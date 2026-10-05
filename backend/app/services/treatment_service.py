"""Treatment effectiveness business logic - Module 4."""

from sqlalchemy import Date, cast, func
from sqlalchemy.orm import Session

from app.models.treatment import TreatmentOutcome
from app.schemas.treatment import TreatmentOutcomeCreate


def record_outcome(db: Session, payload: TreatmentOutcomeCreate) -> TreatmentOutcome:
    """Persist a real treatment outcome - no hardcoded results."""
    outcome = TreatmentOutcome(
        patient_id=payload.patient_id,
        admission_id=payload.admission_id,
        treatment_type=payload.treatment_type,
        outcome_status=payload.outcome_status,
        recovery_days=payload.recovery_days,
        effectiveness_score=payload.effectiveness_score,
    )
    db.add(outcome)
    db.commit()
    db.refresh(outcome)
    return outcome


def get_treatment_effectiveness(db: Session, treatment_type: str | None = None) -> dict:
    """Aggregate real stored outcomes - computed live from the database."""
    query = db.query(TreatmentOutcome)
    if treatment_type:
        query = query.filter(TreatmentOutcome.treatment_type == treatment_type)

    total = query.count()
    if total == 0:
        return {
            "treatment_type": treatment_type,
            "total_cases": 0,
            "improved_rate": 0.0,
            "avg_recovery_days": None,
        }

    improved = query.filter(TreatmentOutcome.outcome_status == "improved").count()
    avg_days = (
        query.filter(TreatmentOutcome.recovery_days.isnot(None))
        .with_entities(func.avg(TreatmentOutcome.recovery_days))
        .scalar()
    )

    return {
        "treatment_type": treatment_type,
        "total_cases": total,
        "improved_rate": round(improved / total, 4),
        "avg_recovery_days": round(avg_days, 1) if avg_days is not None else None,
    }


def get_recovery_trends(db: Session) -> list[dict]:
    """Real month-by-day aggregation from stored outcomes - works on SQLite and Postgres."""
    rows = (
        db.query(
            cast(TreatmentOutcome.created_at, Date).label("month"),
            func.avg(TreatmentOutcome.effectiveness_score).label("avg_score"),
            func.count(TreatmentOutcome.id).label("case_count"),
        )
        .group_by(cast(TreatmentOutcome.created_at, Date))
        .order_by(cast(TreatmentOutcome.created_at, Date))
        .all()
    )
    return [
        {
            "month": str(row.month),
            "avg_effectiveness": round(row.avg_score, 3) if row.avg_score is not None else None,
            "case_count": row.case_count,
        }
        for row in rows
    ]


# Add to treatment_service.py
def get_patient_treatment_history(db: Session, patient_id: int) -> list[TreatmentOutcome]:
    return (
        db.query(TreatmentOutcome)
        .filter(TreatmentOutcome.patient_id == patient_id)
        .order_by(TreatmentOutcome.created_at.desc())
        .all()
    )


def get_treatment_method_counts(db: Session) -> list[dict]:
    rows = (
        db.query(
            TreatmentOutcome.treatment_type,
            func.count(TreatmentOutcome.id).label("patient_count"),
        )
        .group_by(TreatmentOutcome.treatment_type)
        .order_by(func.count(TreatmentOutcome.id).desc())
        .all()
    )

    return [
        {
            "treatment_type": row.treatment_type,
            "patient_count": row.patient_count,
        }
        for row in rows
    ]
