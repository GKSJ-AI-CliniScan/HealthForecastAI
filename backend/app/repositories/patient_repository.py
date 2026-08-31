"""Patient Repository."""

import uuid
from sqlalchemy import or_, func
from sqlalchemy.orm import Session, joinedload

from app.models.patient import Patient
from app.models.doctor_patient_assignment import DoctorPatientAssignment
from app.repositories.base_repository import BaseRepository


class PatientRepository(BaseRepository[Patient]):
    """Data access methods for Patients."""

    def __init__(self, db: Session):
        super().__init__(Patient, db)

    def get_by_identifier(self, identifier: str) -> Patient | None:
        """Find patient by medical identifier."""
        return (
            self.db.query(Patient)
            .filter(func.lower(Patient.patient_identifier) == identifier.lower().strip())
            .first()
        )

    def list_patients(
        self,
        skip: int = 0,
        limit: int = 10,
        search: str | None = None,
        assigned_doctor_id: uuid.UUID | None = None,
        gender: str | None = None,
    ) -> tuple[list[Patient], int]:
        """List patients with scoping by doctor, search, and pagination."""
        query = self.db.query(Patient)

        if assigned_doctor_id is not None:
            query = query.join(
                DoctorPatientAssignment,
                DoctorPatientAssignment.patient_id == Patient.id,
            ).filter(DoctorPatientAssignment.doctor_id == assigned_doctor_id)

        if gender:
            query = query.filter(Patient.gender.ilike(gender))

        if search:
            pattern = f"%{search}%"
            query = query.filter(
                or_(
                    Patient.patient_identifier.ilike(pattern),
                    Patient.first_name.ilike(pattern),
                    Patient.last_name.ilike(pattern),
                    Patient.email.ilike(pattern),
                )
            )

        total = query.count()
        items = query.order_by(Patient.created_at.desc()).offset(skip).limit(limit).all()
        return items, total

    def count_by_doctor(self, doctor_id: uuid.UUID) -> int:
        """Count patients assigned to a specific doctor."""
        return (
            self.db.query(DoctorPatientAssignment)
            .filter(DoctorPatientAssignment.doctor_id == doctor_id)
            .count()
        )
