"""Treatment effectiveness business logic."""

from datetime import timedelta

from sqlalchemy import case, func
from sqlalchemy.orm import Session

from app.models.admission import Admission
from app.models.treatment import TreatmentOutcome


def list_treatment_effectiveness(
    db: Session,
) -> list[dict[str, object]]:
    """Return effectiveness metrics grouped by treatment."""

    rows = (
        db.query(
            TreatmentOutcome.treatment_name,
            func.count(func.distinct(Admission.patient_id)).label("patients_treated"),
            func.avg(TreatmentOutcome.recovery_score).label("average_recovery_score"),
            func.avg(TreatmentOutcome.length_of_stay_days).label(
                "average_length_of_stay_days"
            ),
            (
                func.count(
                    func.distinct(
                        case(
                            (
                                Admission.readmitted == "<30",
                                TreatmentOutcome.admission_id,
                            ),
                        )
                    )
                )
                * 100.0
                / func.count(func.distinct(TreatmentOutcome.admission_id))
            ).label("readmission_rate"),
        )
        .join(Admission, TreatmentOutcome.admission_id == Admission.id)
        .group_by(TreatmentOutcome.treatment_name)
        .order_by(TreatmentOutcome.treatment_name)
        .all()
    )

    return [
        {
            "treatment_name": row.treatment_name,
            "patients_treated": row.patients_treated,
            "average_recovery_score": round(float(row.average_recovery_score or 0), 2),
            "average_length_of_stay_days": round(
                float(row.average_length_of_stay_days or 0), 2
            ),
            "readmission_rate": round(float(row.readmission_rate or 0), 2),
        }
        for row in rows
    ]


def get_recovery_trends(
    db: Session,
) -> list[dict[str, float | str]]:
    """Return weekly average recovery score trends."""

    rows = (
        db.query(
            Admission.admission_date,
            TreatmentOutcome.recovery_score,
        )
        .join(Admission, TreatmentOutcome.admission_id == Admission.id)
        .filter(
            Admission.admission_date.isnot(None),
            TreatmentOutcome.recovery_score.isnot(None),
        )
        .order_by(Admission.admission_date)
        .all()
    )

    weekly_scores: dict[str, list[float]] = {}

    for admission_date, recovery_score in rows:
        week_start = admission_date - timedelta(days=admission_date.weekday())
        week_key = week_start.isoformat()
        weekly_scores.setdefault(week_key, []).append(float(recovery_score))

    return [
        {
            "week": week,
            "recovery_score": round(sum(scores) / len(scores), 2),
        }
        for week, scores in weekly_scores.items()
    ]
