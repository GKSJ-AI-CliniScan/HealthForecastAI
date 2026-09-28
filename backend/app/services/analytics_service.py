"""Healthcare analytics business logic - Module 6."""

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.patient import Patient
from app.models.prediction import RiskPrediction


def get_hospital_summary(db: Session) -> dict:
    """Real counts, computed live - not fixed numbers."""
    total_patients = db.query(func.count(Patient.id)).scalar() or 0
    total_predictions = db.query(func.count(RiskPrediction.id)).scalar() or 0
    avg_risk = db.query(func.avg(RiskPrediction.readmission_probability)).scalar()

    return {
        "total_patients": total_patients,
        "total_predictions_made": total_predictions,
        "average_readmission_risk": round(avg_risk, 4) if avg_risk is not None else 0.0,
    }


def get_readmission_analytics(db: Session) -> dict:
    """Current risk distribution (latest per patient) + total historical predictions."""
    from app.services.risk_service import _latest_predictions

    latest = _latest_predictions(db).subquery()
    current_distribution = (
        db.query(latest.c.risk_category, func.count(latest.c.id).label("count"))
        .group_by(latest.c.risk_category)
        .all()
    )

    total_predictions_ever_run = db.query(func.count(RiskPrediction.id)).scalar() or 0

    return {
        "current_distribution": [
            {"risk_category": r.risk_category, "count": r.count} for r in current_distribution
        ],
        "total_predictions_ever_run": total_predictions_ever_run,
    }


def get_population_health(db: Session) -> dict:
    """Aggregated, anonymised - no individual patient identifiers."""
    total = db.query(func.count(Patient.id)).scalar() or 0
    by_gender = db.query(Patient.gender, func.count(Patient.id)).group_by(Patient.gender).all()
    by_age = db.query(Patient.age_group, func.count(Patient.id)).group_by(Patient.age_group).all()
    return {
        "total_patients": total,
        "gender_distribution": {g or "unknown": c for g, c in by_gender},
        "age_distribution": {a or "unknown": c for a, c in by_age},
    }
