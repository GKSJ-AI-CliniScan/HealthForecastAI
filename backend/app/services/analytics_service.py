"""Healthcare analytics aggregation services."""

from __future__ import annotations

from collections import defaultdict
from datetime import date
from typing import Any

from sqlalchemy import case, func, select
from sqlalchemy.orm import Session

from app.models.admission import Admission
from app.models.patient import Patient
from app.models.prediction import RiskPrediction
from app.models.treatment import TreatmentOutcome


def get_hospital_summary(db: Session) -> dict[str, Any]:
    """Return high-level hospital performance statistics."""

    total_patients = db.scalar(select(func.count(Patient.id))) or 0

    total_admissions = db.scalar(select(func.count(Admission.id))) or 0

    total_readmissions = (
        db.scalar(select(func.count(Admission.id)).where(Admission.readmitted == "<30")) or 0
    )

    average_length_of_stay = db.scalar(select(func.avg(Admission.time_in_hospital)))

    readmission_rate = total_readmissions / total_admissions if total_admissions else 0.0

    return {
        "total_patients": int(total_patients),
        "total_admissions": int(total_admissions),
        "readmission_rate": float(readmission_rate),
        "average_length_of_stay": (
            float(average_length_of_stay) if average_length_of_stay is not None else 0.0
        ),
        "risk_distribution": get_latest_risk_distribution(db),
    }


def get_latest_risk_distribution(db: Session) -> dict[str, int]:
    """Return risk-band counts using each patient's latest prediction."""

    predictions = db.scalars(
        select(RiskPrediction).order_by(
            RiskPrediction.patient_id,
            RiskPrediction.created_at.desc(),
            RiskPrediction.id.desc(),
        )
    ).all()

    latest_by_patient: dict[int, RiskPrediction] = {}

    for prediction in predictions:
        if prediction.patient_id not in latest_by_patient:
            latest_by_patient[prediction.patient_id] = prediction

    distribution = {
        "low": 0,
        "medium": 0,
        "high": 0,
    }

    for prediction in latest_by_patient.values():
        category = str(prediction.risk_category).lower()

        if category in distribution:
            distribution[category] += 1

    return distribution


def get_treatment_effectiveness(
    db: Session,
) -> list[dict[str, Any]]:
    """Return treatment-level effectiveness statistics."""

    readmission_case = case(
        (Admission.readmitted == "<30", 1),
        else_=0,
    )

    statement = (
        select(
            TreatmentOutcome.treatment_name,
            func.count(func.distinct(Admission.patient_id)).label("patients_treated"),
            func.avg(TreatmentOutcome.recovery_score).label("average_recovery_score"),
            func.avg(readmission_case).label("readmission_rate"),
        )
        .join(
            Admission,
            TreatmentOutcome.admission_id == Admission.id,
        )
        .group_by(TreatmentOutcome.treatment_name)
        .order_by(TreatmentOutcome.treatment_name)
    )

    rows = db.execute(statement).all()

    results: list[dict[str, Any]] = []

    for row in rows:
        results.append(
            {
                "treatment_name": row.treatment_name,
                "patients_treated": int(row.patients_treated or 0),
                "average_recovery_score": (
                    float(row.average_recovery_score)
                    if row.average_recovery_score is not None
                    else 0.0
                ),
                "readmission_rate": (float(row.readmission_rate or 0.0)),
            }
        )

    return results


def get_recovery_trends(
    db: Session,
) -> list[dict[str, Any]]:
    """Return recovery-score trends grouped by admission week."""

    statement = select(
        TreatmentOutcome.recovery_score,
        Admission.admission_date,
    ).join(
        Admission,
        TreatmentOutcome.admission_id == Admission.id,
    )

    rows = db.execute(statement).all()

    weekly_scores: dict[str, list[float]] = defaultdict(list)

    for recovery_score, admission_date in rows:
        if recovery_score is None or admission_date is None:
            continue

        week_key = _week_key(admission_date)
        weekly_scores[week_key].append(float(recovery_score))

    results: list[dict[str, Any]] = []

    for week, scores in sorted(weekly_scores.items()):
        results.append(
            {
                "week": week,
                "average_recovery_score": (sum(scores) / len(scores)),
            }
        )

    return results


