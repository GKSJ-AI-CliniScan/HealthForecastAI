"""Treatment service - business logic layer for treatment effectiveness and recovery."""

from __future__ import annotations

from typing import Any

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.admission import Admission
from app.models.treatment import TreatmentOutcome
from app.schemas.analytics import TreatmentEffectivenessSummary


def get_treatment_effectiveness(
    db: Session,
) -> list[TreatmentEffectivenessSummary]:
    """Aggregate treatment outcomes into effectiveness summaries per treatment."""
    records = (
        db.query(
            TreatmentOutcome.treatment_name,
            func.count(TreatmentOutcome.id).label("treated_count"),
            func.avg(TreatmentOutcome.recovery_score).label("avg_recovery"),
        )
        .group_by(TreatmentOutcome.treatment_name)
        .all()
    )

    summaries: list[TreatmentEffectivenessSummary] = []
    for name, count, avg_rec in records:
        # Calculate readmissions for admissions under this treatment
        admissions_under_treatment = (
            db.query(Admission)
            .join(
                TreatmentOutcome,
                Admission.id == TreatmentOutcome.admission_id,
            )
            .filter(TreatmentOutcome.treatment_name == name)
            .all()
        )

        total_adm = len(admissions_under_treatment)
        readmitted = sum(
            1 for a in admissions_under_treatment if a.readmitted and a.readmitted != "NO"
        )
        readmit_rate = round(readmitted / total_adm, 4) if total_adm > 0 else 0.0

        summaries.append(
            TreatmentEffectivenessSummary(
                treatment_name=name,
                patients_treated=count,
                average_recovery_score=round(float(avg_rec or 0.0), 2),
                readmission_rate=readmit_rate,
            )
        )

    return summaries


def get_recovery_trends(db: Session) -> list[dict[str, Any]]:
    """Compute recovery trends grouped by treatment."""
    records = (
        db.query(
            TreatmentOutcome.treatment_name,
            func.avg(TreatmentOutcome.recovery_score).label("avg_recovery"),
            func.avg(TreatmentOutcome.length_of_stay_days).label("avg_stay"),
            func.count(TreatmentOutcome.id).label("total_cases"),
        )
        .group_by(TreatmentOutcome.treatment_name)
        .all()
    )

    return [
        {
            "treatment_name": r.treatment_name,
            "average_recovery_score": round(float(r.avg_recovery or 0.0), 2),
            "average_length_of_stay": round(float(r.avg_stay or 0.0), 2),
            "total_cases": r.total_cases,
        }
        for r in records
    ]
