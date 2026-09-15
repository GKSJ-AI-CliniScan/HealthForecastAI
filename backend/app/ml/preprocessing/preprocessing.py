"""Preprocessing pipeline for imputation, scaling, and categorical encoding."""

from __future__ import annotations

from pathlib import Path

import joblib
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

from app.ml.preprocessing.feature_engineering import engineer_features

# Canonical numerical features to use
NUMERICAL_FEATURES = [
    "time_in_hospital",
    "num_lab_procedures",
    "num_procedures",
    "num_medications",
    "number_outpatient",
    "number_emergency",
    "number_inpatient",
    "number_diagnoses",
    "total_prior_visits",
    "prior_inpatient_ratio",
    "med_changed",
    "has_diabetes_med",
]

# Canonical categorical features to encode
CATEGORICAL_FEATURES = [
    "race",
    "gender",
    "age",
    "admission_type_id",
    "discharge_disposition_id",
    "admission_source_id",
    "max_glu_serum",
    "A1Cresult",
    "metformin",
    "glipizide",
    "glyburide",
    "insulin",
    "diag_1_category",
]


def create_preprocessor() -> ColumnTransformer:
    """Create a ColumnTransformer with numeric and categorical branches."""
    numeric_transformer = Pipeline(
        steps=[
            ("imputer", SimpleImputer(strategy="median")),
            ("scaler", StandardScaler()),
        ]
    )

    categorical_transformer = Pipeline(
        steps=[
            ("imputer", SimpleImputer(strategy="constant", fill_value="Unknown")),
            ("encoder", OneHotEncoder(handle_unknown="ignore", sparse_output=False)),
        ]
    )

    preprocessor = ColumnTransformer(
        transformers=[
            ("num", numeric_transformer, NUMERICAL_FEATURES),
            ("cat", categorical_transformer, CATEGORICAL_FEATURES),
        ]
    )
    return preprocessor


class ClinicalDataPreprocessor:
    """Wrapper encapsulating feature engineering and ColumnTransformer."""

    def __init__(self, preprocessor: ColumnTransformer | None = None):
        self.preprocessor = preprocessor or create_preprocessor()
        self.is_fitted = False
        self.feature_names_: list[str] = []

    def fit(self, X: pd.DataFrame, y=None) -> ClinicalDataPreprocessor:
        X_eng = engineer_features(X)
        self.preprocessor.fit(X_eng)
        self.is_fitted = True

        # Extract output feature names
        try:
            cat_encoder = self.preprocessor.named_transformers_["cat"].named_steps["encoder"]
            cat_features = cat_encoder.get_feature_names_out(CATEGORICAL_FEATURES)
            self.feature_names_ = NUMERICAL_FEATURES + list(cat_features)
        except Exception:
            self.feature_names_ = [f"feat_{i}" for i in range(100)]

        return self

    def transform(self, X: pd.DataFrame):
        if not self.is_fitted:
            raise ValueError("ClinicalDataPreprocessor is not fitted yet.")
        X_eng = engineer_features(X)
        # Ensure all columns required by transformers exist
        for col in NUMERICAL_FEATURES:
            if col not in X_eng.columns:
                X_eng[col] = 0
        for col in CATEGORICAL_FEATURES:
            if col not in X_eng.columns:
                X_eng[col] = "Unknown"
        return self.preprocessor.transform(X_eng)

    def fit_transform(self, X: pd.DataFrame, y=None):
        return self.fit(X, y).transform(X)

    def save(self, filepath: str | Path) -> None:
        """Serialize fitted preprocessor to disk."""
        Path(filepath).parent.mkdir(parents=True, exist_ok=True)
        joblib.dump(self, filepath)

    @classmethod
    def load(cls, filepath: str | Path) -> ClinicalDataPreprocessor:
        """Load serialized preprocessor from disk."""
        return joblib.load(filepath)
