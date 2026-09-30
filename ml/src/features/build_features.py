"""Feature engineering for readmission risk."""

from collections.abc import Sequence
from typing import Any

import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

from src.data.preprocess import split_feature_types


def build_preprocessor(
    frame: pd.DataFrame, config: dict[str, Any], exclude: Sequence[str] = ()
) -> ColumnTransformer:
    """Build the fitted-at-train-time preprocessing pipeline.

    Returning a ColumnTransformer (rather than transforming in place) keeps
    training and serving consistent - the same object is pickled with the model.

    `exclude` names columns the model must not see. They stay in the frame - the
    fairness audit still needs race and gender to slice results - but the
    transformer never selects them, so they cannot influence a prediction.
    """
    preprocessing = config.get("preprocessing", {})
    kept = frame.drop(columns=[c for c in exclude if c in frame.columns])
    numeric, categorical = split_feature_types(kept)

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

    TODO(milestone-2): add comorbidity counts and medication-change indicators.
    """
    result = frame.copy()
    utilisation_columns = ["number_outpatient", "number_emergency", "number_inpatient"]
    if all(column in result.columns for column in utilisation_columns):
        result["prior_visits_total"] = result[utilisation_columns].sum(axis=1)
    return result
