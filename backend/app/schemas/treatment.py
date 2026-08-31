"""Treatment schemas."""

import uuid
from datetime import date, datetime
from pydantic import BaseModel, ConfigDict, Field


class TreatmentBase(BaseModel):
    """Base clinical treatment fields."""
    treatment_name: str = Field(..., max_length=255)
    treatment_type: str | None = Field(None, max_length=128)
    start_date: date
    end_date: date | None = None
    status: str = Field("ACTIVE", max_length=32)
    notes: str | None = None


class TreatmentCreate(TreatmentBase):
    """Payload for creating treatment record."""
    patient_id: uuid.UUID | None = None


class TreatmentUpdate(BaseModel):
    """Payload for updating treatment record."""
    treatment_name: str | None = None
    treatment_type: str | None = None
    start_date: date | None = None
    end_date: date | None = None
    status: str | None = None
    notes: str | None = None


class TreatmentResponse(TreatmentBase):
    """Treatment response schema."""
    id: uuid.UUID
    patient_id: uuid.UUID
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
