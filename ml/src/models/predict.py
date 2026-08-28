"""Batch and single-record inference for the readmission risk model."""

from pathlib import Path
from typing import Any

import joblib
import pandas as pd

from src.evaluation.metrics import categorise_risk


def load_model(artifact_dir: str | Path, filename: str = "readmission_model.joblib") -> Any:
    """Load a trained pipeline from disk."""
    model_path = Path(artifact_dir) / filename
    if not model_path.exists():
        raise FileNotFoundError(
            f"No trained model at {model_path}. Run: python -m src.models.train"
        )
    return joblib.load(model_path)


def predict_frame(model: Any, frame: pd.DataFrame, high: float, medium: float) -> pd.DataFrame:
    """Score a dataframe and attach probabilities and risk bands."""
    probabilities = model.predict_proba(frame)[:, 1]
    result = frame.copy()
    result["readmission_probability"] = probabilities
    result["risk_category"] = [
        categorise_risk(float(value), high=high, medium=medium) for value in probabilities
    ]
    return result
