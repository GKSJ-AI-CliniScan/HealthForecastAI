"""Risk prediction, Model Version, and Analytics schemas."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any
from pydantic import BaseModel, ConfigDict, Field


# -------------------------------------------------------------
# Legacy Milestone 1 Schemas (Preserved for compatibility)
# -------------------------------------------------------------

class RiskPredictionRequest(BaseModel):
    """Feature payload submitted for a single readmission risk prediction."""

    patient_id: int | str
    time_in_hospital: int = Field(default=3, ge=0, le=365)
    num_medications: int = Field(default=15, ge=0)
    num_lab_procedures: int = Field(default=40, ge=0)
    number_diagnoses: int = Field(default=5, ge=0)
    number_inpatient: int = Field(default=0, ge=0)
    number_emergency: int = Field(default=0, ge=0)
    age_group: str | None = None


class RiskPredictionRead(BaseModel):
    """A readmission risk result."""

    model_config = ConfigDict(from_attributes=True)

    patient_id: int | str
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


# -------------------------------------------------------------
# Milestone 2 Schemas
# -------------------------------------------------------------

class ReadmissionPredictRequest(BaseModel):
    """Request payload for triggering patient readmission risk prediction."""

    patient_id: uuid.UUID = Field(description="UUID of the patient")
    override_features: dict[str, Any] | None = Field(
        default=None, description="Optional custom feature overrides for simulation"
    )


class ContributingFactor(BaseModel):
    """Grounded clinical contributing factor."""

    factor: str
    detail: str
    impact: str  # HIGH, MODERATE, LOW
    direction: str  # INCREASES_RISK, DECREASES_RISK, NEUTRAL


class PredictionResponse(BaseModel):
    """Complete prediction response."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID | str
    patient_id: uuid.UUID | str
    prediction_type: str = "READMISSION"
    risk_score: int
    risk_category: str
    readmission_probability: float
    confidence_score: float
    contributing_factors: list[Any] = Field(default_factory=list)
    clinical_insights: str | None = None
    model_name: str = "XGBoost"
    model_version: str = "v1.0"
    created_at: datetime
    # Anonymization flag for researcher queries
    patient_identifier: str | None = None
    patient_name: str | None = None


class PredictionListResponse(BaseModel):
    """Paginated list of historical predictions."""

    items: list[PredictionResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class HighRiskPatientItem(BaseModel):
    """High-risk or critical patient summary record."""

    patient_id: uuid.UUID | str
    patient_identifier: str
    patient_name: str
    age_group: str | None = None
    gender: str | None = None
    risk_score: int
    risk_category: str
    readmission_probability: float
    latest_prediction_date: datetime
    assigned_doctor_name: str | None = None
    prediction_id: uuid.UUID | str


class HighRiskPatientListResponse(BaseModel):
    """Paginated high-risk patient list."""

    items: list[HighRiskPatientItem]
    total: int
    page: int
    page_size: int
    total_pages: int


class ModelVersionResponse(BaseModel):
    """Model version metadata response."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID | str
    model_name: str
    version: str
    algorithm: str
    accuracy: float
    precision: float
    recall: float
    f1_score: float
    roc_auc: float
    training_date: datetime
    is_active: bool


# -------------------------------------------------------------
# Analytics Schemas
# -------------------------------------------------------------

class RiskDistributionItem(BaseModel):
    category: str
    count: int
    percentage: float


class RiskDistributionResponse(BaseModel):
    total_predictions: int
    distribution: list[RiskDistributionItem]


class TrendPoint(BaseModel):
    date: str
    average_probability: float
    prediction_count: int
    high_risk_count: int


class ReadmissionTrendsResponse(BaseModel):
    trends: list[TrendPoint]


class HighRiskStatsResponse(BaseModel):
    high_risk_count: int
    critical_count: int
    total_active_patients: int
    high_risk_percentage: float


class PredictionSummaryResponse(BaseModel):
    total_predictions: int
    high_risk_patients: int
    critical_patients: int
    average_readmission_probability: float
    active_model: str
    active_version: str
