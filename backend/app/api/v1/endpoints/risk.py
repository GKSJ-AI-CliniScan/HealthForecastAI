"""Risk prediction and readmission forecasting endpoints - Module 3."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps import CurrentUser, require_permission
from app.core.config import settings
from app.core.rbac import Permission, Role
from app.db.session import get_db
from app.models.prediction import RiskPrediction
from app.schemas.prediction import (
    ReadmissionForecast,
    RiskPredictionRead,
    RiskPredictionRequest,
)
from app.services import risk_service
from app.services.model_service import ModelNotAvailableError
from app.services.patient_service import list_patients_for_user

router = APIRouter()


@router.post("/predict", response_model=RiskPredictionRead, summary="Score one admission")
def predict_risk(
    payload: RiskPredictionRequest,
    user: CurrentUser = Depends(require_permission(Permission.RISK_REPORT_READ)),
    db: Session = Depends(get_db),
) -> RiskPredictionRead:
    """Score one admission, persist the result, and return it."""
    try:
        probability = risk_service.score_admission(db, payload)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except ModelNotAvailableError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)
        ) from exc

    record = RiskPrediction(
        patient_id=payload.patient_id,
        readmission_probability=probability,
        risk_category=risk_service.categorise_risk(probability),
        model_name=settings.ACTIVE_RISK_MODEL,
        # TODO(milestone-4): pull the real trained version from the MongoDB
        # model_runs registry once it exists, instead of this placeholder.
        model_version="unversioned",
    )
    db.add(record)
    db.commit()
    db.refresh(record)

    return RiskPredictionRead.model_validate(record)


@router.get("/high-risk", summary="List patients currently in the high risk band")
def list_high_risk_patients(
    user: CurrentUser = Depends(require_permission(Permission.RISK_REPORT_READ)),
    db: Session = Depends(get_db),
) -> list[RiskPredictionRead]:
    """Return the current high risk cohort, scoped to what the caller may see.

    "Current" means each patient's most recent prediction - an older
    prediction that happened to be high risk doesn't count if a newer one
    dropped them out of the band.
    """
    visible_patients = list_patients_for_user(db=db, user_id=int(user.subject), role=user.role)
    if user.role not in (Role.DOCTOR, Role.HOSPITAL_ADMIN, Role.SYSTEM_ADMIN):
        return []
    visible_ids = {patient.id for patient in visible_patients}
    if not visible_ids:
        return []

    latest_id_per_patient = (
        select(
            RiskPrediction.patient_id,
            func.max(RiskPrediction.id).label("latest_id"),
        )
        .where(RiskPrediction.patient_id.in_(visible_ids))
        .group_by(RiskPrediction.patient_id)
        .subquery()
    )

    rows = db.scalars(
        select(RiskPrediction)
        .join(latest_id_per_patient, RiskPrediction.id == latest_id_per_patient.c.latest_id)
        .where(RiskPrediction.risk_category == risk_service.RISK_HIGH)
    ).all()

    return [RiskPredictionRead.model_validate(row) for row in rows]


@router.get("/forecast", response_model=ReadmissionForecast, summary="Readmission forecast")
def readmission_forecast(
    horizon_days: int = 30,
    user: CurrentUser = Depends(require_permission(Permission.READMISSION_FORECAST_READ)),
    db: Session = Depends(get_db),
) -> ReadmissionForecast:
    """Return a hospital-wide readmission forecast from current predictions.

    NOTE: the brief's "per department" breakdown isn't possible yet - the
    Admission model has no department column. This aggregates hospital-wide
    only; flag with your mentor whether department needs adding upstream.
    """
    total = db.scalar(select(func.count()).select_from(RiskPrediction)) or 0
    high_risk = (
        db.scalar(
            select(func.count())
            .select_from(RiskPrediction)
            .where(RiskPrediction.risk_category == risk_service.RISK_HIGH)
        )
        or 0
    )
    predicted_rate = (high_risk / total) if total else 0.0

    return ReadmissionForecast(
        scope="hospital",
        horizon_days=horizon_days,
        predicted_readmissions=high_risk,
        predicted_rate=predicted_rate,
    )
