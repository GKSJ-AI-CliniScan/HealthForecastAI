"""Cleaning and preprocessing steps shared by training and inference."""

from typing import Any

import pandas as pd

# Discharge disposition codes that mean the patient died or entered hospice,
# in the Diabetes 130-US export's coding scheme. Such an encounter cannot be
# followed by a readmission, so leaving these rows in the training set leaks
# the target: the model would learn that this disposition guarantees a
# negative label. Not every profile has an equivalent column - see
# remove_expired_encounters.
EXPIRED_OR_HOSPICE_DISPOSITIONS = frozenset({11, 13, 14, 19, 20, 21})

# Age bands below this share of the data are collapsed rather than one-hot
# encoded into a column that fires for a handful of rows.
RARE_CATEGORY_THRESHOLD = 0.01
RARE_LABEL = "Other"


def drop_unused_columns(frame: pd.DataFrame, columns: list[str]) -> pd.DataFrame:
    """Drop identifier and high-missingness columns listed in the profile."""
    present = [column for column in columns if column in frame.columns]
    return frame.drop(columns=present)


def split_feature_types(frame: pd.DataFrame) -> tuple[list[str], list[str]]:
    """Return the numeric and categorical column names of a dataframe."""
    numeric = frame.select_dtypes(include=["number"]).columns.tolist()
    categorical = [column for column in frame.columns if column not in numeric]
    return numeric, categorical


def remove_expired_encounters(
    frame: pd.DataFrame, disposition_column: str | None = "discharge_disposition_id"
) -> pd.DataFrame:
    """Drop encounters that ended in death or hospice transfer, when detectable.

    These patients cannot be readmitted, so their outcome is determined by the
    discharge disposition rather than by any clinical signal. Training on them
    inflates apparent performance and produces a model that cannot generalise.

    ``disposition_column`` is dataset-specific: the Diabetes 130-US export
    carries a numeric disposition code (discharge_disposition_id) checked
    against EXPIRED_OR_HOSPICE_DISPOSITIONS. The India Hospital Readmission
    export has no equivalent field available to this pipeline - its
    "department" column means something else entirely - so its profile passes
    disposition_column=None. Known gap: this pipeline currently has no
    leakage-safe filter for death/hospice-equivalent encounters in the India
    export.
    """
    if disposition_column is None or disposition_column not in frame.columns:
        return frame
    codes = pd.to_numeric(frame[disposition_column], errors="coerce")
    return frame[~codes.isin(EXPIRED_OR_HOSPICE_DISPOSITIONS)]


def drop_duplicate_encounters(frame: pd.DataFrame, profile: dict[str, Any]) -> pd.DataFrame:
    """Drop duplicate encounter rows, never duplicate patients.

    Mirrors DatasetImportService._encounter_identity: deduplicating on the
    patient identifier alone would discard genuine admission history, which is
    exactly the prior-utilisation signal add_history_features depends on. An
    encounter is identified by its own key when the profile has one
    (encounter_id for Diabetes 130-US), otherwise by the (patient, admission
    date) pair (India Hospital Readmission, which has no single encounter id).
    """
    encounter_key = profile.get("encounter_key")
    if encounter_key and encounter_key in frame.columns:
        return frame.drop_duplicates(subset=[encounter_key])

    id_column = profile.get("id_column")
    date_column = profile.get("date_column")
    pair = [c for c in (id_column, date_column) if c and c in frame.columns]
    if len(pair) == 2:
        return frame.drop_duplicates(subset=pair)

    return frame.drop_duplicates()


def bucket_age(frame: pd.DataFrame, column: str = "age") -> pd.DataFrame:
    """Convert an age band such as '[70-80)' into the numeric band start.

    Some exports (Diabetes 130-US) encode age as a string interval, which
    one-hot encoding would treat as unordered; taking the band's lower bound
    keeps the ordering that makes age usable as a numeric risk factor. A
    no-op when age is already numeric (India Hospital Readmission).
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

    Diagnosis columns have a long tail: without this, one-hot encoding
    produces hundreds of near-empty columns that add dimensionality and
    overfitting risk without adding signal.
    """
    collapsed = frame.copy()
    for column in columns:
        if column not in collapsed.columns:
            continue
        frequencies = collapsed[column].value_counts(normalize=True)
        rare = frequencies[frequencies < threshold].index
        collapsed[column] = collapsed[column].where(~collapsed[column].isin(rare), RARE_LABEL)
    return collapsed


def basic_clean(
    frame: pd.DataFrame,
    dataset_profile: dict[str, Any],
    preprocessing: dict[str, Any] | None = None,
) -> pd.DataFrame:
    """Apply leakage-safe cleaning for one dataset profile.

    Column pruning happens later (see drop_unused_columns, called from
    src/models/train.py after feature engineering has used the identifier and
    date columns this step deliberately leaves in place). Order matters here
    too: expired encounters are removed before anything else so that no later
    statistic (a rare-category frequency, an imputation median) is fitted on
    rows that will not be trained on.
    """
    preprocessing = preprocessing or {}

    cleaned = remove_expired_encounters(
        frame, dataset_profile.get("leakage_disposition_column", "discharge_disposition_id")
    )
    cleaned = drop_duplicate_encounters(cleaned, dataset_profile)
    cleaned = bucket_age(cleaned)
    cleaned = collapse_rare_categories(
        cleaned,
        dataset_profile.get("collapse_columns", []),
        preprocessing.get("rare_category_threshold", RARE_CATEGORY_THRESHOLD),
    )
    return cleaned
