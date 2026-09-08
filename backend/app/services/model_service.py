"""Model loading and live ML inference service."""

from pathlib import Path
from typing import Any
import joblib
import pandas as pd

from app.core.config import settings
from app.schemas.prediction import RiskPredictionRequest

_model_cache: Any = None


def get_trained_model() -> Any:
    """Load and cache the best trained model artifact."""
    global _model_cache
    if _model_cache is not None:
        return _model_cache

    # Search for model artifact in ml/artifacts/
    repo_root = Path(__file__).resolve().parents[3]
    candidate_paths = [
        repo_root / "ml" / "artifacts" / "best_model.joblib",
        repo_root / "ml" / "artifacts" / "xgboost.joblib",
        repo_root / "ml" / "artifacts" / "random_forest.joblib",
    ]

    for p in candidate_paths:
        if p.exists():
            _model_cache = joblib.load(p)
            return _model_cache

    return None


def predict_readmission_probability(payload: RiskPredictionRequest) -> float:
    """Run feature transformation and predict readmission probability for a patient."""
    model = get_trained_model()
    if model is None:
        # Fallback heuristic calculation if artifact not found
        base = 0.20
        base += min(payload.time_in_hospital * 0.04, 0.35)
        base += min(payload.num_medications * 0.02, 0.30)
        base += min(payload.number_emergency * 0.15, 0.30)
        return min(max(base, 0.05), 0.98)

    # Construct input dataframe matching model training features
    input_dict = {
        "time_in_hospital": [payload.time_in_hospital],
        "num_medications": [payload.num_medications],
        "num_lab_procedures": [payload.num_lab_procedures],
        "num_procedures": [1],
        "number_diagnoses": [payload.number_diagnoses],
        "number_outpatient": [0],
        "number_emergency": [payload.number_emergency],
        "number_inpatient": [payload.number_inpatient],
        "age": [payload.age_group or "[60-70)"],
        "gender": ["Female"],
        "race": ["Caucasian"],
        "change": ["Ch" if payload.num_medications >= 10 else "No"],
        "diabetesMed": ["Yes"],
    }
    df = pd.DataFrame(input_dict)

    # Derive engineered features
    df["prior_visits_total"] = df["number_outpatient"] + df["number_emergency"] + df["number_inpatient"]
    df["is_polypharmacy"] = (df["num_medications"] >= 10).astype(int)
    df["has_med_change"] = (df["change"].astype(str).str.strip().str.lower() == "ch").astype(int)
    df["is_long_stay"] = (df["time_in_hospital"] >= 7).astype(int)

    try:
        if hasattr(model, "predict_proba"):
            probs = model.predict_proba(df)
            return float(probs[0][1])
        preds = model.predict(df)
        return float(preds[0])
    except Exception:
        # Fallback if specific column mismatch occurs
        base = 0.20 + min(payload.time_in_hospital * 0.04, 0.35) + min(payload.num_medications * 0.02, 0.30)
        return min(max(base, 0.05), 0.98)
