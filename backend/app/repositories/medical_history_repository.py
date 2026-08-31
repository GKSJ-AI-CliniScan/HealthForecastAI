"""Medical History Repository."""

import uuid
from sqlalchemy.orm import Session
from app.models.medical_history import MedicalHistory
from app.repositories.base_repository import BaseRepository


class MedicalHistoryRepository(BaseRepository[MedicalHistory]):
    """Data access methods for Patient Medical Histories."""

    def __init__(self, db: Session):
        super().__init__(MedicalHistory, db)

    def get_by_patient_id(self, patient_id: uuid.UUID) -> list[MedicalHistory]:
        """List all medical histories for a given patient."""
        return (
            self.db.query(MedicalHistory)
            .filter(MedicalHistory.patient_id == patient_id)
            .order_by(MedicalHistory.created_at.desc())
            .all()
        )
