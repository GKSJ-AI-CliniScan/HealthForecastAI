"""Hospital performance and trend monitoring.

Milestone 3.

Performance is reported as observed against expected readmissions - the standard
risk-adjusted measure. "Expected" is the sum of the model's own predicted
probabilities, so a department with older, sicker patients is not penalised for
the patients it happens to treat. A ratio above 1 means more readmissions than
the case mix predicts; the interval says whether that is distinguishable from
luck, and the verdict only calls a department worse or better when it is.

One caveat belongs next to every number: the model was fitted on this same
population, so these ratios are pulled towards 1 and understate real variation
between departments. They rank and flag; they do not certify.

Trends run on the only ordering the source data has. The dataset carries no
dates, so the axis is the source encounter id - a sequence, not a calendar - and
the response says so. The p-chart separates ordinary variation from a real shift:
a point is only a signal when it leaves the control limits, and a single noisy
bucket is not a trend.
"""

from __future__ import annotations

from typing import Any

from sqlalchemy import Float, case, cast, func, literal_column, select
from sqlalchemy.orm import Session

from app.core.rbac import Role
from app.models.admission import Admission
from app.models.patient import Patient
from app.models.prediction import RiskPrediction
from app.models.user import User
from app.services import risk_service, stats
from app.services.treatment_service import (
    HOME_DISPOSITIONS,
    MIN_CELL,
    scope_name,
)

DIMENSIONS: dict[str, tuple[str, Any]] = {
    "department": (
        "Admitting department",
        func.coalesce(Admission.department, literal_column("'Not recorded'")),
    ),
    "diagnosis_group": ("Primary diagnosis group", Patient.primary_diagnosis),
    "admission_type": ("Admission type", Admission.admission_type),
    "admission_source": ("Admission source", Admission.admission_source),
    "discharge_disposition": ("Discharge disposition", Admission.discharge_disposition),
    "age_group": ("Age band", Patient.age_group),
}

MODEL_CAVEAT = (
    "Expected readmissions come from the risk model, which was fitted on this same "
    "population. Ratios are therefore pulled towards 1 and understate true variation "
    "between groups: use them to rank and to flag, not to certify."
)

SEQUENCE_NOTE = (
    "The source data carries no dates, so the horizontal axis is the source encounter "
    "id (oldest to newest) split into equal-sized cohorts. It is a sequence, not a "
    "calendar: a real deployment with admission dates would trend by month."
)


def _readmit_flag() -> Any:
    return case((Admission.readmitted == "<30", 1), else_=0)


def _home_flag() -> Any:
    return case((Admission.discharge_disposition.in_(HOME_DISPOSITIONS), 1), else_=0)


def _scope(actor: User) -> list[Any]:
    if actor.role == Role.DOCTOR:
        return [Patient.assigned_doctor_id == actor.id]
    return []


def _oe(observed: int, expected: float) -> dict[str, Any] | None:
    """Observed/expected with its interval and a verdict, or None if undefined."""
    result = stats.observed_expected(observed, expected)
    if result is None:
        return None
    return {
        "observed": result.observed,
        "expected": round(result.expected, 1),
        "ratio": round(result.ratio, 3),
        "ci_low": round(result.low, 3),
        "ci_high": round(result.high, 3),
        "verdict": result.verdict,
    }


def performance(db: Session, actor: User, dimension: str, limit: int = 25) -> dict[str, Any]:
    """Risk-adjusted performance for every value of one dimension."""
    if dimension not in DIMENSIONS:
        raise ValueError(f"Unknown dimension '{dimension}'. Choose from: {', '.join(DIMENSIONS)}")

    title, expression = DIMENSIONS[dimension]
    group = func.coalesce(expression, literal_column("'Not recorded'")).label("grp")
    latest = risk_service.latest_prediction_subquery()

    columns = [
        func.count(Admission.id),
        func.sum(_readmit_flag()),
        func.sum(cast(RiskPrediction.readmission_probability, Float)),
        func.avg(cast(Admission.time_in_hospital, Float)),
        func.sum(_home_flag()),
    ]

    base = (
        select(group, *columns)
        .select_from(Admission)
        .join(Patient, Patient.id == Admission.patient_id)
        .outerjoin(latest, latest.c.patient_id == Admission.patient_id)
        .outerjoin(RiskPrediction, RiskPrediction.id == latest.c.latest_id)
        .where(*_scope(actor))
    )

    rows = []
    for name, n, events, expected, avg_los, home in db.execute(
        base.group_by(group).order_by(func.count(Admission.id).desc()).limit(limit)
    ):
        n = int(n)
        events = int(events or 0)
        if n < MIN_CELL:
            rows.append({"group": str(name), "admissions": n, "suppressed": True})
            continue
        rows.append(
            {
                "group": str(name),
                "admissions": n,
                "readmissions": events,
                "readmission_rate": round(events / n, 4),
                "average_length_of_stay": round(float(avg_los or 0.0), 2),
                "home_discharge_rate": round(int(home or 0) / n, 4),
                "observed_vs_expected": _oe(events, float(expected or 0.0)),
                "suppressed": False,
            }
        )

    overall_n, overall_events, overall_expected, _, _ = db.execute(
        select(*columns)
        .select_from(Admission)
        .join(Patient, Patient.id == Admission.patient_id)
        .outerjoin(latest, latest.c.patient_id == Admission.patient_id)
        .outerjoin(RiskPrediction, RiskPrediction.id == latest.c.latest_id)
        .where(*_scope(actor))
    ).one()

    return {
        "scope": scope_name(actor),
        "dimension": dimension,
        "dimension_title": title,
        "overall": {
            "admissions": int(overall_n or 0),
            "readmissions": int(overall_events or 0),
            "observed_vs_expected": _oe(int(overall_events or 0), float(overall_expected or 0.0)),
        },
        "rows": rows,
        "caveat": MODEL_CAVEAT,
    }


