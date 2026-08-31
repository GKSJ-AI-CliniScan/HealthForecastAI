"""Treatment Service."""

import uuid
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.treatment import Treatment
from app.models.user import User
from app.repositories.treatment_repository import TreatmentRepository
from app.repositories.patient_repository import PatientRepository
from app.repositories.assignment_repository import AssignmentRepository
from app.schemas.treatment import (
    TreatmentCreate,
    TreatmentResponse,
    TreatmentUpdate,
)
from app.services.audit_service import AuditService


class TreatmentService:
    """Service managing clinical treatments and therapies."""

    def __init__(self, db: Session):
        self.db = db
        self.repo = TreatmentRepository(db)
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

    def get_patient_treatments(
        self, patient_id: uuid.UUID, current_user: User
    ) -> list[TreatmentResponse]:
        """Get treatments for a patient."""
        if current_user.role == "DOCTOR":
            self._verify_doctor_access(current_user.id, patient_id)

        records = self.repo.get_by_patient_id(patient_id)
        return [
            TreatmentResponse(
                id=r.id,
                patient_id=r.patient_id,
                treatment_name=r.treatment_name,
                treatment_type=r.treatment_type,
                start_date=r.start_date,
                end_date=r.end_date,
                status=r.status,
                notes=r.notes,
                created_at=r.created_at,
                updated_at=r.updated_at,
            )
            for r in records
        ]

    def create_treatment(
        self, patient_id: uuid.UUID, payload: TreatmentCreate, current_user: User
    ) -> TreatmentResponse:
        """Create treatment record."""
        if not self.patient_repo.get_by_id(patient_id):
            raise HTTPException(status_code=404, detail="Patient not found")

        if current_user.role == "DOCTOR":
            self._verify_doctor_access(current_user.id, patient_id)

        treatment = Treatment(
            id=uuid.uuid4(),
            patient_id=patient_id,
            treatment_name=payload.treatment_name,
            treatment_type=payload.treatment_type,
            start_date=payload.start_date,
            end_date=payload.end_date,
            status=payload.status,
            notes=payload.notes,
        )
        created = self.repo.create(treatment)

        self.audit_service.log_action(
            action="TREATMENT_CREATE",
            resource="TREATMENT",
            resource_id=str(created.id),
            user_id=current_user.id,
        )

        return TreatmentResponse(
            id=created.id,
            patient_id=created.patient_id,
            treatment_name=created.treatment_name,
            treatment_type=created.treatment_type,
            start_date=created.start_date,
            end_date=created.end_date,
            status=created.status,
            notes=created.notes,
            created_at=created.created_at,
            updated_at=created.updated_at,
        )

    def update_treatment(
        self, treatment_id: uuid.UUID, payload: TreatmentUpdate, current_user: User
    ) -> TreatmentResponse:
        """Update treatment record."""
        tx = self.repo.get_by_id(treatment_id)
        if not tx:
            raise HTTPException(status_code=404, detail="Treatment record not found")

        if current_user.role == "DOCTOR":
            self._verify_doctor_access(current_user.id, tx.patient_id)

        if payload.treatment_name is not None:
            tx.treatment_name = payload.treatment_name
        if payload.treatment_type is not None:
            tx.treatment_type = payload.treatment_type
        if payload.start_date is not None:
            tx.start_date = payload.start_date
        if payload.end_date is not None:
            tx.end_date = payload.end_date
        if payload.status is not None:
            tx.status = payload.status
        if payload.notes is not None:
            tx.notes = payload.notes

        updated = self.repo.update(tx)

        self.audit_service.log_action(
            action="TREATMENT_UPDATE",
            resource="TREATMENT",
            resource_id=str(treatment_id),
            user_id=current_user.id,
        )

        return TreatmentResponse(
            id=updated.id,
            patient_id=updated.patient_id,
            treatment_name=updated.treatment_name,
            treatment_type=updated.treatment_type,
            start_date=updated.start_date,
            end_date=updated.end_date,
            status=updated.status,
            notes=updated.notes,
            created_at=updated.created_at,
            updated_at=updated.updated_at,
        )

    def delete_treatment(self, treatment_id: uuid.UUID, current_user: User) -> bool:
        """Delete treatment record."""
        tx = self.repo.get_by_id(treatment_id)
        if not tx:
            raise HTTPException(status_code=404, detail="Treatment record not found")

        self.repo.delete(treatment_id)

        self.audit_service.log_action(
            action="TREATMENT_DELETE",
            resource="TREATMENT",
            resource_id=str(treatment_id),
            user_id=current_user.id,
        )
        return True

    def count_active_treatments(self, current_user: User | None = None) -> int:
        """Count active treatments hospital-wide or doctor scoped."""
        doctor_id = current_user.id if current_user and current_user.role == "DOCTOR" else None
        return self.repo.count_active(doctor_id=doctor_id)
