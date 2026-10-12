"""Feature engineering and model preprocessing for readmission prediction."""

from collections.abc import Sequence
from typing import Any

import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

# ============================================================
# COLUMNS THAT MUST BE TREATED AS CATEGORICAL
# ============================================================

# These columns contain numeric IDs, but they represent
# categories rather than continuous numerical measurements.
#
# This matches the finalized Colab preprocessing pipeline,
# where these columns were stored as object/categorical data.

FORCE_CATEGORICAL_COLUMNS = [
    "admission_type_id",
    "admission_source_id",
]


def build_preprocessor(
    frame: pd.DataFrame,
    config: dict[str, Any],
    exclude: Sequence[str] = (),
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

    # Numerical features
    numeric = kept.select_dtypes(include=["int64", "float64"]).columns.tolist()
    numeric = [column for column in numeric if column not in FORCE_CATEGORICAL_COLUMNS]

    # Categorical features
    categorical = kept.select_dtypes(include=["object"]).columns.tolist()
    for column in FORCE_CATEGORICAL_COLUMNS:
        if column in kept.columns and column not in categorical:
            categorical.append(column)

    categorical = [column for column in kept.columns if column in categorical]
    numeric = [column for column in kept.columns if column in numeric]

    numeric_steps: list[tuple[str, Any]] = [
        (
            "imputer",
            SimpleImputer(
                strategy=preprocessing.get(
                    "numeric_imputation",
                    "median",
                ),
            ),
        ),
    ]

    if preprocessing.get(
        "scale_numeric",
        True,
    ):
        numeric_steps.append(
            (
                "scaler",
                StandardScaler(),
            )
        )

    numeric_pipeline = Pipeline(numeric_steps)

    # ========================================================
    # CATEGORICAL PREPROCESSING
    # ========================================================

    categorical_pipeline = Pipeline(
        [
            (
                "imputer",
                SimpleImputer(
                    strategy="constant",
                    fill_value="Missing",
                ),
            ),
            (
                "onehot",
                OneHotEncoder(
                    handle_unknown="ignore",
                    min_frequency=0.01,
                ),
            ),
        ]
    )

    # ========================================================
    # COMBINE NUMERICAL + CATEGORICAL
    # ========================================================

    preprocessor = ColumnTransformer(
        transformers=[
            (
                "numeric",
                numeric_pipeline,
                numeric,
            ),
            (
                "categorical",
                categorical_pipeline,
                categorical,
            ),
        ],
        remainder="drop",
    )

    # ========================================================
    # LOG FEATURE TYPE INFORMATION
    # ========================================================

    print("\nPreprocessing feature types:")

    print(f"Numerical features: {len(numeric)}")

    print(f"Categorical features: {len(categorical)}")

    print(f"Total preprocessing input features: " f"{len(numeric) + len(categorical)}")

    print("\nNumerical columns:")

    for index, column in enumerate(
        numeric,
        start=1,
    ):
        print(f"{index:02d}. {column}")

    print("\nCategorical columns:")

    for index, column in enumerate(
        categorical,
        start=1,
    ):
        print(f"{index:02d}. {column}")

    return preprocessor


# ============================================================
# OPTIONAL FEATURE ENGINEERING
# ============================================================


def add_utilisation_features(
    frame: pd.DataFrame,
) -> pd.DataFrame:
    """Create optional clinically relevant utilisation features.

    NOTE:
    These features are retained for compatibility with other
    project code, but they are NOT used by the finalized
    41-feature early-readmission model.
    """

    result = frame.copy()

    # ========================================================
    # TOTAL PREVIOUS HEALTHCARE VISITS
    # ========================================================

    utilisation_columns = [
        "number_outpatient",
        "number_emergency",
        "number_inpatient",
    ]

    if all(column in result.columns for column in utilisation_columns):
        result["prior_visits_total"] = (
            result["number_outpatient"] + result["number_emergency"] + result["number_inpatient"]
        )

        result["prior_acute_visits"] = result["number_emergency"] + result["number_inpatient"]

        result["any_prior_visit"] = (result["prior_visits_total"] > 0).astype(int)

    # ========================================================
    # MEDICATION CHANGE INDICATOR
    # ========================================================

    if "change" in result.columns:
        result["medication_change_flag"] = (
            result["change"].astype(str).str.strip().eq("Ch")
        ).astype(int)

    # ========================================================
    # DIABETES MEDICATION INDICATOR
    # ========================================================

    if "diabetesMed" in result.columns:
        result["diabetes_medication_flag"] = (
            result["diabetesMed"].astype(str).str.strip().eq("Yes")
        ).astype(int)

    return result
