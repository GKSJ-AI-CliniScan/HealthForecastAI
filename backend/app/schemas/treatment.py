"""Treatment outcome API schemas."""

from pydantic import BaseModel, ConfigDict, Field


class TreatmentOutcomeCreate(BaseModel):
    admission_id: int
    treatment_name: str = Field(min_length=1, max_length=255)
    medication_change: bool | None = None
    recovery_score: float | None = Field(
        default=None,
        ge=0,
        le=100,
    )
    length_of_stay_days: int | None = Field(
        default=None,
        ge=0,
        le=365,
    )
    outcome: str | None = Field(
        default=None,
        max_length=64,
    )


class TreatmentOutcomeRead(TreatmentOutcomeCreate):
    model_config = ConfigDict(from_attributes=True)

    id: int
