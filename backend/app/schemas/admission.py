"""Admission schemas."""

import uuid
from datetime import date, datetime
from pydantic import BaseModel, ConfigDict, Field


class AdmissionBase(BaseModel):
    """Base hospital admission fields."""
    admission_date: date
    discharge_date: date | None = None
    admission_type: str | None = Field(None, max_length=64)
    department: str | None = Field(None, max_length=128)
    primary_diagnosis: str | None = Field(None, max_length=255)
    length_of_stay: int | None = None
    discharge_disposition: str | None = Field(None, max_length=128)


class AdmissionCreate(AdmissionBase):
    """Payload for creating hospital admission."""
    patient_id: uuid.UUID | None = None


class AdmissionUpdate(BaseModel):
    """Payload for updating hospital admission."""
    admission_date: date | None = None
    discharge_date: date | None = None
    admission_type: str | None = None
    department: str | None = None
    primary_diagnosis: str | None = None
    length_of_stay: int | None = None
    discharge_disposition: str | None = None


class AdmissionResponse(AdmissionBase):
    """Admission response schema."""
    id: uuid.UUID
    patient_id: uuid.UUID
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
