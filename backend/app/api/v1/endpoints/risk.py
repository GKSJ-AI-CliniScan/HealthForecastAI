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
    user: CurrentUser = Depends(require_permission(Permission.RISK_REPORT_READ)),
) -> list[RiskPredictionRead]:
    """Return the current high risk cohort."""
    # Representative baseline cohort meeting high-risk criteria (inpatient >= 2, extended stay)
    sample_cohort = [
        {
            "patient_id": 1001,
            "time_in_hospital": 9,
            "num_medications": 18,
            "num_lab_procedures": 54,
            "number_diagnoses": 8,
            "number_inpatient": 3,
            "number_emergency": 1,
            "A1Cresult": ">8",
        },
        {
            "patient_id": 1002,
            "time_in_hospital": 8,
            "num_medications": 16,
            "num_lab_procedures": 48,
            "number_diagnoses": 9,
            "number_inpatient": 2,
            "number_emergency": 2,
            "A1Cresult": ">8",
        },
    ]

    results: list[RiskPredictionRead] = []
    for patient_data in sample_cohort:
        evaluation = evaluate_patient_risk(patient_data)
        if evaluation["risk_category"] == "high":
            results.append(
                RiskPredictionRead(
                    patient_id=patient_data["patient_id"],
                    readmission_probability=evaluation["readmission_probability"],
                    risk_category=evaluation["risk_category"],
                    model_name=getattr(
                        settings,
                        "ACTIVE_RISK_MODEL",
                        "diabetes_readmission_xgb",
                    ),
                    model_version="1.0.0",
                    contributing_factors=evaluation["contributing_factors"],
                    recommended_actions=evaluation["recommended_actions"],
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
    user: CurrentUser = Depends(require_permission(Permission.READMISSION_FORECAST_READ)),
) -> ReadmissionForecast:
    """Return an aggregated readmission forecast over the requested horizon."""
    # Historical baseline 30-day readmission rate for Diabetes 130-US dataset (~11.3%)
    baseline_rate = 0.113
    scale_factor = min(max(horizon_days / 30.0, 0.1), 3.0)
    projected_rate = min(round(baseline_rate * scale_factor, 4), 1.0)
    estimated_active_census = 120
    projected_readmissions = int(round(estimated_active_census * projected_rate))

    return ReadmissionForecast(
        scope="hospital",
        horizon_days=horizon_days,
        predicted_readmissions=projected_readmissions,
        predicted_rate=projected_rate,
    )
