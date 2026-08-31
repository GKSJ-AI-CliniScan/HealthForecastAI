"""Pydantic schemas for the patient endpoints."""

from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator

AGE_GROUPS = frozenset(
    {
        "[0-10)",
        "[10-20)",
        "[20-30)",
        "[30-40)",
        "[40-50)",
        "[50-60)",
        "[60-70)",
        "[70-80)",
        "[80-90)",
        "[90-100)",
    }
)


class PatientCreate(BaseModel):
    """Payload for registering a patient record."""

    medical_record_number: str = Field(min_length=1, max_length=64)
    age_group: str | None = None
    gender: str | None = Field(default=None, max_length=16)
    race: str | None = Field(default=None, max_length=64)
    primary_diagnosis: str | None = Field(default=None, max_length=255)
    assigned_doctor_id: int | None = None

    @field_validator("age_group")
    @classmethod
    def check_age_group(cls, value: str | None) -> str | None:
        """Keep age buckets identical to the source dataset.

        The model is trained on these exact strings, so a free-text age here
        would silently produce an unusable feature later.
        """
        if value is None:
            return value
        if value not in AGE_GROUPS:
            raise ValueError(f"age_group must be one of the dataset buckets, got '{value}'")
        return value


class PatientRead(BaseModel):
    """A patient record as returned to clinical and administrative callers."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    medical_record_number: str
    age_group: str | None
    gender: str | None
    race: str | None
    primary_diagnosis: str | None
    assigned_doctor_id: int | None
    created_at: datetime


class PatientAnonymised(BaseModel):
    """A research view with direct identifiers removed."""

    cohort_id: str
    age_group: str | None
    gender: str | None
    race: str | None
    primary_diagnosis: str | None


class AdmissionRead(BaseModel):
    """A single encounter belonging to a patient."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    admission_date: date | None
    discharge_date: date | None
    time_in_hospital: int | None
    admission_type: str | None
    discharge_disposition: str | None
    num_medications: int | None
    number_diagnoses: int | None
    readmitted: str | None
    readmitted_within_30: bool | None


class PatientDetail(PatientRead):
    """A patient together with their encounter history."""

    admissions: list[AdmissionRead] = []


class DashboardStats(BaseModel):
    """Headline metrics for the Milestone 1 dashboard."""

    scope: str
    total_patients: int
    total_admissions: int
    readmitted_within_30_days: int
    readmission_rate_percent: float
    average_length_of_stay_days: float
    can_export: bool
