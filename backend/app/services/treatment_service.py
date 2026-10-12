"""Treatment effectiveness, medication outcomes and recovery analysis.

Milestone 3. Answers the question a clinician actually has - "do patients on this
drug do better?" - without the trap that makes the naive answer wrong.

Confounding by indication is addressed by reporting crude rates alongside stratified
comparisons (age band, prior inpatient visits, primary diagnosis) pooled with Mantel-Haenszel.
Additionally, SQL aggregations over treatment_outcomes provide composite recovery index
trends, medication complication rates, and dashboard summaries.
"""

from __future__ import annotations

from typing import Any

from sqlalchemy import String, case, cast, func, literal_column, or_, select
from sqlalchemy.orm import Session
from sqlalchemy.sql import Select

from app.core.cache import ttl_cache
from app.core.rbac import Role
from app.models.admission import Admission
from app.models.patient import Patient
from app.models.treatment import TreatmentOutcome
from app.models.user import User
from app.schemas.analytics import (
    MedicationOutcome,
    RecoveryTrendPoint,
    TreatmentEffectivenessSummary,
    TreatmentSummary,
)
from app.services import stats

# Groups smaller than this are suppressed rather than reported. A cell of a few
# patients in a table that also shows age band and diagnosis can identify them.
MIN_CELL = 11

ADJUSTED_FOR = [
    "age band",
    "prior inpatient visits (0, 1, 2 or more)",
    "primary diagnosis group",
]

CAVEAT = (
    "Observational data, not a trial. These are associations after adjusting for "
    "age, prior admissions and diagnosis - they do not prove that a treatment "
    "caused the difference, and unmeasured differences between patients remain."
)

HOME_DISPOSITIONS = (
    "Discharged to home",
    "Discharged/transferred to home with home health service",
    "Discharged/transferred to home under care of Home IV provider",
)

RECOVERY_DEFINITION = (
    "Stable recovery = not readmitted within 30 days AND discharged home (with or "
    "without home health). A documented proxy: the source data holds no clinical "
    "recovery score, and inventing one would be fabrication."
)


# --------------------------------------------------------------------------
# Query fragments
# --------------------------------------------------------------------------


def _readmit_flag() -> Any:
    """1 for a readmission within 30 days, else 0."""
    return case((Admission.readmitted == "<30", 1), else_=0)


def _home_condition() -> Any:
    return Admission.discharge_disposition.in_(HOME_DISPOSITIONS)


def _stable_flag() -> Any:
    """1 for stable recovery: no 30-day readmission and discharged home."""
    return case((Admission.readmitted == "<30", 0), (_home_condition(), 1), else_=0)


def _stratum() -> Any:
    """A key identifying the adjustment stratum an admission belongs to.

    Constants are inlined with literal_column rather than bound as parameters:
    PostgreSQL will not treat `coalesce(x, $1)` in the SELECT list as the same
    expression as `coalesce(x, $2)` in GROUP BY, and rejects the query.
    """
    inpatient = case(
        (Admission.number_inpatient >= 2, 2), else_=func.coalesce(Admission.number_inpatient, 0)
    )
    pipe = literal_column("'|'")
    unknown = literal_column("'?'")
    return (
        func.coalesce(Patient.age_group, unknown)
        .concat(pipe)
        .concat(cast(inpatient, String))
        .concat(pipe)
        .concat(func.coalesce(Patient.primary_diagnosis, unknown))
    )


def _scope(actor: User) -> list[Any]:
    """Row filters for what the caller may see: a doctor's own caseload, else all."""
    if actor.role == Role.DOCTOR:
        return [Patient.assigned_doctor_id == actor.id]
    return []


def scope_name(actor: User) -> str:
    """Human label for the population a result covers."""
    return "your caseload" if actor.role == Role.DOCTOR else "the whole hospital"


# --------------------------------------------------------------------------
# Result builders
# --------------------------------------------------------------------------


def _rate(n: int, events: int) -> dict[str, Any] | None:
    """A group rate with its Wilson interval, or None for an empty group."""
    if n <= 0:
        return None
    low, high = stats.wilson_interval(events, n)
    return {
        "n": n,
        "events": events,
        "rate": round(events / n, 4),
        "ci_low": round(low, 4),
        "ci_high": round(high, 4),
    }


