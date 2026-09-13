"""Machine-learning model loading and inference service."""

from functools import lru_cache
from pathlib import Path
from typing import Any

import joblib
import numpy as np
import pandas as pd
from xgboost import DMatrix

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


def get_risk_drivers(
    *,
    time_in_hospital: int,
    num_medications: int,
    num_lab_procedures: int,
    number_diagnoses: int,
    number_inpatient: int,
    number_emergency: int,
    age_group: str | None,
    top_n: int = 5,
) -> tuple[float, list[dict[str, Any]]]:
    """Return prediction probability and top model-derived feature contributions."""

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

    probability = float(model.predict_proba(features)[0, 1])

    estimator = model.estimator.estimator
    preprocessor = estimator.named_steps["preprocess"]
    classifier = estimator.named_steps["model"]
    transformed = preprocessor.transform(features)

    if hasattr(transformed, "toarray"):
        transformed = transformed.toarray()

    feature_names = preprocessor.get_feature_names_out().tolist()

    booster = classifier.get_booster()

    dmatrix = DMatrix(transformed)

    contributions = booster.predict(
        dmatrix,
        pred_contribs=True,
    )[0]

    feature_contributions = contributions[:-1]

    ranked_indices = np.argsort(np.abs(feature_contributions))[::-1]

    drivers: list[dict[str, Any]] = []

    for index in ranked_indices[:top_n]:
        contribution = float(feature_contributions[index])

        if np.isclose(contribution, 0.0):
            continue

        raw_feature_name = str(feature_names[index])
        feature_name = format_driver_name(raw_feature_name)

        drivers.append(
            {
                "feature": feature_name,
                "value": None,
                "contribution": contribution,
                "direction": (
                    "increases_risk"
                    if contribution > 0
                    else "decreases_risk"
                ),
            }
        )

    return probability, drivers

def format_driver_name(feature_name: str) -> str:
    """Convert preprocessing feature names into readable labels."""

    name = feature_name

    if name.startswith("numeric__"):
        name = name.removeprefix("numeric__")

    elif name.startswith("categorical__"):
        name = name.removeprefix("categorical__")

    replacements = {
        "number_inpatient": "Previous inpatient visits",
        "number_emergency": "Previous emergency visits",
        "number_diagnoses": "Number of diagnoses",
        "num_medications": "Number of medications",
        "num_lab_procedures": "Number of laboratory procedures",
        "time_in_hospital": "Length of hospital stay",
        "age": "Age group",
        "age_infrequent_sklearn": "Age group",
        "diag_1": "Primary diagnosis",
        "diag_2": "Secondary diagnosis",
        "diag_3": "Additional diagnosis",
        "number_outpatient": "Previous outpatient visits",
    }

    if name in replacements:
        return replacements[name]

    if name.startswith("diag_1_"):
        return f"Primary diagnosis: {name.removeprefix('diag_1_')}"

    if name.startswith("diag_2_"):
        return f"Secondary diagnosis: {name.removeprefix('diag_2_')}"

    if name.startswith("diag_3_"):
        return f"Additional diagnosis: {name.removeprefix('diag_3_')}"

    return name.replace("_", " ").strip().title()
