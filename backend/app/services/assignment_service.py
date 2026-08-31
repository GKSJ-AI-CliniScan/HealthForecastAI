"""Doctor-Patient Assignment Service."""

import uuid
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.doctor_patient_assignment import DoctorPatientAssignment
from app.models.user import User
from app.repositories.assignment_repository import AssignmentRepository
from app.repositories.user_repository import UserRepository
from app.repositories.patient_repository import PatientRepository
from app.schemas.assignment import AssignmentCreate, AssignmentResponse
from app.services.audit_service import AuditService


class AssignmentService:
    """Service managing assignments between clinical doctors and patients."""

    def __init__(self, db: Session):
        self.db = db
        self.repo = AssignmentRepository(db)
        self.user_repo = UserRepository(db)
        self.patient_repo = PatientRepository(db)
        self.audit_service = AuditService(db)

    def list_assignments(self) -> list[AssignmentResponse]:
        """List all active doctor-patient assignments."""
        assignments = self.repo.list_all_with_details()
        return [
            AssignmentResponse(
                id=a.id,
                doctor_id=a.doctor_id,
                patient_id=a.patient_id,
                doctor_name=a.doctor.full_name if a.doctor else "Unknown Doctor",
                patient_identifier=a.patient.patient_identifier if a.patient else "Unknown Patient",
                patient_name=a.patient.full_name if a.patient else "Unknown",
                assigned_at=a.assigned_at,
            )
            for a in assignments
        ]

    def create_assignment(
        self, payload: AssignmentCreate, current_user: User
    ) -> AssignmentResponse:
        """Assign a doctor to a patient."""
        doctor = self.user_repo.get_by_id_with_role(payload.doctor_id)
        if not doctor:
            raise HTTPException(status_code=404, detail="Doctor not found")
        if doctor.role != "DOCTOR":
            raise HTTPException(status_code=400, detail=f"User '{doctor.username}' is not a DOCTOR")

        patient = self.patient_repo.get_by_id(payload.patient_id)
        if not patient:
            raise HTTPException(status_code=404, detail="Patient not found")

        existing = self.repo.get_assignment(payload.doctor_id, payload.patient_id)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Doctor is already assigned to this patient",
            )

        assignment = DoctorPatientAssignment(
            id=uuid.uuid4(),
            doctor_id=payload.doctor_id,
            patient_id=payload.patient_id,
        )
        created = self.repo.create(assignment)

        self.audit_service.log_action(
            action="PATIENT_ASSIGN",
            resource="ASSIGNMENT",
            resource_id=str(created.id),
            user_id=current_user.id,
        )

        return AssignmentResponse(
            id=created.id,
            doctor_id=created.doctor_id,
            patient_id=created.patient_id,
            doctor_name=doctor.full_name,
            patient_identifier=patient.patient_identifier,
            patient_name=patient.full_name,
            assigned_at=created.assigned_at,
        )

    def delete_assignment(self, assignment_id: uuid.UUID, current_user: User) -> bool:
        """Remove a doctor-patient assignment."""
        assignment = self.repo.get_by_id(assignment_id)
        if not assignment:
            raise HTTPException(status_code=404, detail="Assignment not found")

        self.repo.delete(assignment_id)

        self.audit_service.log_action(
            action="PATIENT_UNASSIGN",
            resource="ASSIGNMENT",
            resource_id=str(assignment_id),
            user_id=current_user.id,
        )
        return True
