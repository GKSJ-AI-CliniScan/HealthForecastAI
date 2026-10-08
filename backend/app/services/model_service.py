"""Machine-learning model loading and inference service."""

from functools import lru_cache
from pathlib import Path
from typing import Any

import joblib
import pandas as pd

from app.core.config import settings

MODEL_FILENAME = "readmission_model.joblib"
MODEL_VERSION = "2.0.0-simple"
MODEL_SECRET_PATH = Path("/etc/secrets/readmission_model.joblib")


@lru_cache(maxsize=1)
def load_risk_model() -> Any:
    model_path = Path(settings.MODEL_ARTIFACT_DIR) / MODEL_FILENAME

    if not model_path.exists() and MODEL_SECRET_PATH.exists():
        model_path = MODEL_SECRET_PATH

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
    model = load_risk_model()

    row = pd.DataFrame(
        [
            {
                "time_in_hospital": time_in_hospital,
                "num_medications": num_medications,
                "num_lab_procedures": num_lab_procedures,
                "number_diagnoses": number_diagnoses,
                "number_inpatient": number_inpatient,
                "number_emergency": number_emergency,
                "age_group": age_group,
            }
        ]
    )

    probability = model.predict_proba(row)[0, 1]
    return float(probability)


def list_registered_models() -> list[dict]:
    artifacts_dir = Path(settings.MODEL_ARTIFACT_DIR)

    if not artifacts_dir.exists():
        return []

    models: list[dict] = []

    for file in sorted(artifacts_dir.glob("*.joblib")):
        models.append(
            {
                "filename": file.name,
                "size_kb": round(file.stat().st_size / 1024, 1),
                "is_active": file.name == MODEL_FILENAME,
            }
        )

    return models


def get_active_model_info() -> dict:
    model_path = Path(settings.MODEL_ARTIFACT_DIR) / MODEL_FILENAME
    exists = model_path.exists()

    return {
        "model_name": settings.ACTIVE_RISK_MODEL,
        "model_version": MODEL_VERSION,
        "artifact_path": str(model_path),
        "status": "loaded" if exists else "missing",
        "filename": MODEL_FILENAME,
    }


def get_active_model_metrics() -> dict:
    artifacts_dir = Path(settings.MODEL_ARTIFACT_DIR)
    metrics_path = artifacts_dir / "metrics.joblib"
    threshold_path = artifacts_dir / "threshold.joblib"

    metrics = {
        "accuracy": None,
        "precision": None,
        "recall": None,
        "f1": None,
        "roc_auc": None,
        "threshold": None,
    }

    if metrics_path.exists():
        try:
            saved_metrics = joblib.load(metrics_path)

            if isinstance(saved_metrics, dict):
                for key in (
                    "accuracy",
                    "precision",
                    "recall",
                    "f1",
                    "roc_auc",
                ):
                    value = saved_metrics.get(key)

                    if value is not None:
                        metrics[key] = float(value)
        except Exception:
            pass

    if threshold_path.exists():
        try:
            threshold = joblib.load(threshold_path)

            if isinstance(threshold, int | float):
                metrics["threshold"] = float(threshold)
            elif isinstance(threshold, dict):
                threshold_value = threshold.get("threshold")

                if threshold_value is not None:
                    metrics["threshold"] = float(threshold_value)
        except Exception:
            pass

    return metrics
