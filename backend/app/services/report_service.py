"""report service - generate, store and serve analytics reports.

Every figure in a report comes from AnalyticsService / TreatmentService, the
same methods behind the /analytics and /treatment endpoints, so a report can
never disagree with the dashboard, and their scoping, cohort-size guards and
audit logging apply unchanged. This layer only arranges those results into a
ReportDocument, renders it, stores the file and records its metadata.
"""

from collections.abc import Callable
from contextlib import suppress
from datetime import UTC, datetime, timedelta
from pathlib import Path
from typing import Any

from sqlalchemy.orm import Session

from app.api.deps import CurrentUser
from app.core.rbac import Permission, Role, has_permission
from app.models.report import Report
from app.models.treatment import OUTCOME_VALUES
from app.repositories.audit_repository import AuditRepository
from app.repositories.report_repository import ReportRepository
from app.repositories.treatment_repository import UNRECORDED_OUTCOME
from app.schemas.analytics import DateRange, ResearchCohortFilter
from app.schemas.report import ReportFilters, ReportGenerateRequest
from app.services.analytics_service import AnalyticsService
from app.services.patient_service import CohortTooSmallError
from app.services.treatment_service import TreatmentService
from app.utils import report_storage
from app.utils.report_exporters import EXPORTERS, Cell, ReportDocument, ReportTable

DEFAULT_TREND_MONTHS = 12

ReportDocumentParts = tuple[list[tuple[str, Cell]], list[ReportTable]]

# The analytics permission each report type's data requires, on top of the
# ANALYTICS_EXPORT permission every report route demands. Mirrors the guard on
# the endpoint that serves the same data, so a report can never expose what
# the caller could not read directly. Treatment reports accept either the full
# or the _LIMITED grant, exactly as /treatment does.
REPORT_PERMISSIONS: dict[str, tuple[Permission, ...]] = {
    "treatment_effectiveness": (
        Permission.TREATMENT_REPORT_READ,
        Permission.TREATMENT_REPORT_READ_LIMITED,
    ),
    "patient_outcomes": (Permission.HOSPITAL_ANALYTICS_READ,),
    "department_performance": (Permission.HOSPITAL_ANALYTICS_READ,),
    "population_health": (Permission.POPULATION_HEALTH_READ,),
    "risk_distribution": (Permission.HOSPITAL_ANALYTICS_READ,),
    "readmission_analytics": (Permission.HOSPITAL_ANALYTICS_READ,),
    "research_cohort": (Permission.POPULATION_HEALTH_READ,),
}

REPORT_TITLES: dict[str, str] = {
    "treatment_effectiveness": "Treatment Effectiveness Report",
    "patient_outcomes": "Patient Outcome Analytics Report",
    "department_performance": "Department Performance Report",
    "population_health": "Population Health Report",
    "risk_distribution": "Risk Distribution Report",
    "readmission_analytics": "Readmission Analytics Report",
    "research_cohort": "Research Cohort Statistics Report",
}


class ReportNotFoundError(Exception):
    """No such report, or it belongs to another user (the two are not distinguished)."""


class ReportForbiddenError(Exception):
    """The caller lacks the analytics permission this report type's data requires."""


class ReportFileMissingError(Exception):
    """The metadata row exists but its file is no longer on disk."""


def can_read_report_type(user: CurrentUser, report_type: str) -> bool:
    return any(has_permission(user.role, p) for p in REPORT_PERMISSIONS[report_type])


def _remove_quietly(file_name: str) -> None:
    """Remove a report file; a stored name that fails validation is never
    turned into a filesystem path, and must not block deleting its row."""
    with suppress(report_storage.InvalidReportFileNameError):
        report_storage.remove(file_name)


def _counts_table(title: str, label: str, counts: dict[str, int]) -> ReportTable:
    ordered = sorted(counts.items(), key=lambda item: (-item[1], item[0]))
    return ReportTable(title, [label, "Count"], [[key, value] for key, value in ordered])


def _trend_table(title: str, points: list[dict[str, Any]], labels: list[str]) -> ReportTable:
    seen = {key for point in points for key in point["breakdown"]}
    columns = [*labels, *sorted(seen - set(labels))]
    return ReportTable(
        title,
        ["Month", "Total", *columns],
        [
            [point["period"], point["total"], *(point["breakdown"].get(c, 0) for c in columns)]
            for point in points
        ],
    )


