"""Patient outcome and recovery progression schemas."""

import uuid
from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field


class PatientOutcomeBase(BaseModel):
    """Base patient outcome fields."""

    admission_id: uuid.UUID | None = None
    outcome_status: str = Field(..., max_length=64)
    outcome_score: float | None = Field(None, ge=0.0, le=100.0)
    recorded_date: date
    notes: str | None = None


class PatientOutcomeCreate(PatientOutcomeBase):
    """Payload for creating a patient outcome record."""

    patient_id: uuid.UUID | None = None


class PatientOutcomeUpdate(BaseModel):
    """Payload for updating a patient outcome record."""

    outcome_status: str | None = None
    outcome_score: float | None = Field(None, ge=0.0, le=100.0)
    recorded_date: date | None = None
    notes: str | None = None


class PatientOutcomeResponse(PatientOutcomeBase):
    """Patient outcome response schema."""

    id: uuid.UUID
    patient_id: uuid.UUID
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
