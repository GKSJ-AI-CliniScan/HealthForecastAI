"""Cleaning and preprocessing for the Diabetes 130-US Hospitals dataset.

Milestone 1. The steps here encode decisions that matter clinically, not just
mechanically - each one is commented with why it exists, because getting these
wrong produces a model that scores well and is useless.
"""

from __future__ import annotations

from typing import Any

import pandas as pd

from src.data.mappings import (
    ADMISSION_SOURCE,
    ADMISSION_TYPE,
    DISCHARGE_DISPOSITION,
    NON_READMITTABLE_DISPOSITIONS,
    group_diagnosis,
    midpoint_of_age_bracket,
    parse_age_bracket,
)


def drop_unused_columns(frame: pd.DataFrame, columns: list[str]) -> pd.DataFrame:
    """Drop identifier and high-missingness columns listed in the config."""
    present = [column for column in columns if column in frame.columns]
    return frame.drop(columns=present)


def split_feature_types(frame: pd.DataFrame) -> tuple[list[str], list[str]]:
    """Return the numeric and categorical column names of a dataframe."""
    numeric = frame.select_dtypes(include=["number"]).columns.tolist()
    categorical = [column for column in frame.columns if column not in numeric]
    return numeric, categorical


def decode_id_columns(frame: pd.DataFrame) -> pd.DataFrame:
    """Replace the opaque id columns with their human readable descriptions."""
    result = frame.copy()

    lookups = (
        ("admission_type_id", "admission_type", ADMISSION_TYPE),
        ("discharge_disposition_id", "discharge_disposition", DISCHARGE_DISPOSITION),
        ("admission_source_id", "admission_source", ADMISSION_SOURCE),
    )
    for source_column, target_column, lookup in lookups:
        if source_column in result.columns:
            result[target_column] = (
                pd.to_numeric(result[source_column], errors="coerce").map(lookup).fillna("Unknown")
            )

    return result


def drop_non_readmittable(frame: pd.DataFrame) -> tuple[pd.DataFrame, int]:
    """Remove encounters that ended in death or hospice transfer.

    Such a patient cannot be readmitted, so keeping the row leaks the outcome
    into the target. Returns the filtered frame and how many rows were removed.
    """
    if "discharge_disposition_id" not in frame.columns:
        return frame, 0

    disposition = pd.to_numeric(frame["discharge_disposition_id"], errors="coerce")
    keep = ~disposition.isin(NON_READMITTABLE_DISPOSITIONS)
    return frame.loc[keep].copy(), int((~keep).sum())


def deduplicate_patients(frame: pd.DataFrame) -> tuple[pd.DataFrame, int]:
    """Keep only the first encounter per patient.

    Encounters from the same patient are not independent observations. Leaving
    all of them in lets information about a patient appear in both the training
    and the test split, which inflates every metric.
    """
    if "patient_nbr" not in frame.columns:
        return frame, 0

    before = len(frame)
    sort_columns = [c for c in ("patient_nbr", "encounter_id") if c in frame.columns]
    deduped = (
        frame.sort_values(sort_columns).drop_duplicates(subset="patient_nbr", keep="first").copy()
    )
    return deduped, before - len(deduped)


def drop_incomplete_follow_up(frame: pd.DataFrame, fraction: float) -> tuple[pd.DataFrame, int]:
    """Set aside the newest encounters, whose outcome has not had time to happen.

    A 30-day readmission label needs a later encounter to exist. An index
    encounter near the end of the collection window has had less time for one to
    occur, so its label undercounts readmissions - and the shortfall grows the
    closer to the end it sits. The trend monitor found this: after keeping each
    patient's first encounter, the 30-day rate falls from about 9.7% to 4.2% across
    the newest 5% of encounters, though it is flat across the raw data.

    This is the same reasoning as removing patients who died: the outcome cannot
    be observed, so the row cannot teach or test anything. The dataset carries no
    dates, so "newest" is the highest source encounter id.

    It is a pragmatic mitigation, not a correction: the truncation is gradual, so no
    cut is perfectly clean. docs/06-milestones/milestone-3.md publishes how the
    remaining cohorts behave at 0, 10, 15 and 20%.
    """
    if fraction <= 0 or "encounter_id" not in frame.columns:
        return frame, 0

    cutoff = frame["encounter_id"].quantile(1.0 - fraction)
    keep = frame["encounter_id"] <= cutoff
    return frame.loc[keep].copy(), int((~keep).sum())


def engineer_columns(frame: pd.DataFrame) -> pd.DataFrame:
    """Add the derived columns the model and the dashboards both use."""
    result = frame.copy()

    if "age" in result.columns:
        result["age_group"] = result["age"].map(parse_age_bracket)
        result["age_midpoint"] = result["age"].map(midpoint_of_age_bracket)

    for column in ("diag_1", "diag_2", "diag_3"):
        if column in result.columns:
            result[f"{column}_group"] = result[column].map(group_diagnosis)

    utilisation = ["number_outpatient", "number_emergency", "number_inpatient"]
    if all(column in result.columns for column in utilisation):
        result["prior_visits_total"] = result[utilisation].sum(axis=1)

    if "readmitted" in result.columns:
        result["readmitted_within_30_days"] = (
            result["readmitted"].astype(str).str.strip() == "<30"
        ).astype(int)

    return result


def basic_clean(
    frame: pd.DataFrame, config: dict[str, Any], drop_columns: bool = True
) -> pd.DataFrame:
    """Apply the full cleaning pipeline in the order the steps depend on.

    Set drop_columns=False to keep the identifier columns. The ETL needs
    patient_nbr to build the medical record number; the training pipeline must
    not see it, so it uses the default.
    """
    preprocessing = config.get("preprocessing", {})

    cleaned = decode_id_columns(frame)

    if preprocessing.get("drop_non_readmittable", True):
        cleaned, _ = drop_non_readmittable(cleaned)

    if preprocessing.get("deduplicate_patients", True):
        cleaned, _ = deduplicate_patients(cleaned)

    cleaned, _ = drop_incomplete_follow_up(
        cleaned, float(preprocessing.get("follow_up_buffer_fraction", 0.0))
    )

    cleaned = engineer_columns(cleaned)

    if drop_columns:
        cleaned = drop_unused_columns(cleaned, preprocessing.get("drop_columns", []))

    return cleaned.reset_index(drop=True)


def summarise(frame: pd.DataFrame) -> dict[str, Any]:
    """Return a small report describing a dataframe, for the milestone write-up."""
    missing = frame.isna().sum()
    worst = missing[missing > 0].sort_values(ascending=False).head(10)

    summary: dict[str, Any] = {
        "rows": int(len(frame)),
        "columns": int(frame.shape[1]),
        "missing_by_column": {str(k): int(v) for k, v in worst.items()},
    }

    if "readmitted_within_30_days" in frame.columns:
        positives = int(frame["readmitted_within_30_days"].sum())
        summary["positives"] = positives
        summary["positive_rate"] = round(positives / len(frame), 4) if len(frame) else 0.0

    return summary
