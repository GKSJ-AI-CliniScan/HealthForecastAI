"""report service - business logic layer.

Keep API handlers thin: routers validate and authorise, services do the work.

Implements the reporting requirements of Milestone 2 ("generate forecasting
reports"), specifically SRS FR-RPT-02 (operational report for administrators)
and FR-RPT-03 (patient outcome report for doctors).

A report composes data the platform already stores - it never scores a patient
and never writes to risk_predictions. Scope comes from the same helpers the rest
of the platform uses: PatientService for a single patient, and
PatientRepository.scope_clause (through RiskRepository) for a cohort, so a
report can never be wider than the patient list the same caller could read.
"""

from datetime import UTC, datetime
from typing import Any

from sqlalchemy.orm import Session

from app.api.deps import CurrentUser, patient_scope_for
from app.core.rbac import Role
from app.models.prediction import RiskPrediction
from app.repositories.admission_repository import AdmissionRepository
from app.repositories.audit_repository import AuditRepository
from app.repositories.patient_repository import PatientRepository
from app.repositories.risk_repository import RiskRepository
from app.schemas.analytics import RiskDistribution
from app.schemas.report import (
    CohortRiskEntry,
    ForecastHorizon,
    ForecastingReport,
    PatientRiskReport,
    ReportMetadata,
    RiskFactor,
)
from app.services.patient_service import PatientNotFoundError, PatientService
from app.services.risk_service import MAX_HORIZON_DAYS, MIN_HORIZON_DAYS, RISK_HIGH

# Horizons a forecasting report projects by default. 30 days is the window the
# model was actually trained on; the others are linear rescales of it, which is
# the same simplification get_readmission_forecast documents.
DEFAULT_HORIZONS = (30, 60, 90)

# MIN_HORIZON_DAYS / MAX_HORIZON_DAYS come from risk_service so this endpoint
# and /risk/forecast accept exactly the same range.
MAX_COHORT_ROWS = 500

# Below this many scored patients an aggregate is too thin to read as a rate.
# The SRS asks for a data-availability notice rather than a silent number.
SPARSE_DATA_THRESHOLD = 5


class InvalidReportRequestError(Exception):
    """Raised when report parameters are outside the supported range."""


def _now() -> datetime:
    return datetime.now(UTC)


def _rate(numerator: float, denominator: float) -> float:
    """Return a ratio clamped to [0, 1], or 0.0 when the denominator is zero."""
    if denominator <= 0:
        return 0.0
    return max(0.0, min(numerator / denominator, 1.0))


