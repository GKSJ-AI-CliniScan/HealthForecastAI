"""Risk prediction and readmission forecasting endpoints - Module 3.

Milestone 2.
"""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import require_permission
from app.core.rbac import Permission
from app.db.session import get_db
from app.models.user import User
from app.schemas.prediction import (
    ReadmissionForecast,
    RiskDriver,
    RiskPredictionRead,
    RiskPredictionRequest,
    ScoredPatientPage,
)
from app.services import model_service, patient_service, risk_service

router = APIRouter()

DbSession = Annotated[Session, Depends(get_db)]
CanReadRisk = Annotated[User, Depends(require_permission(Permission.RISK_REPORT_READ))]
CanReadForecast = Annotated[User, Depends(require_permission(Permission.READMISSION_FORECAST_READ))]

MODEL_UNAVAILABLE = HTTPException(
    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
    detail=("No risk model is loaded. Train one with: cd ml && python -m src.models.train"),
)


@router.post("/predict", response_model=RiskPredictionRead, summary="Score one encounter")
def predict_risk(
    payload: RiskPredictionRequest, user: CanReadRisk, db: DbSession
) -> RiskPredictionRead:
    """Score a single encounter and store the result.

    The model was fitted on the full encounter record; a request carries fewer
    fields, and the pipeline's fitted imputers fill the rest. The response
    reports `features_supplied` against `features_expected` so the caller can
    see how much of the prediction rests on imputed values.
    """
    supplied = payload.model_dump(exclude={"patient_id", "persist"}, exclude_none=True)
    result = risk_service.predict_one(supplied)
    if result is None:
        raise MODEL_UNAVAILABLE

    # A doctor may only score a patient on their own caseload.
    patient = patient_service.get_patient(db, user, payload.patient_id)
    if patient is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found")

    if payload.persist:
        risk_service.store_prediction(
            db,
            patient_id=payload.patient_id,
            probability=result["readmission_probability"],
            model_name=result["model_name"],
            model_version=result["model_version"],
        )

    return RiskPredictionRead(patient_id=payload.patient_id, **result)


@router.get(
    "/patients/{patient_id}",
    response_model=RiskPredictionRead,
    summary="Latest stored risk score for a patient",
)
def patient_risk(patient_id: int, user: CanReadRisk, db: DbSession) -> RiskPredictionRead:
    """Return the most recent stored prediction for one patient."""
    if patient_service.get_patient(db, user, patient_id) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found")

    prediction = risk_service.latest_for_patient(db, patient_id)
    if prediction is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="This patient has not been scored yet. Run: python -m src.models.score",
        )

    model = model_service.load_model()
    probability = float(prediction.readmission_probability)
    return RiskPredictionRead(
        patient_id=patient_id,
        readmission_probability=probability,
        risk_category=prediction.risk_category,
        flagged=probability >= (model.decision_threshold if model else 0.5),
        decision_threshold=model.decision_threshold if model else 0.5,
        model_name=prediction.model_name,
        model_version=prediction.model_version,
        created_at=prediction.created_at,
    )


@router.get("/high-risk", response_model=ScoredPatientPage, summary="High risk cohort")
def list_high_risk_patients(
    user: CanReadRisk,
    db: DbSession,
    category: str = Query(default="high", pattern="^(high|medium|low)$"),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
) -> ScoredPatientPage:
    """Return the patients currently in a risk band, highest probability first.

    Scoped like every other patient endpoint: a doctor sees only their caseload.
    """
    cohort, total = risk_service.high_risk_cohort(
        db, user, category=category, limit=limit, offset=offset
    )
    return ScoredPatientPage(items=cohort, total=total, limit=limit, offset=offset)


@router.get("/distribution", summary="How many patients sit in each risk band")
def distribution(user: CanReadRisk, db: DbSession) -> dict[str, int]:
    """Return the risk band counts, scoped to the caller."""
    return risk_service.risk_distribution(db, user)


@router.get("/forecast", response_model=ReadmissionForecast, summary="Readmission forecast")
def readmission_forecast(
    user: CanReadForecast, db: DbSession, horizon_days: int = Query(default=30, ge=1, le=365)
) -> ReadmissionForecast:
    """Forecast readmissions over the requested horizon.

    The expected count sums the individual probabilities rather than counting
    flagged patients - that is the unbiased estimate of how many events occur.
    """
    return ReadmissionForecast(**risk_service.forecast(db, user, horizon_days=horizon_days))


@router.get("/calibration", summary="Predicted rate against observed, per band")
def calibration(user: CanReadForecast, db: DbSession) -> dict[str, object]:
    """Compare the forecast with what the record actually shows.

    A forecast nobody checks is a number, not a workflow. If the predicted and
    observed rates diverge, the model needs retraining.
    """
    return risk_service.observed_vs_expected(db)


@router.get("/drivers", response_model=list[RiskDriver], summary="What the model keys on")
def risk_drivers(
    user: CanReadRisk, limit: int = Query(default=10, ge=1, le=50)
) -> list[RiskDriver]:
    """Return the model's strongest risk drivers.

    A risk score with no explanation is not something a clinician can act on.
    These are global drivers for the model; per-patient attribution arrives with
    the clinical decision support module in Milestone 3.
    """
    drivers = risk_service.explain(limit=limit)
    if not drivers and not model_service.is_loaded():
        raise MODEL_UNAVAILABLE
    return [RiskDriver(**driver) for driver in drivers]
