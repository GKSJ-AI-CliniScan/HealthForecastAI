"""Feature engineering and model preprocessing for readmission prediction."""

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


# ============================================================
# BUILD PREPROCESSOR
# ============================================================


def build_preprocessor(
    frame: pd.DataFrame,
    config: dict[str, Any],
) -> ColumnTransformer:
    """Build the preprocessing pipeline used during model training.

    This preprocessing matches the finalized Colab model.

    Numerical features:
    - Identified from int64/float64 columns.
    - Missing values are replaced using median imputation.
    - StandardScaler is applied.

    Categorical features:
    - Identified from object columns.
    - admission_type_id and admission_source_id are explicitly
      treated as categorical IDs.
    - Missing values are represented as "Missing".
    - One-hot encoding is applied.
    - Categories occurring in less than 1% of the training
      data are grouped by OneHotEncoder's min_frequency setting.

    The fitted preprocessing pipeline is stored together with
    the model so training and prediction use the same
    transformations.
    """

    preprocessing = config.get(
        "preprocessing",
        {},
    )

    # ========================================================
    # IDENTIFY NUMERICAL FEATURES
    # ========================================================

    numeric = frame.select_dtypes(include=["int64", "float64"]).columns.tolist()

    # Remove columns that must be treated as categorical.
    numeric = [column for column in numeric if column not in FORCE_CATEGORICAL_COLUMNS]

    # ========================================================
    # IDENTIFY CATEGORICAL FEATURES
    # ========================================================

    categorical = frame.select_dtypes(include=["object"]).columns.tolist()

    # Add numeric ID columns that represent categories.
    for column in FORCE_CATEGORICAL_COLUMNS:
        if column in frame.columns and column not in categorical:
            categorical.append(column)

    # Keep the feature ordering deterministic.
    categorical = [column for column in frame.columns if column in categorical]

    numeric = [column for column in frame.columns if column in numeric]

    # ========================================================
    # NUMERICAL PREPROCESSING
    # ========================================================

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