class ReportService:
    """Generates the read-only reports the reporting endpoints expose."""

    def __init__(self, db: Session) -> None:
        self.db = db
        self.patients = PatientService(db)
        self.patient_repository = PatientRepository(db)
        self.admissions = AdmissionRepository(db)
        self.risk = RiskRepository(db)
        self.audit = AuditRepository(db)

    # -- shared helpers --------------------------------------------------

    @staticmethod
    def _scope_label(user: CurrentUser) -> str:
        """Describe, in the report itself, how wide the caller's view was."""
        if user.role is Role.DOCTOR:
            return "assigned_patients"
        if user.role is Role.RESEARCHER:
            return "aggregated"
        return "hospital"

    def _metadata(self, user: CurrentUser, notes: list[str]) -> ReportMetadata:
        return ReportMetadata(
            generated_at=_now(),
            generated_for_role=str(user.role),
            scope=self._scope_label(user),
            notes=notes,
        )

    @staticmethod
    def _risk_factors(
        prediction: RiskPrediction | None,
        total_admissions: int,
        readmitted_total: int,
        average_stay: float,
    ) -> list[RiskFactor]:
        """Derive plain-language drivers from data the report already loaded.

        Deliberately rule based and derived from stored history rather than from
        the live request payload that endpoints/risk.py:explain_risk_factors
        reads, because a report describes a patient as recorded, not a
        hypothetical scoring input. Model-derived attribution (SHAP) stays a
        documented limitation.
        """
        factors: list[RiskFactor] = []

        if prediction is not None and prediction.risk_category == RISK_HIGH:
            factors.append(
                RiskFactor(
                    factor="High predicted readmission risk",
                    detail=(
                        f"Latest model score {prediction.readmission_probability:.1%} "
                        f"falls in the {prediction.risk_category} band."
                    ),
                )
            )
        if readmitted_total >= 1:
            factors.append(
                RiskFactor(
                    factor="Prior readmission history",
                    detail=(
                        f"{readmitted_total} of {total_admissions} recorded "
                        "admissions were followed by a readmission."
                    ),
                )
            )
        if total_admissions >= 3:
            factors.append(
                RiskFactor(
                    factor="Frequent utilisation",
                    detail=f"{total_admissions} admissions recorded for this patient.",
                )
            )
        if average_stay >= 10:
            factors.append(
                RiskFactor(
                    factor="Extended length of stay",
                    detail=f"Average recorded stay is {average_stay:.1f} days.",
                )
            )

        if not factors:
            factors.append(
                RiskFactor(
                    factor="No major risk factors identified",
                    detail="Recorded history shows no readmissions or extended stays.",
                )
            )
        return factors

    def _admission_history(self, patient_id: int) -> dict[str, Any]:
        """Summarise one patient's admissions for the report body."""
        rows = self.admissions.list_for_patient(patient_id, limit=MAX_COHORT_ROWS)
        summary = self.admissions.readmission_summary(patient_id)
        readmitted_total = summary.pop("readmitted_total", 0)

        stays = [r.time_in_hospital for r in rows if r.time_in_hospital is not None]
        average_stay = sum(stays) / len(stays) if stays else 0.0

        dates = [r.admission_date for r in rows if r.admission_date is not None]
        last_admission = max(dates).isoformat() if dates else None

        return {
            "total_admissions": len(rows),
            "readmitted_total": readmitted_total,
            "readmissions_by_label": summary,
            "average_length_of_stay": round(average_stay, 2),
            "last_admission_date": last_admission,
        }

    # -- FR-RPT-03: per patient ------------------------------------------

    def patient_report(self, user: CurrentUser, patient_id: int) -> PatientRiskReport:
        """Build one patient's risk report.

        Resolving the patient through PatientService first is what enforces
        scope: an out of scope or missing patient raises PatientNotFoundError,
        which the router turns into the same 404 the patient endpoints return.
        That call also writes the patient.read audit entry, so a report read is
        recorded against the record like any other access.
        """
        patient = self.patients.get_patient(user, patient_id)

        prediction = self.risk.latest_for_patient(patient_id)
        history = self._admission_history(patient_id)

        notes: list[str] = []
        if prediction is None:
            notes.append(
                "This patient has no stored risk prediction. Score them through "
                "POST /api/v1/risk/predict to populate the risk section."
            )
        if history["total_admissions"] == 0:
            notes.append("No admissions are recorded for this patient.")

        self.audit.record(
            action="report.patient",
            actor_id=user.user_id,
            actor_role=str(user.role),
            resource=f"patient:{patient_id}",
        )

        return PatientRiskReport(
            metadata=self._metadata(user, notes),
            patient_id=patient.id,
            medical_record_number=patient.medical_record_number,
            age_group=patient.age_group,
            gender=patient.gender,
            primary_diagnosis=patient.primary_diagnosis,
            assigned_doctor_id=patient.assigned_doctor_id,
            readmission_probability=(prediction.readmission_probability if prediction else None),
            risk_category=prediction.risk_category if prediction else None,
            model_name=prediction.model_name if prediction else None,
            model_version=prediction.model_version if prediction else None,
            scored_at=prediction.created_at if prediction else None,
            risk_factors=self._risk_factors(
                prediction,
                history["total_admissions"],
                history["readmitted_total"],
                history["average_length_of_stay"],
            ),
            **history,
        )

    # -- FR-RPT-02: cohort / hospital ------------------------------------

    def forecasting_report(
        self,
        user: CurrentUser,
        horizons: tuple[int, ...] = DEFAULT_HORIZONS,
        include_patients: bool = True,
    ) -> ForecastingReport:
        """Build a forecasting report over every patient the caller may see.

        Doctors receive their own caseload, hospital and system administrators
        the whole hospital, and researchers aggregates with no identifiable rows
        - the split the SRS RBAC matrix specifies for risk reporting.
        """
        for horizon in horizons:
            if horizon < MIN_HORIZON_DAYS or horizon > MAX_HORIZON_DAYS:
                raise InvalidReportRequestError(
                    f"horizon_days must be between {MIN_HORIZON_DAYS} and "
                    f"{MAX_HORIZON_DAYS}, got {horizon}"
                )

        doctor_id = patient_scope_for(user)
        predictions = self.risk.list_latest(doctor_id=doctor_id)
        patients_in_scope = self.patient_repository.count_patients(doctor_id=doctor_id)
        patients_scored = len(predictions)

        distribution = RiskDistribution()
        for prediction in predictions:
            if hasattr(distribution, prediction.risk_category):
                current = getattr(distribution, prediction.risk_category)
                setattr(distribution, prediction.risk_category, current + 1)

        probabilities = [p.readmission_probability for p in predictions]
        base_rate_30d = sum(probabilities) / len(probabilities) if probabilities else 0.0

        horizon_rows = [
            ForecastHorizon(
                horizon_days=horizon,
                predicted_rate=round(min(base_rate_30d * (horizon / 30), 1.0), 4),
                predicted_readmissions=round(
                    min(base_rate_30d * (horizon / 30), 1.0) * patients_scored
                ),
            )
            for horizon in horizons
        ]

        total_admissions = 0
        observed_readmissions = 0
        for prediction in predictions:
            summary = self.admissions.readmission_summary(prediction.patient_id)
            observed_readmissions += summary.pop("readmitted_total", 0)
            total_admissions += self.admissions.count_for_patient(prediction.patient_id)

        notes: list[str] = []
        if patients_scored == 0:
            notes.append(
                "No patients in scope have a stored risk prediction, so every "
                "projection below is zero."
            )
        elif patients_scored < SPARSE_DATA_THRESHOLD:
            notes.append(
                f"Only {patients_scored} patient(s) in scope have been scored; "
                "rates are indicative rather than representative."
            )
        if patients_scored < patients_in_scope:
            notes.append(
                f"{patients_in_scope - patients_scored} patient(s) in scope have "
                "no stored prediction and are excluded from the projections."
            )
        notes.append(
            "Horizons other than 30 days are a linear rescale of the model's "
            "30-day probability, not an independent time-series forecast."
        )

        # None means "this caller may not see patient rows at all"; an empty list
        # means "permitted, but nothing matched". Collapsing the two would make a
        # researcher's report indistinguishable from a quiet hospital.
        cohort: list[CohortRiskEntry] | None = None
        if user.role is not Role.RESEARCHER:
            cohort = []
            for prediction in predictions[:MAX_COHORT_ROWS] if include_patients else []:
                if prediction.risk_category != RISK_HIGH:
                    continue
                patient = self.patient_repository.get(prediction.patient_id)
                cohort.append(
                    CohortRiskEntry(
                        patient_id=prediction.patient_id,
                        medical_record_number=(patient.medical_record_number if patient else None),
                        readmission_probability=prediction.readmission_probability,
                        risk_category=prediction.risk_category,
                        scored_at=prediction.created_at,
                    )
                )

        self.audit.record(
            action="report.forecast",
            actor_id=user.user_id,
            actor_role=str(user.role),
            resource=f"scope:{self._scope_label(user)}",
        )

        return ForecastingReport(
            metadata=self._metadata(user, notes),
            patients_in_scope=patients_in_scope,
            patients_scored=patients_scored,
            coverage_rate=round(_rate(patients_scored, patients_in_scope), 4),
            risk_distribution=distribution,
            average_risk_probability=round(base_rate_30d, 4),
            horizons=horizon_rows,
            total_admissions=total_admissions,
            observed_readmissions=observed_readmissions,
            observed_readmission_rate=round(_rate(observed_readmissions, total_admissions), 4),
            high_risk_patients=cohort,
        )


__all__ = [
    "DEFAULT_HORIZONS",
    "InvalidReportRequestError",
    "PatientNotFoundError",
    "ReportService",
]
