"""Data access for hospital-wide outcome, department and research analytics.

Every aggregate is a plain query over patients/admissions - no new fact table
is introduced (see the Milestone 3 Phase A migration's rationale). Doctor
scoping reuses PatientRepository.scope_clause, the same predicate every other
patient-scoped query in the codebase uses, so "what a doctor may see" is
never redefined a second time.
"""

from collections import Counter
from datetime import date
from typing import Any

from sqlalchemy import Select, func, select
from sqlalchemy.orm import Session

from app.models.admission import Admission
from app.models.patient import Patient
from app.repositories.base import BaseRepository
from app.repositories.patient_repository import PatientRepository

NOT_READMITTED = frozenset({"NO", "No", "no", "0", ""})


class AnalyticsRepository(BaseRepository[Admission]):
    """Aggregate queries backing the Healthcare Analytics and Research
    Analytics endpoints. Bound to Admission for BaseRepository's generic
    helpers, though every method here is a bespoke aggregate, not CRUD."""

    def __init__(self, db: Session) -> None:
        super().__init__(Admission, db)

    def _scoped_admissions(self, doctor_id: int | None) -> Select[tuple[Admission]]:
        stmt = select(Admission)
        if doctor_id is not None:
            stmt = stmt.join(Patient, Patient.id == Admission.patient_id).where(
                PatientRepository.scope_clause(doctor_id)
            )
        return stmt

    def admission_stats(self, doctor_id: int | None = None) -> tuple[int, int, float]:
        """Return (total patient count, admission count, average length of stay).

        The patient count is queried from patients directly rather than
        derived from admissions.patient_id, so a patient with zero admissions
        still counts as one of the hospital's patients.
        """
        patients_stmt = select(func.count()).select_from(Patient)
        if doctor_id is not None:
            patients_stmt = patients_stmt.where(PatientRepository.scope_clause(doctor_id))
        total_patients = self.db.execute(patients_stmt).scalar_one()

        admission_rows = self.db.execute(self._scoped_admissions(doctor_id)).scalars().all()
        total_admissions = len(admission_rows)
        stays = [row.time_in_hospital for row in admission_rows if row.time_in_hospital is not None]
        average_length_of_stay = sum(stays) / len(stays) if stays else 0.0
        return total_patients, total_admissions, average_length_of_stay

    def readmission_rate(self, doctor_id: int | None = None) -> float:
        """Fraction of scoped admissions whose readmitted label is not a "no" marker."""
        stmt = self._scoped_admissions(doctor_id)
        labels = [row.readmitted for row in self.db.execute(stmt).scalars().all()]
        if not labels:
            return 0.0
        readmitted = sum(1 for label in labels if label is not None and label not in NOT_READMITTED)
        return readmitted / len(labels)

    def readmission_trend(
        self, doctor_id: int | None = None, months: int = 12
    ) -> list[dict[str, Any]]:
        """Monthly readmission rate, most recent ``months`` months that have data.

        Bucketed in Python (year-month of admission_date) rather than with a
        dialect-specific function, so this behaves identically against SQLite
        (tests) and PostgreSQL (production).
        """
        stmt = self._scoped_admissions(doctor_id)
        buckets: dict[str, list[str | None]] = {}
        for row in self.db.execute(stmt).scalars().all():
            if row.admission_date is None:
                continue
            key = f"{row.admission_date.year:04d}-{row.admission_date.month:02d}"
            buckets.setdefault(key, []).append(row.readmitted)

        results = []
        for month in sorted(buckets)[-months:]:
            labels = buckets[month]
            readmitted = sum(
                1 for label in labels if label is not None and label not in NOT_READMITTED
            )
            results.append(
                {
                    "month": month,
                    "total_admissions": len(labels),
                    "readmission_rate": readmitted / len(labels) if labels else 0.0,
                }
            )
        return results

    def discharge_outcome_distribution(self, doctor_id: int | None = None) -> dict[str, int]:
        """Count of admissions per discharge_disposition value."""
        stmt = self._scoped_admissions(doctor_id)
        counts: Counter[str] = Counter()
        for row in self.db.execute(stmt).scalars().all():
            counts[row.discharge_disposition or "unknown"] += 1
        return dict(counts)

    def department_stats(
        self,
        doctor_id: int | None = None,
        date_from: date | None = None,
        date_to: date | None = None,
    ) -> list[dict[str, Any]]:
        """Per-department admission volume, distinct patients, average stay and
        readmission rate. Admissions with no department are grouped as
        "unassigned" rather than dropped, so totals still reconcile."""
        stmt = self._scoped_admissions(doctor_id)
        if date_from is not None:
            stmt = stmt.where(Admission.admission_date >= date_from)
        if date_to is not None:
            stmt = stmt.where(Admission.admission_date <= date_to)

        groups: dict[str, list[Admission]] = {}
        for row in self.db.execute(stmt).scalars().all():
            groups.setdefault(row.department or "unassigned", []).append(row)

        results = []
        for department, rows in groups.items():
            stays = [row.time_in_hospital for row in rows if row.time_in_hospital is not None]
            readmitted = sum(
                1
                for row in rows
                if row.readmitted is not None and row.readmitted not in NOT_READMITTED
            )
            results.append(
                {
                    "department": department,
                    "total_patients": len({row.patient_id for row in rows}),
                    "total_admissions": len(rows),
                    "average_length_of_stay": sum(stays) / len(stays) if stays else 0.0,
                    "readmission_rate": readmitted / len(rows),
                }
            )
        return results

    def total_patient_count(self) -> int:
        """Hospital-wide patient count - the research cohort-size guard's denominator."""
        return self.db.execute(select(func.count()).select_from(Patient)).scalar_one()

    def demographic_distribution(self) -> dict[str, dict[str, int]]:
        """Hospital-wide age_group/gender/race counts - never scoped to a
        doctor, since only Researcher/Hospital Administrator/System
        Administrator call this (aggregated-only access, no row-level data)."""
        rows = self.db.execute(select(Patient.age_group, Patient.gender, Patient.race)).all()
        age_group: Counter[str] = Counter()
        gender: Counter[str] = Counter()
        race: Counter[str] = Counter()
        for row_age, row_gender, row_race in rows:
            age_group[row_age or "unknown"] += 1
            gender[row_gender or "unknown"] += 1
            race[row_race or "unknown"] += 1
        return {"age_group": dict(age_group), "gender": dict(gender), "race": dict(race)}

    def disease_prevalence(self, limit: int = 10) -> list[tuple[str, int]]:
        """The ``limit`` most common primary_diagnosis values, hospital-wide."""
        stmt = (
            select(Patient.primary_diagnosis, func.count())
            .where(Patient.primary_diagnosis.is_not(None))
            .group_by(Patient.primary_diagnosis)
            .order_by(func.count().desc())
            .limit(limit)
        )
        return [(diagnosis, count) for diagnosis, count in self.db.execute(stmt).all()]
