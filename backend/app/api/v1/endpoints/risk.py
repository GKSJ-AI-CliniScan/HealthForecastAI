"""Risk prediction and readmission forecasting endpoints - Module 3."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import (
    CurrentUser,
    VerifiedUser,
    require_permission,
    require_verified_permission,
)
from app.core.config import settings
from app.core.rbac import Permission
from app.db.session import get_db
from app.schemas.prediction import (
    ReadmissionForecast,
    RiskPredictionRead,
    RiskPredictionRequest,
)
from app.services.risk_service import (
    categorise_risk,
    get_readmission_forecast,
    list_high_risk_predictions,
)

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
    db: Session = Depends(get_db),
    caller: VerifiedUser = Depends(require_verified_permission(Permission.RISK_REPORT_READ)),
) -> list[RiskPredictionRead]:
    """Return high-risk predictions visible to the caller."""

    predictions = list_high_risk_predictions(db, caller)

    return [RiskPredictionRead.model_validate(prediction) for prediction in predictions]


@router.get(
    "/forecast",
    response_model=ReadmissionForecast,
    summary="Readmission forecast",
)
def readmission_forecast(
    horizon_days: int = 30,
    db: Session = Depends(get_db),
    caller: VerifiedUser = Depends(
        require_verified_permission(Permission.READMISSION_FORECAST_READ)
    ),
) -> ReadmissionForecast:
    """Return an aggregated readmission forecast over the requested horizon."""

    predicted_readmissions, predicted_rate = get_readmission_forecast(db, caller, horizon_days)

    return ReadmissionForecast(
        scope="hospital",
        horizon_days=horizon_days,
        predicted_readmissions=predicted_readmissions,
        predicted_rate=predicted_rate,
    )