def _interpret(adjusted: stats.OddsRatio | None) -> str:
    if adjusted is None:
        return "Not estimable: one of the groups has no events within the strata."
    if adjusted.significant and adjusted.value < 1:
        return "Associated with lower odds of 30-day readmission after adjustment."
    if adjusted.significant and adjusted.value > 1:
        return "Associated with higher odds of 30-day readmission after adjustment."
    return "No clear association after adjustment: the interval includes no effect."


def _effect(
    tables: list[tuple[int, int, int, int]], crude_counts: tuple[int, int, int, int]
) -> dict[str, Any]:
    """Crude and Mantel-Haenszel adjusted effect for one exposure."""
    crude = stats.crude_odds_ratio(*crude_counts)
    adjusted = stats.mantel_haenszel(tables)

    # Confounding by indication shows up as the two answers disagreeing: opposite
    # direction, or significant crude and not adjusted (or the reverse).
    flag = False
    if crude is not None and adjusted is not None:
        opposite = (crude.value - 1) * (adjusted.value - 1) < 0
        flag = opposite or crude.significant != adjusted.significant

    return {
        "crude_odds_ratio": None if crude is None else round(crude.value, 3),
        "crude_ci": None if crude is None else [round(crude.low, 3), round(crude.high, 3)],
        "adjusted_odds_ratio": None if adjusted is None else round(adjusted.value, 3),
        "adjusted_ci": (
            None if adjusted is None else [round(adjusted.low, 3), round(adjusted.high, 3)]
        ),
        "strata_used": 0 if adjusted is None else adjusted.strata,
        "significant": bool(adjusted is not None and adjusted.significant),
        "interpretation": _interpret(adjusted),
        "confounding_flag": flag,
    }


def _tables(
    exposed: dict[str, tuple[int, int]], reference: dict[str, tuple[int, int]]
) -> tuple[list[tuple[int, int, int, int]], tuple[int, int, int, int]]:
    """Build per-stratum 2x2 tables and the collapsed crude table.

    Both inputs map stratum -> (patients, events). Table layout is the one
    stats.mantel_haenszel expects: exposed events, exposed non-events, reference
    events, reference non-events.
    """
    tables: list[tuple[int, int, int, int]] = []
    totals = [0, 0, 0, 0]
    for stratum in exposed.keys() | reference.keys():
        e_n, e_events = exposed.get(stratum, (0, 0))
        r_n, r_events = reference.get(stratum, (0, 0))
        table = (e_events, e_n - e_events, r_events, r_n - r_events)
        tables.append(table)
        for i, value in enumerate(table):
            totals[i] += value
    return tables, (totals[0], totals[1], totals[2], totals[3])


# --------------------------------------------------------------------------
# Data access
# --------------------------------------------------------------------------


def _admission_totals(
    db: Session, actor: User, extra: list[Any]
) -> dict[str, tuple[int, int, int]]:
    """Per stratum: (admissions, readmissions, total length of stay) for everyone."""
    stratum = _stratum().label("stratum")
    stmt = (
        select(
            stratum,
            func.count(Admission.id),
            func.sum(_readmit_flag()),
            func.sum(Admission.time_in_hospital),
        )
        .select_from(Admission)
        .join(Patient, Patient.id == Admission.patient_id)
        .where(*_scope(actor), *extra)
        .group_by(stratum)
    )
    return {row[0]: (int(row[1]), int(row[2] or 0), int(row[3] or 0)) for row in db.execute(stmt)}


def _treatment_counts(
    db: Session, actor: User, extra: list[Any]
) -> dict[str, dict[str, tuple[int, int, int]]]:
    """Per drug then stratum: (admissions on it, readmissions, total length of stay)."""
    stratum = _stratum().label("stratum")
    stmt = (
        select(
            TreatmentOutcome.treatment_name,
            stratum,
            func.count(TreatmentOutcome.id),
            func.sum(_readmit_flag()),
            func.sum(Admission.time_in_hospital),
        )
        .select_from(TreatmentOutcome)
        .join(Admission, Admission.id == TreatmentOutcome.admission_id)
        .join(Patient, Patient.id == Admission.patient_id)
        .where(*_scope(actor), *extra)
        .group_by(TreatmentOutcome.treatment_name, stratum)
    )
    result: dict[str, dict[str, tuple[int, int, int]]] = {}
    for name, key, n, events, los in db.execute(stmt):
        result.setdefault(name, {})[key] = (int(n), int(events or 0), int(los or 0))
    return result


