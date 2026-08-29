"""Risk prediction and readmission forecasting endpoints - Module 3.

Every route is guarded by a permission and then scoped by row, so a doctor with a
valid token still only reaches their own patients. A missing model artefact is a
503, never a zero probability dressed up as a successful answer.
"""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import (
    VerifiedUser,
    get_db,
    require_verified_permission,
)
from app.core.rbac import Permission
from app.schemas.prediction import (
    ReadmissionForecast,
    RiskPredictionRead,
    RiskPredictionRequest,
)
from app.services import model_service, risk_service

router = APIRouter()

_read_risk = require_verified_permission(Permission.RISK_REPORT_READ)
_read_forecast = require_verified_permission(Permission.READMISSION_FORECAST_READ)


def _model_unavailable(exc: Exception) -> HTTPException:
    """Build the 503 returned when no usable artefact is on disk."""
    return HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc))


@router.post("/predict", response_model=RiskPredictionRead, summary="Score one admission")
def predict_risk(
    payload: RiskPredictionRequest,
    db: Session = Depends(get_db),
    caller: VerifiedUser = Depends(_read_risk),
) -> RiskPredictionRead:
    """Return and store the readmission probability and band for one admission."""
    try:
        prediction = risk_service.score_admission(db, caller, payload.model_dump())
    except risk_service.PatientOutOfScopeError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except model_service.ModelUnavailableError as exc:
        raise _model_unavailable(exc) from exc
    return RiskPredictionRead.model_validate(prediction)


@router.get(
    "/high-risk",
    response_model=list[RiskPredictionRead],
    summary="List patients currently in the high risk band",
)
def list_high_risk_patients(
    limit: int = Query(default=50, ge=1, le=200),
    db: Session = Depends(get_db),
    caller: VerifiedUser = Depends(_read_risk),
) -> list[RiskPredictionRead]:
    """Return the high risk cohort, scoped to what the caller may see."""
    rows = risk_service.latest_predictions(db, caller, category=risk_service.RISK_HIGH, limit=limit)
    return [RiskPredictionRead.model_validate(row) for row in rows]


@router.get("/forecast", response_model=ReadmissionForecast, summary="Readmission forecast")
def readmission_forecast(
    horizon_days: int = Query(default=30, ge=1, le=365),
    db: Session = Depends(get_db),
    caller: VerifiedUser = Depends(_read_forecast),
) -> ReadmissionForecast:
    """Return an aggregated readmission forecast over the requested horizon."""
    return ReadmissionForecast(**risk_service.forecast(db, caller, horizon_days))
