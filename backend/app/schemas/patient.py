"""Patient schemas."""

from pydantic import BaseModel, ConfigDict, Field


class PatientBase(BaseModel):
    """Shared patient fields."""

    medical_record_number: str = Field(min_length=1, max_length=64)
    age_group: str | None = None
    gender: str | None = None
    race: str | None = None
    primary_diagnosis: str | None = None


class PatientCreate(PatientBase):
    """Payload for creating a patient record."""

    assigned_doctor_id: int | None = None


class PatientUpdate(BaseModel):
    """Partial update to a patient record.

    Every field is optional and the endpoint serialises with exclude_unset, so an
    omitted field keeps its stored value. The medical record number is absent on
    purpose: it is the record's identity, not an editable attribute.
    """

    age_group: str | None = None
    gender: str | None = None
    race: str | None = None
    primary_diagnosis: str | None = None
    assigned_doctor_id: int | None = None


class PatientRead(PatientBase):
    """Patient representation returned to authorised callers."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    assigned_doctor_id: int | None = None


class PatientAnonymised(BaseModel):
    """Researcher facing view - no identifiers, no MRN."""

    model_config = ConfigDict(from_attributes=True)

    pseudo_id: str
    age_group: str | None = None
    gender: str | None = None
    primary_diagnosis: str | None = None
