"""Risk prediction and readmission forecasting schemas."""

from datetime import UTC, datetime

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
    A1Cresult: str | None = Field(default="None")


class RiskPredictionRead(BaseModel):
    """A readmission risk result with clinical insights."""

    model_config = ConfigDict(from_attributes=True)

    patient_id: int
    readmission_probability: float = Field(ge=0.0, le=1.0)
    risk_category: str
    model_name: str = "diabetes_readmission_xgb"
    model_version: str = "v1.0.0"
    contributing_factors: list[str] = Field(default_factory=list)
    recommended_actions: list[str] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class ReadmissionForecast(BaseModel):
    """Aggregated readmission forecast for a department or hospital."""

    scope: str
    horizon_days: int
    predicted_readmissions: int
    predicted_rate: float = Field(ge=0.0, le=1.0)