def get_readmission_trends(
    db: Session,
) -> list[dict[str, Any]]:
    """Return monthly admission and readmission statistics."""

    statement = select(
        Admission.admission_date,
        Admission.readmitted,
    )

    rows = db.execute(statement).all()

    monthly_data: dict[str, dict[str, int]] = defaultdict(
        lambda: {
            "admissions": 0,
            "readmissions": 0,
        }
    )

    for admission_date, readmitted in rows:
        if admission_date is None:
            continue

        month_key = admission_date.strftime("%Y-%m")

        monthly_data[month_key]["admissions"] += 1

        if readmitted == "<30":
            monthly_data[month_key]["readmissions"] += 1

    results: list[dict[str, Any]] = []

    for month, values in sorted(monthly_data.items()):
        admissions = values["admissions"]
        readmissions = values["readmissions"]

        results.append(
            {
                "period": month,
                "admissions": admissions,
                "readmissions": readmissions,
                "readmission_rate": (readmissions / admissions if admissions else 0.0),
            }
        )

    return results


def get_population_health(
    db: Session,
) -> list[dict[str, Any]]:
    """Return aggregated population-health statistics by age group."""

    readmission_case = case(
        (Admission.readmitted == "<30", 1),
        else_=0,
    )

    statement = (
        select(
            Patient.age_group,
            func.count(func.distinct(Patient.id)).label("patient_count"),
            func.count(Admission.id).label("admission_count"),
            func.sum(readmission_case).label("readmissions"),
        )
        .outerjoin(
            Admission,
            Admission.patient_id == Patient.id,
        )
        .group_by(Patient.age_group)
        .order_by(Patient.age_group)
    )

    rows = db.execute(statement).all()

    results: list[dict[str, Any]] = []

    for row in rows:
        admissions = int(row.admission_count or 0)
        readmissions = int(row.readmissions or 0)

        results.append(
            {
                "age_group": row.age_group,
                "patient_count": int(row.patient_count or 0),
                "admission_count": admissions,
                "readmission_rate": (readmissions / admissions if admissions else 0.0),
            }
        )

    return results


def _week_key(value: date) -> str:
    """Return an ISO year-week identifier."""

    iso = value.isocalendar()

    return f"{iso.year}-W{iso.week:02d}"


def get_medication_outcomes(
    db: Session,
) -> list[dict[str, Any]]:
    """Return aggregated outcomes grouped by medication change."""

    statement = (
        select(
            TreatmentOutcome.medication_change,
            func.count(func.distinct(Admission.patient_id)).label("patients_treated"),
            func.coalesce(
                func.avg(TreatmentOutcome.recovery_score),
                0.0,
            ).label("average_recovery_score"),
            func.coalesce(
                func.avg(
                    case(
                        (
                            Admission.readmitted == "<30",
                            1.0,
                        ),
                        else_=0.0,
                    )
                ),
                0.0,
            ).label("readmission_rate"),
            func.sum(
                case(
                    (
                        TreatmentOutcome.outcome == "improved",
                        1,
                    ),
                    else_=0,
                )
            ).label("improved_count"),
            func.sum(
                case(
                    (
                        TreatmentOutcome.outcome == "stable",
                        1,
                    ),
                    else_=0,
                )
            ).label("stable_count"),
            func.sum(
                case(
                    (
                        TreatmentOutcome.outcome == "partial_recovery",
                        1,
                    ),
                    else_=0,
                )
            ).label("partial_recovery_count"),
        )
        .join(
            Admission,
            TreatmentOutcome.admission_id == Admission.id,
        )
        .group_by(TreatmentOutcome.medication_change)
        .order_by(TreatmentOutcome.medication_change)
    )

    rows = db.execute(statement).all()

    return [
        {
            "medication_change": bool(row.medication_change),
            "patients_treated": int(row.patients_treated or 0),
            "average_recovery_score": float(row.average_recovery_score or 0.0),
            "readmission_rate": float(row.readmission_rate or 0.0),
            "improved_count": int(row.improved_count or 0),
            "stable_count": int(row.stable_count or 0),
            "partial_recovery_count": int(row.partial_recovery_count or 0),
        }
        for row in rows
    ]
