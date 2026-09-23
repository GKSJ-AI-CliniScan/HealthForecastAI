"""Feature engineering for readmission risk."""

from typing import Any

import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

from src.data.preprocess import split_feature_types


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


def add_utilisation_features(
    frame: pd.DataFrame, utilisation_columns: list[str] | None = None
) -> pd.DataFrame:
    """Sum pre-aggregated prior-visit columns into one utilisation feature.

    Only meaningful for exports that carry pre-aggregated visit counts (the
    Diabetes 130-US export's number_outpatient/number_emergency/
    number_inpatient); a no-op otherwise. The India Hospital Readmission
    export has no such columns - see add_history_features below for its
    equivalent prior-utilisation signal, derived from raw admission dates.

    TODO(milestone-2): add comorbidity counts and medication-change indicators.
    """
    # None means "use the Diabetes 130-US default"; an explicit [] (the India
    # profile) means "this export has none" and must stay empty, not fall
    # back - `columns or [...]` would treat both the same way and silently
    # reactivate the Diabetes columns for a profile that doesn't have them.
    if utilisation_columns is None:
        columns = ["number_outpatient", "number_emergency", "number_inpatient"]
    else:
        columns = utilisation_columns

    result = frame.copy()
    if columns and all(column in result.columns for column in columns):
        result["prior_visits_total"] = result[columns].sum(axis=1)
    return result


def add_history_features(
    frame: pd.DataFrame, id_column: str | None, date_column: str | None
) -> pd.DataFrame:
    """Derive prior-admission-count and days-since-last-discharge per patient.

    "The best predictor of a future admission is a past admission" is the
    single strongest documented readmission signal (ML Design section 7,
    Historical Features). The India Hospital Readmission export has no
    pre-aggregated utilisation columns (unlike Diabetes 130-US), so this
    pipeline derives the same signal from each patient's own admission
    history instead. A no-op when the profile has no usable id/date pair
    (Diabetes 130-US has no real calendar dates in the public export).

    Both derived columns are computed strictly from admissions on or before
    the current row (a forward-in-time cumulative count and a lag-1 date
    diff), so a row never sees information from its own or a later
    admission - required to avoid leaking the future into a feature.
    """
    if (
        id_column is None
        or date_column is None
        or id_column not in frame.columns
        or date_column not in frame.columns
    ):
        return frame

    result = frame.copy()
    dates = pd.to_datetime(result[date_column], errors="coerce")
    order = dates.sort_values(kind="stable", na_position="last").index
    ordered = result.loc[order].assign(_date=dates.loc[order])

    ordered["prior_admission_count"] = ordered.groupby(id_column).cumcount()
    previous_date = ordered.groupby(id_column)["_date"].shift(1)
    ordered["days_since_last_discharge"] = (ordered["_date"] - previous_date).dt.days

    result["prior_admission_count"] = ordered["prior_admission_count"].reindex(result.index)
    result["days_since_last_discharge"] = ordered["days_since_last_discharge"].reindex(result.index)
    return result
