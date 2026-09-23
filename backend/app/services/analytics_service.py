"""Analytics service - business logic layer for hospital and population metrics."""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.admission import Admission
from app.models.patient import Patient
from app.models.prediction import RiskPrediction
from app.schemas.analytics import HospitalAnalyticsSummary, RiskDistribution


def get_hospital_summary(db: Session) -> HospitalAnalyticsSummary:
    """Compute headline hospital KPIs aggregated across all patients and admissions."""
    total_patients = db.query(Patient).count()
    total_admissions = db.query(Admission).count()

    # Calculate average length of stay
    avg_stay = db.query(func.avg(Admission.time_in_hospital)).scalar() or 0.0

    # Calculate overall readmission rate
    if total_admissions > 0:
        readmitted_count = (
            db.query(Admission)
            .filter(Admission.readmitted.isnot(None), Admission.readmitted != "NO")
            .count()
        )
        readmission_rate = round(readmitted_count / total_admissions, 4)
    else:
        readmission_rate = 0.0

    # Risk distribution from latest risk predictions
    low_count = db.query(RiskPrediction).filter(RiskPrediction.risk_category == "low").count()
    med_count = db.query(RiskPrediction).filter(RiskPrediction.risk_category == "medium").count()
    high_count = db.query(RiskPrediction).filter(RiskPrediction.risk_category == "high").count()

    return HospitalAnalyticsSummary(
        total_patients=total_patients,
        total_admissions=total_admissions,
        readmission_rate=readmission_rate,
        average_length_of_stay=round(float(avg_stay), 2),
        risk_distribution=RiskDistribution(
            low=low_count,
            medium=med_count,
            high=high_count,
        ),
    )


def get_readmission_trends(db: Session) -> list[dict[str, Any]]:
    """Compute monthly readmission rate trends grouped by discharge disposition."""
    admissions = (
        db.query(
            Admission.discharge_disposition,
            func.count(Admission.id).label("total"),
        )
        .group_by(Admission.discharge_disposition)
        .all()
    )

    trends: list[dict[str, Any]] = []
    for disp, total in admissions:
        readmitted = (
            db.query(Admission)
            .filter(
                Admission.discharge_disposition == disp,
                Admission.readmitted.isnot(None),
                Admission.readmitted != "NO",
            )
            .count()
        )
        rate = round(readmitted / total, 4) if total > 0 else 0.0
        trends.append(
            {
                "discharge_disposition": disp or "Unknown",
                "total_admissions": total,
                "readmissions": readmitted,
                "readmission_rate": rate,
            }
        )
    return trends


def get_population_health(db: Session) -> dict[str, Any]:
    """Return aggregated cohort statistics without exposing individual PII."""
    cohorts = []
    age_groups = (
        db.query(Patient.age_group, func.count(Patient.id).label("patient_count"))
        .group_by(Patient.age_group)
        .all()
    )

    for age, count in age_groups:
        cohorts.append(
            {
                "cohort": age or "Unspecified",
                "patient_count": count,
                "category": "age_group",
            }
        )

    return {
        "cohorts": cohorts,
        "total_cohorts": len(cohorts),
        "generated_at": datetime.now(UTC).isoformat(),
    }
