"""Treatment effectiveness and recovery analysis."""

from __future__ import annotations

from collections import defaultdict

from app.schemas.analytics import TreatmentEffectivenessSummary
from app.services.patient_service import PatientRecord, all_patients


def treatment_summaries(
    patients: list[PatientRecord] | None = None,
) -> list[TreatmentEffectivenessSummary]:
    """Effectiveness rollup per treatment, best recovery first."""
    cohort = all_patients() if patients is None else patients
    groups: dict[str, list[PatientRecord]] = defaultdict(list)
    for patient in cohort:
        groups[patient.treatment].append(patient)
    summaries = [
        TreatmentEffectivenessSummary(
            treatment_name=name,
            patients_treated=len(rows),
            average_recovery_score=round(sum(p.recovery_score for p in rows) / len(rows), 1),
            readmission_rate=round(sum(p.readmitted_30d for p in rows) / len(rows), 4),
        )
        for name, rows in groups.items()
    ]
    return sorted(summaries, key=lambda s: s.average_recovery_score, reverse=True)


def recovery_trend(patients: list[PatientRecord] | None = None) -> list[dict[str, float]]:
    """Average recovery score per admission month, oldest first."""
    cohort = all_patients() if patients is None else patients
    by_month: dict[str, list[float]] = defaultdict(list)
    for patient in cohort:
        by_month[patient.admission_month].append(patient.recovery_score)
    return [
        {"month": month, "average_recovery_score": round(sum(scores) / len(scores), 1)}
        for month, scores in sorted(by_month.items())
    ]
