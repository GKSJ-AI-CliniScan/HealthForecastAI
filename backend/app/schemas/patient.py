"""Patient schemas."""

import uuid
from datetime import date, datetime
from typing import Any
from pydantic import BaseModel, ConfigDict, EmailStr, Field


class PatientBase(BaseModel):
    """Base patient data."""
    patient_identifier: str = Field(..., max_length=64)
    first_name: str = Field(..., max_length=128)
    last_name: str = Field(..., max_length=128)
    date_of_birth: date | None = None
    gender: str | None = Field(None, max_length=32)
    phone: str | None = Field(None, max_length=32)
    email: EmailStr | None = None
    address: str | None = None


class PatientCreate(PatientBase):
    """Patient creation payload."""
    pass


class PatientUpdate(BaseModel):
    """Patient update payload."""
    first_name: str | None = None
    last_name: str | None = None
    date_of_birth: date | None = None
    gender: str | None = None
    phone: str | None = None
    email: EmailStr | None = None
    address: str | None = None


class PatientResponse(PatientBase):
    """Full patient record returned to authorized clinicians & administrators."""
    id: uuid.UUID
    full_name: str
    created_at: datetime
    updated_at: datetime
    is_anonymized: bool = False

    model_config = ConfigDict(from_attributes=True)


class AnonymizedPatientResponse(BaseModel):
    """Anonymized patient record strictly stripped of PII for RESEARCHER role."""
    id: uuid.UUID
    anonymized_patient_id: str
    age_group: str | None = None
    gender: str | None = None
    created_at: datetime
    is_anonymized: bool = True

    model_config = ConfigDict(from_attributes=True)


class PatientListResponse(BaseModel):
    """Paginated list of patients (full or anonymized)."""
    items: list[Any]
    total: int
    page: int
    page_size: int
    total_pages: int
