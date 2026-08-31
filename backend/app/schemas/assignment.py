"""Doctor-Patient Assignment schemas."""

import uuid
from datetime import datetime
from pydantic import BaseModel, ConfigDict


class AssignmentCreate(BaseModel):
    """Payload to assign a doctor to a patient."""

    doctor_id: uuid.UUID
    patient_id: uuid.UUID


class AssignmentResponse(BaseModel):
    """Doctor-patient assignment response schema."""

    id: uuid.UUID
    doctor_id: uuid.UUID
    patient_id: uuid.UUID
    doctor_name: str | None = None
    patient_identifier: str | None = None
    patient_name: str | None = None
    assigned_at: datetime

    model_config = ConfigDict(from_attributes=True)
