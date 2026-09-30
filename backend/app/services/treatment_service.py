"""Treatment effectiveness, medication outcomes and recovery analysis.

Milestone 3. Answers the question a clinician actually has - "do patients on this
drug do better?" - without the trap that makes the naive answer wrong.

The trap is confounding by indication. Sicker patients are given more intensive
treatment, so a drug's crude readmission rate mostly measures who got it, not
what it did. Every comparison here is therefore made twice: crude, and adjusted
by stratifying on age band, prior inpatient visits and primary diagnosis group
and pooling with Mantel-Haenszel. Where the two disagree the report says so,
because that disagreement is the finding.

What this is not: a causal estimate. It is observational data with three
adjustment variables. It can say "associated with", never "causes", and every
response carries that caveat.
"""

from __future__ import annotations

from typing import Any

from sqlalchemy import String, case, cast, func, literal_column, select
from sqlalchemy.orm import Session

from app.core.rbac import Role
from app.models.admission import Admission
from app.models.patient import Patient
from app.models.treatment import TreatmentOutcome
from app.models.user import User
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
