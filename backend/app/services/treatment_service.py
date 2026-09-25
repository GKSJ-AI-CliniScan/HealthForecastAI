"""Business logic for treatment effectiveness reporting."""

from sqlalchemy import case, func, select
from sqlalchemy.orm import Session

from app.models.treatment import TreatmentOutcome


def get_treatment_effectiveness(
    db: Session,
) -> list[dict[str, float | int | str]]:
    """Return observed treatment effectiveness metrics."""

    readmission_rate = func.avg(
        case(
            (TreatmentOutcome.outcome != "NO", 1.0),
            else_=0.0,
        )
    )

    stmt = (
        select(
            TreatmentOutcome.treatment_name,
            func.count(TreatmentOutcome.id).label("patients_treated"),
            func.avg(TreatmentOutcome.recovery_score).label(
                "average_recovery_score"
            ),
            readmission_rate.label("readmission_rate"),
        )
        .group_by(TreatmentOutcome.treatment_name)
        .order_by(TreatmentOutcome.treatment_name)
    )

    rows = db.execute(stmt).all()

    return [
        {
            "treatment_name": row.treatment_name,
            "patients_treated": row.patients_treated,
            "average_recovery_score": (
                float(row.average_recovery_score)
                if row.average_recovery_score is not None
                else 0.0
            ),
            "readmission_rate": float(row.readmission_rate or 0.0),
        }
        for row in rows
    ]