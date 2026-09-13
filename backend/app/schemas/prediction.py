"""Risk prediction and readmission forecasting schemas."""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

AGE_GROUPS = Literal[
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
]


class RiskPredictionRequest(BaseModel):
    """Feature payload submitted for a single readmission risk prediction."""

    patient_id: int
    time_in_hospital: int = Field(ge=1, le=14)
    num_medications: int = Field(ge=0)
    num_lab_procedures: int = Field(ge=0)
    number_diagnoses: int = Field(ge=0)
    number_inpatient: int = Field(default=0, ge=0)
    number_emergency: int = Field(default=0, ge=0)
    # was le=365
    age_group: AGE_GROUPS | None = None


class RiskPredictionRead(BaseModel):
    """A readmission risk result."""

    model_config = ConfigDict(from_attributes=True)

    patient_id: int
    readmission_probability: float = Field(ge=0.0, le=1.0)
    risk_category: str
    model_name: str
    model_version: str
    created_at: datetime | None = None


class ReadmissionForecast(BaseModel):
    """Aggregated readmission forecast for a department or hospital."""

    scope: str
    horizon_days: int
    predicted_readmissions: int
    predicted_rate: float = Field(ge=0.0, le=1.0)
