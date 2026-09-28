"""Machine-learning model loading and inference service."""

from functools import lru_cache
from pathlib import Path
from typing import Any

import joblib
import pandas as pd

from app.core.config import settings

MODEL_FILENAME = "readmission_model.joblib"
MODEL_VERSION = "2.0.0-simple"


@lru_cache(maxsize=1)
def load_risk_model() -> Any:
    model_path = Path(settings.MODEL_ARTIFACT_DIR) / MODEL_FILENAME
    if not model_path.exists():
        raise FileNotFoundError(f"Risk model artifact not found at {model_path}")
    return joblib.load(model_path)


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
    """Return the readmission probability using ONLY the 7 real inputs."""
    model = load_risk_model()

    # Build a row with EXACTLY the 7 fields the model was trained on —
    # no padding with NaN for columns that don't exist here.
    row = pd.DataFrame([{
        "time_in_hospital": time_in_hospital,
        "num_medications": num_medications,
        "num_lab_procedures": num_lab_procedures,
        "number_diagnoses": number_diagnoses,
        "number_inpatient": number_inpatient,
        "number_emergency": number_emergency,
        "age_group": age_group,
    }])

    probability = model.predict_proba(row)[0, 1]
    return float(probability)