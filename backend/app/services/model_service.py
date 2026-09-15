"""ML model loading and prediction service."""

from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd

from app.core.config import settings


def _model_path() -> Path:
    """Return the path to the trained ML model artifact."""
    project_root = Path(__file__).resolve().parents[3]
    return project_root / settings.MODEL_ARTIFACT_DIR / "readmission_model.joblib"


def load_model() -> Any:
    """Load the trained readmission model from disk."""
    import joblib

    model_path = _model_path()
    if not model_path.exists():
        return None

    try:
        return joblib.load(model_path)
    except Exception:
        return None


def calculate_baseline_risk(features: dict[str, Any]) -> float:
    """Calculate clinical risk baseline (LACE index approximation) when ML artifact is offline."""
    time_in_hospital = float(features.get("time_in_hospital") or 1)
    num_medications = float(features.get("num_medications") or 1)
    number_diagnoses = float(features.get("number_diagnoses") or 1)
    num_lab_procedures = float(features.get("num_lab_procedures") or 10)
    number_inpatient = float(features.get("number_inpatient") or 0)
    number_emergency = float(features.get("number_emergency") or 0)

    # Risk factor calculation
    base_score = 0.10
    base_score += min(time_in_hospital * 0.03, 0.25)
    base_score += min(number_inpatient * 0.15, 0.30)
    base_score += min(number_emergency * 0.08, 0.20)
    base_score += min(number_diagnoses * 0.02, 0.15)
    base_score += min(num_medications * 0.005, 0.10)
    base_score += min(num_lab_procedures * 0.001, 0.05)

    return round(float(np.clip(base_score, 0.05, 0.95)), 4)


def predict_risk(features: dict[str, Any]) -> float:
    """Return the probability of 30-day readmission using trained ML model with baseline fallback."""
    model = load_model()

    if model is None:
        return calculate_baseline_risk(features)

    try:
        frame = pd.DataFrame([features])

        if "number_inpatient" in frame.columns and "number_emergency" in frame.columns:
            frame["prior_visits_total"] = (
                pd.to_numeric(frame["number_inpatient"], errors="coerce").fillna(0)
                + pd.to_numeric(frame["number_emergency"], errors="coerce").fillna(0)
            )

        if hasattr(model, "feature_names_in_"):
            expected_features = list(model.feature_names_in_)
            for feature in expected_features:
                if feature not in frame.columns:
                    frame[feature] = np.nan
            frame = frame[expected_features]

        return float(model.predict_proba(frame)[0, 1])
    except Exception:
        return calculate_baseline_risk(features)
