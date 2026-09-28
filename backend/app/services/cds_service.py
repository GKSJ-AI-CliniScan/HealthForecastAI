"""Clinical decision support - rule-based recommendations from real data."""

from sqlalchemy.orm import Session

from app.models.patient import Patient
from app.models.prediction import RiskPrediction


def get_care_recommendations(db: Session, patient_id: int) -> list[str]:
    """Generate recommendations from the patient's actual latest risk score."""
    latest = (
        db.query(RiskPrediction)
        .filter(RiskPrediction.patient_id == patient_id)
        .order_by(RiskPrediction.created_at.desc())
        .first()
    )
    if latest is None:
        return ["No risk assessment on file yet — schedule an initial evaluation."]

    recommendations = []
    if latest.risk_category == "high":
        recommendations += [
            "Schedule follow-up appointment within 7 days of discharge.",
            "Consider home health monitoring.",
            "Review medication adherence with patient.",
        ]
    elif latest.risk_category == "medium":
        recommendations.append("Schedule follow-up appointment within 14 days.")
    else:
        recommendations.append("Standard discharge follow-up applies.")

    return recommendations


def get_discharge_plan(db: Session, patient_id: int) -> dict:
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if patient is None:
        return {"error": "Patient not found"}

    recommendations = get_care_recommendations(db, patient_id)
    return {
        "patient_id": patient_id,
        "recommendations": recommendations,
        "requires_close_monitoring": len(recommendations) > 1,
    }