def _dose_change_counts(db: Session, actor: User, extra: list[Any]) -> dict[str, dict[str, int]]:
    """Per drug: how many admissions had each dose change."""
    stmt = (
        select(
            TreatmentOutcome.treatment_name,
            TreatmentOutcome.dose_change,
            func.count(TreatmentOutcome.id),
        )
        .select_from(TreatmentOutcome)
        .join(Admission, Admission.id == TreatmentOutcome.admission_id)
        .join(Patient, Patient.id == Admission.patient_id)
        .where(*_scope(actor), *extra)
        .group_by(TreatmentOutcome.treatment_name, TreatmentOutcome.dose_change)
    )
    result: dict[str, dict[str, int]] = {}
    for name, change, n in db.execute(stmt):
        result.setdefault(name, {})[change or "Unknown"] = int(n)
    return result


# --------------------------------------------------------------------------
# Medication outcome analysis
# --------------------------------------------------------------------------


def _medication_effect(
    name: str,
    treated_by_stratum: dict[str, tuple[int, int, int]],
    totals: dict[str, tuple[int, int, int]],
    dose_changes: dict[str, int],
) -> dict[str, Any]:
    """Compare admissions on one drug against admissions not on it."""
    treated_n = sum(v[0] for v in treated_by_stratum.values())
    treated_events = sum(v[1] for v in treated_by_stratum.values())
    treated_los = sum(v[2] for v in treated_by_stratum.values())

    total_n = sum(v[0] for v in totals.values())
    total_events = sum(v[1] for v in totals.values())
    total_los = sum(v[2] for v in totals.values())

    other_n = total_n - treated_n
    other_events = total_events - treated_events
    other_los = total_los - treated_los

    result: dict[str, Any] = {
        "treatment_name": name,
        "patients_treated": treated_n,
        "suppressed": treated_n < MIN_CELL or other_n < MIN_CELL,
        "dose_changes": dose_changes,
    }
    if result["suppressed"]:
        return result

    # Unexposed within a stratum = everyone in the stratum not on this drug.
    reference = {
        stratum: (
            total[0] - treated_by_stratum.get(stratum, (0, 0, 0))[0],
            total[1] - treated_by_stratum.get(stratum, (0, 0, 0))[1],
        )
        for stratum, total in totals.items()
    }
    exposed = {stratum: (v[0], v[1]) for stratum, v in treated_by_stratum.items()}
    tables, crude = _tables(exposed, reference)

    result.update(
        {
            "treated": _rate(treated_n, treated_events),
            "not_treated": _rate(other_n, other_events),
            "rate_difference_points": round(
                (treated_events / treated_n - other_events / other_n) * 100, 2
            ),
            "effect": _effect(tables, crude),
            "average_length_of_stay_treated": round(treated_los / treated_n, 2),
            "average_length_of_stay_not_treated": round(other_los / other_n, 2),
        }
    )
    return result


@ttl_cache
def medication_report(db: Session, actor: User, diagnosis: str | None = None) -> dict[str, Any]:
    """Outcomes for every drug with enough patients to report, largest first."""
    extra = [Patient.primary_diagnosis == diagnosis] if diagnosis else []
    totals = _admission_totals(db, actor, extra)
    treated = _treatment_counts(db, actor, extra)
    doses = _dose_change_counts(db, actor, extra)

    medications = [
        _medication_effect(name, by_stratum, totals, doses.get(name, {}))
        for name, by_stratum in treated.items()
    ]
    medications.sort(key=lambda item: item["patients_treated"], reverse=True)

    return {
        "scope": scope_name(actor) + (f", primary diagnosis {diagnosis}" if diagnosis else ""),
        "outcome": "readmitted within 30 days",
        "adjusted_for": ADJUSTED_FOR,
        "min_cell": MIN_CELL,
        "caveat": CAVEAT,
        "medications": medications,
    }


def _contrast(
    label: str,
    exposed: dict[str, tuple[int, int]],
    reference: dict[str, tuple[int, int]],
) -> dict[str, Any]:
    """One exposed-versus-reference comparison, suppressed when either side is small."""
    exposed_n = sum(v[0] for v in exposed.values())
    reference_n = sum(v[0] for v in reference.values())
    if exposed_n < MIN_CELL or reference_n < MIN_CELL:
        return {"comparison": label, "suppressed": True}

    tables, crude = _tables(exposed, reference)
    return {
        "comparison": label,
        "exposed": _rate(exposed_n, sum(v[1] for v in exposed.values())),
        "reference": _rate(reference_n, sum(v[1] for v in reference.values())),
        "effect": _effect(tables, crude),
        "suppressed": False,
    }


