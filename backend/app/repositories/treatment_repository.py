"""Data access for treatment effectiveness analytics.

Every aggregate here is computed with plain SQL portable across SQLite (the
in-memory engine backend/tests/conftest.py runs against) and PostgreSQL
(production) - trend bucketing in particular is done in Python rather than
with a dialect-specific function like DATE_TRUNC, so behaviour never diverges
between the two.

Every aggregate takes an optional doctor_id. When set, only treatment rows
whose admission belongs to one of that doctor's patients are counted - the
same PatientRepository.scope_clause every other doctor-scoped read uses.
"""

from collections import Counter
from dataclasses import dataclass
from datetime import date, timedelta
from typing import Any

from sqlalchemy import ColumnElement, Select, case, func, select
from sqlalchemy.orm import Session

from app.models.admission import Admission
from app.models.patient import Patient
from app.models.treatment import OUTCOME_VALUES, TreatmentOutcome
from app.repositories.base import BaseRepository
from app.repositories.patient_repository import PatientRepository

SUCCESS_OUTCOME = "improved"
UNRECORDED_OUTCOME = "unrecorded"

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
class DepartmentEffectivenessRow:
    """One department's treatment effectiveness figures."""

    department: str
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


def _readmitted_case() -> ColumnElement[int]:
    return case(
        (Admission.readmitted.is_(None), 0),
        (Admission.readmitted.in_(list(NOT_READMITTED)), 0),
        else_=1,
    )


def _success_case() -> ColumnElement[int]:
    return case((TreatmentOutcome.outcome == SUCCESS_OUTCOME, 1), else_=0)


def _is_readmitted(label: str | None) -> bool:
    return label is not None and label not in NOT_READMITTED


def _in_doctor_scope(doctor_id: int) -> ColumnElement[bool]:
    """Admission belongs to one of this doctor's patients. Requires Admission in the FROM."""
    return Admission.patient_id.in_(
        select(Patient.id).where(PatientRepository.scope_clause(doctor_id))
    )


