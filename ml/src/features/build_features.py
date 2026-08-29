"""Feature construction for the readmission model.

These features are derived during Milestone 1 so that Milestone 2 modelling can
start from a table that already carries the strongest known signals from the
readmission literature: prior utilisation and medication instability.
"""

from __future__ import annotations

import pandas as pd

# Every drug column in this dataset uses the same four-value dosage vocabulary.
DOSAGE_VALUES = frozenset({"No", "Up", "Down", "Steady"})

PRIOR_VISIT_COLUMNS = ("number_outpatient", "number_emergency", "number_inpatient")


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