@ttl_cache
def medication_detail(db: Session, actor: User, name: str) -> dict[str, Any] | None:
    """One drug in depth, including what raising or lowering the dose did."""
    totals = _admission_totals(db, actor, [])
    treated = _treatment_counts(db, actor, [])
    if name not in treated:
        return None

    doses = _dose_change_counts(db, actor, [])
    overall = _medication_effect(name, treated[name], totals, doses.get(name, {}))

    # Within the drug: compare each dose change against patients held steady.
    stratum = _stratum().label("stratum")
    stmt = (
        select(
            TreatmentOutcome.dose_change,
            stratum,
            func.count(TreatmentOutcome.id),
            func.sum(_readmit_flag()),
        )
        .select_from(TreatmentOutcome)
        .join(Admission, Admission.id == TreatmentOutcome.admission_id)
        .join(Patient, Patient.id == Admission.patient_id)
        .where(*_scope(actor), TreatmentOutcome.treatment_name == name)
        .group_by(TreatmentOutcome.dose_change, stratum)
    )
    by_change: dict[str, dict[str, tuple[int, int]]] = {}
    for change, key, n, events in db.execute(stmt):
        by_change.setdefault(change or "Unknown", {})[key] = (int(n), int(events or 0))

    steady = by_change.get("Steady", {})
    contrasts = [
        _contrast(f"Dose raised vs held steady ({name})", by_change.get("Up", {}), steady),
        _contrast(f"Dose lowered vs held steady ({name})", by_change.get("Down", {}), steady),
    ]

    return {
        "medication": overall,
        "dose_change_contrasts": contrasts,
        "adjusted_for": ADJUSTED_FOR,
        "caveat": CAVEAT,
    }


# --------------------------------------------------------------------------
# Care process effects: a test, a change of regimen
# --------------------------------------------------------------------------


def _process_effect(
    db: Session,
    actor: User,
    name: str,
    description: str,
    cohort_label: str,
    cohort_filters: list[Any],
    exposure: Any,
    exposed_label: str,
    reference_label: str,
) -> dict[str, Any]:
    """Compare admissions with a care process against those without, by stratum."""
    stratum = _stratum().label("stratum")
    flag = case((exposure, 1), else_=0).label("exposed")
    stmt = (
        select(flag, stratum, func.count(Admission.id), func.sum(_readmit_flag()))
        .select_from(Admission)
        .join(Patient, Patient.id == Admission.patient_id)
        .where(*_scope(actor), *cohort_filters)
        .group_by(flag, stratum)
    )

    exposed: dict[str, tuple[int, int]] = {}
    reference: dict[str, tuple[int, int]] = {}
    for is_exposed, key, n, events in db.execute(stmt):
        (exposed if is_exposed else reference)[key] = (int(n), int(events or 0))

    base = {
        "name": name,
        "description": description,
        "cohort": cohort_label,
        "exposed_label": exposed_label,
        "reference_label": reference_label,
    }
    exposed_n = sum(v[0] for v in exposed.values())
    reference_n = sum(v[0] for v in reference.values())
    if exposed_n < MIN_CELL or reference_n < MIN_CELL:
        return {**base, "suppressed": True}

    tables, crude = _tables(exposed, reference)
    return {
        **base,
        "exposed": _rate(exposed_n, sum(v[1] for v in exposed.values())),
        "reference": _rate(reference_n, sum(v[1] for v in reference.values())),
        "effect": _effect(tables, crude),
        "suppressed": False,
    }


@ttl_cache
def care_process_report(db: Session, actor: User) -> dict[str, Any]:
    """The effect of HbA1c testing and of changing the regimen on readmission."""
    tested = Admission.a1c_result.is_not(None)
    processes = [
        _process_effect(
            db,
            actor,
            "HbA1c measured during the stay",
            "Whether a glycated haemoglobin test was performed, compared with none.",
            "all admissions",
            [],
            tested,
            "HbA1c measured",
            "no HbA1c",
        ),
        _process_effect(
            db,
            actor,
            "HbA1c measured during the stay",
            "The same comparison restricted to admissions where diabetes was the "
            "primary diagnosis, where the test is most clearly indicated.",
            "primary diagnosis diabetes",
            [Patient.primary_diagnosis == "Diabetes"],
            tested,
            "HbA1c measured",
            "no HbA1c",
        ),
        _process_effect(
            db,
            actor,
            "Diabetes medication changed during the stay",
            "Whether the regimen was changed (dose or drug), among patients on "
            "diabetes medication.",
            "admissions on diabetes medication",
            [Admission.diabetes_med.is_(True)],
            Admission.medication_changed.is_(True),
            "regimen changed",
            "regimen unchanged",
        ),
    ]
    return {
        "scope": scope_name(actor),
        "adjusted_for": ADJUSTED_FOR,
        "caveat": CAVEAT,
        "processes": processes,
    }


