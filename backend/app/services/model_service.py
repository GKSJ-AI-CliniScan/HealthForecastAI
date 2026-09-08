"""Loading and serving the trained readmission risk model.

Milestone 2. The artifact produced by `ml/src/models/train.py` is a dict holding
the fitted sklearn pipeline plus everything needed to serve it reproducibly: the
model name and version, the tuned decision threshold, the feature columns it was
fitted on, and its test metrics.

The model is loaded lazily and cached. A missing artifact is not a crash - the
API degrades to "model not loaded" so the rest of the platform keeps working.
"""

from __future__ import annotations

import threading
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from app.core.config import settings
from app.core.logging_config import logger

# Isotonic calibration saturates at its outermost bins. Clip so no patient is
# ever reported as certain to be readmitted, or certain not to be.
PROBABILITY_FLOOR = 0.001
PROBABILITY_CEILING = 0.999

_lock = threading.Lock()
_cached: LoadedModel | None = None


@dataclass
class LoadedModel:
    """A trained pipeline plus the metadata needed to serve it."""

    pipeline: Any
    model_name: str
    model_version: str
    decision_threshold: float
    feature_columns: list[str]
    metrics: dict[str, float] = field(default_factory=dict)
    top_drivers: list[dict[str, Any]] = field(default_factory=list)
    trained_at: str | None = None

    def predict_proba(self, frame: Any) -> Any:
        """Return the positive-class probability for each row, clipped.

        Isotonic calibration is a step function fitted on the validation split,
        so its top and bottom bins map to exactly 1.0 and 0.0. On this data that
        hit 14 patients out of 69,990 - but "100% certain to be readmitted" is
        not a claim any model can support, and showing it to a clinician would
        rightly destroy their trust in the rest of the numbers. Clipping keeps
        the ranking identical and the extremes honest.
        """
        probabilities = self.pipeline.predict_proba(frame)[:, 1]
        return probabilities.clip(PROBABILITY_FLOOR, PROBABILITY_CEILING)


def artifact_path() -> Path:
    """Return the absolute path of the model artifact.

    MODEL_ARTIFACT_DIR is written relative to the repository root so it reads the
    same in the docs, but the backend runs from backend/. Anchor it.
    """
    configured = Path(settings.MODEL_ARTIFACT_DIR)
    if configured.is_absolute():
        return configured / "readmission_model.joblib"

    repo_root = Path(__file__).resolve().parents[3]
    return repo_root / configured / "readmission_model.joblib"


def load_model(force: bool = False) -> LoadedModel | None:
    """Load and cache the promoted model. Returns None when no artifact exists."""
    global _cached

    if _cached is not None and not force:
        return _cached

    with _lock:
        if _cached is not None and not force:
            return _cached

        path = artifact_path()
        if not path.exists():
            logger.warning(
                "No model artifact at %s - risk endpoints will report model_loaded=false. "
                "Run: cd ml && python -m src.models.train",
                path,
            )
            return None

        try:
            import joblib

            payload = joblib.load(path)
        except Exception:  # noqa: BLE001 - a broken artifact must not take the API down
            logger.exception("Failed to load the model artifact at %s", path)
            return None

        if not isinstance(payload, dict) or "pipeline" not in payload:
            logger.error(
                "Artifact at %s is not in the expected format. Retrain with the "
                "current ml/src/models/train.py.",
                path,
            )
            return None

        _cached = LoadedModel(
            pipeline=payload["pipeline"],
            model_name=payload.get("model_name", "unknown"),
            model_version=payload.get("model_version", "0.0.0"),
            decision_threshold=float(payload.get("decision_threshold", 0.5)),
            feature_columns=list(payload.get("feature_columns", [])),
            metrics=payload.get("metrics", {}),
            top_drivers=payload.get("top_drivers", []),
            trained_at=payload.get("trained_at"),
        )
        logger.info(
            "Loaded model %s v%s (threshold %.4f)",
            _cached.model_name,
            _cached.model_version,
            _cached.decision_threshold,
        )
        return _cached


def reset_cache() -> None:
    """Drop the cached model. Used by tests and by the reload endpoint."""
    global _cached
    with _lock:
        _cached = None


def is_loaded() -> bool:
    """Return True when a model artifact is available."""
    return load_model() is not None


def model_info() -> dict[str, Any]:
    """Return a description of the active model for the management endpoints."""
    model = load_model()
    if model is None:
        return {
            "loaded": False,
            "artifact_path": str(artifact_path()),
            "hint": "Run: cd ml && python -m src.models.train",
        }

    return {
        "loaded": True,
        "model_name": model.model_name,
        "model_version": model.model_version,
        "decision_threshold": model.decision_threshold,
        "trained_at": model.trained_at,
        "metrics": model.metrics,
        "feature_count": len(model.feature_columns),
        "artifact_path": str(artifact_path()),
    }
