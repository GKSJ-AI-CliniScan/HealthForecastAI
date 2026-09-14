"""Risk prediction and readmission forecasting endpoints - Module 3."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import CurrentUser, require_permission
from app.core.config import settings
from app.core.rbac import Permission
from app.db.session import get_db
from app.models.admission import Admission
from app.models.patient import Patient
from app.schemas.prediction import (
    ReadmissionForecast,
    RiskPredictionRead,
    RiskPredictionRequest,
)
from app.services import model_service
from app.services.risk_service import categorise_risk
from app.services.risk_service import save_prediction

router = APIRouter()


@router.post("/predict", response_model=RiskPredictionRead, summary="Score one admission")
def predict_risk(
    payload: RiskPredictionRequest,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(require_permission(Permission.RISK_REPORT_READ)),
) -> RiskPredictionRead:
    """Return the readmission probability and risk band for one admission."""
    patient = db.get(Patient, payload.patient_id)
    admission = (
        db.query(Admission)
        .filter(Admission.patient_id == payload.patient_id)
        .order_by(Admission.id.desc())
        .first()
    )
    if patient is None or admission is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient or admission not found")

    probability = model_service.predict_probability(patient, admission)
    prediction = save_prediction(db, payload.patient_id, probability, settings.ACTIVE_RISK_MODEL, "1.0.0")
    return RiskPredictionRead.model_validate(prediction)


@router.get("/high-risk", summary="List patients currently in the high risk band")
def list_high_risk_patients(
    user: CurrentUser = Depends(require_permission(Permission.RISK_REPORT_READ)),
) -> list[RiskPredictionRead]:
    """Return the current high risk cohort.

    TODO(milestone-2): query risk_predictions, scoped to the caller's role.
    Owned by the Backend/Database teammate - see the Milestone 2 task split.
    """
    return []


@router.get("/forecast", response_model=ReadmissionForecast, summary="Readmission forecast")
def readmission_forecast(
    horizon_days: int = 30,
    user: CurrentUser = Depends(require_permission(Permission.READMISSION_FORECAST_READ)),
) -> ReadmissionForecast:
    """Return an aggregated readmission forecast over the requested horizon.

    TODO(milestone-2): aggregate model output per department.
    Owned by the Backend/Database teammate - see the Milestone 2 task split.
    """
    return ReadmissionForecast(
        scope="hospital",
        horizon_days=horizon_days,
        predicted_readmissions=0,
        predicted_rate=0.0,
    )