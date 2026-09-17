"""Medication Repository."""

from __future__ import annotations

import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.medication import Medication


class MedicationRepository:
    """Database repository for patient medications."""

    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, med_id: uuid.UUID) -> Medication | None:
        """Get medication record by ID."""
        return self.db.scalar(select(Medication).where(Medication.id == med_id))

    def get_by_patient_id(self, patient_id: uuid.UUID) -> list[Medication]:
        """Get medications prescribed to a patient."""
        return list(
            self.db.scalars(
                select(Medication)
                .where(Medication.patient_id == patient_id)
                .order_by(Medication.start_date.desc())
            ).all()
        )

    def get_all(self) -> list[Medication]:
        """Get all medications."""
        return list(self.db.scalars(select(Medication)).all())

    def create(self, medication: Medication) -> Medication:
        """Create new medication record."""
        self.db.add(medication)
        self.db.commit()
        self.db.refresh(medication)
        return medication

    def update(self, medication: Medication) -> Medication:
        """Update existing medication record."""
        self.db.commit()
        self.db.refresh(medication)
        return medication

    def delete(self, med_id: uuid.UUID) -> None:
        """Delete a medication record."""
        item = self.get_by_id(med_id)
        if item:
            self.db.delete(item)
            self.db.commit()
