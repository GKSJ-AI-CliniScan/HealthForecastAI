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
    clinical_notes: list[dict] | None = None
    treatment_history: list[str] | None = None
    recovery_progress: dict | None = None
    treatment_status: str | None = None
    risk_level: str | None = None
    readmission_probability: float | None = None
    discharge_date: str | None = None


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
    clinical_notes: list[dict] | None = None
    treatment_history: list[str] | None = None
    recovery_progress: dict | None = None
    treatment_status: str | None = None
    risk_level: str | None = None
    readmission_probability: float | None = None
    discharge_date: str | None = None


class PatientRead(PatientBase):
    """Patient representation returned to authorised callers."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    assigned_doctor_id: int | None = None


class PatientListItem(BaseModel):
    """A row in the patient list.

    The clinical note, treatment history and recovery blobs are left out: no list
    view renders them, and carrying 50 of them costs about ten times the payload.
    The detail route still returns the full record.
    """

    model_config = ConfigDict(from_attributes=True)

    id: int
    medical_record_number: str
    age_group: str | None = None
    gender: str | None = None
    race: str | None = None
    primary_diagnosis: str | None = None
    assigned_doctor_id: int | None = None
    treatment_status: str | None = None
    risk_level: str | None = None
    readmission_probability: float | None = None
    discharge_date: str | None = None


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

    items: list[PatientListItem]
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