def _signals(points: list[dict[str, Any]], centre: float) -> list[dict[str, Any]]:
    """Return the points that signal a real change, with the reason.

    Two rules, both standard for a p-chart: a point outside the 3-sigma limits,
    and a run of eight successive points on the same side of the centre line.
    Anything else is ordinary variation and is not reported.
    """
    signals: list[dict[str, Any]] = []

    for point in points:
        if point["rate"] > point["upper_limit"]:
            signals.append(
                {
                    "cohort": point["cohort"],
                    "rule": "above the upper control limit",
                    "detail": f"{point['rate']:.1%} against a limit of {point['upper_limit']:.1%}",
                }
            )
        elif point["rate"] < point["lower_limit"]:
            signals.append(
                {
                    "cohort": point["cohort"],
                    "rule": "below the lower control limit",
                    "detail": f"{point['rate']:.1%} against a limit of {point['lower_limit']:.1%}",
                }
            )

    run_side = 0
    run_length = 0
    for point in points:
        side = 1 if point["rate"] > centre else -1 if point["rate"] < centre else 0
        if side != 0 and side == run_side:
            run_length += 1
        else:
            run_side = side
            run_length = 1 if side != 0 else 0
        if run_length == 8:
            signals.append(
                {
                    "cohort": point["cohort"],
                    "rule": "eight successive cohorts on one side of the centre line",
                    "detail": "a sustained shift, even though no single point is extreme",
                }
            )

    return signals


def sequence_trend(db: Session, actor: User, buckets: int = 10) -> dict[str, Any]:
    """Readmission, recovery, length of stay and predicted risk across the sequence."""
    latest = risk_service.latest_prediction_subquery()
    stable = case(
        (Admission.readmitted == "<30", 0),
        (Admission.discharge_disposition.in_(HOME_DISPOSITIONS), 1),
        else_=0,
    )

    numbered = (
        select(
            func.ntile(buckets).over(order_by=Admission.source_encounter_id).label("bucket"),
            Admission.source_encounter_id.label("encounter"),
            _readmit_flag().label("readmitted"),
            stable.label("stable"),
            cast(Admission.time_in_hospital, Float).label("los"),
            cast(RiskPrediction.readmission_probability, Float).label("probability"),
        )
        .select_from(Admission)
        .join(Patient, Patient.id == Admission.patient_id)
        .outerjoin(latest, latest.c.patient_id == Admission.patient_id)
        .outerjoin(RiskPrediction, RiskPrediction.id == latest.c.latest_id)
        .where(Admission.source_encounter_id.is_not(None), *_scope(actor))
        .subquery()
    )

    stmt = (
        select(
            numbered.c.bucket,
            func.count(),
            func.sum(numbered.c.readmitted),
            func.sum(numbered.c.stable),
            func.avg(numbered.c.los),
            func.sum(numbered.c.probability),
            func.min(numbered.c.encounter),
            func.max(numbered.c.encounter),
        )
        .group_by(numbered.c.bucket)
        .order_by(numbered.c.bucket)
    )

    raw = list(db.execute(stmt))
    total_n = sum(int(r[1]) for r in raw)
    total_events = sum(int(r[2] or 0) for r in raw)
    centre = total_events / total_n if total_n else 0.0

    points: list[dict[str, Any]] = []
    for bucket, n, events, stable_n, avg_los, expected, first, last in raw:
        n = int(n)
        events = int(events or 0)
        lower, upper = stats.p_chart_limits(centre, n)
        rate = events / n if n else 0.0
        points.append(
            {
                "cohort": int(bucket),
                "n": n,
                "encounter_range": [int(first), int(last)],
                "rate": round(rate, 4),
                "lower_limit": round(lower, 4),
                "upper_limit": round(upper, 4),
                "out_of_control": bool(rate > upper or rate < lower),
                "expected_rate": round(float(expected or 0.0) / n, 4) if n else None,
                "stable_recovery_rate": round(int(stable_n or 0) / n, 4) if n else None,
                "average_length_of_stay": round(float(avg_los or 0.0), 2),
            }
        )

    return {
        "scope": scope_name(actor),
        "axis": "encounter sequence",
        "axis_note": SEQUENCE_NOTE,
        "buckets": buckets,
        "centre_line": round(centre, 4),
        "points": points,
        "signals": _signals(points, centre),
        "reading": (
            "Points inside the limits are ordinary variation. Only a point outside the "
            "limits, or a run of eight on one side of the centre line, is a signal."
        ),
    }
