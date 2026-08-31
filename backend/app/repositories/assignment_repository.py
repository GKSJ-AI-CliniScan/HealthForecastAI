"""Doctor-Patient Assignment Repository."""

import uuid
from sqlalchemy.orm import Session, joinedload
from app.models.doctor_patient_assignment import DoctorPatientAssignment
from app.repositories.base_repository import BaseRepository


class AssignmentRepository(BaseRepository[DoctorPatientAssignment]):
    """Data access methods for Doctor-Patient Assignments."""

    def __init__(self, db: Session):
        super().__init__(DoctorPatientAssignment, db)

    def get_assignment(
        self, doctor_id: uuid.UUID, patient_id: uuid.UUID
    ) -> DoctorPatientAssignment | None:
        """Find specific assignment by doctor and patient IDs."""
        return (
            self.db.query(DoctorPatientAssignment)
            .filter(
                DoctorPatientAssignment.doctor_id == doctor_id,
                DoctorPatientAssignment.patient_id == patient_id,
            )
            .first()
        )

    def list_all_with_details(self) -> list[DoctorPatientAssignment]:
        """List assignments with doctor and patient relationships loaded."""
        return (
            self.db.query(DoctorPatientAssignment)
            .options(
                joinedload(DoctorPatientAssignment.doctor),
                joinedload(DoctorPatientAssignment.patient),
            )
            .order_by(DoctorPatientAssignment.assigned_at.desc())
            .all()
        )
