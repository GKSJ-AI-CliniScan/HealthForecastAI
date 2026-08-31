"""Patient Management Service."""

import uuid
from typing import Any
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.patient import Patient
from app.models.user import User
from app.repositories.patient_repository import PatientRepository
from app.repositories.assignment_repository import AssignmentRepository
from app.schemas.patient import (
    AnonymizedPatientResponse,
    PatientCreate,
    PatientResponse,
    PatientUpdate,
)
from app.services.audit_service import AuditService
from app.utils.anonymizer import anonymize_patient


class PatientService:
    """Service handling patient workflows with strict role-based scoping and backend anonymization."""

    def __init__(self, db: Session):
        self.db = db
        self.repo = PatientRepository(db)
        self.assignment_repo = AssignmentRepository(db)
        self.audit_service = AuditService(db)

    def _to_full_response(self, patient: Patient) -> PatientResponse:
        """Convert Patient entity to standard PatientResponse with PII."""
        return PatientResponse(
            id=patient.id,
            patient_identifier=patient.patient_identifier,
            first_name=patient.first_name,
            last_name=patient.last_name,
            full_name=patient.full_name,
            date_of_birth=patient.date_of_birth,
            gender=patient.gender,
            phone=patient.phone,
            email=patient.email,
            address=patient.address,
            created_at=patient.created_at,
            updated_at=patient.updated_at,
            is_anonymized=False,
        )

    def list_patients(
        self,
        current_user: User,
        page: int = 1,
        page_size: int = 10,
        search: str | None = None,
        gender: str | None = None,
    ) -> tuple[list[Any], int]:
        """List patients governed by the caller's role."""
        skip = (page - 1) * page_size
        user_role = current_user.role

        assigned_doctor_id = None
        if user_role == "DOCTOR":
            assigned_doctor_id = current_user.id

        patients, total = self.repo.list_patients(
            skip=skip,
            limit=page_size,
            search=search,
            assigned_doctor_id=assigned_doctor_id,
            gender=gender,
        )

        # Apply backend anonymization for RESEARCHER
        if user_role == "RESEARCHER":
            anonymized_items = [anonymize_patient(p) for p in patients]
            return anonymized_items, total

        # Full responses for clinicians and administrators
        full_items = [self._to_full_response(p) for p in patients]
        return full_items, total

    def get_patient_by_id(self, patient_id: uuid.UUID, current_user: User) -> Any:
        """Retrieve a single patient record with role scoping and anonymization."""
        patient = self.repo.get_by_id(patient_id)
        if not patient:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Patient with ID '{patient_id}' not found",
            )

        user_role = current_user.role

        # Enforce DOCTOR scoping
        if user_role == "DOCTOR":
            is_assigned = self.assignment_repo.get_assignment(
                doctor_id=current_user.id, patient_id=patient.id
            )
            if not is_assigned:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access denied: You are not assigned to this patient",
                )

        # Enforce RESEARCHER de-identification
        if user_role == "RESEARCHER":
            return anonymize_patient(patient)

        return self._to_full_response(patient)

    def create_patient(self, payload: PatientCreate, current_user: User) -> PatientResponse:
        """Create a new patient record and log audit event."""
        # Validate unique identifier
        existing = self.repo.get_by_identifier(payload.patient_identifier)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Patient identifier '{payload.patient_identifier}' already exists",
            )

        patient = Patient(
            id=uuid.uuid4(),
            patient_identifier=payload.patient_identifier,
            first_name=payload.first_name,
            last_name=payload.last_name,
            date_of_birth=payload.date_of_birth,
            gender=payload.gender,
            phone=payload.phone,
            email=payload.email,
            address=payload.address,
        )
        created = self.repo.create(patient)

        # If created by a DOCTOR, automatically assign doctor to patient
        if current_user.role == "DOCTOR":
            from app.models.doctor_patient_assignment import DoctorPatientAssignment
            assignment = DoctorPatientAssignment(
                id=uuid.uuid4(),
                doctor_id=current_user.id,
                patient_id=created.id,
            )
            self.assignment_repo.create(assignment)

        self.audit_service.log_action(
            action="PATIENT_CREATE",
            resource="PATIENT",
            resource_id=str(created.id),
            user_id=current_user.id,
        )

        return self._to_full_response(created)

    def update_patient(
        self, patient_id: uuid.UUID, payload: PatientUpdate, current_user: User
    ) -> PatientResponse:
        """Update patient demographic/clinical record."""
        patient = self.repo.get_by_id(patient_id)
        if not patient:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Patient not found",
            )

        # Verify doctor access if caller is DOCTOR
        if current_user.role == "DOCTOR":
            is_assigned = self.assignment_repo.get_assignment(
                doctor_id=current_user.id, patient_id=patient.id
            )
            if not is_assigned:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access denied: Cannot update unassigned patient",
                )

        if payload.first_name is not None:
            patient.first_name = payload.first_name
        if payload.last_name is not None:
            patient.last_name = payload.last_name
        if payload.date_of_birth is not None:
            patient.date_of_birth = payload.date_of_birth
        if payload.gender is not None:
            patient.gender = payload.gender
        if payload.phone is not None:
            patient.phone = payload.phone
        if payload.email is not None:
            patient.email = payload.email
        if payload.address is not None:
            patient.address = payload.address

        updated = self.repo.update(patient)

        self.audit_service.log_action(
            action="PATIENT_UPDATE",
            resource="PATIENT",
            resource_id=str(patient_id),
            user_id=current_user.id,
        )

        return self._to_full_response(updated)

    def delete_patient(self, patient_id: uuid.UUID, current_user: User) -> bool:
        """Delete patient record (Admin only)."""
        patient = self.repo.get_by_id(patient_id)
        if not patient:
            raise HTTPException(status_code=404, detail="Patient not found")

        self.repo.delete(patient_id)

        self.audit_service.log_action(
            action="PATIENT_DELETE",
            resource="PATIENT",
            resource_id=str(patient_id),
            user_id=current_user.id,
        )
        return True
