"""Treatment effectiveness and recovery analytics.

Milestone 3. Every number here is aggregated in SQL from `treatment_outcomes`
joined to its admission and patient - there is no seeded "reference" figure,
because a dashboard that shows invented baselines is worse than one that shows
an empty state.

Three definitions do the heavy lifting, and they are worth stating because they
are proxies a clinician will interrogate:

* **Treatment success** = the patient was *not* readmitted within 30 days. This
  is the endpoint the dataset actually records, so it is the honest one.
* **Recovery** = `recovery_score >= RECOVERY_TARGET`. The score is the composite
  produced by :func:`recovery_index` from length of stay, diagnosis burden,
  medication count and readmission outcome - not a measured clinical scale.
* **Complication / side effect** = the patient was discharged somewhere other
  than home. A routine home discharge is the good outcome; a transfer to a
  skilled nursing facility, a rehabilitation unit, or another acute hospital
  means the presenting episode did not resolve. This is the closest thing the
  schema has to an adverse-event flag, and it is reported as such rather than as
  a measured drug side-effect rate.
"""

from __future__ import annotations

from typing import Any

from sqlalchemy import case, func, or_, select
from sqlalchemy.orm import Session
from sqlalchemy.sql import Select

from app.models.admission import Admission
from app.models.patient import Patient
from app.models.treatment import TreatmentOutcome
from app.schemas.analytics import (
    MedicationOutcome,
    RecoveryTrendPoint,
    TreatmentEffectivenessSummary,
    TreatmentSummary,
)

# A stay of 7+ days is the last point on the recovery chart; longer stays are
# folded into it so one outlier admission does not stretch the axis.
MAX_TREND_DAY = 7

# Composite recovery score at or above which an episode counts as recovered.
RECOVERY_TARGET = 70.0

# Dispositions that mean "the episode resolved and the patient went home".
# Anything else is counted as a complication - see the module docstring.
ROUTINE_HOME_DISCHARGES: frozenset[str] = frozenset(
    {
        "Discharged to home",
        "Discharged/transferred to home with home health service",
        "Discharged/transferred to home under care of Home IV provider",
    }
)

# The dashboard's disease-group dropdown maps onto `patients.primary_diagnosis`,
# which holds either an ICD-9 chapter group ("Circulatory", "Diabetes") written
# by the ETL or a free-text condition from the demo seed. Substring matching
# covers both without either side having to be rewritten.
DISEASE_GROUP_PATTERNS: dict[str, tuple[str, ...]] = {
    "DIABETES": ("diabet", "metab"),
    "CHF": ("circulat", "cardio", "heart failure"),
    "COPD": ("respirat", "pulmon", "copd"),
    "PNEUMONIA": ("pneumonia", "respirat", "pulmon"),
}

# Specialty cohorts for the recovery trajectory chart, in display order.
COHORT_PATTERNS: dict[str, tuple[str, ...]] = {
    "cardiac": ("circulat", "cardio", "heart"),
    "renal": ("diabet", "metab", "genitourin", "renal", "kidney"),
    "pulmonary": ("respirat", "pulmon", "copd", "pneumonia", "asthma"),
}

READMITTED_WITHIN_30_DAYS = "<30"


def recovery_index(
    *,
    length_of_stay: int,
    number_diagnoses: int,
    num_medications: int,
    readmitted: str | None,
) -> float:
    """Composite 0-100 recovery index for a single episode.

    The dataset records no measured recovery scale, so this is a transparent
    penalty model rather than a fitted one: a long stay, a heavy comorbidity
    burden, polypharmacy and a 30-day readmission each subtract from a near-perfect
    baseline. It is the same function the demo seed uses, so a score reported by
    the API can always be traced back to the four admission fields that produced
    it. Treat it as an ordering signal, not as a clinical measurement.
    """
    score = 96.0
    score -= max(0, length_of_stay - 4) * 2.2
    score -= max(0, number_diagnoses - 5) * 2.8
    score -= max(0, num_medications - 12) * 0.6
    if readmitted == READMITTED_WITHIN_30_DAYS:
        score -= 18.0
    return round(min(100.0, max(25.0, score)), 1)


def _matches_diagnosis(patterns: tuple[str, ...]) -> Any:
    """SQL predicate: primary_diagnosis matches any pattern, case-insensitively."""
    diagnosis = func.lower(func.coalesce(Patient.primary_diagnosis, ""))
    return or_(diagnosis.ilike(f"%{pattern}%") for pattern in patterns)


