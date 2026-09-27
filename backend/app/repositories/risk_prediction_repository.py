"""Data access for risk scores and readmission forecasts."""

from typing import Any

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.patient import Patient
from app.models.prediction import RiskPrediction
from app.repositories.base import BaseRepository
from app.repositories.patient_repository import PatientRepository


class RiskPredictionRepository(BaseRepository[RiskPrediction]):
    """Queries the risk and readmission prediction endpoints depend on."""

    def __init__(self, db: Session) -> None:
        super().__init__(RiskPrediction, db)

    def latest_for_patient(
        self, patient_id: int, prediction_type: str = "risk"
    ) -> RiskPrediction | None:
        """Return the most recent prediction of one type for a patient."""
        stmt = (
            select(RiskPrediction)
            .where(
                RiskPrediction.patient_id == patient_id,
                RiskPrediction.prediction_type == prediction_type,
            )
            .order_by(RiskPrediction.created_at.desc(), RiskPrediction.id.desc())
            .limit(1)
        )
        return self.db.execute(stmt).scalars().first()

    def history_for_patient(
        self, patient_id: int, prediction_type: str = "risk", limit: int = 50
    ) -> list[RiskPrediction]:
        """Return a patient's prediction history of one type, newest first."""
        stmt = (
            select(RiskPrediction)
            .where(
                RiskPrediction.patient_id == patient_id,
                RiskPrediction.prediction_type == prediction_type,
            )
            .order_by(RiskPrediction.created_at.desc(), RiskPrediction.id.desc())
            .limit(limit)
        )
        return list(self.db.execute(stmt).scalars().all())

    def list_high_risk(
        self,
        prediction_type: str = "risk",
        doctor_id: int | None = None,
        limit: int = 100,
    ) -> list[RiskPrediction]:
        """Return the current high-risk cohort: each patient's latest prediction
        of one type, filtered to risk_category = 'high'.

        "Latest" is approximated by the highest id per patient rather than a
        correlated MAX(created_at) subquery - safe here because rows are only
        ever appended, in the same session clock, so id order and created_at
        order agree, and it avoids a second timestamp tie-break.
        """
        latest_ids = (
            select(func.max(RiskPrediction.id))
            .where(RiskPrediction.prediction_type == prediction_type)
            .group_by(RiskPrediction.patient_id)
        )
        stmt = select(RiskPrediction).where(
            RiskPrediction.id.in_(latest_ids), RiskPrediction.risk_category == "high"
        )
        if doctor_id is not None:
            stmt = stmt.join(Patient, Patient.id == RiskPrediction.patient_id).where(
                PatientRepository.scope_clause(doctor_id)
            )
        stmt = stmt.order_by(RiskPrediction.created_at.desc()).limit(limit)
        return list(self.db.execute(stmt).scalars().all())

    def readmission_forecast_summary(self, doctor_id: int | None = None) -> tuple[int, int]:
        """Return (predicted_readmissions, total) among each patient's latest
        readmission forecast, using a 0.5 decision threshold on the stored
        probability. Scoped the same way list_high_risk is."""
        latest_ids = (
            select(func.max(RiskPrediction.id))
            .where(RiskPrediction.prediction_type == "readmission")
            .group_by(RiskPrediction.patient_id)
        )
        stmt = select(RiskPrediction).where(RiskPrediction.id.in_(latest_ids))
        if doctor_id is not None:
            stmt = stmt.join(Patient, Patient.id == RiskPrediction.patient_id).where(
                PatientRepository.scope_clause(doctor_id)
            )
        rows = list(self.db.execute(stmt).scalars().all())
        total = len(rows)
        predicted = sum(1 for row in rows if row.readmission_probability >= 0.5)
        return predicted, total

    def risk_category_distribution(self, doctor_id: int | None = None) -> dict[str, int]:
        """Return {"low": n, "medium": n, "high": n} across each patient's
        latest risk score - the Healthcare Analytics Dashboard's risk
        distribution widget (Milestone 3)."""
        latest_ids = (
            select(func.max(RiskPrediction.id))
            .where(RiskPrediction.prediction_type == "risk")
            .group_by(RiskPrediction.patient_id)
        )
        stmt = select(RiskPrediction.risk_category, func.count()).where(
            RiskPrediction.id.in_(latest_ids)
        )
        if doctor_id is not None:
            stmt = stmt.join(Patient, Patient.id == RiskPrediction.patient_id).where(
                PatientRepository.scope_clause(doctor_id)
            )
        stmt = stmt.group_by(RiskPrediction.risk_category)

        distribution = {"low": 0, "medium": 0, "high": 0}
        for category, count in self.db.execute(stmt).all():
            distribution[category] = count
        return distribution

    def risk_category_trend(
        self, months: int = 12, doctor_id: int | None = None
    ) -> list[dict[str, Any]]:
        """Monthly count of risk scores issued per category, most recent
        ``months`` with data. Every score counts (not only each patient's
        latest), since the trend is about scoring activity over time.
        Bucketed in Python for SQLite/PostgreSQL parity."""
        stmt = select(RiskPrediction.created_at, RiskPrediction.risk_category).where(
            RiskPrediction.prediction_type == "risk"
        )
        if doctor_id is not None:
            stmt = stmt.join(Patient, Patient.id == RiskPrediction.patient_id).where(
                PatientRepository.scope_clause(doctor_id)
            )
        buckets: dict[str, dict[str, int]] = {}
        for created_at, category in self.db.execute(stmt).all():
            key = f"{created_at.year:04d}-{created_at.month:02d}"
            breakdown = buckets.setdefault(key, {"low": 0, "medium": 0, "high": 0})
            breakdown[category] = breakdown.get(category, 0) + 1
        return [
            {"period": key, "total": sum(buckets[key].values()), "breakdown": buckets[key]}
            for key in sorted(buckets)[-months:]
        ]
