"""Recovery scoring and treatment effectiveness analysis.

Two separate jobs live here. ``recovery_score`` turns one finished encounter
into a single 0-100 number for the dashboard. ``treatment_effectiveness``
compares readmission rates between treatment groups, with an interval and a
p-value attached to every comparison so a difference over a handful of rows is
visibly not a finding.

Nothing in this file is a causal claim. Patients whose medication was changed
were not randomised into that group - they were changed because they were
sicker - so a higher readmission rate among them is an association and is
worded as one throughout.
"""

from __future__ import annotations

import math
from typing import Any

import pandas as pd
from scipy.stats import chi2_contingency, norm

# The dataset's three-way outcome column, and what counts as an event for each
# of the two rates reported everywhere below.
READMITTED_COLUMN = "readmitted"
EARLY_READMISSION = "<30"
ANY_READMISSION = ("<30", ">30")


def _lookup(value: object, mapping: dict[str, float]) -> float | None:
    """Return the configured score for a categorical value, or None if unmapped.

    Unmapped covers both a genuinely missing value and the dataset's literal
    "None" string in A1Cresult, which means the test was never performed. Both
    mean the same thing for scoring: this component cannot be judged, so the
    caller drops it rather than guessing a middle value.
    """
    if value is None or (isinstance(value, float) and math.isnan(value)):
        return None
    return mapping.get(str(value).strip())


def _normalised_stay(value: object, bounds: dict[str, Any]) -> float | None:
    """Score length of stay, shorter being better, against the configured range.

    Values outside the range are clamped instead of rejected. A 20-day stay is
    still the worst case the score can express, and rejecting it would drop a
    component for a patient we do in fact know something about.
    """
    try:
        days = float(value)  # type: ignore[arg-type]
    except (TypeError, ValueError):
        return None
    if math.isnan(days):
        return None
    low = float(bounds["min"])
    high = float(bounds["max"])
    if high <= low:
        return 1.0
    days = min(max(days, low), high)
    return 1.0 - (days - low) / (high - low)


def recovery_components(row: Any, config: dict[str, Any]) -> dict[str, float]:
    """Return the components that can be scored for one encounter.

    Split out from ``recovery_score`` so a caller (and the tests) can see which
    components were actually available, not only the number that came out.
    """
    settings = config["recovery_score"]
    components: dict[str, float] = {}

    outcome = _lookup(row.get(READMITTED_COLUMN), settings["readmitted_values"])
    if outcome is not None:
        components["readmitted"] = outcome

    stay = _normalised_stay(row.get("time_in_hospital"), settings["time_in_hospital_range"])
    if stay is not None:
        components["time_in_hospital"] = stay

    a1c = _lookup(row.get("A1Cresult"), settings["a1c_values"])
    if a1c is not None:
        components["a1c_result"] = a1c

    return components


def recovery_score(row: Any, config: dict[str, Any]) -> float | None:
    """Score one encounter from 0 to 100, higher being a better recovery.

    The weights of whichever components are present are re-normalised, so a row
    with no A1C result is scored on readmission and length of stay alone rather
    than being penalised for a test that was never ordered. Returns None when no
    component is available at all - a 0 there would read as the worst possible
    recovery, which is a different statement from "not known".
    """
    weights = config["recovery_score"]["weights"]
    components = recovery_components(row, config)
    if not components:
        return None
    total_weight = sum(float(weights[name]) for name in components)
    if total_weight <= 0:
        return None
    weighted = sum(float(weights[name]) * value for name, value in components.items())
    return round(100.0 * weighted / total_weight, 2)


def recovery_score_series(frame: pd.DataFrame, config: dict[str, Any]) -> pd.Series:
    """Score a whole frame, one row at a time.

    Deliberately reuses the single-row function rather than a faster vectorised
    copy: the per-row version is the one the backend will call through the
    loader, and two implementations would be two things to keep in step.
    """
    return frame.apply(lambda row: recovery_score(row, config), axis=1)


def wilson_interval(successes: int, total: int, confidence: float = 0.95) -> list[float]:
    """Return a Wilson confidence interval for a proportion.

    Wilson rather than the textbook normal interval because readmission rates
    here are near 0.1 on groups that can be small, where the normal interval
    runs below zero and stops being readable.
    """
    if total <= 0:
        return [0.0, 0.0]
    z = float(norm.ppf(1.0 - (1.0 - confidence) / 2.0))
    rate = successes / total
    denominator = 1.0 + z**2 / total
    centre = rate + z**2 / (2 * total)
    spread = z * math.sqrt(rate * (1 - rate) / total + z**2 / (4 * total**2))
    low = (centre - spread) / denominator
    high = (centre + spread) / denominator
    return [round(max(0.0, low), 4), round(min(1.0, high), 4)]


def _chi_square(counts: pd.DataFrame) -> dict[str, Any]:
    """Run a chi-square test of independence over a group-by-outcome table.

    Returns nulls rather than raising when the table cannot support the test
    (one group, or a group with no rows). Reporting "not computed" is honest;
    reporting a p-value scipy refused to produce would not be.
    """
    table = counts.to_numpy()
    if table.shape[0] < 2 or table.shape[1] < 2 or (table.sum(axis=1) == 0).any():
        return {"p_value": None, "statistic": None, "note": "too few groups to test"}
    statistic, p_value, _, _ = chi2_contingency(table)
    return {"p_value": round(float(p_value), 6), "statistic": round(float(statistic), 4)}


