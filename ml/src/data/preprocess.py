"""Cleaning and preprocessing steps shared by training and inference."""

from typing import Any

import pandas as pd


# Discharge dispositions representing death/hospice outcomes.
# These encounters should not be used for readmission prediction because
# subsequent readmission is not a meaningful possible outcome.
EXCLUDED_DISCHARGE_DISPOSITIONS = {11, 13, 14, 19, 20, 21}


def drop_unused_columns(frame: pd.DataFrame, columns: list[str]) -> pd.DataFrame:
    """Drop identifier and high-missingness columns listed in the config."""
    present = [column for column in columns if column in frame.columns]
    return frame.drop(columns=present)


def split_feature_types(frame: pd.DataFrame) -> tuple[list[str], list[str]]:
    """Return the numeric and categorical column names of a dataframe."""
    numeric = frame.select_dtypes(include=["number"]).columns.tolist()
    categorical = [column for column in frame.columns if column not in numeric]
    return numeric, categorical


def remove_non_readmission_outcomes(frame: pd.DataFrame) -> pd.DataFrame:
    """Remove encounters whose discharge outcome makes readmission impossible."""
    if "discharge_disposition_id" not in frame.columns:
        return frame

    return frame.loc[
        ~frame["discharge_disposition_id"].isin(EXCLUDED_DISCHARGE_DISPOSITIONS)
    ].copy()


def normalise_age(frame: pd.DataFrame) -> pd.DataFrame:
    """Normalise the dataset's existing ten-year age buckets.

    The source dataset already supplies age as ranges such as [50-60), so we
    preserve those clinically interpretable buckets instead of inventing a
    continuous age value.
    """
    if "age" not in frame.columns:
        return frame

    result = frame.copy()
    result["age"] = result["age"].astype("string").str.strip()
    return result


def collapse_rare_diagnoses(
    frame: pd.DataFrame,
    min_frequency: float = 0.01,
) -> pd.DataFrame:
    """Collapse infrequent ICD diagnosis codes into an OTHER category.

    Diagnosis columns contain many distinct ICD-9 codes. Rare categories add
    unnecessary sparsity and can make the feature space unstable.
    """
    result = frame.copy()

    for column in ("diag_1", "diag_2", "diag_3"):
        if column not in result.columns:
            continue

        frequencies = result[column].value_counts(normalize=True, dropna=True)
        rare_values = frequencies[frequencies < min_frequency].index

        result[column] = result[column].where(
            ~result[column].isin(rare_values),
            "OTHER",
        )

    return result


def basic_clean(frame: pd.DataFrame, config: dict[str, Any]) -> pd.DataFrame:
    """Apply deterministic domain-specific cleaning.

    Steps:
      1. Remove duplicate encounters.
      2. Remove discharge outcomes incompatible with readmission modelling.
      3. Drop identifiers and configured high-missingness columns.
      4. Preserve and normalise the existing age buckets.
      5. Collapse rare diagnosis codes.
    """
    preprocessing = config.get("preprocessing", {})

    cleaned = frame.drop_duplicates().copy()
    cleaned = remove_non_readmission_outcomes(cleaned)

    cleaned = drop_unused_columns(
        cleaned,
        preprocessing.get("drop_columns", []),
    )

    cleaned = normalise_age(cleaned)

    cleaned = collapse_rare_diagnoses(
        cleaned,
        min_frequency=0.01,
    )

    return cleaned.reset_index(drop=True)
