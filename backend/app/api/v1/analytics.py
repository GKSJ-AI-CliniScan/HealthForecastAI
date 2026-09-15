"""Analytics API endpoints returning real aggregated prediction intelligence."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_active_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.prediction import (
    HighRiskPatientListResponse,
    PredictionSummaryResponse,
    ReadmissionTrendsResponse,
    RiskDistributionResponse,
)
from app.services.prediction_service import PredictionService

router = APIRouter(prefix="/analytics", tags=["Clinical Analytics"])


@router.get(
    "/risk-distribution",
    response_model=RiskDistributionResponse,
    summary="Risk Category Distribution",
    description="Calculate aggregated counts and percentages across LOW, MEDIUM, HIGH, CRITICAL bands.",
)
def get_risk_distribution(
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: Annotated[Session, Depends(get_db)],
) -> RiskDistributionResponse:
    service = PredictionService(db)
    return service.get_risk_distribution()


@router.get(
    "/readmission-trends",
    response_model=ReadmissionTrendsResponse,
    summary="Readmission Risk Trends",
    description="Retrieve daily readmission risk trends over time from stored predictions.",
)
def get_readmission_trends(
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: Annotated[Session, Depends(get_db)],
) -> ReadmissionTrendsResponse:
    service = PredictionService(db)
    return service.get_readmission_trends()


@router.get(
    "/high-risk-patients",
    response_model=HighRiskPatientListResponse,
    summary="High-Risk Patients Analytics",
    description="Retrieve current high-risk cases for hospital monitoring.",
)
def get_high_risk_patients_analytics(
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: Annotated[Session, Depends(get_db)],
) -> HighRiskPatientListResponse:
    service = PredictionService(db)
    return service.list_high_risk_patients(current_user=current_user, page=1, page_size=100)


@router.get(
    "/prediction-summary",
    response_model=PredictionSummaryResponse,
    summary="Prediction Intelligence Summary",
    description="Retrieve KPI metrics for clinical prediction dashboards.",
)
def get_prediction_summary(
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: Annotated[Session, Depends(get_db)],
) -> PredictionSummaryResponse:
    service = PredictionService(db)
    return service.get_prediction_summary()
