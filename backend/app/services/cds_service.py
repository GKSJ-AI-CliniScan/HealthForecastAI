# ruff: noqa: E402


"""Clinical decision support business logic."""

import sys
from pathlib import Path

ML_ROOT = Path(__file__).resolve().parents[3] / "ml"
if str(ML_ROOT) not in sys.path:
    sys.path.insert(0, str(ML_ROOT))

from sqlalchemy.orm import Session
from src.serving import insights_loader

from app.models.admission import Admission
from app.models.patient import Patient
from app.models.prediction import RiskPrediction
from app.models.treatment import TreatmentOutcome


def get_care_recommendations(db: Session, patient_id: int) -> tuple[list[str], int | None]:
    """Generate care and follow-up recommendations for a patient."""

    patient = db.query(Patient).filter(Patient.id == patient_id).one_or_none()
    if patient is None:
        return [], None

    recommendations: list[str] = []

    prediction = (
        db.query(RiskPrediction)
        .filter(RiskPrediction.patient_id == patient_id)
        .order_by(RiskPrediction.created_at.desc())
        .first()
    )

    admissions = (
        db.query(Admission)
        .filter(Admission.patient_id == patient_id)
        .order_by(Admission.admission_date.desc())
        .all()
    )

    treatments = (
        db.query(TreatmentOutcome)
        .join(Admission, TreatmentOutcome.admission_id == Admission.id)
        .filter(Admission.patient_id == patient_id)
        .all()
    )

    if prediction is not None:
        if prediction.risk_category == "high":
            recommendations.append(
                "Prioritise close follow-up because the patient is in the high-risk band."
            )
        elif prediction.risk_category == "medium":
            recommendations.append(
                "Schedule routine follow-up because the patient is in the medium-risk band."
            )
        else:
            recommendations.append(
                "Continue routine monitoring because the patient is in the low-risk band."
            )

    recent_readmission = any(admission.readmitted == "<30" for admission in admissions)

    if recent_readmission:
        recommendations.append(
            "Review the patient's recent readmission history and reinforce follow-up care."
        )

    if treatments:
        recovery_scores = [
            treatment.recovery_score
            for treatment in treatments
            if treatment.recovery_score is not None
        ]

        if recovery_scores and sum(recovery_scores) / len(recovery_scores) < 70:
            recommendations.append(
                "Review treatment response because the recorded recovery score is below 70."
            )

    if not recommendations:
        recommendations.append("Continue routine clinical monitoring.")

    follow_up_days = 7 if prediction and prediction.risk_category == "high" else 14

    return recommendations, follow_up_days


def get_discharge_plan(db: Session, patient_id: int) -> tuple[list[str], bool | None]:
    """Assess discharge readiness using risk, length of stay and treatment response."""

    patient = db.query(Patient).filter(Patient.id == patient_id).one_or_none()
    if patient is None:
        return [], None

    prediction = (
        db.query(RiskPrediction)
        .filter(RiskPrediction.patient_id == patient_id)
        .order_by(RiskPrediction.created_at.desc())
        .first()
    )

    latest_admission = (
        db.query(Admission)
        .filter(Admission.patient_id == patient_id)
        .order_by(Admission.admission_date.desc())
        .first()
    )

    risk_mitigation: list[str] = []
    ready_for_discharge = True

    if prediction is not None and prediction.risk_category == "high":
        risk_mitigation.append(
            "Arrange close post-discharge follow-up because of high readmission risk."
        )
        ready_for_discharge = False

    if (
        latest_admission is not None
        and latest_admission.time_in_hospital is not None
        and latest_admission.time_in_hospital > 7
    ):
        risk_mitigation.append("Review the prolonged hospital stay before discharge.")
        ready_for_discharge = False

    treatments = (
        db.query(TreatmentOutcome)
        .join(Admission, TreatmentOutcome.admission_id == Admission.id)
        .filter(Admission.patient_id == patient_id)
        .all()
    )

    recovery_scores = [
        treatment.recovery_score for treatment in treatments if treatment.recovery_score is not None
    ]

    if recovery_scores:
        average_recovery = sum(recovery_scores) / len(recovery_scores)

        if average_recovery < 70:
            risk_mitigation.append(
                "Review treatment response before discharge because recovery remains below 70."
            )
            ready_for_discharge = False

    if not risk_mitigation:
        risk_mitigation.append(
            "No additional risk mitigation was identified from the available data."
        )

    return risk_mitigation, ready_for_discharge


def get_risk_drivers(db: Session, patient_id: int) -> tuple[list[dict], str, str]:
    """Return ML risk drivers for a patient.

    Patient-specific SHAP drivers are used when available.
    Otherwise, fall back to population-level global drivers.
    """

    patient = db.query(Patient).filter(Patient.id == patient_id).one_or_none()

    if patient is None:
        return [], "none", ""

    latest_admission = (
        db.query(Admission)
        .filter(Admission.patient_id == patient_id)
        .order_by(Admission.admission_date.desc(), Admission.id.desc())
        .first()
    )

    if latest_admission is None or latest_admission.encounter_id is None:
        drivers = insights_loader.get_global_drivers(5)
        return drivers, "population-level", "xgboost-202609051057"

    drivers = insights_loader.get_patient_drivers(
        latest_admission.encounter_id,
        top_n=5,
    )

    if drivers is not None:
        source = "patient-specific"
    else:
        drivers = insights_loader.get_global_drivers(5)
        source = "population-level"

    model_version = insights_loader.get_model_version()

    return drivers, source, model_version
