"""Feature construction for the readmission model.

These features are derived during Milestone 1 so that Milestone 2 modelling can
start from a table that already carries the strongest known signals from the
readmission literature: prior utilisation and medication instability.

``build_preprocessor`` and ``add_utilisation_features`` are the scaffold's
original contract and are still imported by ``src/models/train.py``. They are
kept here unchanged so the training entrypoint keeps working alongside the
Milestone 1 additions below.
"""

from __future__ import annotations

from typing import Any

import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

from src.data.preprocess import split_feature_types

# Every drug column in this dataset uses the same four-value dosage vocabulary.
DOSAGE_VALUES = frozenset({"No", "Up", "Down", "Steady"})

PRIOR_VISIT_COLUMNS = ("number_outpatient", "number_emergency", "number_inpatient")


def build_preprocessor(frame: pd.DataFrame, config: dict[str, Any]) -> ColumnTransformer:
    """Build the fitted-at-train-time preprocessing pipeline.

    Returning a ColumnTransformer (rather than transforming in place) keeps
    training and serving consistent - the same object is pickled with the model.
    """
    preprocessing = config.get("preprocessing", {})
    numeric, categorical = split_feature_types(frame)

    numeric_steps: list[tuple[str, Any]] = [
        ("impute", SimpleImputer(strategy=preprocessing.get("numeric_imputation", "median")))
    ]
    if preprocessing.get("scale_numeric", True):
        numeric_steps.append(("scale", StandardScaler()))

    categorical_steps: list[tuple[str, Any]] = [
        (
            "impute",
            SimpleImputer(strategy=preprocessing.get("categorical_imputation", "most_frequent")),
        ),
        ("encode", OneHotEncoder(handle_unknown="ignore", min_frequency=0.01)),
    ]

    return ColumnTransformer(
        transformers=[
            ("numeric", Pipeline(numeric_steps), numeric),
            ("categorical", Pipeline(categorical_steps), categorical),
        ],
        remainder="drop",
    )


def add_utilisation_features(frame: pd.DataFrame) -> pd.DataFrame:
    """Derive prior-utilisation features, the strongest readmission signal.

    Retained under its original name because ``src/models/train.py`` imports it.
    ``add_prior_visit_features`` below is the Milestone 1 equivalent.
    """
    result = frame.copy()
    utilisation_columns = ["number_outpatient", "number_emergency", "number_inpatient"]
    if all(column in result.columns for column in utilisation_columns):
        result["prior_visits_total"] = result[utilisation_columns].sum(axis=1)
    return result


def find_medication_columns(frame: pd.DataFrame) -> list[str]:
    """Return the drug columns, identified by their dosage vocabulary.

    Detecting them by content rather than by a hardcoded list means the pipeline
    survives a column being renamed or dropped upstream.
    """
    medication_columns = []
    for column in frame.columns:
        if pd.api.types.is_numeric_dtype(frame[column]):
            continue
        values = {str(value) for value in frame[column].dropna().unique()}
        if values and values <= DOSAGE_VALUES and frame[column].nunique() > 1:
            medication_columns.append(column)
    return medication_columns


def add_prior_visit_features(frame: pd.DataFrame) -> pd.DataFrame:
    """Add the total number of prior outpatient, emergency and inpatient visits."""
    featured = frame.copy()
    present = [column for column in PRIOR_VISIT_COLUMNS if column in featured.columns]
    if present:
        featured["total_prior_visits"] = featured[present].sum(axis=1)
    return featured


def add_medication_features(frame: pd.DataFrame) -> pd.DataFrame:
    """Add counts of prescribed drugs and of dosage changes.

    A dosage moved up or down during the stay is a proxy for an unstable patient,
    which is one of the stronger predictors of an early return.
    """
    featured = frame.copy()
    medication_columns = find_medication_columns(featured)
    if not medication_columns:
        return featured
    featured["num_med_changes"] = featured[medication_columns].isin(["Up", "Down"]).sum(axis=1)
    featured["num_meds_prescribed"] = featured[medication_columns].ne("No").sum(axis=1)
    return featured


def build_features(frame: pd.DataFrame) -> pd.DataFrame:
    """Run every Milestone 1 feature step in order."""
    featured = add_prior_visit_features(frame)
    featured = add_medication_features(featured)
    return featured
