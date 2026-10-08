"""Machine-learning model loading and inference service."""

from functools import lru_cache
from hashlib import sha256
from pathlib import Path
from typing import Any
from urllib.request import urlopen
from zipfile import ZipFile

import joblib
import pandas as pd

from app.core.config import settings

MODEL_FILENAME = "readmission_model.joblib"
MODEL_VERSION = "2.0.0-simple"

MODEL_DOWNLOAD_URL = (
    "https://github.com/GKSJ-AI-CliniScan/HealthForecastAI/"
    "releases/download/model-v2.0.0/readmission_model.zip"
)

MODEL_ZIP_SHA256 = "584cc7afd66117b82c1c64f9a244070fb76520de799ea594264aa9b3c162612e"


def _download_model() -> Path:
    """Download and extract the production model artifact."""
    artifacts_dir = Path("/tmp/healthforecastai-model")
    artifacts_dir.mkdir(parents=True, exist_ok=True)

    model_path = artifacts_dir / MODEL_FILENAME

    if model_path.exists():
        return model_path

    zip_path = artifacts_dir / "readmission_model.zip"

    with urlopen(MODEL_DOWNLOAD_URL, timeout=60) as response:
        zip_path.write_bytes(response.read())

    file_hash = sha256(zip_path.read_bytes()).hexdigest()

    if file_hash != MODEL_ZIP_SHA256:
        zip_path.unlink(missing_ok=True)
        raise RuntimeError("Downloaded model ZIP failed SHA-256 verification.")

    with ZipFile(zip_path) as archive:
        members = archive.namelist()

        if MODEL_FILENAME not in members:
            zip_path.unlink(missing_ok=True)
            raise FileNotFoundError(f"{MODEL_FILENAME} was not found inside the model ZIP.")

        archive.extract(MODEL_FILENAME, artifacts_dir)

    zip_path.unlink(missing_ok=True)

    return model_path


@lru_cache(maxsize=1)
def load_risk_model() -> Any:
    """Load the production risk prediction model."""
    model_path = Path(settings.MODEL_ARTIFACT_DIR) / MODEL_FILENAME

    if not model_path.exists():
        model_path = _download_model()

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
    """Predict the probability of hospital readmission."""
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
    """List locally available model artifacts."""
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
    """Return information about the active model."""
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
    """Return stored model evaluation metrics when available."""
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