class TreatmentRepository(BaseRepository[TreatmentOutcome]):
    """Queries the treatment effectiveness endpoints depend on."""

    def __init__(self, db: Session) -> None:
        super().__init__(TreatmentOutcome, db)

    @staticmethod
    def _joined(stmt: Select[Any], doctor_id: int | None) -> Select[Any]:
        stmt = stmt.select_from(TreatmentOutcome).join(
            Admission, Admission.id == TreatmentOutcome.admission_id
        )
        if doctor_id is not None:
            stmt = stmt.where(_in_doctor_scope(doctor_id))
        return stmt

    def list_for_admission(self, admission_id: int) -> list[TreatmentOutcome]:
        """Return every treatment outcome recorded for one admission."""
        stmt = (
            select(TreatmentOutcome)
            .where(TreatmentOutcome.admission_id == admission_id)
            .order_by(TreatmentOutcome.id)
        )
        return list(self.db.execute(stmt).scalars().all())

    def rates_by_treatment(
        self,
        treatment_name: str | None = None,
        department: str | None = None,
        doctor_id: int | None = None,
    ) -> list[TreatmentRateRow]:
        """Recovery rate and success rate, grouped by treatment name."""
        stmt = self._joined(
            select(
                TreatmentOutcome.treatment_name,
                func.count().label("sample_size"),
                func.avg(TreatmentOutcome.recovery_score).label("average_recovery_score"),
                func.sum(_success_case()).label("success_count"),
            ),
            doctor_id,
        )
        if department is not None:
            stmt = stmt.where(Admission.department == department)
        if treatment_name is not None:
            stmt = stmt.where(TreatmentOutcome.treatment_name == treatment_name)
        stmt = stmt.group_by(TreatmentOutcome.treatment_name).order_by(
            TreatmentOutcome.treatment_name
        )

        return [
            TreatmentRateRow(
                treatment_name=row.treatment_name,
                sample_size=row.sample_size,
                average_recovery_score=row.average_recovery_score,
                success_count=row.success_count or 0,
            )
            for row in self.db.execute(stmt).all()
        ]

    def outcome_distribution(
        self,
        treatment_name: str | None = None,
        department: str | None = None,
        doctor_id: int | None = None,
    ) -> list[tuple[str, dict[str, int]]]:
        """Per-treatment count of each outcome value, NULL counted as "unrecorded".

        Every known outcome appears in each breakdown (zero when absent) so the
        cross-tab has a stable shape.
        """
        stmt = self._joined(
            select(TreatmentOutcome.treatment_name, TreatmentOutcome.outcome, func.count()),
            doctor_id,
        )
        if department is not None:
            stmt = stmt.where(Admission.department == department)
        if treatment_name is not None:
            stmt = stmt.where(TreatmentOutcome.treatment_name == treatment_name)
        stmt = stmt.group_by(TreatmentOutcome.treatment_name, TreatmentOutcome.outcome)

        table: dict[str, dict[str, int]] = {}
        for name, outcome, count in self.db.execute(stmt).all():
            breakdown = table.setdefault(
                name, {label: 0 for label in (*OUTCOME_VALUES, UNRECORDED_OUTCOME)}
            )
            breakdown[outcome or UNRECORDED_OUTCOME] += count
        return sorted(table.items())

    def effectiveness_by_department(
        self, doctor_id: int | None = None
    ) -> list[DepartmentEffectivenessRow]:
        """Recovery/success/readmission figures grouped by admission department."""
        department = func.coalesce(Admission.department, "unassigned")
        stmt = self._joined(
            select(
                department.label("department"),
                func.count().label("sample_size"),
                func.avg(TreatmentOutcome.recovery_score).label("average_recovery_score"),
                func.sum(_success_case()).label("success_count"),
                func.sum(_readmitted_case()).label("readmitted_count"),
            ),
            doctor_id,
        )
        stmt = stmt.group_by(department).order_by(department)

        results: list[DepartmentEffectivenessRow] = []
        for row in self.db.execute(stmt).all():
            sample = row.sample_size or 0
            results.append(
                DepartmentEffectivenessRow(
                    department=row.department,
                    sample_size=sample,
                    average_recovery_score=row.average_recovery_score,
                    success_rate=(row.success_count or 0) / sample if sample else 0.0,
                    readmission_rate=(row.readmitted_count or 0) / sample if sample else 0.0,
                )
            )
        return results

    def readmission_rate_for_treatment(
        self, treatment_name: str, doctor_id: int | None = None
    ) -> tuple[int, int]:
        """Return (readmitted_count, total_count) for admissions that received this treatment."""
        stmt = self._joined(select(Admission.readmitted), doctor_id).where(
            TreatmentOutcome.treatment_name == treatment_name
        )
        labels = [row[0] for row in self.db.execute(stmt).all()]
        return sum(1 for label in labels if _is_readmitted(label)), len(labels)

    def hospital_readmission_rate(self, doctor_id: int | None = None) -> tuple[int, int]:
        """Baseline (readmitted_count, total_count) across every admission in scope."""
        stmt = select(Admission.readmitted)
        if doctor_id is not None:
            stmt = stmt.where(_in_doctor_scope(doctor_id))
        labels = [row[0] for row in self.db.execute(stmt).all()]
        return sum(1 for label in labels if _is_readmitted(label)), len(labels)

    def total_for_diagnosis(self, diagnosis: str, doctor_id: int | None = None) -> int:
        """Total recorded treatment_outcomes rows for a diagnosis cohort - the
        small-sample guard's sample-size check."""
        stmt = (
            self._joined(select(func.count()), doctor_id)
            .join(Patient, Patient.id == Admission.patient_id)
            .where(Patient.primary_diagnosis == diagnosis)
        )
        return self.db.execute(stmt).scalar_one()

    def compare_by_diagnosis(
        self, diagnosis: str, doctor_id: int | None = None
    ) -> list[TreatmentComparisonRow]:
        """Recovery/success/readmission figures per treatment, within one diagnosis cohort."""
        stmt = (
            self._joined(
                select(
                    TreatmentOutcome.treatment_name,
                    func.count().label("sample_size"),
                    func.avg(TreatmentOutcome.recovery_score).label("average_recovery_score"),
                    func.sum(_success_case()).label("success_count"),
                    func.sum(_readmitted_case()).label("readmitted_count"),
                ),
                doctor_id,
            )
            .join(Patient, Patient.id == Admission.patient_id)
            .where(Patient.primary_diagnosis == diagnosis)
            .group_by(TreatmentOutcome.treatment_name)
            .order_by(TreatmentOutcome.treatment_name)
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
        self, treatment_name: str | None = None, weeks: int = 12, doctor_id: int | None = None
    ) -> list[RecoveryTrendPoint]:
        """Weekly recovery-score trend, most recent ``weeks`` weeks that have data.

        Bucketed in Python (ISO week start) rather than with a dialect-specific
        date-truncation function, so this behaves identically against SQLite
        (tests) and PostgreSQL (production).
        """
        stmt = self._joined(
            select(Admission.discharge_date, TreatmentOutcome.recovery_score), doctor_id
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

    def outcome_trend(self, months: int = 12, doctor_id: int | None = None) -> list[dict[str, Any]]:
        """Monthly outcome breakdown by discharge month, most recent ``months`` with data."""
        stmt = self._joined(select(Admission.discharge_date, TreatmentOutcome.outcome), doctor_id)
        buckets: dict[str, Counter[str]] = {}
        for discharge_date, outcome in self.db.execute(stmt).all():
            if discharge_date is None:
                continue
            key = f"{discharge_date.year:04d}-{discharge_date.month:02d}"
            buckets.setdefault(key, Counter())[outcome or UNRECORDED_OUTCOME] += 1
        return [
            {"period": key, "total": sum(buckets[key].values()), "breakdown": dict(buckets[key])}
            for key in sorted(buckets)[-months:]
        ]