def _cohort_case() -> Any:
    """SQL expression assigning each row to a specialty cohort, or NULL."""
    return case(
        *((_matches_diagnosis(patterns), cohort) for cohort, patterns in COHORT_PATTERNS.items()),
        else_=None,
    )


def _scoped(
    statement: Select[tuple[Any, ...]],
    disease_group: str | None,
    assigned_doctor_id: int | None,
) -> Select[tuple[Any, ...]]:
    """Apply the caller's filters inside the query, never after it.

    `assigned_doctor_id` is the "limited" arm of the access matrix: a doctor's
    treatment report is the same aggregation narrowed to their own caseload, so
    the scoping happens in the WHERE clause and never pulls other doctors'
    patients into Python to be dropped.
    """
    patterns = DISEASE_GROUP_PATTERNS.get(resolve_disease_group(disease_group))
    if patterns:
        statement = statement.where(_matches_diagnosis(patterns))
    if assigned_doctor_id is not None:
        statement = statement.where(Patient.assigned_doctor_id == assigned_doctor_id)
    return statement


def resolve_disease_group(disease_group: str | None) -> str:
    """Return the canonical group name, or 'All' when it filters nothing."""
    key = (disease_group or "").strip().upper()
    return key if key in DISEASE_GROUP_PATTERNS else "All"


def _complication_count() -> Any:
    """SQL expression: 1 when the episode ended somewhere other than home."""
    return case(
        (
            func.coalesce(Admission.discharge_disposition, "").notin_(ROUTINE_HOME_DISCHARGES),
            1,
        ),
        else_=0,
    )


def get_treatment_effectiveness_summary(
    db: Session, disease_group: str | None = None, assigned_doctor_id: int | None = None
) -> list[TreatmentEffectivenessSummary]:
    """Return effectiveness rollups per treatment regimen, aggregated in SQL."""
    rows = db.execute(
        _scoped(
            select(
                TreatmentOutcome.treatment_name,
                func.count().label("treated"),
                func.avg(TreatmentOutcome.recovery_score).label("avg_recovery"),
                func.sum(
                    case((Admission.readmitted == READMITTED_WITHIN_30_DAYS, 1), else_=0)
                ).label("readmissions"),
            )
            .join(Admission, Admission.id == TreatmentOutcome.admission_id)
            .join(Patient, Patient.id == Admission.patient_id)
            .group_by(TreatmentOutcome.treatment_name)
            .order_by(func.count().desc(), TreatmentOutcome.treatment_name),
            disease_group,
            assigned_doctor_id,
        )
    ).all()

    results: list[TreatmentEffectivenessSummary] = []
    for row in rows:
        treated = int(row.treated or 0)
        results.append(
            TreatmentEffectivenessSummary(
                treatment_name=str(row.treatment_name),
                patients_treated=treated,
                average_recovery_score=round(float(row.avg_recovery or 0.0), 1),
                readmission_rate=(
                    round(int(row.readmissions or 0) / treated, 4) if treated else 0.0
                ),
            )
        )
    return results


def get_medication_outcomes(
    db: Session, disease_group: str | None = None, assigned_doctor_id: int | None = None
) -> list[MedicationOutcome]:
    """Protocol efficacy vs complication rate, one row per regimen."""
    rows = db.execute(
        _scoped(
            select(
                TreatmentOutcome.treatment_name,
                func.count().label("treated"),
                func.avg(TreatmentOutcome.recovery_score).label("avg_recovery"),
                func.sum(
                    case((Admission.readmitted == READMITTED_WITHIN_30_DAYS, 1), else_=0)
                ).label("readmissions"),
                func.sum(_complication_count()).label("complications"),
            )
            .join(Admission, Admission.id == TreatmentOutcome.admission_id)
            .join(Patient, Patient.id == Admission.patient_id)
            .group_by(TreatmentOutcome.treatment_name)
            .order_by(func.count().desc(), TreatmentOutcome.treatment_name),
            disease_group,
            assigned_doctor_id,
        )
    ).all()

    outcomes: list[MedicationOutcome] = []
    for row in rows:
        treated = int(row.treated or 0)
        if not treated:
            continue
        readmissions = int(row.readmissions or 0)
        outcomes.append(
            MedicationOutcome(
                treatment=str(row.treatment_name),
                success_rate=round(100.0 * (treated - readmissions) / treated, 1),
                side_effects_rate=round(100.0 * int(row.complications or 0) / treated, 1),
                patients_treated=treated,
                average_recovery_score=round(float(row.avg_recovery or 0.0), 1),
                readmission_rate=round(readmissions / treated, 4),
            )
        )
    return outcomes


