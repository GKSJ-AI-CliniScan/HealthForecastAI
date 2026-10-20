"""Hospital analytics: KPIs, readmission trends and population health."""

from __future__ import annotations

from collections import defaultdict
from csv import writer
from io import StringIO

from app.schemas.analytics import HospitalAnalyticsSummary, RiskDistribution
from app.services.patient_service import PatientRecord, all_patients
from app.services.risk_service import score_patients

# Groups smaller than this are never returned, so a researcher cannot single out a person.
MIN_GROUP_SIZE = 5


def hospital_summary(patients: list[PatientRecord] | None = None) -> HospitalAnalyticsSummary:
    """Headline KPIs for the hospital dashboard."""
    cohort = all_patients() if patients is None else patients
    if not cohort:
        return HospitalAnalyticsSummary()
    bands = {"low": 0, "medium": 0, "high": 0}
    for scored in score_patients(cohort):
        bands[scored.category] += 1
    return HospitalAnalyticsSummary(
        total_patients=len(cohort),
        total_admissions=len(cohort),
        readmission_rate=round(sum(p.readmitted_30d for p in cohort) / len(cohort), 4),
        average_length_of_stay=round(sum(p.time_in_hospital for p in cohort) / len(cohort), 2),
        risk_distribution=RiskDistribution(**bands),
    )


def readmission_series(patients: list[PatientRecord] | None = None) -> list[dict[str, float | str]]:
    """Monthly admissions and 30 day readmission rate, oldest month first."""
    cohort = all_patients() if patients is None else patients
    by_month: dict[str, list[PatientRecord]] = defaultdict(list)
    for patient in cohort:
        by_month[patient.admission_month].append(patient)
    return [
        {
            "month": month,
            "admissions": len(rows),
            "readmission_rate": round(sum(p.readmitted_30d for p in rows) / len(rows), 4),
        }
        for month, rows in sorted(by_month.items())
    ]


def population_health() -> dict[str, object]:
    """Aggregated cohorts by age group. Small groups are suppressed."""
    groups: dict[str, list[PatientRecord]] = defaultdict(list)
    for patient in all_patients():
        groups[patient.age_group].append(patient)
    cohorts = []
    suppressed = 0
    for age_group, rows in sorted(groups.items()):
        if len(rows) < MIN_GROUP_SIZE:
            suppressed += 1
            continue
        cohorts.append(
            {
                "age_group": age_group,
                "patients": len(rows),
                "readmission_rate": round(sum(p.readmitted_30d for p in rows) / len(rows), 4),
                "average_length_of_stay": round(
                    sum(p.time_in_hospital for p in rows) / len(rows), 2
                ),
            }
        )
    return {"cohorts": cohorts, "suppressed_groups": suppressed, "min_group_size": MIN_GROUP_SIZE}


def export_csv(patients: list[PatientRecord] | None = None) -> str:
    """Return the monthly readmission series as CSV text for download."""
    buffer = StringIO()
    out = writer(buffer)
    out.writerow(["month", "admissions", "readmission_rate"])
    for row in readmission_series(patients):
        out.writerow([row["month"], row["admissions"], row["readmission_rate"]])
    return buffer.getvalue()
