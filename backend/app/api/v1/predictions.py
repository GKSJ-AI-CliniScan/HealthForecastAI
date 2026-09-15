"""Prediction API endpoints for readmission forecasting and risk intelligence."""

from __future__ import annotations

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_active_user, require_roles
from app.db.session import get_db
from app.models.user import User
from app.schemas.prediction import (
    HighRiskPatientListResponse,
    PredictionListResponse,
    PredictionResponse,
    ReadmissionPredictRequest,
)
from app.services.prediction_service import PredictionService

router = APIRouter(prefix="", tags=["Risk Prediction & Intelligence"])


@router.post(
    "/predictions/readmission",
    response_model=PredictionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Generate Readmission Prediction",
    description=(
        "Trigger AI hospital readmission risk prediction for a patient. "
        "Validates patient assignment for DOCTOR, allows HOSPITAL_ADMIN and SYSTEM_ADMIN."
    ),
    dependencies=[Depends(require_roles("DOCTOR", "HOSPITAL_ADMIN", "SYSTEM_ADMIN"))],
)
def generate_readmission_prediction(
    payload: ReadmissionPredictRequest,
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: Annotated[Session, Depends(get_db)],
) -> PredictionResponse:
    service = PredictionService(db)
    return service.generate_readmission_prediction(
        patient_id=payload.patient_id,
        current_user=current_user,
        override_features=payload.override_features,
    )


@router.get(
    "/predictions",
    response_model=PredictionListResponse,
    summary="List Prediction History",
    description="Retrieve paginated prediction history with optional risk category filtering and role scoping.",
)
def list_predictions(
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: Annotated[Session, Depends(get_db)],
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    risk_category: str | None = Query(
        None, description="Filter by risk category: LOW, MEDIUM, HIGH, CRITICAL"
    ),
    patient_id: uuid.UUID | None = Query(None, description="Filter by specific patient"),
) -> PredictionListResponse:
    service = PredictionService(db)
    return service.list_predictions(
        current_user=current_user,
        page=page,
        page_size=page_size,
        patient_id=patient_id,
        risk_category=risk_category,
    )


@router.get(
    "/predictions/high-risk",
    response_model=PredictionListResponse,
    summary="List High-Risk Predictions",
    description="Filter predictions where risk category is HIGH or CRITICAL.",
)
def list_high_risk_predictions(
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: Annotated[Session, Depends(get_db)],
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
) -> PredictionListResponse:
    service = PredictionService(db)
    return service.list_predictions(
        current_user=current_user,
        page=page,
        page_size=page_size,
        risk_category="HIGH",
    )


@router.get(
    "/predictions/{prediction_id}",
    response_model=PredictionResponse,
    summary="Get Prediction Detail",
    description="Retrieve detailed prediction record with contributing factors and clinical insights.",
)
def get_prediction_detail(
    prediction_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: Annotated[Session, Depends(get_db)],
) -> PredictionResponse:
    service = PredictionService(db)
    return service.get_prediction_by_id(prediction_id, current_user)


@router.get(
    "/patients/{patient_id}/predictions",
    response_model=list[PredictionResponse],
    summary="Get Patient Prediction History",
    description="Retrieve chronological list of predictions generated for a patient.",
)
def get_patient_predictions(
    patient_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: Annotated[Session, Depends(get_db)],
) -> list[PredictionResponse]:
    service = PredictionService(db)
    return service.get_patient_predictions(patient_id, current_user)


@router.get(
    "/patients/high-risk",
    response_model=HighRiskPatientListResponse,
    summary="List High-Risk Inpatients",
    description=(
        "Retrieve patients whose latest prediction is HIGH or CRITICAL. "
        "Doctors receive only assigned patients. Hospital Admins and System Admins receive all."
    ),
)
def list_high_risk_patients(
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: Annotated[Session, Depends(get_db)],
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    category: str | None = Query(None, description="Optional category filter: HIGH or CRITICAL"),
) -> HighRiskPatientListResponse:
    service = PredictionService(db)
    return service.list_high_risk_patients(
        current_user=current_user,
        page=page,
        page_size=page_size,
        category=category,
    )
