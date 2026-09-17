"""Medication Analytics & Management Service."""

from __future__ import annotations

import uuid

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.medication import Medication
from app.models.user import User
from app.repositories.assignment_repository import AssignmentRepository
from app.repositories.medication_repository import MedicationRepository
from app.repositories.patient_repository import PatientRepository
from app.schemas.analytics import (
    MedicationAnalyticsResponse,
    MedicationSummaryItem,
)
from app.schemas.medication import (
    MedicationCreate,
    MedicationResponse,
    MedicationUpdate,
)
from app.services.audit_service import AuditService


class MedicationService:
    """Service managing medication prescriptions, status, and therapeutic outcomes."""

    def __init__(self, db: Session):
        self.db = db
        self.repo = MedicationRepository(db)
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

    def get_medication_analytics(self) -> MedicationAnalyticsResponse:
        """Calculate hospital-wide medication outcome metrics and breakdown."""
        medications = self.repo.get_all()

        total = len(medications)
        active = sum(1 for m in medications if m.status == "ACTIVE")
        completed = sum(1 for m in medications if m.status == "COMPLETED")

        scores = [m.effectiveness_score for m in medications if m.effectiveness_score is not None]
        avg_score = round(sum(scores) / len(scores), 2) if scores else None

        outcome_dist: dict[str, int] = {
            "IMPROVED": 0,
            "STABLE": 0,
            "NO_CHANGE": 0,
            "ADVERSE_EFFECT": 0,
            "DISCONTINUED": 0,
            "UNKNOWN": 0,
        }
        for m in medications:
            raw_out = (m.outcome or "UNKNOWN").upper()
            outcome_dist[raw_out] = outcome_dist.get(raw_out, 0) + 1

        # Breakdown by medication name
        grouped: dict[str, list[Medication]] = {}
        for m in medications:
            name = m.medication_name.strip()
            grouped.setdefault(name, []).append(m)

        breakdown: list[MedicationSummaryItem] = []
        for name, items in grouped.items():
            patients = len({m.patient_id for m in items})
            act_cnt = sum(1 for m in items if m.status == "ACTIVE")
            comp_cnt = sum(1 for m in items if m.status == "COMPLETED")
            item_scores = [
                m.effectiveness_score for m in items if m.effectiveness_score is not None
            ]
            item_avg = round(sum(item_scores) / len(item_scores), 2) if item_scores else None
            out_d: dict[str, int] = {}
            for m in items:
                k = (m.outcome or "UNKNOWN").upper()
                out_d[k] = out_d.get(k, 0) + 1

            breakdown.append(
                MedicationSummaryItem(
                    medication_name=name,
                    total_patients=patients,
                    active_count=act_cnt,
                    completed_count=comp_cnt,
                    avg_effectiveness=item_avg,
                    outcome_distribution=out_d,
                )
            )

        return MedicationAnalyticsResponse(
            total_medications=total,
            active_medications=active,
            completed_medications=completed,
            average_effectiveness=avg_score,
            outcome_distribution=outcome_dist,
            medication_breakdown=breakdown,
        )

    def get_patient_medications(
        self, patient_id: uuid.UUID, current_user: User
    ) -> list[MedicationResponse]:
        """List medications prescribed to a patient."""
        if current_user.role == "DOCTOR":
            self._verify_doctor_access(current_user.id, patient_id)

        records = self.repo.get_by_patient_id(patient_id)
        return [MedicationResponse.model_validate(r) for r in records]

    def create_medication(
        self, patient_id: uuid.UUID, payload: MedicationCreate, current_user: User
    ) -> MedicationResponse:
        """Prescribe/record medication for a patient."""
        if not self.patient_repo.get_by_id(patient_id):
            raise HTTPException(status_code=404, detail="Patient not found")

        if current_user.role == "DOCTOR":
            self._verify_doctor_access(current_user.id, patient_id)

        med = Medication(
            id=uuid.uuid4(),
            patient_id=patient_id,
            medication_name=payload.medication_name,
            dosage=payload.dosage,
            frequency=payload.frequency,
            start_date=payload.start_date,
            end_date=payload.end_date,
            status=payload.status,
            effectiveness_score=payload.effectiveness_score,
            outcome=payload.outcome,
            notes=payload.notes,
        )
        created = self.repo.create(med)

        self.audit_service.log_action(
            action="MEDICATION_CREATE",
            resource="MEDICATION",
            resource_id=str(created.id),
            user_id=current_user.id,
        )

        return MedicationResponse.model_validate(created)

    def update_medication(
        self, med_id: uuid.UUID, payload: MedicationUpdate, current_user: User
    ) -> MedicationResponse:
        """Update medication prescription or outcome."""
        med = self.repo.get_by_id(med_id)
        if not med:
            raise HTTPException(status_code=404, detail="Medication record not found")

        if current_user.role == "DOCTOR":
            self._verify_doctor_access(current_user.id, med.patient_id)

        if payload.medication_name is not None:
            med.medication_name = payload.medication_name
        if payload.dosage is not None:
            med.dosage = payload.dosage
        if payload.frequency is not None:
            med.frequency = payload.frequency
        if payload.start_date is not None:
            med.start_date = payload.start_date
        if payload.end_date is not None:
            med.end_date = payload.end_date
        if payload.status is not None:
            med.status = payload.status
        if payload.effectiveness_score is not None:
            med.effectiveness_score = payload.effectiveness_score
        if payload.outcome is not None:
            med.outcome = payload.outcome
        if payload.notes is not None:
            med.notes = payload.notes

        updated = self.repo.update(med)

        self.audit_service.log_action(
            action="MEDICATION_UPDATE",
            resource="MEDICATION",
            resource_id=str(med_id),
            user_id=current_user.id,
        )

        return MedicationResponse.model_validate(updated)

    def delete_medication(self, med_id: uuid.UUID, current_user: User) -> None:
        """Delete medication record."""
        med = self.repo.get_by_id(med_id)
        if not med:
            raise HTTPException(status_code=404, detail="Medication record not found")

        if current_user.role == "DOCTOR":
            self._verify_doctor_access(current_user.id, med.patient_id)

        self.repo.delete(med_id)

        self.audit_service.log_action(
            action="MEDICATION_DELETE",
            resource="MEDICATION",
            resource_id=str(med_id),
            user_id=current_user.id,
        )
