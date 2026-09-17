"""Patient Outcome Repository."""

from __future__ import annotations

import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.patient_outcome import PatientOutcome


class PatientOutcomeRepository:
    """Database repository for patient recovery outcomes."""

    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, outcome_id: uuid.UUID) -> PatientOutcome | None:
        """Get outcome record by ID."""
        return self.db.scalar(select(PatientOutcome).where(PatientOutcome.id == outcome_id))

    def get_by_patient_id(self, patient_id: uuid.UUID) -> list[PatientOutcome]:
        """Get all outcome records for a patient ordered chronologically."""
        return list(
            self.db.scalars(
                select(PatientOutcome)
                .where(PatientOutcome.patient_id == patient_id)
                .order_by(PatientOutcome.recorded_date.asc())
            ).all()
        )

    def create(self, outcome: PatientOutcome) -> PatientOutcome:
        """Create new outcome record."""
        self.db.add(outcome)
        self.db.commit()
        self.db.refresh(outcome)
        return outcome

    def update(self, outcome: PatientOutcome) -> PatientOutcome:
        """Update existing outcome record."""
        self.db.commit()
        self.db.refresh(outcome)
        return outcome

    def delete(self, outcome_id: uuid.UUID) -> None:
        """Delete an outcome record."""
        item = self.get_by_id(outcome_id)
        if item:
            self.db.delete(item)
            self.db.commit()
