"""Treatment Effectiveness Analysis Service."""

from __future__ import annotations

import uuid
from datetime import date

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.admission import Admission
from app.models.patient import Patient
from app.models.treatment import Treatment
from app.models.user import User
from app.repositories.assignment_repository import AssignmentRepository
from app.schemas.analytics import (
    TreatmentAnalyticsResponse,
    TreatmentTypeDistribution,
)
from app.schemas.treatment import (
    PatientTreatmentAnalysisResponse,
    PatientTreatmentItem,
    PatientTreatmentSummary,
)
from app.services.audit_service import AuditService


class TreatmentEffectivenessService:
    """Service evaluating treatment outcomes, completion rates, and effectiveness scoring."""

    def __init__(self, db: Session):
        self.db = db
        self.assignment_repo = AssignmentRepository(db)
        self.audit_service = AuditService(db)

    def _verify_doctor_access(self, doctor_id: uuid.UUID, patient_id: uuid.UUID) -> None:
        """Verify doctor has patient assigned."""
        if not self.assignment_repo.get_assignment(doctor_id, patient_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: Doctor is not assigned to this patient",
            )

    def get_treatment_analytics(
        self,
        start_date: date | None = None,
        end_date: date | None = None,
        department: str | None = None,
        treatment_type: str | None = None,
        outcome: str | None = None,
        current_user: User | None = None,
    ) -> TreatmentAnalyticsResponse:
        """Calculate hospital or scoped treatment analytics directly from PostgreSQL/SQLAlchemy."""
        query = select(Treatment)

        if start_date:
            query = query.where(Treatment.start_date >= start_date)
        if end_date:
            query = query.where(Treatment.start_date <= end_date)
        if treatment_type:
            query = query.where(Treatment.treatment_type.ilike(f"%{treatment_type}%"))
        if outcome:
            query = query.where(Treatment.outcome == outcome)

        # Department filtering joins through patient admissions if requested
        if department:
            query = (
                query.join(Patient, Treatment.patient_id == Patient.id)
                .join(Admission, Admission.patient_id == Patient.id)
                .where(Admission.department.ilike(f"%{department}%"))
                .distinct()
            )

        treatments = list(self.db.scalars(query).all())

        total = len(treatments)
        completed = sum(1 for t in treatments if t.status == "COMPLETED")

        # Distribution of outcomes
        outcome_distribution: dict[str, int] = {
            "IMPROVED": 0,
            "STABLE": 0,
            "NO_CHANGE": 0,
            "WORSENED": 0,
            "COMPLETED": 0,
            "DISCONTINUED": 0,
            "UNKNOWN": 0,
        }
        for t in treatments:
            raw_out = (t.outcome or "UNKNOWN").upper()
            if raw_out in outcome_distribution:
                outcome_distribution[raw_out] += 1
            else:
                outcome_distribution[raw_out] = outcome_distribution.get(raw_out, 0) + 1

        # Average effectiveness score (ignore None values; DO NOT convert None to 0%)
        scores = [t.effectiveness_score for t in treatments if t.effectiveness_score is not None]
        avg_score = round(sum(scores) / len(scores), 2) if scores else None

        # Evaluated treatments for effectiveness rate (exclude UNKNOWN / None outcomes)
        evaluated = sum(
            1 for t in treatments if t.outcome and t.outcome.upper() not in ("UNKNOWN", "")
        )
        successful_or_improved = outcome_distribution.get("IMPROVED", 0) + outcome_distribution.get(
            "STABLE", 0
        )
        eff_rate = round((successful_or_improved / evaluated) * 100, 2) if evaluated > 0 else None

        # Type distribution
        type_counts: dict[str, list[float]] = {}
        for t in treatments:
            t_type = t.treatment_type or "General Therapy"
            if t_type not in type_counts:
                type_counts[t_type] = []
            if t.effectiveness_score is not None:
                type_counts[t_type].append(t.effectiveness_score)

        type_dist: list[TreatmentTypeDistribution] = []
        for t_type, sc_list in type_counts.items():
            type_total = sum(
                1 for t in treatments if (t.treatment_type or "General Therapy") == t_type
            )
            type_avg = round(sum(sc_list) / len(sc_list), 2) if sc_list else None
            type_dist.append(
                TreatmentTypeDistribution(
                    treatment_type=t_type,
                    count=type_total,
                    avg_effectiveness=type_avg,
                )
            )

        # Status distribution
        status_dist: dict[str, int] = {}
        for t in treatments:
            st = (t.status or "ACTIVE").upper()
            status_dist[st] = status_dist.get(st, 0) + 1

        return TreatmentAnalyticsResponse(
            total_treatments=total,
            completed_treatments=completed,
            average_effectiveness=avg_score,
            effectiveness_rate=eff_rate,
            outcome_distribution=outcome_distribution,
            type_distribution=type_dist,
            status_distribution=status_dist,
        )

    def get_patient_treatment_analysis(
        self, patient_id: uuid.UUID, current_user: User
    ) -> PatientTreatmentAnalysisResponse:
        """Retrieve patient treatment history with duration, status, outcome, and effectiveness."""
        if current_user.role == "DOCTOR":
            self._verify_doctor_access(current_user.id, patient_id)

        treatments = list(
            self.db.scalars(
                select(Treatment)
                .where(Treatment.patient_id == patient_id)
                .order_by(Treatment.start_date.desc())
            ).all()
        )

        items: list[PatientTreatmentItem] = []
        for t in treatments:
            duration = (t.end_date - t.start_date).days if t.end_date and t.start_date else None
            items.append(
                PatientTreatmentItem(
                    id=t.id,
                    treatment_name=t.treatment_name,
                    treatment_type=t.treatment_type,
                    start_date=t.start_date,
                    end_date=t.end_date,
                    duration_days=duration,
                    status=t.status,
                    outcome=t.outcome,
                    effectiveness_score=t.effectiveness_score,
                    notes=t.notes,
                )
            )

        total = len(treatments)
        completed = sum(1 for t in treatments if t.status == "COMPLETED")
        scores = [t.effectiveness_score for t in treatments if t.effectiveness_score is not None]
        avg_score = round(sum(scores) / len(scores), 2) if scores else None

        self.audit_service.log_action(
            action="TREATMENT_ANALYSIS_VIEW",
            resource="PATIENT_TREATMENT_ANALYSIS",
            resource_id=str(patient_id),
            user_id=current_user.id,
        )

        return PatientTreatmentAnalysisResponse(
            patient_id=patient_id,
            treatments=items,
            summary=PatientTreatmentSummary(
                total_treatments=total,
                completed=completed,
                average_effectiveness=avg_score,
            ),
        )
