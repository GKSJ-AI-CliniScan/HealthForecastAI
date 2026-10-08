"""Machine-learning model loading and inference service."""

import json
from contextlib import suppress
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
PRODUCTION_MODEL_DIR = Path("/tmp/healthforecastai-model")


def _download_model() -> Path:
    """Download and extract the production model artifact."""
    artifacts_dir = PRODUCTION_MODEL_DIR
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
    model_path = PRODUCTION_MODEL_DIR / MODEL_FILENAME

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
    """List the production model artifact."""
    model_path = PRODUCTION_MODEL_DIR / MODEL_FILENAME

    if not model_path.exists():
        try:
            model_path = _download_model()
        except Exception:
            return []

    if not model_path.exists():
        return []

    return [
        {
            "filename": model_path.name,
            "size_kb": round(model_path.stat().st_size / 1024, 1),
            "is_active": True,
        }
    ]


def get_active_model_info() -> dict:
    """Return information about the active production model."""
    model_path = PRODUCTION_MODEL_DIR / MODEL_FILENAME

    if not model_path.exists():
        with suppress(Exception):
            model_path = _download_model()

    exists = model_path.exists()

    return {
        "model_name": settings.ACTIVE_RISK_MODEL,
        "model_version": MODEL_VERSION,
        "artifact_path": str(model_path),
        "status": "loaded" if exists else "missing",
        "filename": MODEL_FILENAME,
    }


def get_active_model_metrics() -> dict:
    """Return evaluation metrics for the active model."""
    metrics_path = Path(__file__).with_name("model_metrics.json")

    metrics = {
        "accuracy": None,
        "precision": None,
        "recall": None,
        "f1": None,
        "roc_auc": None,
        "threshold": None,
    }

    if not metrics_path.exists():
        return metrics

    try:
        with metrics_path.open("r", encoding="utf-8") as file:
            saved_metrics = json.load(file)

        for key in metrics:
            value = saved_metrics.get(key)

            if value is not None:
                metrics[key] = float(value)

    except (OSError, ValueError, TypeError):
        pass

    return metrics
