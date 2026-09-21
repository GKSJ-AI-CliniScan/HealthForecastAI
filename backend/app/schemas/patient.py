"""Patient schemas."""

from datetime import date

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
    """Partial update. Only the fields supplied are changed."""

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

    pseudo_id: str
    age_group: str | None = None
    gender: str | None = None
    primary_diagnosis: str | None = None


class AdmissionRead(BaseModel):
    """One inpatient encounter."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    patient_id: int
    admission_date: date | None = None
    discharge_date: date | None = None
    time_in_hospital: int | None = None
    admission_type: str | None = None
    discharge_disposition: str | None = None
    num_medications: int | None = None
    num_lab_procedures: int | None = None
    number_diagnoses: int | None = None
    readmitted: str | None = None


class PatientPage(BaseModel):
    """A page of patients plus the total the caller is allowed to see."""

    items: list[PatientRead]
    total: int
    limit: int
    offset: int


class AnonymisedPage(BaseModel):
    """A page of de-identified patients."""

    items: list[PatientAnonymised]
    total: int
    limit: int
    offset: int


class PatientDetail(PatientRead):
    """A patient with their admission history attached."""

    admissions: list[AdmissionRead] = []
