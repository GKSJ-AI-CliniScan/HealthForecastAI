"""Treatment effectiveness schemas."""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

DIABETES_TREATMENT_TYPES = Literal[
    "insulin_therapy",
    "metformin",
    "sulfonylurea",
    "lifestyle_intervention",
    "oral_hypoglycemics",
    "combination_therapy",
]


class TreatmentOutcomeCreate(BaseModel):
    patient_id: int
    admission_id: int | None = None
    treatment_type: DIABETES_TREATMENT_TYPES
    outcome_status: str = Field(pattern="^(improved|unchanged|worsened)$")
    recovery_days: int | None = Field(default=None, ge=0)
    effectiveness_score: float | None = Field(default=None, ge=0.0, le=1.0)


class TreatmentOutcomeRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    patient_id: int
    treatment_type: str
    outcome_status: str
    recovery_days: int | None
    effectiveness_score: float | None
    created_at: datetime


class TreatmentEffectivenessSummary(BaseModel):
    treatment_type: str | None
    total_cases: int
    improved_rate: float
    avg_recovery_days: float | None


class RecoveryTrendPoint(BaseModel):
    month: str
    avg_effectiveness: float | None
    case_count: int