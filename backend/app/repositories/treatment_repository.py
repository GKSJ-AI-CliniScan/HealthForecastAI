"""Data access for treatment effectiveness analytics.

Every aggregate here is computed with plain SQL portable across SQLite (the
in-memory engine backend/tests/conftest.py runs against) and PostgreSQL
(production) - trend bucketing in particular is done in Python rather than
with a dialect-specific function like DATE_TRUNC, so behaviour never diverges
between the two.
"""

from dataclasses import dataclass
from datetime import date, timedelta

from sqlalchemy import ColumnElement, case, func, select
from sqlalchemy.orm import Session

from app.models.admission import Admission
from app.models.patient import Patient
from app.models.treatment import TreatmentOutcome
from app.repositories.base import BaseRepository

SUCCESS_OUTCOME = "improved"

# Values the source datasets use to mean "this encounter was not followed by a
# readmission" - mirrors AdmissionRepository.NOT_READMITTED so the two never
# disagree about what counts as a readmission.
NOT_READMITTED = frozenset({"NO", "No", "no", "0", ""})


@dataclass(frozen=True)
class TreatmentRateRow:
    """One treatment's aggregate recovery/success figures."""

    treatment_name: str
    sample_size: int
    average_recovery_score: float | None
    success_count: int


@dataclass(frozen=True)
class TreatmentComparisonRow:
    """One treatment's figures within a single diagnosis cohort."""

    treatment_name: str
    sample_size: int
    average_recovery_score: float | None
    success_rate: float
    readmission_rate: float


@dataclass(frozen=True)
class RecoveryTrendPoint:
    """One week's recovery-score trend point."""

    week_start: str
    average_recovery_score: float | None
    sample_size: int


def _not_readmitted_case() -> ColumnElement[int]:
    return case(
        (Admission.readmitted.is_(None), 0),
        (Admission.readmitted.in_(list(NOT_READMITTED)), 0),
        else_=1,
    )


