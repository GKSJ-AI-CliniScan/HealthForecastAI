"""Admission schemas."""

from datetime import date

from pydantic import BaseModel, ConfigDict, Field, model_validator


class AdmissionBase(BaseModel):
    """Fields shared by every admission representation."""

    admission_date: date | None = None
    discharge_date: date | None = None
    time_in_hospital: int | None = Field(default=None, ge=0)
    admission_type: str | None = Field(default=None, max_length=64)
    discharge_disposition: str | None = Field(default=None, max_length=128)
    num_medications: int | None = Field(default=None, ge=0)
    num_lab_procedures: int | None = Field(default=None, ge=0)
    number_diagnoses: int | None = Field(default=None, ge=0)
    readmitted: str | None = Field(default=None, max_length=8)

    @model_validator(mode="after")
    def _discharge_not_before_admission(self) -> "AdmissionBase":
        """Mirror the admissions_date_order_check constraint at the API edge.

        The database enforces this too. Validating here turns what would be an
        opaque integrity error into a 422 that names the problem.
        """
        if (
            self.admission_date is not None
            and self.discharge_date is not None
            and self.discharge_date < self.admission_date
        ):
            raise ValueError("discharge_date cannot be before admission_date")
        return self


class AdmissionCreate(AdmissionBase):
    """Payload for recording a new admission."""


class AdmissionUpdate(AdmissionBase):
    """Partial update to an admission.

    Inherits the date ordering rule. The endpoint serialises with exclude_unset,
    so an omitted field keeps its stored value.
    """


class AdmissionRead(AdmissionBase):
    """Admission representation returned by the API."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    patient_id: int


class ReadmissionSummary(BaseModel):
    """Readmission tracking for one patient.

    ``by_label`` keeps the source dataset's own values (for example NO, <30, >30)
    so the readmission window survives, which Milestone 2 forecasting needs.
    """

    patient_id: int
    total_admissions: int
    readmitted_total: int
    by_label: dict[str, int]
