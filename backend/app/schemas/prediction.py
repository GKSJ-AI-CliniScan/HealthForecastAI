"""Risk prediction and readmission forecasting schemas."""

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class RiskPredictionRequest(BaseModel):
    """Request payload for a patient risk score.

    Previously carried raw Diabetes-130-US-shaped feature fields
    (time_in_hospital, num_lab_procedures, ...) that the /risk/predict stub
    never actually read - it always returned a hardcoded probability. Real
    inference builds the feature row itself from Postgres
    (app/services/ml/feature_builder.py), so the caller only identifies the
    patient; it does not - and should not - know the model's feature shape.
    """

    patient_id: int


class ReadmissionPredictionRequest(BaseModel):
    """Request payload for a 30-day readmission forecast on one admission."""

    patient_id: int
    admission_id: int


class RiskPredictionRead(BaseModel):
    """A risk score or readmission forecast result for one patient/admission."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    patient_id: int
    admission_id: int | None = None
    readmission_probability: float = Field(ge=0.0, le=1.0)
    risk_category: str
    prediction_type: str = "risk"
    confidence_score: float | None = Field(default=None, ge=0.0, le=1.0)
    readmission_window: str | None = None
    actual_readmitted: bool | None = None
    outcome_recorded_at: datetime | None = None
    model_name: str
    model_version: str
    created_at: datetime | None = None


class ReadmissionForecast(BaseModel):
    """Aggregated readmission forecast for a department or hospital."""

    scope: str
    horizon_days: int
    predicted_readmissions: int
    predicted_rate: float = Field(ge=0.0, le=1.0)
