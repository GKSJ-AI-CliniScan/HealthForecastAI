"""Admission Service."""

import uuid
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.admission import Admission
from app.models.user import User
from app.repositories.admission_repository import AdmissionRepository
from app.repositories.patient_repository import PatientRepository
from app.repositories.assignment_repository import AssignmentRepository
from app.schemas.admission import (
    AdmissionCreate,
    AdmissionResponse,
    AdmissionUpdate,
)
from app.services.audit_service import AuditService


class AdmissionService:
    """Service managing hospital admissions."""

    def __init__(self, db: Session):
        self.db = db
        self.repo = AdmissionRepository(db)
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

    def get_patient_admissions(
        self, patient_id: uuid.UUID, current_user: User
    ) -> list[AdmissionResponse]:
        """Get admissions for a patient."""
        if current_user.role == "DOCTOR":
            self._verify_doctor_access(current_user.id, patient_id)

        records = self.repo.get_by_patient_id(patient_id)
        return [
            AdmissionResponse(
                id=r.id,
                patient_id=r.patient_id,
                admission_date=r.admission_date,
                discharge_date=r.discharge_date,
                admission_type=r.admission_type,
                department=r.department,
                primary_diagnosis=r.primary_diagnosis,
                length_of_stay=r.length_of_stay,
                discharge_disposition=r.discharge_disposition,
                created_at=r.created_at,
            )
            for r in records
        ]

    def create_admission(
        self, patient_id: uuid.UUID, payload: AdmissionCreate, current_user: User
    ) -> AdmissionResponse:
        """Create admission record."""
        if not self.patient_repo.get_by_id(patient_id):
            raise HTTPException(status_code=404, detail="Patient not found")

        if current_user.role == "DOCTOR":
            self._verify_doctor_access(current_user.id, patient_id)

        admission = Admission(
            id=uuid.uuid4(),
            patient_id=patient_id,
            admission_date=payload.admission_date,
            discharge_date=payload.discharge_date,
            admission_type=payload.admission_type,
            department=payload.department,
            primary_diagnosis=payload.primary_diagnosis,
            length_of_stay=payload.length_of_stay,
            discharge_disposition=payload.discharge_disposition,
        )
        created = self.repo.create(admission)

        self.audit_service.log_action(
            action="ADMISSION_CREATE",
            resource="ADMISSION",
            resource_id=str(created.id),
            user_id=current_user.id,
        )

        return AdmissionResponse(
            id=created.id,
            patient_id=created.patient_id,
            admission_date=created.admission_date,
            discharge_date=created.discharge_date,
            admission_type=created.admission_type,
            department=created.department,
            primary_diagnosis=created.primary_diagnosis,
            length_of_stay=created.length_of_stay,
            discharge_disposition=created.discharge_disposition,
            created_at=created.created_at,
        )

    def update_admission(
        self, admission_id: uuid.UUID, payload: AdmissionUpdate, current_user: User
    ) -> AdmissionResponse:
        """Update admission record."""
        adm = self.repo.get_by_id(admission_id)
        if not adm:
            raise HTTPException(status_code=404, detail="Admission record not found")

        if current_user.role == "DOCTOR":
            self._verify_doctor_access(current_user.id, adm.patient_id)

        if payload.admission_date is not None:
            adm.admission_date = payload.admission_date
        if payload.discharge_date is not None:
            adm.discharge_date = payload.discharge_date
        if payload.admission_type is not None:
            adm.admission_type = payload.admission_type
        if payload.department is not None:
            adm.department = payload.department
        if payload.primary_diagnosis is not None:
            adm.primary_diagnosis = payload.primary_diagnosis
        if payload.length_of_stay is not None:
            adm.length_of_stay = payload.length_of_stay
        if payload.discharge_disposition is not None:
            adm.discharge_disposition = payload.discharge_disposition

        updated = self.repo.update(adm)

        self.audit_service.log_action(
            action="ADMISSION_UPDATE",
            resource="ADMISSION",
            resource_id=str(admission_id),
            user_id=current_user.id,
        )

        return AdmissionResponse(
            id=updated.id,
            patient_id=updated.patient_id,
            admission_date=updated.admission_date,
            discharge_date=updated.discharge_date,
            admission_type=updated.admission_type,
            department=updated.department,
            primary_diagnosis=updated.primary_diagnosis,
            length_of_stay=updated.length_of_stay,
            discharge_disposition=updated.discharge_disposition,
            created_at=updated.created_at,
        )

    def delete_admission(self, admission_id: uuid.UUID, current_user: User) -> bool:
        """Delete admission record."""
        adm = self.repo.get_by_id(admission_id)
        if not adm:
            raise HTTPException(status_code=404, detail="Admission record not found")

        self.repo.delete(admission_id)

        self.audit_service.log_action(
            action="ADMISSION_DELETE",
            resource="ADMISSION",
            resource_id=str(admission_id),
            user_id=current_user.id,
        )
        return True

    def get_recent_admissions(
        self, limit: int = 10, current_user: User | None = None
    ) -> list[AdmissionResponse]:
        """Get recent admissions scoped by user role."""
        doctor_id = current_user.id if current_user and current_user.role == "DOCTOR" else None
        admissions = self.repo.get_recent_admissions(limit=limit, doctor_id=doctor_id)
        return [
            AdmissionResponse(
                id=r.id,
                patient_id=r.patient_id,
                admission_date=r.admission_date,
                discharge_date=r.discharge_date,
                admission_type=r.admission_type,
                department=r.department,
                primary_diagnosis=r.primary_diagnosis,
                length_of_stay=r.length_of_stay,
                discharge_disposition=r.discharge_disposition,
                created_at=r.created_at,
            )
            for r in admissions
        ]

    def get_department_summary(self) -> dict[str, int]:
        """Return department admission counts."""
        return self.repo.count_by_department()