def group_outcomes(
    frame: pd.DataFrame,
    column: str,
    config: dict[str, Any],
) -> dict[str, Any]:
    """Compare readmission rates across the values of one column.

    Both rates the brief asks for are reported side by side: the 30-day rate the
    model predicts, and the any-readmission rate, which is the larger and
    steadier number. The chi-square test is run over the 30-day outcome, since
    that is the one the platform acts on.
    """
    settings = config["treatment_analysis"]
    confidence = float(settings.get("confidence_level", 0.95))
    min_size = int(settings.get("min_group_size", 30))

    outcome = frame[READMITTED_COLUMN].astype(str).str.strip()
    early = (outcome == EARLY_READMISSION).astype(int)
    any_readmit = outcome.isin(ANY_READMISSION).astype(int)

    groups = []
    counts = []
    for value, index in frame.groupby(frame[column].astype(str), dropna=False).groups.items():
        total = len(index)
        early_count = int(early.loc[index].sum())
        any_count = int(any_readmit.loc[index].sum())
        groups.append(
            {
                "value": str(value),
                "n": total,
                "readmitted_30d": early_count,
                "rate_30d": round(early_count / total, 4) if total else None,
                "ci_95_30d": wilson_interval(early_count, total, confidence),
                "readmitted_any": any_count,
                "rate_any": round(any_count / total, 4) if total else None,
                "ci_95_any": wilson_interval(any_count, total, confidence),
                "reliable": total >= min_size,
            }
        )
        counts.append([early_count, total - early_count])

    groups.sort(key=lambda group: group["value"])
    table = pd.DataFrame(
        [[group["readmitted_30d"], group["n"] - group["readmitted_30d"]] for group in groups]
    )
    return {"factor": column, "groups": groups, "chi_square_30d": _chi_square(table)}


def a1c_tested_outcomes(frame: pd.DataFrame, config: dict[str, Any]) -> dict[str, Any]:
    """Compare readmission rates between encounters where A1C was tested and not.

    This is the closest the dataset gets to the brief's "HbA1c improvement".
    There is only one A1C value per encounter and no follow-up value, so an
    improvement cannot be measured; what can be measured is whether ordering the
    test at all is associated with a different outcome.
    """
    tested_values = {str(value) for value in config["treatment_analysis"]["a1c_tested_values"]}
    working = frame.copy()
    working["a1c_tested"] = working["A1Cresult"].astype(str).str.strip().isin(tested_values)
    working["a1c_tested"] = working["a1c_tested"].map({True: "tested", False: "not tested"})
    return group_outcomes(working, "a1c_tested", config)


def a1c_and_medication_change(frame: pd.DataFrame, config: dict[str, Any]) -> dict[str, Any]:
    """Cross A1C testing with whether medication was changed, against the outcome.

    Named for exactly what it is. The brief asks for "HbA1c improvement after a
    medication change", which this dataset cannot answer - there is no post-change
    A1C value. This reports the four-way split "A1C tested yes/no x medication
    changed yes/no -> readmission rate" instead, and the label says so.
    """
    tested_values = {str(value) for value in config["treatment_analysis"]["a1c_tested_values"]}
    working = frame.copy()
    tested = working["A1Cresult"].astype(str).str.strip().isin(tested_values)
    changed = working["change"].astype(str).str.strip() == "Ch"
    working["a1c_and_change"] = [
        f"a1c {'tested' if t else 'not tested'} + medication {'changed' if c else 'unchanged'}"
        for t, c in zip(tested, changed, strict=False)
    ]
    result = group_outcomes(working, "a1c_and_change", config)
    result["measures"] = (
        "association between A1C testing, medication change and readmission; "
        "not a measured HbA1c reduction - the dataset has no follow-up A1C value"
    )
    return result


def treatment_effectiveness(
    frame: pd.DataFrame,
    config: dict[str, Any],
    medication_columns: list[str],
) -> dict[str, Any]:
    """Run every treatment comparison the milestone asks for.

    Output goes straight into treatment_metrics.json under "treatment_effectiveness",
    and from there to the backend through src/serving/insights_loader.py.
    """
    settings = config["treatment_analysis"]
    result: dict[str, Any] = {"factors": {}, "medications": {}}

    for column in settings["factors"]:
        if column in frame.columns:
            result["factors"][column] = group_outcomes(frame, column, config)

    result["factors"]["a1c_tested"] = a1c_tested_outcomes(frame, config)
    result["factors"]["a1c_and_medication_change"] = a1c_and_medication_change(frame, config)

    # One comparison per drug, over its Up/Down/Steady/No dosage values. Most
    # drugs in this dataset are "No" for almost every patient, which is why the
    # per-group reliable flag matters more here than anywhere else.
    for column in medication_columns:
        if column in frame.columns and frame[column].nunique(dropna=False) > 1:
            result["medications"][column] = group_outcomes(frame, column, config)

    return result
