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
    scope: str
    horizon_days: int = Field(gt=0, le=365)
    predicted_readmissions: float = Field(ge=0.0)
    predicted_rate: float = Field(ge=0.0, le=1.0)


class RiskDriver(BaseModel):
    """A model-derived feature contribution."""

    feature: str
    value: str | float | int | None = None
    contribution: float
    direction: str


class ClinicalInsight(BaseModel):
    """Human-readable interpretation of a patient risk prediction."""

    title: str
    detail: str
    severity: str


class RiskDriversRead(BaseModel):
    """Model-derived drivers for one patient risk prediction."""

    patient_id: int
    probability: float = Field(ge=0.0, le=1.0)
    model_name: str
    model_version: str
    drivers: list[RiskDriver]
    insights: list[ClinicalInsight]
