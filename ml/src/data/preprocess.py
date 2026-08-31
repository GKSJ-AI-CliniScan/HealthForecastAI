"""Cleaning and preprocessing steps shared by training and inference."""

from typing import Any

import pandas as pd

# Discharge disposition ids in the Diabetes 130-US export that mean the patient
# died or entered hospice. Such an encounter cannot be followed by a readmission,
# so leaving these rows in the training set leaks the target: the model would
# learn that this disposition guarantees a negative label.
EXPIRED_OR_HOSPICE_DISPOSITIONS = frozenset({11, 13, 14, 19, 20, 21})

# Age bands below this share of the data are collapsed rather than one-hot
# encoded into a column that fires for a handful of rows.
RARE_CATEGORY_THRESHOLD = 0.01
RARE_LABEL = "Other"


def drop_unused_columns(frame: pd.DataFrame, columns: list[str]) -> pd.DataFrame:
    """Drop identifier and high-missingness columns listed in the config."""
    present = [column for column in columns if column in frame.columns]
    return frame.drop(columns=present)


def split_feature_types(frame: pd.DataFrame) -> tuple[list[str], list[str]]:
    """Return the numeric and categorical column names of a dataframe."""
    numeric = frame.select_dtypes(include=["number"]).columns.tolist()
    categorical = [column for column in frame.columns if column not in numeric]
    return numeric, categorical


def remove_expired_encounters(frame: pd.DataFrame) -> pd.DataFrame:
    """Drop encounters that ended in death or hospice transfer.

    These patients cannot be readmitted, so their outcome is determined by the
    discharge disposition rather than by any clinical signal. Training on them
    inflates apparent performance and produces a model that cannot generalise.
    """
    if "discharge_disposition_id" not in frame.columns:
        return frame
    codes = pd.to_numeric(frame["discharge_disposition_id"], errors="coerce")
    return frame[~codes.isin(EXPIRED_OR_HOSPICE_DISPOSITIONS)]


def bucket_age(frame: pd.DataFrame, column: str = "age") -> pd.DataFrame:
    """Convert an age band such as '[70-80)' into the numeric band start.

    The source encodes age as a string interval, which one-hot encoding would
    treat as unordered. Taking the band's lower bound keeps the ordering that
    makes age usable as a numeric risk factor.
    """
    if column not in frame.columns:
        return frame
    bucketed = frame.copy()
    bucketed[column] = (
        bucketed[column].astype(str).str.extract(r"(\d+)", expand=False).astype("Float64")
    )
    return bucketed


def collapse_rare_categories(
    frame: pd.DataFrame,
    columns: list[str],
    threshold: float = RARE_CATEGORY_THRESHOLD,
) -> pd.DataFrame:
    """Replace values rarer than ``threshold`` with a single 'Other' label.

    Diagnosis codes have a long tail: without this, one-hot encoding produces
    hundreds of near-empty columns that add dimensionality and overfitting risk
    without adding signal.
    """
    collapsed = frame.copy()
    for column in columns:
        if column not in collapsed.columns:
            continue
        frequencies = collapsed[column].value_counts(normalize=True)
        rare = frequencies[frequencies < threshold].index
        collapsed[column] = collapsed[column].where(~collapsed[column].isin(rare), RARE_LABEL)
    return collapsed


def basic_clean(frame: pd.DataFrame, config: dict[str, Any]) -> pd.DataFrame:
    """Apply the configured cleaning steps.

    Order matters: expired encounters are removed before anything else so that
    no later statistic (a rare-category frequency, an imputation median) is fitted
    on rows that will not be trained on.
    """
    preprocessing = config.get("preprocessing", {})

    cleaned = remove_expired_encounters(frame)
    cleaned = drop_unused_columns(cleaned, preprocessing.get("drop_columns", []))
    cleaned = cleaned.drop_duplicates()
    cleaned = bucket_age(cleaned)
    cleaned = collapse_rare_categories(
        cleaned,
        preprocessing.get("collapse_columns", ["diag_1", "diag_2", "diag_3"]),
        preprocessing.get("rare_category_threshold", RARE_CATEGORY_THRESHOLD),
    )
    return cleaned
