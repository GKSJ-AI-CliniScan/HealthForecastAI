"""Recovery Analysis & Patient Outcome Service."""

from __future__ import annotations

import uuid

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.admission import Admission
from app.models.patient_outcome import PatientOutcome
from app.models.treatment import Treatment
from app.models.user import User
from app.repositories.assignment_repository import AssignmentRepository
from app.repositories.patient_outcome_repository import PatientOutcomeRepository
from app.repositories.patient_repository import PatientRepository
from app.schemas.analytics import (
    PatientRecoveryResponse,
    RecoveryTimelineEvent,
)
from app.schemas.patient_outcome import (
    PatientOutcomeCreate,
    PatientOutcomeResponse,
)
from app.services.audit_service import AuditService


class RecoveryService:
    """Service tracking patient clinical recovery flow, stay duration, and progression."""

    def __init__(self, db: Session):
        self.db = db
        self.outcome_repo = PatientOutcomeRepository(db)
        self.patient_repo = PatientRepository(db)
        self.assignment_repo = AssignmentRepository(db)
        self.audit_service = AuditService(db)

    def _verify_doctor_access(self, doctor_id: uuid.UUID, patient_id: uuid.UUID) -> None:
        """Verify doctor has patient assigned."""
        if not self.assignment_repo.get_assignment(doctor_id, patient_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: Doctor is not assigned to this patient",
            )

    def get_patient_recovery(
        self, patient_id: uuid.UUID, current_user: User
    ) -> PatientRecoveryResponse:
        """Compute chronological recovery flow from admissions, treatments, and recorded outcomes."""
        if current_user.role == "DOCTOR":
            self._verify_doctor_access(current_user.id, patient_id)

        patient = self.patient_repo.get_by_id(patient_id)
        if not patient:
            raise HTTPException(status_code=404, detail="Patient not found")

        admissions = list(
            self.db.scalars(
                select(Admission)
                .where(Admission.patient_id == patient_id)
                .order_by(Admission.admission_date.asc())
            ).all()
        )
        treatments = list(
            self.db.scalars(
                select(Treatment)
                .where(Treatment.patient_id == patient_id)
                .order_by(Treatment.start_date.asc())
            ).all()
        )
        outcomes = self.outcome_repo.get_by_patient_id(patient_id)

        events: list[RecoveryTimelineEvent] = []

        # 1. Admission and Discharge events
        for adm in admissions:
            events.append(
                RecoveryTimelineEvent(
                    event_type="ADMISSION",
                    event_date=adm.admission_date,
                    title=f"Hospital Admission - {adm.department or 'General'}",
                    status=adm.admission_type or "Standard",
                    details={
                        "admission_id": str(adm.id),
                        "diagnosis": adm.primary_diagnosis,
                        "department": adm.department,
                    },
                )
            )
            if adm.discharge_date:
                events.append(
                    RecoveryTimelineEvent(
                        event_type="DISCHARGE",
                        event_date=adm.discharge_date,
                        title="Hospital Discharge",
                        status=adm.discharge_disposition or "Discharged",
                        details={
                            "admission_id": str(adm.id),
                            "length_of_stay": adm.length_of_stay,
                            "disposition": adm.discharge_disposition,
                        },
                    )
                )

        # 2. Treatment start and completion/outcome events
        for tx in treatments:
            events.append(
                RecoveryTimelineEvent(
                    event_type="TREATMENT",
                    event_date=tx.start_date,
                    title=f"Treatment Commenced: {tx.treatment_name}",
                    status=tx.status,
                    details={
                        "treatment_id": str(tx.id),
                        "type": tx.treatment_type,
                        "notes": tx.notes,
                    },
                )
            )
            if tx.end_date:
                events.append(
                    RecoveryTimelineEvent(
                        event_type="TREATMENT_OUTCOME",
                        event_date=tx.end_date,
                        title=f"Treatment Concluded: {tx.treatment_name}",
                        status=tx.outcome or tx.status,
                        score=tx.effectiveness_score,
                        details={
                            "treatment_id": str(tx.id),
                            "outcome": tx.outcome,
                            "effectiveness_score": tx.effectiveness_score,
                        },
                    )
                )

        # 3. Patient clinical outcomes recorded
        for out in outcomes:
            events.append(
                RecoveryTimelineEvent(
                    event_type="OUTCOME",
                    event_date=out.recorded_date,
                    title=f"Recovery Evaluation: {out.outcome_status}",
                    status=out.outcome_status,
                    score=out.outcome_score,
                    details={
                        "outcome_id": str(out.id),
                        "admission_id": str(out.admission_id) if out.admission_id else None,
                        "notes": out.notes,
                    },
                )
            )

        # Chronological sorting by event_date
        events.sort(key=lambda e: e.event_date)

        # Calculations
        los_values = [a.length_of_stay for a in admissions if a.length_of_stay is not None]
        avg_los = round(sum(los_values) / len(los_values), 1) if los_values else None

        latest_outcome = outcomes[-1] if outcomes else None
        recovery_status = latest_outcome.outcome_status if latest_outcome else None
        latest_score = latest_outcome.outcome_score if latest_outcome else None

        progression = [
            {
                "date": str(o.recorded_date),
                "status": o.outcome_status,
                "score": o.outcome_score,
                "notes": o.notes,
            }
            for o in outcomes
        ]

        return PatientRecoveryResponse(
            patient_id=patient_id,
            timeline=events,
            average_length_of_stay=avg_los,
            total_admissions=len(admissions),
            total_treatments=len(treatments),
            recovery_status=recovery_status,
            latest_outcome_score=latest_score,
            outcome_progression=progression,
        )

    def get_patient_outcomes(
        self, patient_id: uuid.UUID, current_user: User
    ) -> list[PatientOutcomeResponse]:
        """List patient outcome records."""
        if current_user.role == "DOCTOR":
            self._verify_doctor_access(current_user.id, patient_id)

        records = self.outcome_repo.get_by_patient_id(patient_id)
        return [PatientOutcomeResponse.model_validate(r) for r in records]

    def create_patient_outcome(
        self, patient_id: uuid.UUID, payload: PatientOutcomeCreate, current_user: User
    ) -> PatientOutcomeResponse:
        """Record a clinical recovery evaluation or outcome."""
        if not self.patient_repo.get_by_id(patient_id):
            raise HTTPException(status_code=404, detail="Patient not found")

        if current_user.role == "DOCTOR":
            self._verify_doctor_access(current_user.id, patient_id)

        outcome = PatientOutcome(
            id=uuid.uuid4(),
            patient_id=patient_id,
            admission_id=payload.admission_id,
            outcome_status=payload.outcome_status,
            outcome_score=payload.outcome_score,
            recorded_date=payload.recorded_date,
            notes=payload.notes,
        )
        created = self.outcome_repo.create(outcome)

        self.audit_service.log_action(
            action="PATIENT_OUTCOME_CREATE",
            resource="PATIENT_OUTCOME",
            resource_id=str(created.id),
            user_id=current_user.id,
        )

        return PatientOutcomeResponse.model_validate(created)