# --------------------------------------------------------------------------
# Recovery
# --------------------------------------------------------------------------


def _recovery_row(
    group: str, n: int, stable: int, no_readmit: int, home: int, los: int
) -> dict[str, Any]:
    """Turn raw counts for one slice into a recovery row, suppressing small ones."""
    if n < MIN_CELL:
        return {"group": group, "n": n, "suppressed": True}
    return {
        "group": group,
        "n": n,
        "stable_recovery": _rate(n, stable),
        "no_readmission_rate": round(no_readmit / n, 4),
        "home_discharge_rate": round(home / n, 4),
        "average_length_of_stay": round(los / n, 2),
        "suppressed": False,
    }


def _recovery_columns() -> list[Any]:
    home = case((_home_condition(), 1), else_=0)
    no_readmit = case((Admission.readmitted == "<30", 0), else_=1)
    return [
        func.count(Admission.id),
        func.sum(_stable_flag()),
        func.sum(no_readmit),
        func.sum(home),
        func.sum(Admission.time_in_hospital),
    ]


def _recovery_by(
    db: Session, actor: User, group_expr: Any, limit: int = 15
) -> list[dict[str, Any]]:
    label = func.coalesce(group_expr, literal_column("'Not recorded'")).label("grp")
    stmt = (
        select(label, *_recovery_columns())
        .select_from(Admission)
        .join(Patient, Patient.id == Admission.patient_id)
        .where(*_scope(actor))
        .group_by(label)
        .order_by(func.count(Admission.id).desc())
        .limit(limit)
    )
    return [
        _recovery_row(str(g), int(n), int(s or 0), int(nr or 0), int(h or 0), int(los or 0))
        for g, n, s, nr, h, los in db.execute(stmt)
    ]


@ttl_cache
def recovery_report(db: Session, actor: User) -> dict[str, Any]:
    """Recovery outcomes overall and by age, diagnosis and treatment."""
    overall_stmt = (
        select(*_recovery_columns())
        .select_from(Admission)
        .join(Patient, Patient.id == Admission.patient_id)
        .where(*_scope(actor))
    )
    n, stable, no_readmit, home, los = db.execute(overall_stmt).one()
    overall = _recovery_row(
        "All admissions",
        int(n or 0),
        int(stable or 0),
        int(no_readmit or 0),
        int(home or 0),
        int(los or 0),
    )

    by_age = sorted(_recovery_by(db, actor, Patient.age_group), key=lambda row: row["group"])

    treatment_label = TreatmentOutcome.treatment_name.label("grp")
    treatment_stmt = (
        select(treatment_label, *_recovery_columns())
        .select_from(TreatmentOutcome)
        .join(Admission, Admission.id == TreatmentOutcome.admission_id)
        .join(Patient, Patient.id == Admission.patient_id)
        .where(*_scope(actor))
        .group_by(treatment_label)
        .order_by(func.count(Admission.id).desc())
        .limit(12)
    )
    by_treatment = [
        _recovery_row(str(g), int(c), int(s or 0), int(nr or 0), int(h or 0), int(los or 0))
        for g, c, s, nr, h, los in db.execute(treatment_stmt)
    ]

    return {
        "scope": scope_name(actor),
        "definition": RECOVERY_DEFINITION,
        "overall": overall,
        "by_age_group": by_age,
        "by_diagnosis_group": _recovery_by(db, actor, Patient.primary_diagnosis),
        "by_treatment": by_treatment,
        "caveat": (
            "Recovery here is a proxy for staying out of hospital and going home, not "
            "a measure of clinical improvement. Treatment rows are crude rates: the "
            "adjusted comparison is in the medication report."
        ),
    }


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
    return or_(*(diagnosis.ilike(f"%{pattern}%") for pattern in patterns))


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
