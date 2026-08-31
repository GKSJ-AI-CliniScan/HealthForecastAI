"""Admission Repository."""

import uuid
from sqlalchemy.orm import Session
from app.models.admission import Admission
from app.models.doctor_patient_assignment import DoctorPatientAssignment
from app.repositories.base_repository import BaseRepository


class AdmissionRepository(BaseRepository[Admission]):
    """Data access methods for Hospital Admissions."""

    def __init__(self, db: Session):
        super().__init__(Admission, db)

    def get_by_patient_id(self, patient_id: uuid.UUID) -> list[Admission]:
        """List all admission records for a given patient."""
        return (
            self.db.query(Admission)
            .filter(Admission.patient_id == patient_id)
            .order_by(Admission.admission_date.desc())
            .all()
        )

    def get_recent_admissions(self, limit: int = 10, doctor_id: uuid.UUID | None = None) -> list[Admission]:
        """Get most recent admissions across hospital or scoped by doctor."""
        query = self.db.query(Admission)
        if doctor_id:
            query = query.join(
                DoctorPatientAssignment,
                DoctorPatientAssignment.patient_id == Admission.patient_id,
            ).filter(DoctorPatientAssignment.doctor_id == doctor_id)

        return query.order_by(Admission.admission_date.desc()).limit(limit).all()

    def count_by_department(self) -> dict[str, int]:
        """Aggregate admission count by department."""
        from sqlalchemy import func
        rows = (
            self.db.query(Admission.department, func.count(Admission.id))
            .group_by(Admission.department)
            .all()
        )
        return {dept or "General": cnt for dept, cnt in rows}