def _fill_gaps(series: dict[int, float]) -> dict[int, float]:
    """Carry the previous day's value into days with no admissions.

    A line chart with holes reads as a data-quality problem, so a sparse cohort
    is filled from its own neighbours. Days outside the observed range stay
    empty - extrapolating a recovery curve past the patients we actually have
    would be a fabrication.
    """
    if not series:
        return {}
    days = sorted(series)
    filled: dict[int, float] = {}
    for day in range(days[0], days[-1] + 1):
        filled[day] = series[day] if day in series else filled[day - 1]
    return filled


def get_recovery_trends(
    db: Session, disease_group: str | None = None, assigned_doctor_id: int | None = None
) -> list[dict[str, Any]]:
    """Mean recovery index per day of stay, split by specialty cohort.

    This is a cross-sectional curve, not a follow-up of the same patients: each
    point averages the recovery score of episodes that reached that day of stay.
    """
    stay = func.coalesce(TreatmentOutcome.length_of_stay_days, Admission.time_in_hospital)
    cohort = _cohort_case()

    rows = db.execute(
        _scoped(
            select(
                cohort.label("cohort"),
                case((stay >= MAX_TREND_DAY, MAX_TREND_DAY), else_=stay).label("day"),
                func.avg(TreatmentOutcome.recovery_score).label("avg_recovery"),
            )
            .join(Admission, Admission.id == TreatmentOutcome.admission_id)
            .join(Patient, Patient.id == Admission.patient_id)
            .where(cohort.is_not(None), stay.is_not(None))
            .group_by("cohort", "day")
            .order_by("cohort", "day"),
            disease_group,
            assigned_doctor_id,
        )
    ).all()

    by_cohort: dict[str, dict[int, float]] = {}
    for row in rows:
        if row.day is None:
            continue
        days = by_cohort.setdefault(str(row.cohort), {})
        days[int(row.day)] = round(float(row.avg_recovery or 0.0), 1)

    if not by_cohort:
        return []

    series = {name: _fill_gaps(days) for name, days in by_cohort.items()}
    first_day = min(min(days) for days in series.values())
    last_day = max(max(days) for days in series.values())

    trends: list[dict[str, Any]] = []
    for day in range(first_day, last_day + 1):
        label = f"Day {day}"
        if day == MAX_TREND_DAY:
            label += "+"
        point: dict[str, Any] = {"day": label}
        for name in COHORT_PATTERNS:
            point[name] = series.get(name, {}).get(day)
        trends.append(point)
    return trends


def get_recovery_trend_points(
    db: Session, disease_group: str | None = None, assigned_doctor_id: int | None = None
) -> list[RecoveryTrendPoint]:
    """Typed view of :func:`get_recovery_trends` for the response models."""
    return [
        RecoveryTrendPoint(**point)
        for point in get_recovery_trends(db, disease_group, assigned_doctor_id)
    ]


def get_treatment_summary(
    db: Session, disease_group: str | None = None, assigned_doctor_id: int | None = None
) -> TreatmentSummary:
    """Everything the treatment effectiveness dashboard renders, in one call."""
    totals = db.execute(
        _scoped(
            select(
                func.count().label("treated"),
                func.count(func.distinct(TreatmentOutcome.treatment_name)).label("protocols"),
                func.sum(
                    case((Admission.readmitted == READMITTED_WITHIN_30_DAYS, 1), else_=0)
                ).label("readmissions"),
                func.sum(
                    case((TreatmentOutcome.recovery_score >= RECOVERY_TARGET, 1), else_=0)
                ).label("recovered"),
                func.sum(_complication_count()).label("complications"),
            )
            .select_from(TreatmentOutcome)
            .join(Admission, Admission.id == TreatmentOutcome.admission_id)
            .join(Patient, Patient.id == Admission.patient_id),
            disease_group,
            assigned_doctor_id,
        )
    ).one()

    treated = int(totals.treated or 0)
    readmissions = int(totals.readmissions or 0)

    return TreatmentSummary(
        success_rate=round(100.0 * (treated - readmissions) / treated, 1) if treated else 0.0,
        recovery_rate=round(100.0 * int(totals.recovered or 0) / treated, 1) if treated else 0.0,
        complications_rate=(
            round(100.0 * int(totals.complications or 0) / treated, 1) if treated else 0.0
        ),
        outcomes_recorded=treated,
        protocols_evaluated=int(totals.protocols or 0),
        disease_group=resolve_disease_group(disease_group),
        medications_data=get_medication_outcomes(db, disease_group, assigned_doctor_id),
        recovery_progress_trend=get_recovery_trend_points(db, disease_group, assigned_doctor_id),
    )
