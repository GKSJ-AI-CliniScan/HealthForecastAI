"""Medical History Service."""

import uuid
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.medical_history import MedicalHistory
from app.models.user import User
from app.repositories.medical_history_repository import MedicalHistoryRepository
from app.repositories.patient_repository import PatientRepository
from app.repositories.assignment_repository import AssignmentRepository
from app.schemas.medical_history import (
    MedicalHistoryCreate,
    MedicalHistoryResponse,
    MedicalHistoryUpdate,
)
from app.services.audit_service import AuditService


class MedicalHistoryService:
    """Service managing patient medical history records."""

    def __init__(self, db: Session):
        self.db = db
        self.repo = MedicalHistoryRepository(db)
        self.patient_repo = PatientRepository(db)
        self.assignment_repo = AssignmentRepository(db)
        self.audit_service = AuditService(db)

    def _verify_doctor_access(self, doctor_id: uuid.UUID, patient_id: uuid.UUID):
        """Verify doctor has patient assigned."""
        if not self.assignment_repo.get_assignment(doctor_id, patient_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: Doctor is not assigned to this patient",
            )

    def get_patient_medical_history(
        self, patient_id: uuid.UUID, current_user: User
    ) -> list[MedicalHistoryResponse]:
        """Get medical histories for a patient."""
        if current_user.role == "DOCTOR":
            self._verify_doctor_access(current_user.id, patient_id)

        records = self.repo.get_by_patient_id(patient_id)
        return [
            MedicalHistoryResponse(
                id=r.id,
                patient_id=r.patient_id,
                diagnosis=r.diagnosis,
                chronic_conditions=r.chronic_conditions,
                allergies=r.allergies,
                medical_notes=r.medical_notes,
                created_at=r.created_at,
                updated_at=r.updated_at,
            )
            for r in records
        ]

    def create_medical_history(
        self, patient_id: uuid.UUID, payload: MedicalHistoryCreate, current_user: User
    ) -> MedicalHistoryResponse:
        """Create medical history entry."""
        if not self.patient_repo.get_by_id(patient_id):
            raise HTTPException(status_code=404, detail="Patient not found")

        if current_user.role == "DOCTOR":
            self._verify_doctor_access(current_user.id, patient_id)

        history = MedicalHistory(
            id=uuid.uuid4(),
            patient_id=patient_id,
            diagnosis=payload.diagnosis,
            chronic_conditions=payload.chronic_conditions,
            allergies=payload.allergies,
            medical_notes=payload.medical_notes,
        )
        created = self.repo.create(history)

        self.audit_service.log_action(
            action="MEDICAL_HISTORY_CREATE",
            resource="MEDICAL_HISTORY",
            resource_id=str(created.id),
            user_id=current_user.id,
        )

        return MedicalHistoryResponse(
            id=created.id,
            patient_id=created.patient_id,
            diagnosis=created.diagnosis,
            chronic_conditions=created.chronic_conditions,
            allergies=created.allergies,
            medical_notes=created.medical_notes,
            created_at=created.created_at,
            updated_at=created.updated_at,
        )

    def update_medical_history(
        self, history_id: uuid.UUID, payload: MedicalHistoryUpdate, current_user: User
    ) -> MedicalHistoryResponse:
        """Update medical history entry."""
        history = self.repo.get_by_id(history_id)
        if not history:
            raise HTTPException(status_code=404, detail="Medical history record not found")

        if current_user.role == "DOCTOR":
            self._verify_doctor_access(current_user.id, history.patient_id)

        if payload.diagnosis is not None:
            history.diagnosis = payload.diagnosis
        if payload.chronic_conditions is not None:
            history.chronic_conditions = payload.chronic_conditions
        if payload.allergies is not None:
            history.allergies = payload.allergies
        if payload.medical_notes is not None:
            history.medical_notes = payload.medical_notes

        updated = self.repo.update(history)

        self.audit_service.log_action(
            action="MEDICAL_HISTORY_UPDATE",
            resource="MEDICAL_HISTORY",
            resource_id=str(history_id),
            user_id=current_user.id,
        )

        return MedicalHistoryResponse(
            id=updated.id,
            patient_id=updated.patient_id,
            diagnosis=updated.diagnosis,
            chronic_conditions=updated.chronic_conditions,
            allergies=updated.allergies,
            medical_notes=updated.medical_notes,
            created_at=updated.created_at,
            updated_at=updated.updated_at,
        )

    def delete_medical_history(self, history_id: uuid.UUID, current_user: User) -> bool:
        """Delete medical history record (Admin)."""
        history = self.repo.get_by_id(history_id)
        if not history:
            raise HTTPException(status_code=404, detail="Medical history record not found")

        self.repo.delete(history_id)

        self.audit_service.log_action(
            action="MEDICAL_HISTORY_DELETE",
            resource="MEDICAL_HISTORY",
            resource_id=str(history_id),
            user_id=current_user.id,
        )
        return True
