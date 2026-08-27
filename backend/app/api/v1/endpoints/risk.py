"""Risk prediction and readmission forecasting endpoints - Module 3."""

from fastapi import APIRouter, Depends

from app.api.deps import CurrentUser, require_permission
from app.core.config import settings
from app.core.rbac import Permission
from app.schemas.prediction import (
    ReadmissionForecast,
    RiskPredictionRead,
    RiskPredictionRequest,
)
from app.services.risk_service import categorise_risk

router = APIRouter()


@router.post("/predict", response_model=RiskPredictionRead, summary="Score one admission")
def predict_risk(
    payload: RiskPredictionRequest,
    user: CurrentUser = Depends(require_permission(Permission.RISK_REPORT_READ)),
) -> RiskPredictionRead:
    """Return the readmission probability and risk band for one admission.

    TODO(milestone-2): load the trained artefact from MODEL_ARTIFACT_DIR and call
    it through app/services/model_service.py instead of the placeholder below.
    """
    probability = 0.0
    return RiskPredictionRead(
        patient_id=payload.patient_id,
        readmission_probability=probability,
        risk_category=categorise_risk(probability),
        model_name=settings.ACTIVE_RISK_MODEL,
        model_version="0.0.0-placeholder",
    )


@router.get("/high-risk", summary="List patients currently in the high risk band")
def list_high_risk_patients(
    user: CurrentUser = Depends(require_permission(Permission.RISK_REPORT_READ)),
) -> list[RiskPredictionRead]:
    """Return the current high risk cohort.

    TODO(milestone-2): query risk_predictions, scoped to the caller's role.
    """
    return []


@router.get("/forecast", response_model=ReadmissionForecast, summary="Readmission forecast")
def readmission_forecast(
    horizon_days: int = 30,
    user: CurrentUser = Depends(require_permission(Permission.READMISSION_FORECAST_READ)),
) -> ReadmissionForecast:
    """Return an aggregated readmission forecast over the requested horizon.

    TODO(milestone-2): aggregate model output per department.
    """
    return ReadmissionForecast(
        scope="hospital",
        horizon_days=horizon_days,
        predicted_readmissions=0,
        predicted_rate=0.0,
    )
