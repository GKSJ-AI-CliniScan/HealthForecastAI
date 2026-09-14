"""Data access for stored risk predictions.

Every read here is narrowed by PatientRepository.scope_clause rather than by a
locally written doctor filter. Reusing that one predicate is what keeps report
scope identical to patient scope: a doctor who may read a patient may read that
patient's risk, including patients granted through doctor_patient_map.
"""

from sqlalchemy import Select, func, select
from sqlalchemy.orm import Session

from app.models.patient import Patient
from app.models.prediction import RiskPrediction
from app.repositories.base import BaseRepository
from app.repositories.patient_repository import PatientRepository


class RiskRepository(BaseRepository[RiskPrediction]):
    """Queries the reporting endpoints depend on."""

    def __init__(self, db: Session) -> None:
        super().__init__(RiskPrediction, db)

    @staticmethod
    def _latest_ids_subquery():
        """Return a subquery of each patient's most recent prediction timestamp."""
        return (
            select(
                RiskPrediction.patient_id.label("patient_id"),
                func.max(RiskPrediction.created_at).label("latest"),
            )
            .group_by(RiskPrediction.patient_id)
            .subquery()
        )

    def _latest_scoped(self, doctor_id: int | None) -> Select[tuple[RiskPrediction]]:
        """Return a select of the latest prediction per patient, within scope."""
        latest = self._latest_ids_subquery()
        stmt = select(RiskPrediction).join(
            latest,
            (RiskPrediction.patient_id == latest.c.patient_id)
            & (RiskPrediction.created_at == latest.c.latest),
        )
        if doctor_id is not None:
            stmt = stmt.join(Patient, Patient.id == RiskPrediction.patient_id).where(
                PatientRepository.scope_clause(doctor_id)
            )
        return stmt

    def latest_for_patient(self, patient_id: int) -> RiskPrediction | None:
        """Return one patient's most recent prediction, or None if never scored.

        Scope is not applied here: callers resolve the patient through
        PatientService first, which already refuses an out of scope record.
        """
        stmt = (
            select(RiskPrediction)
            .where(RiskPrediction.patient_id == patient_id)
            .order_by(RiskPrediction.created_at.desc(), RiskPrediction.id.desc())
            .limit(1)
        )
        return self.db.execute(stmt).scalars().first()

    def list_latest(self, doctor_id: int | None = None) -> list[RiskPrediction]:
        """Return the latest prediction for every patient the caller may see."""
        stmt = self._latest_scoped(doctor_id).order_by(
            RiskPrediction.readmission_probability.desc()
        )
        return list(self.db.execute(stmt).scalars().all())

    def list_latest_by_category(
        self, category: str, doctor_id: int | None = None
    ) -> list[RiskPrediction]:
        """Return the latest prediction per patient, filtered to one risk band.

        Scope is applied before the band filter, so a doctor asking for the high
        risk cohort receives their own patients only - including patients granted
        through doctor_patient_map, because the narrowing comes from
        PatientRepository.scope_clause rather than a local doctor filter.
        """
        stmt = (
            self._latest_scoped(doctor_id)
            .where(RiskPrediction.risk_category == category)
            .order_by(RiskPrediction.readmission_probability.desc())
        )
        return list(self.db.execute(stmt).scalars().all())

    def count_scored_patients(self, doctor_id: int | None = None) -> int:
        """Return how many distinct patients have at least one prediction in scope."""
        inner = self._latest_scoped(doctor_id).subquery()
        return self.db.execute(select(func.count()).select_from(inner)).scalar_one()
