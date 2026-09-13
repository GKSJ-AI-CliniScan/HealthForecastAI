"""Risk prediction and readmission forecasting endpoints - Module 3."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps import CurrentUser, require_permission
from app.core.config import settings
from app.core.rbac import Permission
from app.db.session import get_db
from app.models.patient import Patient
from app.models.prediction import RiskPrediction
from app.schemas.prediction import (
    ReadmissionForecast,
    RiskDriversRead,
    RiskPredictionRead,
    RiskPredictionRequest,
)
from app.services.clinical_insight_service import (
    generate_clinical_insights,
)
from app.services.model_service import (
    MODEL_VERSION,
    get_risk_drivers,
    predict_readmission,
)
from app.services.risk_service import categorise_risk

router = APIRouter()


@router.post("/predict", response_model=RiskPredictionRead, summary="Score one admission")
def predict_risk(
    payload: RiskPredictionRequest,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(require_permission(Permission.RISK_REPORT_READ)),
) -> RiskPredictionRead:
    """Predict readmission risk and persist the result."""

    patient = db.get(Patient, payload.patient_id)

    if patient is None:
        raise HTTPException(
            status_code=404,
            detail=f"Patient {payload.patient_id} not found",
        )

    probability = predict_readmission(
        time_in_hospital=payload.time_in_hospital,
        num_medications=payload.num_medications,
        num_lab_procedures=payload.num_lab_procedures,
        number_diagnoses=payload.number_diagnoses,
        number_inpatient=payload.number_inpatient,
        number_emergency=payload.number_emergency,
        age_group=payload.age_group or patient.age_group,
    )

    risk_category = categorise_risk(probability)

    prediction = RiskPrediction(
        patient_id=payload.patient_id,
        readmission_probability=probability,
        risk_category=risk_category,
        model_name=settings.ACTIVE_RISK_MODEL,
        model_version=MODEL_VERSION,
    )

    db.add(prediction)
    db.commit()
    db.refresh(prediction)

    return RiskPredictionRead.model_validate(prediction)


@router.post(
    "/drivers",
    response_model=RiskDriversRead,
    summary="Explain patient risk prediction",
)
def risk_drivers(
    payload: RiskPredictionRequest,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(require_permission(Permission.RISK_REPORT_READ)),
) -> RiskDriversRead:
    """Return model-derived feature contributions for a patient."""

    patient = db.get(Patient, payload.patient_id)

    if patient is None:
        raise HTTPException(
            status_code=404,
            detail=f"Patient {payload.patient_id} not found",
        )

    probability, drivers = get_risk_drivers(
        time_in_hospital=payload.time_in_hospital,
        num_medications=payload.num_medications,
        num_lab_procedures=payload.num_lab_procedures,
        number_diagnoses=payload.number_diagnoses,
        number_inpatient=payload.number_inpatient,
        number_emergency=payload.number_emergency,
        age_group=payload.age_group or patient.age_group,
    )

    risk_category = categorise_risk(probability)

    insights = generate_clinical_insights(
        probability=probability,
        risk_category=risk_category,
        drivers=drivers,
    )

    return RiskDriversRead(
        patient_id=payload.patient_id,
        probability=probability,
        model_name=settings.ACTIVE_RISK_MODEL,
        model_version=MODEL_VERSION,
        drivers=drivers,
        insights=insights,
    )


@router.get(
    "/high-risk",
    response_model=list[RiskPredictionRead],
    summary="List patients currently in the high risk band",
)
def list_high_risk_patients(
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(require_permission(Permission.RISK_REPORT_READ)),
) -> list[RiskPredictionRead]:
    """Return the latest high-risk prediction for each patient."""

    latest_prediction = select(
        RiskPrediction.id,
        func.row_number()
        .over(
            partition_by=RiskPrediction.patient_id,
            order_by=RiskPrediction.created_at.desc(),
        )
        .label("row_number"),
    ).subquery()

    statement = (
        select(RiskPrediction)
        .join(
            latest_prediction,
            RiskPrediction.id == latest_prediction.c.id,
        )
        .where(
            latest_prediction.c.row_number == 1,
            RiskPrediction.risk_category == "high",
        )
        .order_by(RiskPrediction.created_at.desc())
    )

    predictions = db.scalars(statement).all()

    return [RiskPredictionRead.model_validate(prediction) for prediction in predictions]


@router.get(
    "/forecast",
    response_model=ReadmissionForecast,
    summary="Readmission forecast",
)
def readmission_forecast(
    horizon_days: int = 30,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(require_permission(Permission.READMISSION_FORECAST_READ)),
) -> ReadmissionForecast:
    """Return an aggregated readmission forecast from stored predictions."""

    if horizon_days <= 0 or horizon_days > 365:
        raise HTTPException(
            status_code=422,
            detail="horizon_days must be between 1 and 365",
        )

    predictions = db.scalars(
        select(RiskPrediction).order_by(RiskPrediction.created_at.desc())
    ).all()

    if not predictions:
        return ReadmissionForecast(
            scope="hospital",
            horizon_days=horizon_days,
            predicted_readmissions=0.0,
            predicted_rate=0.0,
        )

    latest_predictions: dict[int, RiskPrediction] = {}

    for prediction in predictions:
        if prediction.patient_id not in latest_predictions:
            latest_predictions[prediction.patient_id] = prediction

    probabilities = [
        prediction.readmission_probability for prediction in latest_predictions.values()
    ]

    predicted_readmissions = sum(probabilities)
    predicted_rate = predicted_readmissions / len(probabilities)

    return ReadmissionForecast(
        scope="hospital",
        horizon_days=horizon_days,
        predicted_readmissions=predicted_readmissions,
        predicted_rate=predicted_rate,
    )
