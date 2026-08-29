"""Risk prediction and readmission forecasting schemas."""

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class RiskPredictionRequest(BaseModel):
    """Feature payload submitted for a single readmission risk prediction."""

    patient_id: int
    time_in_hospital: int = Field(ge=0, le=365)
    num_medications: int = Field(ge=0)
    num_lab_procedures: int = Field(ge=0)
    number_diagnoses: int = Field(ge=0)
    number_inpatient: int = Field(default=0, ge=0)
    number_emergency: int = Field(default=0, ge=0)
    age_group: str | None = None


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
    patients_scored: int = 0
