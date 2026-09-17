"""Medication schemas."""

import uuid
from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field


class MedicationBase(BaseModel):
    """Base clinical medication fields."""

    medication_name: str = Field(..., max_length=255)
    dosage: str | None = Field(None, max_length=128)
    frequency: str | None = Field(None, max_length=128)
    start_date: date
    end_date: date | None = None
    status: str = Field("ACTIVE", max_length=32)
    effectiveness_score: float | None = Field(None, ge=0.0, le=100.0)
    outcome: str | None = Field(None, max_length=32)
    notes: str | None = None


class MedicationCreate(MedicationBase):
    """Payload for creating a medication prescription."""

    patient_id: uuid.UUID | None = None


class MedicationUpdate(BaseModel):
    """Payload for updating a medication prescription."""

    medication_name: str | None = None
    dosage: str | None = None
    frequency: str | None = None
    start_date: date | None = None
    end_date: date | None = None
    status: str | None = None
    effectiveness_score: float | None = Field(None, ge=0.0, le=100.0)
    outcome: str | None = None
    notes: str | None = None


class MedicationResponse(MedicationBase):
    """Medication response schema."""

    id: uuid.UUID
    patient_id: uuid.UUID
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
