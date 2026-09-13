"""Machine-learning model loading and inference service."""

from functools import lru_cache
from pathlib import Path
from typing import Any

import joblib
import numpy as np
import pandas as pd

from app.core.config import settings

MODEL_FILENAME = "readmission_model.joblib"
MODEL_VERSION = "1.0.0"


@lru_cache(maxsize=1)
def load_risk_model() -> Any:
    """Load and cache the trained readmission risk model."""
    model_path = Path(settings.MODEL_ARTIFACT_DIR) / MODEL_FILENAME

    if not model_path.exists():
        raise FileNotFoundError(f"Risk model artifact not found at {model_path}")

    return joblib.load(model_path)


def get_expected_features(model: Any) -> list[str]:
    """Return the raw feature columns expected by the trained pipeline."""
    estimator = model.estimator.estimator
    preprocessor = estimator.named_steps["preprocess"]

    features: list[str] = []

    for _, _, columns in preprocessor.transformers_:
        if columns is not None:
            features.extend(columns)

    return features


def build_prediction_features(
    *,
    time_in_hospital: int,
    num_medications: int,
    num_lab_procedures: int,
    number_diagnoses: int,
    number_inpatient: int,
    number_emergency: int,
    age_group: str | None,
) -> pd.DataFrame:
    """Build a complete model input row from the API prediction payload."""

    model = load_risk_model()
    expected_features = get_expected_features(model)

    row: dict[str, Any] = {feature: np.nan for feature in expected_features}

    row.update(
        {
            "time_in_hospital": time_in_hospital,
            "num_medications": num_medications,
            "num_lab_procedures": num_lab_procedures,
            "number_diagnoses": number_diagnoses,
            "number_inpatient": number_inpatient,
            "number_emergency": number_emergency,
            "age": age_group,
            "prior_visits_total": (number_inpatient + number_emergency),
        }
    )

    return pd.DataFrame([row], columns=expected_features)


def predict_readmission(
    *,
    time_in_hospital: int,
    num_medications: int,
    num_lab_procedures: int,
    number_diagnoses: int,
    number_inpatient: int,
    number_emergency: int,
    age_group: str | None,
) -> float:
    """Return the calibrated readmission probability."""

    model = load_risk_model()

    features = build_prediction_features(
        time_in_hospital=time_in_hospital,
        num_medications=num_medications,
        num_lab_procedures=num_lab_procedures,
        number_diagnoses=number_diagnoses,
        number_inpatient=number_inpatient,
        number_emergency=number_emergency,
        age_group=age_group,
    )

    probability = model.predict_proba(features)[0, 1]

    return float(probability)
