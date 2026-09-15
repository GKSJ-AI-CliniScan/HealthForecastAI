"""Prediction and ModelVersion database repository."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import desc, func, select
from sqlalchemy.orm import Session

from app.models.doctor_patient_assignment import DoctorPatientAssignment
from app.models.patient import Patient
from app.models.prediction import ModelVersion, Prediction


class PredictionRepository:
    """Handles CRUD, filtering, pagination, and analytics for risk predictions."""

    def __init__(self, db: Session):
        self.db = db

    def create_prediction(self, prediction: Prediction) -> Prediction:
        """Persist a new risk prediction record."""
        self.db.add(prediction)
        self.db.commit()
        self.db.refresh(prediction)
        return prediction

    def get_by_id(self, prediction_id: uuid.UUID) -> Prediction | None:
        """Retrieve a prediction record by its UUID."""
        stmt = select(Prediction).where(Prediction.id == prediction_id)
        return self.db.execute(stmt).scalars().first()

    def get_latest_for_patient(self, patient_id: uuid.UUID) -> Prediction | None:
        """Retrieve the latest prediction for a specific patient."""
        stmt = (
            select(Prediction)
            .where(Prediction.patient_id == patient_id)
            .order_by(desc(Prediction.created_at))
            .limit(1)
        )
        return self.db.execute(stmt).scalars().first()

    def list_predictions(
        self,
        skip: int = 0,
        limit: int = 20,
        patient_id: uuid.UUID | None = None,
        risk_category: str | None = None,
        assigned_doctor_id: uuid.UUID | None = None,
        start_date: datetime | None = None,
        end_date: datetime | None = None,
    ) -> tuple[list[Prediction], int]:
        """List predictions with role scoping, category filter, date filtering, and pagination."""
        stmt = select(Prediction)

        if assigned_doctor_id is not None:
            # Doctor scoping: limit to patients assigned to this doctor
            stmt = stmt.join(
                DoctorPatientAssignment,
                DoctorPatientAssignment.patient_id == Prediction.patient_id,
            ).where(DoctorPatientAssignment.doctor_id == assigned_doctor_id)

        if patient_id is not None:
            stmt = stmt.where(Prediction.patient_id == patient_id)

        if risk_category is not None:
            stmt = stmt.where(Prediction.risk_category == risk_category.upper())

        if start_date is not None:
            stmt = stmt.where(Prediction.created_at >= start_date)

        if end_date is not None:
            stmt = stmt.where(Prediction.created_at <= end_date)

        # Count total matching
        count_stmt = select(func.count()).select_from(stmt.subquery())
        total = self.db.execute(count_stmt).scalar() or 0

        # Retrieve page ordered descending by creation date
        paged_stmt = stmt.order_by(desc(Prediction.created_at)).offset(skip).limit(limit)
        items = list(self.db.execute(paged_stmt).scalars().all())

        return items, total

    def list_high_risk_patients(
        self,
        skip: int = 0,
        limit: int = 20,
        assigned_doctor_id: uuid.UUID | None = None,
        category_filter: str | None = None,
    ) -> tuple[list[dict[str, Any]], int]:
        """Retrieve patients whose latest prediction is HIGH or CRITICAL."""
        # Subquery to get latest prediction ID per patient
        subquery = (
            select(
                Prediction.patient_id,
                func.max(Prediction.created_at).label("latest_created_at"),
            )
            .group_by(Prediction.patient_id)
            .subquery()
        )

        # Join to fetch the actual latest prediction records
        stmt = (
            select(Prediction, Patient)
            .join(Patient, Patient.id == Prediction.patient_id)
            .join(
                subquery,
                (Prediction.patient_id == subquery.c.patient_id)
                & (Prediction.created_at == subquery.c.latest_created_at),
            )
        )

        if assigned_doctor_id is not None:
            stmt = stmt.join(
                DoctorPatientAssignment,
                DoctorPatientAssignment.patient_id == Patient.id,
            ).where(DoctorPatientAssignment.doctor_id == assigned_doctor_id)

        if category_filter in ("HIGH", "CRITICAL"):
            stmt = stmt.where(Prediction.risk_category == category_filter)
        else:
            stmt = stmt.where(Prediction.risk_category.in_(["HIGH", "CRITICAL"]))

        count_stmt = select(func.count()).select_from(stmt.subquery())
        total = self.db.execute(count_stmt).scalar() or 0

        paged_stmt = (
            stmt.order_by(desc(Prediction.risk_score), desc(Prediction.created_at))
            .offset(skip)
            .limit(limit)
        )
        rows = self.db.execute(paged_stmt).all()

        results = []
        for pred, pat in rows:
            # Query assigned doctor name if any
            assignment = (
                self.db.execute(
                    select(DoctorPatientAssignment)
                    .where(DoctorPatientAssignment.patient_id == pat.id)
                    .limit(1)
                )
                .scalars()
                .first()
            )
            doc_name = None
            if assignment and assignment.doctor:
                doc_name = assignment.doctor.full_name

            results.append(
                {
                    "patient_id": pat.id,
                    "patient_identifier": pat.patient_identifier,
                    "patient_name": pat.full_name,
                    "gender": pat.gender,
                    "risk_score": pred.risk_score,
                    "risk_category": pred.risk_category,
                    "readmission_probability": pred.readmission_probability,
                    "latest_prediction_date": pred.created_at,
                    "assigned_doctor_name": doc_name,
                    "prediction_id": pred.id,
                }
            )

        return results, total

    # -------------------------------------------------------------
    # Analytics queries
    # -------------------------------------------------------------

    def get_risk_distribution(self) -> list[dict[str, Any]]:
        """Calculate count and percentage for each risk category."""
        total_stmt = select(func.count(Prediction.id))
        total = self.db.execute(total_stmt).scalar() or 0

        group_stmt = select(
            Prediction.risk_category, func.count(Prediction.id).label("count")
        ).group_by(Prediction.risk_category)
        rows = self.db.execute(group_stmt).all()
        counts = {row.risk_category: row.count for row in rows}

        categories = ["LOW", "MEDIUM", "HIGH", "CRITICAL"]
        distribution = []
        for cat in categories:
            c = counts.get(cat, 0)
            pct = round((c / total * 100), 2) if total > 0 else 0.0
            distribution.append(
                {
                    "category": cat,
                    "count": c,
                    "percentage": pct,
                }
            )
        return distribution

    def get_prediction_summary(self) -> dict[str, Any]:
        """Calculate high-level summary metrics from real database."""
        total = self.db.execute(select(func.count(Prediction.id))).scalar() or 0
        avg_prob = (
            self.db.execute(select(func.avg(Prediction.readmission_probability))).scalar() or 0.0
        )
        high_risk = (
            self.db.execute(
                select(func.count(Prediction.id)).where(Prediction.risk_category == "HIGH")
            ).scalar()
            or 0
        )
        critical = (
            self.db.execute(
                select(func.count(Prediction.id)).where(Prediction.risk_category == "CRITICAL")
            ).scalar()
            or 0
        )

        active_mv = self.get_active_model_version()
        active_name = active_mv.algorithm if active_mv else "Random Forest"
        active_ver = active_mv.version if active_mv else "v1.0"

        return {
            "total_predictions": total,
            "high_risk_patients": high_risk,
            "critical_patients": critical,
            "average_readmission_probability": round(float(avg_prob), 4),
            "active_model": active_name,
            "active_version": active_ver,
        }

    # -------------------------------------------------------------
    # Model Versions
    # -------------------------------------------------------------

    def get_active_model_version(self) -> ModelVersion | None:
        """Fetch the currently active registered model version."""
        stmt = (
            select(ModelVersion)
            .where(ModelVersion.is_active.is_(True))
            .order_by(desc(ModelVersion.created_at))
            .limit(1)
        )
        return self.db.execute(stmt).scalars().first()

    def register_model_version(self, mv: ModelVersion) -> ModelVersion:
        """Register a new model version. Deactivates existing active models if is_active is True."""
        if mv.is_active:
            # Set all existing model versions to is_active=False
            existing = (
                self.db.execute(select(ModelVersion).where(ModelVersion.is_active.is_(True)))
                .scalars()
                .all()
            )
            for old in existing:
                old.is_active = False

        self.db.add(mv)
        self.db.commit()
        self.db.refresh(mv)
        return mv
