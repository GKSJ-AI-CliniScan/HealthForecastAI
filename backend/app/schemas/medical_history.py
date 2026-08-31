"""Medical History schemas."""

import uuid
from datetime import datetime
from pydantic import BaseModel, ConfigDict


class MedicalHistoryBase(BaseModel):
    """Base medical history fields."""
    diagnosis: str | None = None
    chronic_conditions: str | None = None
    allergies: str | None = None
    medical_notes: str | None = None


class MedicalHistoryCreate(MedicalHistoryBase):
    """Payload for creating medical history."""
    patient_id: uuid.UUID | None = None


class MedicalHistoryUpdate(MedicalHistoryBase):
    """Payload for updating medical history."""
    pass


class MedicalHistoryResponse(MedicalHistoryBase):
    """Medical history response."""
    id: uuid.UUID
    patient_id: uuid.UUID
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
