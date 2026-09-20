"""Admission API schemas."""

from datetime import date

from pydantic import BaseModel, ConfigDict, Field


class AdmissionCreate(BaseModel):
    patient_id: int
    admission_date: date
    discharge_date: date | None = None

    time_in_hospital: int | None = Field(
        default=None,
        ge=0,
        le=365,
    )

    admission_type: str | None = Field(
        default=None,
        max_length=64,
    )

    discharge_disposition: str | None = Field(
        default=None,
        max_length=128,
    )

    num_medications: int | None = Field(
        default=None,
        ge=0,
    )

    num_lab_procedures: int | None = Field(
        default=None,
        ge=0,
    )

    number_diagnoses: int | None = Field(
        default=None,
        ge=0,
    )

    readmitted: str | None = Field(
        default=None,
        max_length=8,
    )


class AdmissionRead(AdmissionCreate):
    model_config = ConfigDict(from_attributes=True)

    id: int