class ReportService:
    """Report generation, history, download and retention."""

    def __init__(self, db: Session) -> None:
        self.reports = ReportRepository(db)
        self.analytics = AnalyticsService(db)
        self.treatments = TreatmentService(db)
        self.audit = AuditRepository(db)
        self._builders: dict[str, Callable[[CurrentUser, ReportFilters], ReportDocumentParts]] = {
            "treatment_effectiveness": self._treatment_effectiveness,
            "patient_outcomes": self._patient_outcomes,
            "department_performance": self._department_performance,
            "population_health": self._population_health,
            "risk_distribution": self._risk_distribution,
            "readmission_analytics": self._readmission_analytics,
            "research_cohort": self._research_cohort,
        }

    # ------------------------------------------------------------------
    # Generation
    # ------------------------------------------------------------------

    def generate(self, user: CurrentUser, request: ReportGenerateRequest) -> Report:
        """Build, render, store and register one report.

        Raises ReportForbiddenError, or CohortTooSmallError from the
        population/cohort guards. The file is written before the row is
        inserted and removed again if the insert fails, so no row ever
        points at a missing file.
        """
        if not can_read_report_type(user, request.report_type):
            self._audit(user, "report.generate", f"type:{request.report_type}", "failure")
            raise ReportForbiddenError(request.report_type)
        if user.user_id is None:
            raise ReportForbiddenError(request.report_type)

        try:
            summary, tables = self._builders[request.report_type](user, request.filters)
        except CohortTooSmallError:
            self._audit(user, "report.generate", f"type:{request.report_type}", "failure")
            raise

        applied = request.filters.model_dump(exclude_none=True, mode="json")
        document = ReportDocument(
            title=REPORT_TITLES[request.report_type],
            generated_at=datetime.now(UTC),
            generated_by=f"User #{user.user_id} ({user.role})",
            filters={key: str(value) for key, value in applied.items()},
            summary=summary,
            tables=tables,
        )
        content = EXPORTERS[request.format](document)

        file_name = report_storage.new_file_name(request.format)
        size = report_storage.write(file_name, content)
        try:
            report = self.reports.create(
                report_type=request.report_type,
                format=request.format,
                generated_by=user.user_id,
                filters=applied,
                file_path=file_name,
                file_size_bytes=size,
                generated_at=document.generated_at,
            )
        except Exception:
            report_storage.remove(file_name)
            raise

        self._audit(user, "report.generate", f"report:{report.id};type:{request.report_type}")
        return report

    # ------------------------------------------------------------------
    # History / download / deletion
    # ------------------------------------------------------------------

    @staticmethod
    def _owner_scope(user: CurrentUser) -> int | None:
        """System administrators manage every report; everyone else only their own."""
        return None if user.role is Role.SYSTEM_ADMIN else user.user_id

    def list_reports(
        self,
        user: CurrentUser,
        report_type: str | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> tuple[list[Report], int]:
        owner = self._owner_scope(user)
        rows = self.reports.list_reports(owner, report_type, limit, offset)
        return rows, self.reports.count_reports(owner, report_type)

    def get_report(self, user: CurrentUser, report_id: int) -> Report:
        report = self.reports.get(report_id)
        owner = self._owner_scope(user)
        if report is None or (owner is not None and report.generated_by != owner):
            raise ReportNotFoundError(str(report_id))
        return report

    def open_download(self, user: CurrentUser, report_id: int) -> tuple[Report, Path]:
        """Authorise a download and return the file to stream.

        The data permission is re-checked, so a user whose role has since lost
        access to that analytics area can no longer pull the file.
        """
        report = self.get_report(user, report_id)
        if not can_read_report_type(user, report.report_type):
            self._audit(user, "report.download", f"report:{report_id}", "failure")
            raise ReportForbiddenError(report.report_type)
        try:
            path = report_storage.resolve(report.file_path)
        except report_storage.InvalidReportFileNameError as exc:
            # Only reachable if the stored name was altered outside this service.
            raise ReportFileMissingError(str(report_id)) from exc
        if not path.is_file():
            raise ReportFileMissingError(str(report_id))
        self._audit(user, "report.download", f"report:{report_id}")
        return report, path

    def delete_report(self, user: CurrentUser, report_id: int) -> None:
        report = self.get_report(user, report_id)
        file_name = report.file_path
        self.reports.delete(report)
        _remove_quietly(file_name)
        self._audit(user, "report.delete", f"report:{report_id}")

    def purge_expired(self, user: CurrentUser, older_than_days: int) -> int:
        """Delete every report (row and file) older than the retention window."""
        cutoff = datetime.now(UTC) - timedelta(days=older_than_days)
        expired = self.reports.generated_before(cutoff)
        for report in expired:
            file_name = report.file_path
            self.reports.delete(report)
            _remove_quietly(file_name)
        self._audit(
            user, "report.purge", f"older_than_days:{older_than_days};deleted:{len(expired)}"
        )
        return len(expired)

    def _audit(
        self, user: CurrentUser, action: str, resource: str, outcome: str = "success"
    ) -> None:
        self.audit.record(
            action=action,
            actor_id=user.user_id,
            actor_role=str(user.role),
            resource=resource[:128],
            outcome=outcome,
        )

    # ------------------------------------------------------------------
    # Report builders - arrangement only, every figure comes from a service
    # ------------------------------------------------------------------

    def _treatment_effectiveness(
        self, user: CurrentUser, filters: ReportFilters
    ) -> ReportDocumentParts:
        rows = self.treatments.list_effectiveness(user, filters.treatment_name, filters.department)
        departments = self.treatments.department_effectiveness(user)
        total = sum(row.sample_size for row in rows)
        successes = sum(row.success_count for row in rows)
        summary: list[tuple[str, Cell]] = [
            ("Treatments analysed", len(rows)),
            ("Treatment outcomes", total),
            ("Overall success rate", successes / total if total else 0.0),
        ]
        tables = [
            ReportTable(
                "Treatment effectiveness",
                ["Treatment", "Sample size", "Average recovery score", "Success rate"],
                [
                    [
                        row.treatment_name,
                        row.sample_size,
                        row.average_recovery_score,
                        row.success_count / row.sample_size if row.sample_size else 0.0,
                    ]
                    for row in rows
                ],
            ),
            ReportTable(
                "Effectiveness by department",
                [
                    "Department",
                    "Sample size",
                    "Average recovery score",
                    "Success rate",
                    "Readmission rate",
                ],
                [
                    [
                        row.department,
                        row.sample_size,
                        row.average_recovery_score,
                        row.success_rate,
                        row.readmission_rate,
                    ]
                    for row in departments
                ],
            ),
        ]
        return summary, tables

    def _patient_outcomes(self, user: CurrentUser, filters: ReportFilters) -> ReportDocumentParts:
        months = filters.months or DEFAULT_TREND_MONTHS
        distribution = self.treatments.outcome_distribution(user)
        trend = self.analytics.trends(user, "outcome", months)
        discharges = self.analytics.discharge_outcomes(user)
        outcome_labels = [*OUTCOME_VALUES, UNRECORDED_OUTCOME]
        recorded = sum(sum(outcomes.values()) for _, outcomes in distribution)
        improved = sum(outcomes.get("improved", 0) for _, outcomes in distribution)
        summary: list[tuple[str, Cell]] = [
            ("Treatment outcomes recorded", recorded),
            ("Share improved", improved / recorded if recorded else 0.0),
            ("Admissions with a discharge disposition", sum(discharges.values())),
        ]
        tables = [
            ReportTable(
                "Outcome distribution by treatment",
                ["Treatment", "Sample size", *outcome_labels],
                [
                    [name, sum(outcomes.values()), *(outcomes[label] for label in outcome_labels)]
                    for name, outcomes in distribution
                ],
            ),
            _trend_table("Monthly outcome trend", trend, outcome_labels),
            _counts_table("Discharge outcomes", "Discharge disposition", discharges),
        ]
        return summary, tables

    def _department_performance(
        self, user: CurrentUser, filters: ReportFilters
    ) -> ReportDocumentParts:
        window = DateRange(date_from=filters.date_from, date_to=filters.date_to)
        departments = self.analytics.department_analytics(user, window, "total_admissions", "desc")
        effectiveness = self.treatments.department_effectiveness(user)
        summary: list[tuple[str, Cell]] = [
            ("Departments", len(departments)),
            ("Admissions", sum(row["total_admissions"] for row in departments)),
        ]
        tables = [
            ReportTable(
                "Department activity",
                [
                    "Department",
                    "Patients",
                    "Admissions",
                    "Average length of stay (days)",
                    "Readmission rate",
                ],
                [
                    [
                        row["department"],
                        row["total_patients"],
                        row["total_admissions"],
                        row["average_length_of_stay"],
                        row["readmission_rate"],
                    ]
                    for row in departments
                ],
            ),
            ReportTable(
                "Treatment effectiveness by department",
                ["Department", "Treatment outcomes", "Average recovery score", "Success rate"],
                [
                    [row.department, row.sample_size, row.average_recovery_score, row.success_rate]
                    for row in effectiveness
                ],
            ),
        ]
        return summary, tables

    def _population_health(self, user: CurrentUser, filters: ReportFilters) -> ReportDocumentParts:
        result = self.analytics.population_health(user)
        demographics = result["demographic_distribution"]
        summary: list[tuple[str, Cell]] = [
            ("Patients", result["total_patients"]),
            ("Distinct primary diagnoses listed", len(result["disease_prevalence"])),
        ]
        tables = [
            _counts_table("Disease prevalence", "Primary diagnosis", result["disease_prevalence"]),
            _counts_table("Age distribution", "Age group", demographics.get("age_group", {})),
            _counts_table("Gender distribution", "Gender", demographics.get("gender", {})),
            _counts_table("Race distribution", "Race", demographics.get("race", {})),
        ]
        return summary, tables

    def _risk_distribution(self, user: CurrentUser, filters: ReportFilters) -> ReportDocumentParts:
        months = filters.months or DEFAULT_TREND_MONTHS
        distribution = self.analytics.hospital_summary(user).risk_distribution.model_dump()
        trend = self.analytics.trends(user, "risk", months)
        scored = sum(distribution.values())
        summary: list[tuple[str, Cell]] = [
            ("Patients with a risk score", scored),
            ("Share high risk", distribution["high"] / scored if scored else 0.0),
        ]
        tables = [
            ReportTable(
                "Latest risk category per patient",
                ["Risk category", "Patients"],
                [[category, count] for category, count in distribution.items()],
            ),
            _trend_table("Monthly risk scoring trend", trend, ["low", "medium", "high"]),
        ]
        return summary, tables

    def _readmission_analytics(
        self, user: CurrentUser, filters: ReportFilters
    ) -> ReportDocumentParts:
        months = filters.months or DEFAULT_TREND_MONTHS
        headline = self.analytics.hospital_summary(user)
        trend = self.analytics.readmission_analytics(user, months)
        summary: list[tuple[str, Cell]] = [
            ("Patients", headline.total_patients),
            ("Admissions", headline.total_admissions),
            ("Readmission rate", headline.readmission_rate),
            ("Average length of stay (days)", headline.average_length_of_stay),
        ]
        tables = [
            ReportTable(
                "Monthly readmission trend",
                ["Month", "Admissions", "Readmission rate"],
                [
                    [point["month"], point["total_admissions"], point["readmission_rate"]]
                    for point in trend
                ],
            )
        ]
        return summary, tables

    def _research_cohort(self, user: CurrentUser, filters: ReportFilters) -> ReportDocumentParts:
        cohort_filter = ResearchCohortFilter(
            diagnosis=filters.diagnosis,
            gender=filters.gender,
            age_band=filters.age_band,
            date_from=filters.date_from,
            date_to=filters.date_to,
        )
        stats = self.analytics.cohort_statistics(user, cohort_filter)
        summary: list[tuple[str, Cell]] = [("Cohort size", stats["cohort_size"])]
        tables = [
            _counts_table("Age band distribution", "Age band", stats["age_band_distribution"]),
            _counts_table("Gender distribution", "Gender", stats["gender_distribution"]),
            _counts_table("Diagnosis distribution", "Diagnosis", stats["diagnosis_distribution"]),
        ]
        return summary, tables


__all__ = [
    "CohortTooSmallError",
    "REPORT_PERMISSIONS",
    "ReportFileMissingError",
    "ReportForbiddenError",
    "ReportNotFoundError",
    "ReportService",
]
