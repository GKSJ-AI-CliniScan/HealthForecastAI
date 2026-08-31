"""Treatment Repository."""

import uuid
from sqlalchemy.orm import Session
from app.models.treatment import Treatment
from app.models.doctor_patient_assignment import DoctorPatientAssignment
from app.repositories.base_repository import BaseRepository


class TreatmentRepository(BaseRepository[Treatment]):
    """Data access methods for Patient Treatments."""

    def __init__(self, db: Session):
        super().__init__(Treatment, db)

    def get_by_patient_id(self, patient_id: uuid.UUID) -> list[Treatment]:
        """List all treatment records for a given patient."""
        return (
            self.db.query(Treatment)
            .filter(Treatment.patient_id == patient_id)
            .order_by(Treatment.start_date.desc())
            .all()
        )

    def count_active(self, doctor_id: uuid.UUID | None = None) -> int:
        """Count active treatments hospital-wide or assigned to doctor."""
        query = self.db.query(Treatment).filter(Treatment.status == "ACTIVE")
        if doctor_id:
            query = query.join(
                DoctorPatientAssignment,
                DoctorPatientAssignment.patient_id == Treatment.patient_id,
            ).filter(DoctorPatientAssignment.doctor_id == doctor_id)
        return query.count()
