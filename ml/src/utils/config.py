"""Configuration loading and path resolution for the modelling pipeline."""

from pathlib import Path
from typing import Any

import yaml

REPO_ROOT = Path(__file__).resolve().parents[3]
DEFAULT_CONFIG_PATH = REPO_ROOT / "ml" / "configs" / "config.yaml"


def load_config(path: str | Path | None = None) -> dict[str, Any]:
    """Load the YAML pipeline configuration.

    Every experiment must be reproducible from this file alone - do not hardcode
    hyperparameters in training scripts.
    """
    config_path = Path(path) if path else DEFAULT_CONFIG_PATH
    if not config_path.exists():
        raise FileNotFoundError(f"Config not found: {config_path}")
    with config_path.open("r", encoding="utf-8") as handle:
        return yaml.safe_load(handle) or {}


def resolve_path(value: str | Path) -> Path:
    """Resolve a config path against the repository root.

    Paths in config.yaml are written relative to the repository root so they
    read the same from the docs. Scripts, though, run from ml/ or backend/, so
    a bare relative path would resolve differently depending on where you
    started. This anchors them.
    """
    candidate = Path(value)
    return candidate if candidate.is_absolute() else REPO_ROOT / candidate
