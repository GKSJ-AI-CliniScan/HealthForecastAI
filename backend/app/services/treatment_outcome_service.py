"""Treatment outcome business logic."""

from __future__ import annotations

from sqlalchemy.orm import Session

from app.models.admission import Admission
from app.models.treatment import TreatmentOutcome
from app.schemas.treatment import TreatmentOutcomeCreate


def create_treatment_outcome(
    db: Session,
    payload: TreatmentOutcomeCreate,
) -> TreatmentOutcome:
    """Create an outcome record for an existing admission."""

    admission = db.get(
        Admission,
        payload.admission_id,
    )

    if admission is None:
        raise ValueError(f"Admission {payload.admission_id} not found")

    outcome = TreatmentOutcome(
        admission_id=payload.admission_id,
        treatment_name=payload.treatment_name,
        medication_change=payload.medication_change,
        recovery_score=payload.recovery_score,
        length_of_stay_days=payload.length_of_stay_days,
        outcome=payload.outcome,
    )

    db.add(outcome)
    db.commit()
    db.refresh(outcome)

    return outcome
