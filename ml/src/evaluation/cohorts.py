"""Cohort analytics: recovery and readmission broken down by patient group.

Groups are age band, gender, race and primary diagnosis. The ICD-9 mapping is
not re-implemented here - it calls ``preprocess.group_icd9_code``, the same
function the training pipeline uses to build diag_1_group, so a cohort label and
a model feature can never drift apart.

A cohort smaller than the configured minimum is reported with reliable=false
rather than dropped. Dropping it would leave a reader to assume the cohort had
no readmissions, which is the opposite of "we do not have enough rows to say".
"""

from __future__ import annotations

from typing import Any

import pandas as pd

from src.data.preprocess import group_icd9_code
from src.evaluation.treatment import (
    ANY_READMISSION,
    EARLY_READMISSION,
    READMITTED_COLUMN,
    recovery_score_series,
    wilson_interval,
)

# The milestone names its diagnosis groups in lower case; preprocess.py returns
# them capitalised. This table is the translation, and it is also the list of
# groups the output is allowed to contain.
DIAGNOSIS_LABELS = {
    "Circulatory": "circulatory",
    "Respiratory": "respiratory",
    "Digestive": "digestive",
    "Diabetes": "diabetes",
    "Injury": "injury",
    "Musculoskeletal": "musculoskeletal",
    "Genitourinary": "genitourinary",
    "Neoplasms": "neoplasms",
    "Other": "other",
    # Kept as its own bucket instead of folded into "other": a missing primary
    # diagnosis is a data gap, not a clinical category.
    "Missing": "missing",
}

DIAGNOSIS_COLUMN = "diagnosis_cohort"


def diagnosis_group(code: object) -> str:
    """Map one ICD-9 code to the milestone's lower-case diagnosis group."""
    return DIAGNOSIS_LABELS.get(group_icd9_code(code), "other")


def add_diagnosis_cohort(frame: pd.DataFrame) -> pd.DataFrame:
    """Add the primary-diagnosis cohort column used by the cohort breakdown.

    Prefers the already-computed diag_1_group when the frame has been through
    basic_clean, and falls back to mapping diag_1 directly so the function also
    works on a raw frame in a test.
    """
    result = frame.copy()
    if "diag_1_group" in result.columns:
        result[DIAGNOSIS_COLUMN] = result["diag_1_group"].map(
            lambda value: DIAGNOSIS_LABELS.get(str(value), "other")
        )
    elif "diag_1" in result.columns:
        result[DIAGNOSIS_COLUMN] = result["diag_1"].map(diagnosis_group)
    return result


def cohort_metrics(
    frame: pd.DataFrame, column: str, config: dict[str, Any]
) -> list[dict[str, Any]]:
    """Return recovery score and readmission rates for every value of one column.

    The recovery score is computed once for the whole frame and then averaged per
    group, so a patient scored as None (no component available) is excluded from
    the mean without being dropped from the row count.
    """
    min_size = int(config["cohorts"]["min_size"])
    confidence = float(config["treatment_analysis"].get("confidence_level", 0.95))

    outcome = frame[READMITTED_COLUMN].astype(str).str.strip()
    early = (outcome == EARLY_READMISSION).astype(int)
    any_readmit = outcome.isin(ANY_READMISSION).astype(int)
    scores = recovery_score_series(frame, config)

    rows: list[dict[str, Any]] = []
    for value, index in frame.groupby(frame[column].astype(str), dropna=False).groups.items():
        total = len(index)
        early_count = int(early.loc[index].sum())
        group_scores = scores.loc[index].dropna()
        rows.append(
            {
                "cohort": str(value),
                "n": total,
                "readmitted_30d": early_count,
                "rate_30d": round(early_count / total, 4) if total else None,
                "ci_95_30d": wilson_interval(early_count, total, confidence),
                "rate_any": round(int(any_readmit.loc[index].sum()) / total, 4) if total else None,
                "mean_recovery_score": (
                    round(float(group_scores.mean()), 2) if len(group_scores) else None
                ),
                "scored_rows": int(len(group_scores)),
                "reliable": total >= min_size,
            }
        )

    rows.sort(key=lambda row: row["cohort"])
    return rows


def cohort_analytics(frame: pd.DataFrame, config: dict[str, Any]) -> dict[str, Any]:
    """Run every configured cohort breakdown.

    Output goes into treatment_metrics.json under "cohorts", keyed by the cohort
    type names the backend asks for: age, gender, race, diagnosis.
    """
    working = add_diagnosis_cohort(frame)
    columns = dict(config["cohorts"]["columns"])
    # The diagnosis cohort is the column this module derives, not the raw one
    # named in the config, so it is redirected here rather than in the config.
    columns["diagnosis"] = DIAGNOSIS_COLUMN

    result: dict[str, Any] = {}
    for cohort_type, column in columns.items():
        if column in working.columns:
            result[cohort_type] = cohort_metrics(working, column, config)
    return result
