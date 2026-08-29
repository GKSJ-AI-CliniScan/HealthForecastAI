"""Loading and serving the trained readmission model.

The artefact is loaded once and cached, not read per request: unpickling a
scikit-learn pipeline on every call would dominate the response time.

A missing artefact is reported as an error rather than silently substituted with
a zero probability. A clinician reading "0% risk" cannot tell the difference
between a healthy patient and a model that was never trained.
"""

from __future__ import annotations

import threading
from pathlib import Path
from typing import Any

from app.core.config import settings

MODEL_FILENAME = "readmission_model.joblib"
METRICS_FILENAME = "metrics.json"

# Feature columns the API sends to the pipeline, in a fixed order. The trained
# ColumnTransformer selects what it needs by name and ignores the rest, so this
# list only has to be a superset of what the model was fitted on.
REQUEST_FEATURES = (
    "time_in_hospital",
    "num_medications",
    "num_lab_procedures",
    "number_diagnoses",
    "number_inpatient",
    "number_emergency",
    "age_group",
)


class ModelUnavailableError(Exception):
    """Raised when no trained artefact is available to score with."""


class _ModelCache:
    """Holds the loaded pipeline and its version, guarded for thread safety."""

    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._pipeline: Any | None = None
        self._version: str | None = None

    def artifact_path(self) -> Path:
        """Return the path the trained pipeline is expected at."""
        return Path(settings.MODEL_ARTIFACT_DIR) / MODEL_FILENAME

    def load(self) -> tuple[Any, str]:
        """Return the cached pipeline and version, loading it on first use."""
        if self._pipeline is not None and self._version is not None:
            return self._pipeline, self._version

        with self._lock:
            # Re-check inside the lock: another thread may have loaded it while
            # this one was waiting.
            if self._pipeline is not None and self._version is not None:
                return self._pipeline, self._version

            path = self.artifact_path()
            if not path.exists():
                raise ModelUnavailableError(
                    f"No trained model at {path}. Run: cd ml && python -m src.models.train"
                )

            import joblib

            try:
                pipeline = joblib.load(path)
            except Exception as exc:  # noqa: BLE001 - surfaced as 503 by the caller
                raise ModelUnavailableError(f"Could not load the model at {path}: {exc}") from exc

            self._pipeline = pipeline
            self._version = _read_version(path)
            return self._pipeline, self._version

    def reset(self) -> None:
        """Drop the cached pipeline. Used by tests and after a retrain."""
        with self._lock:
            self._pipeline = None
            self._version = None


_cache = _ModelCache()


def _read_version(path: Path) -> str:
    """Derive a version string for the artefact currently on disk.

    The training run writes metrics.json next to the model; its best_model name
    plus the artefact's modification time identifies exactly which run produced
    the predictions being served.
    """
    import json
    from datetime import UTC, datetime

    stamp = datetime.fromtimestamp(path.stat().st_mtime, tz=UTC).strftime("%Y%m%d%H%M")
    metrics_path = path.parent / METRICS_FILENAME
    if metrics_path.exists():
        try:
            summary = json.loads(metrics_path.read_text(encoding="utf-8"))
            best = summary.get("best_model")
            if best:
                return f"{best}-{stamp}"
        except (OSError, json.JSONDecodeError):
            pass
    return stamp


def reset_cache() -> None:
    """Forget the loaded artefact so the next call reloads from disk."""
    _cache.reset()


def is_available() -> bool:
    """Return True when a trained artefact exists on disk."""
    return _cache.artifact_path().exists()


def model_version() -> str:
    """Return the version of the artefact currently loaded."""
    _, version = _cache.load()
    return version


def predict_probability(features: dict[str, Any]) -> float:
    """Return the 30-day readmission probability for one admission.

    Raises ModelUnavailableError when no artefact has been trained yet.
    """
    import pandas as pd

    pipeline, _ = _cache.load()
    row = {name: features.get(name) for name in REQUEST_FEATURES}
    frame = pd.DataFrame([row])

    try:
        probability = float(pipeline.predict_proba(frame)[:, 1][0])
    except Exception as exc:  # noqa: BLE001 - a stale artefact is an outage, not a 500
        raise ModelUnavailableError(
            "The loaded model could not score this request; it may have been trained "
            f"on a different feature set: {exc}"
        ) from exc

    # Clamp defensively: a corrupt artefact must not produce a probability the
    # response schema would reject with a 500.
    return min(max(probability, 0.0), 1.0)