class TreatmentRepository(BaseRepository[TreatmentOutcome]):
    """Queries the treatment effectiveness endpoints depend on."""

    def __init__(self, db: Session) -> None:
        super().__init__(TreatmentOutcome, db)

    def list_for_admission(self, admission_id: int) -> list[TreatmentOutcome]:
        """Return every treatment outcome recorded for one admission."""
        stmt = select(TreatmentOutcome).where(TreatmentOutcome.admission_id == admission_id)
        return list(self.db.execute(stmt).scalars().all())

    def rates_by_treatment(
        self, treatment_name: str | None = None, department: str | None = None
    ) -> list[TreatmentRateRow]:
        """Recovery rate and success rate, grouped by treatment name.

        Joins to admissions only when a department filter is given, since the
        join is unnecessary overhead for the common unfiltered case.
        """
        success = case((TreatmentOutcome.outcome == SUCCESS_OUTCOME, 1), else_=0)
        stmt = select(
            TreatmentOutcome.treatment_name,
            func.count().label("sample_size"),
            func.avg(TreatmentOutcome.recovery_score).label("average_recovery_score"),
            func.sum(success).label("success_count"),
        )
        if department is not None:
            stmt = stmt.join(Admission, Admission.id == TreatmentOutcome.admission_id).where(
                Admission.department == department
            )
        if treatment_name is not None:
            stmt = stmt.where(TreatmentOutcome.treatment_name == treatment_name)
        stmt = stmt.group_by(TreatmentOutcome.treatment_name)

        return [
            TreatmentRateRow(
                treatment_name=row.treatment_name,
                sample_size=row.sample_size,
                average_recovery_score=row.average_recovery_score,
                success_count=row.success_count or 0,
            )
            for row in self.db.execute(stmt).all()
        ]

    def readmission_rate_for_treatment(self, treatment_name: str) -> tuple[int, int]:
        """Return (readmitted_count, total_count) for admissions that received this treatment."""
        stmt = (
            select(Admission.readmitted)
            .join(TreatmentOutcome, TreatmentOutcome.admission_id == Admission.id)
            .where(TreatmentOutcome.treatment_name == treatment_name)
        )
        labels = [row[0] for row in self.db.execute(stmt).all()]
        total = len(labels)
        readmitted = sum(1 for label in labels if label is not None and label not in NOT_READMITTED)
        return readmitted, total

    def hospital_readmission_rate(self) -> tuple[int, int]:
        """Baseline (readmitted_count, total_count) across every admission, for comparison."""
        stmt = select(Admission.readmitted)
        labels = [row[0] for row in self.db.execute(stmt).all()]
        total = len(labels)
        readmitted = sum(1 for label in labels if label is not None and label not in NOT_READMITTED)
        return readmitted, total

    def total_for_diagnosis(self, diagnosis: str) -> int:
        """Total recorded treatment_outcomes rows for a diagnosis cohort - the
        re-identification-risk guard's sample-size check."""
        stmt = (
            select(func.count())
            .select_from(TreatmentOutcome)
            .join(Admission, Admission.id == TreatmentOutcome.admission_id)
            .join(Patient, Patient.id == Admission.patient_id)
            .where(Patient.primary_diagnosis == diagnosis)
        )
        return self.db.execute(stmt).scalar_one()

    def compare_by_diagnosis(self, diagnosis: str) -> list[TreatmentComparisonRow]:
        """Recovery/success/readmission figures per treatment, within one diagnosis cohort."""
        success = case((TreatmentOutcome.outcome == SUCCESS_OUTCOME, 1), else_=0)
        stmt = (
            select(
                TreatmentOutcome.treatment_name,
                func.count().label("sample_size"),
                func.avg(TreatmentOutcome.recovery_score).label("average_recovery_score"),
                func.sum(success).label("success_count"),
                func.sum(_not_readmitted_case()).label("readmitted_count"),
            )
            .join(Admission, Admission.id == TreatmentOutcome.admission_id)
            .join(Patient, Patient.id == Admission.patient_id)
            .where(Patient.primary_diagnosis == diagnosis)
            .group_by(TreatmentOutcome.treatment_name)
        )
        results: list[TreatmentComparisonRow] = []
        for row in self.db.execute(stmt).all():
            sample = row.sample_size or 0
            results.append(
                TreatmentComparisonRow(
                    treatment_name=row.treatment_name,
                    sample_size=sample,
                    average_recovery_score=row.average_recovery_score,
                    success_rate=(row.success_count or 0) / sample if sample else 0.0,
                    readmission_rate=(row.readmitted_count or 0) / sample if sample else 0.0,
                )
            )
        return results

    def recovery_trend(
        self, treatment_name: str | None = None, weeks: int = 12
    ) -> list[RecoveryTrendPoint]:
        """Weekly recovery-score trend, most recent ``weeks`` weeks that have data.

        Bucketed in Python (ISO week start) rather than with a dialect-specific
        date-truncation function, so this behaves identically against SQLite
        (tests) and PostgreSQL (production).
        """
        stmt = select(Admission.discharge_date, TreatmentOutcome.recovery_score).join(
            Admission, Admission.id == TreatmentOutcome.admission_id
        )
        if treatment_name is not None:
            stmt = stmt.where(TreatmentOutcome.treatment_name == treatment_name)

        scores_by_week: dict[date, list[float]] = {}
        counts_by_week: dict[date, int] = {}
        for discharge_date, recovery_score in self.db.execute(stmt).all():
            if discharge_date is None:
                continue
            week_start = discharge_date - timedelta(days=discharge_date.weekday())
            counts_by_week[week_start] = counts_by_week.get(week_start, 0) + 1
            if recovery_score is not None:
                scores_by_week.setdefault(week_start, []).append(recovery_score)

        ordered_weeks = sorted(counts_by_week)[-weeks:]
        return [
            RecoveryTrendPoint(
                week_start=week.isoformat(),
                average_recovery_score=(
                    sum(scores_by_week[week]) / len(scores_by_week[week])
                    if scores_by_week.get(week)
                    else None
                ),
                sample_size=counts_by_week[week],
            )
            for week in ordered_weeks
        ]
