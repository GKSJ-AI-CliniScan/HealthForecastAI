"""Loads the current-production model artefact for a model family.

The registry (model_metadata, Phase A) is the single source of truth for
"which artefact is live" - this module never hardcodes a filename or a path.
Register a newly trained artefact with scripts/register_model.py before a
prediction endpoint can serve it.
"""

from pathlib import Path
from typing import Any

import joblib
from sqlalchemy.orm import Session

from app.models.model_metadata import ModelMetadata
from app.repositories.model_metadata_repository import ModelMetadataRepository

# Process-wide, keyed by the resolved artefact path rather than model_name so
# that two different tests (or two different registered versions within one
# process) pointing at different files never collide or serve a stale object.
_pipeline_cache: dict[str, Any] = {}


class ModelNotAvailableError(Exception):
    """Raised when no usable production model is registered for a family."""

    def __init__(self, model_name: str) -> None:
        self.model_name = model_name
        super().__init__(f"No production model is registered for '{model_name}'.")


class ModelLoader:
    """Resolves a model family to its production pipeline object."""

    def __init__(self, db: Session) -> None:
        self.repo = ModelMetadataRepository(db)

    def get_production_pipeline(self, model_name: str) -> tuple[Any, ModelMetadata]:
        """Return (fitted sklearn Pipeline, the model_metadata row it came from).

        Raises ModelNotAvailableError when no production row is registered, or
        when its artefact_path no longer exists on disk - both are the caller's
        cue to return a clear "not available yet" response rather than a 500.
        """
        record = self.repo.get_production(model_name)
        if record is None:
            raise ModelNotAvailableError(model_name)

        artifact_path = Path(record.artifact_path)
        if not artifact_path.exists():
            raise ModelNotAvailableError(model_name)

        cache_key = str(artifact_path.resolve())
        if cache_key not in _pipeline_cache:
            _pipeline_cache[cache_key] = joblib.load(artifact_path)
        return _pipeline_cache[cache_key], record


def clear_cache() -> None:
    """Drop every cached pipeline. Used by tests so one test's fixture model
    at a reused temp path can never be served to a later, unrelated test."""
    _pipeline_cache.clear()
