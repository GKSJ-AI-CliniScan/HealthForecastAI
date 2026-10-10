"""Risk prediction and readmission forecasting endpoints - Module 3."""

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps import CurrentUser, require_permission
from app.core.config import settings
from app.core.rbac import Permission
from app.db.session import get_db
from app.models.admission import Admission
from app.models.prediction import RiskPrediction
from app.schemas.prediction import (
    ReadmissionForecast,
    RiskPredictionRead,
    RiskPredictionRequest,
)
from app.services.risk_service import evaluate_patient_risk

router = APIRouter()


@router.post("/predict", response_model=RiskPredictionRead, summary="Score one admission")
def predict_risk(
    payload: RiskPredictionRequest,
    user: CurrentUser = Depends(require_permission(Permission.RISK_REPORT_READ)),
) -> RiskPredictionRead:
    """Return the calibrated readmission probability, risk band, and clinical insights."""
    data = payload.model_dump()
    risk_evaluation = evaluate_patient_risk(data)

    return RiskPredictionRead(
        patient_id=payload.patient_id,
        readmission_probability=risk_evaluation["readmission_probability"],
        risk_category=risk_evaluation["risk_category"],
        model_name=getattr(settings, "ACTIVE_RISK_MODEL", "diabetes_readmission_xgb"),
        model_version="1.0.0",
        contributing_factors=risk_evaluation["contributing_factors"],
        recommended_actions=risk_evaluation["recommended_actions"],
    )


@router.get("/high-risk", summary="List patients currently in the high risk band")
def list_high_risk_patients(
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(require_permission(Permission.RISK_REPORT_READ)),
) -> list[RiskPredictionRead]:
    """Return the latest high-risk prediction for each patient."""

    # Select the latest prediction for each patient.
    latest_prediction = (
        select(
            RiskPrediction.patient_id,
            RiskPrediction.id.label("prediction_id"),
            RiskPrediction.admission_id,
            RiskPrediction.readmission_probability,
            RiskPrediction.risk_category,
            RiskPrediction.model_name,
            RiskPrediction.model_version,
            RiskPrediction.created_at,
        )
        .where(RiskPrediction.risk_category == "high")
        .order_by(
            RiskPrediction.patient_id,
            RiskPrediction.created_at.desc(),
        )
        .distinct(RiskPrediction.patient_id)
        .subquery()
    )

    stmt = (
        select(
            latest_prediction.c.patient_id,
            latest_prediction.c.readmission_probability,
            latest_prediction.c.risk_category,
            latest_prediction.c.model_name,
            latest_prediction.c.model_version,
            latest_prediction.c.created_at,
            Admission.time_in_hospital,
            Admission.number_inpatient,
            Admission.number_emergency,
            Admission.num_medications,
            Admission.A1Cresult,
        )
        .join(
            Admission,
            Admission.id == latest_prediction.c.admission_id,
            isouter=True,
        )
        .order_by(latest_prediction.c.readmission_probability.desc())
        .limit(50)
    )

    rows = db.execute(stmt).all()

    results: list[RiskPredictionRead] = []

    for row in rows:
        factors: list[str] = []

        if row.number_inpatient:
            factors.append(
                f"High inpatient utilization "
                f"({row.number_inpatient} admissions in prior 12 months)"
            )

        if row.number_emergency:
            factors.append(
                f"Frequent emergency department encounters " f"({row.number_emergency} visits)"
            )

        if row.time_in_hospital and row.time_in_hospital >= 7:
            factors.append(f"Extended hospital length of stay " f"({row.time_in_hospital} days)")

        if row.num_medications and row.num_medications >= 15:
            factors.append(
                f"Polypharmacy detected " f"({row.num_medications} active prescribed medications)"
            )

        if row.A1Cresult == ">8":
            factors.append("Poor glycemic management (HbA1c level exceeds 8%)")

        actions: list[str] = [
            "Schedule post-discharge primary care follow-up within 48 to 72 hours",
            "Enroll patient in community-based transition care program",
        ]

        if row.num_medications and row.num_medications >= 15:
            actions.append("Conduct clinical pharmacist medication reconciliation before discharge")

        if row.time_in_hospital and row.time_in_hospital >= 7:
            actions.append("Arrange dedicated care coordination and discharge nurse review")

        if row.A1Cresult == ">8":
            actions.append("Order outpatient endocrine or certified diabetes educator consultation")

        results.append(
            RiskPredictionRead(
                patient_id=row.patient_id,
                readmission_probability=row.readmission_probability,
                risk_category=row.risk_category,
                model_name=row.model_name,
                model_version=row.model_version,
                contributing_factors=factors,
                recommended_actions=actions,
                created_at=row.created_at,
            )
        )

    return results


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
    """Return a database-backed readmission forecast."""

    # Get the latest prediction for each patient.
    latest_predictions = (
        select(RiskPrediction)
        .distinct(RiskPrediction.patient_id)
        .order_by(
            RiskPrediction.patient_id,
            RiskPrediction.created_at.desc(),
            RiskPrediction.id.desc(),
        )
        .subquery()
    )

    # Aggregate the latest patient-level predictions.
    summary = db.execute(
        select(
            func.count().label("patient_count"),
            func.avg(latest_predictions.c.readmission_probability).label("average_probability"),
            func.sum(latest_predictions.c.readmission_probability).label("expected_readmissions"),
        )
    ).one()

    patient_count = int(summary.patient_count or 0)
    average_probability = float(summary.average_probability or 0.0)
    expected_readmissions_30d = float(summary.expected_readmissions or 0.0)

    if patient_count == 0:
        return ReadmissionForecast(
            scope="hospital",
            horizon_days=horizon_days,
            predicted_readmissions=0,
            predicted_rate=0.0,
        )

    # Scale the 30-day expectation according to the requested horizon.
    horizon_factor = max(horizon_days, 1) / 30.0

    predicted_readmissions = int(round(expected_readmissions_30d * horizon_factor))

    predicted_rate = min(
        average_probability * horizon_factor,
        1.0,
    )

    return ReadmissionForecast(
        scope="hospital",
        horizon_days=horizon_days,
        predicted_readmissions=predicted_readmissions,
        predicted_rate=round(predicted_rate, 4),
    )
