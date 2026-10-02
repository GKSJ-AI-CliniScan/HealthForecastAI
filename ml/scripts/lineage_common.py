"""Shared plumbing for the Milestone 4 lineage scripts.

WHY this module exists: seed_model_runs.py and drift_and_leakage_report.py
both need the *exact* train/validation/test split that produced the saved
model, plus file hashes, the git commit and the per-model artifacts. If each
script rebuilt the split on its own, a one-line difference would make the
seeded metrics and the drift report describe two different test sets.

WHAT it does NOT do: invent pipeline logic. Every step below calls the
existing M1-M3 functions (load_raw, basic_clean, build_features,
build_estimator, calibrate_probabilities, select_decision_threshold) with the
same config values train.main() uses. The split lines are the only code that
is repeated from train.main(), because main() does not return its split - and
rebuild_splits() is checked against that: the saved production artifact
reproduces metrics.json's test ROC-AUC exactly on the split built here (see
seed_model_runs.check_reproduces_metrics_json()).
"""

from __future__ import annotations

import hashlib
import json
import subprocess
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import joblib
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline

from src.data.load_data import binarise_target, load_raw
from src.data.preprocess import basic_clean
from src.evaluation.metrics import select_decision_threshold
from src.features.build_features import build_features, build_preprocessor
from src.models.train import (
    IDENTIFIER_COLUMNS,
    REPO_ROOT,
    build_estimator,
    calibrate_probabilities,
    resolve_path,
)
from src.utils.config import load_config

# The production artifact - the one file backend/app/services/model_service.py
# loads (its MODEL_FILENAME constant). Whatever model sits in this file is the
# model actually serving predictions, so it is the one marked is_active.
PRODUCTION_ARTIFACT = "readmission_model.joblib"

# train.py saves only the winning model, so the losing two have no file.
# Retrained copies are written under these names next to the production file
# (ml/artifacts/ is gitignored for *.joblib, so they never reach git).
CANDIDATE_ARTIFACT_TEMPLATE = "{name}.joblib"


@dataclass
class SplitData:
    """Everything downstream scripts need about one rebuild of the dataset.

    `frame` is the cleaned + featured table *with* patient_nbr and
    encounter_id still attached (the model never sees them - see
    `feature_columns`); the x_/y_ attributes are the model's view of the
    three splits, indexed by the same row labels as `frame`, so any split
    can be mapped back to its patients and encounters via frame.loc[index].
    """

    config: dict[str, Any]
    raw_path: Path
    n_raw_rows: int
    frame: pd.DataFrame
    feature_columns: list[str]
    x_train: pd.DataFrame
    x_val: pd.DataFrame
    x_test: pd.DataFrame
    y_train: pd.Series
    y_val: pd.Series
    y_test: pd.Series


def sha256_file(path: Path) -> str:
    """Hex SHA-256 of a file, read in 1 MiB chunks so a large CSV never fills memory.

    USE: dataset.sha256 and artifact_sha256 in model_runs - the two ends of
    the lineage chain (which bytes went in -> which bytes came out).
    """
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1 << 20), b""):
            digest.update(chunk)
    return digest.hexdigest()


def git_commit() -> dict[str, Any]:
    """Return the current commit hash and whether the working tree had local edits.

    WHY `dirty` is recorded too: a commit hash alone claims "this exact code";
    if uncommitted edits existed at seed time that claim would be false, so
    the flag tells a reader how far to trust the hash. Falls back to
    "unknown" outside a git checkout instead of crashing the seed.
    """
    try:
        commit = subprocess.run(
            ["git", "rev-parse", "HEAD"], cwd=REPO_ROOT, capture_output=True, text=True, check=True
        ).stdout.strip()
        status = subprocess.run(
            ["git", "status", "--porcelain", "--untracked-files=no"],
            cwd=REPO_ROOT,
            capture_output=True,
            text=True,
            check=True,
        ).stdout.strip()
        return {"commit": commit, "dirty": bool(status)}
    except (OSError, subprocess.CalledProcessError):
        return {"commit": "unknown", "dirty": None}


def repo_relative(path: Path) -> str:
    """Path as written relative to the repo root (how config.yaml writes paths).

    Stored in model_runs instead of an absolute path, which would leak this
    machine's home directory and mean nothing on the backend server.
    """
    try:
        return str(path.resolve().relative_to(REPO_ROOT))
    except ValueError:
        return str(path)


def rebuild_splits(config_path: str | None = None) -> SplitData:
    """Rebuild the exact train/val/test split train.main() used.

    Flow (identical to train.main()): raw CSV -> basic_clean (drops
    expired/hospice rows, keeps one encounter per patient) -> build_features
    -> binarise the target -> drop target + identifiers from the feature
    matrix -> stratified 80/20 train+val/test -> stratified val carve-out.
    Same config, same random_state, so the same rows land in the same split.
    """
    config = load_config(config_path)
    dataset = config["dataset"]
    split = config["split"]

    raw_path = resolve_path(dataset["raw_path"])
    raw = load_raw(raw_path)

    frame = basic_clean(raw, config)
    frame = build_features(frame)
    # basic_clean drops encounter_id (config cleaning.drop_columns) but keeps
    # the raw row index, so encounter_id is re-attached by index. It is needed
    # only for the drift report's time-proxy ordering - it is never a feature.
    frame = frame.assign(encounter_id=raw.loc[frame.index, "encounter_id"].to_numpy())

    target = binarise_target(frame[dataset["target_column"]], dataset["positive_label"])
    drop = [dataset["target_column"], *[c for c in IDENTIFIER_COLUMNS if c in frame.columns]]
    features = frame.drop(columns=drop)

    stratify = split.get("stratify", True)
    x_trainval, x_test, y_trainval, y_test = train_test_split(
        features,
        target,
        test_size=split["test_size"],
        random_state=split["random_state"],
        stratify=target if stratify else None,
    )
    val_fraction = split["validation_size"] / (1 - split["test_size"])
    x_train, x_val, y_train, y_val = train_test_split(
        x_trainval,
        y_trainval,
        test_size=val_fraction,
        random_state=split["random_state"],
        stratify=y_trainval if stratify else None,
    )
    return SplitData(
        config=config,
        raw_path=raw_path,
        n_raw_rows=len(raw),
        frame=frame,
        feature_columns=list(features.columns),
        x_train=x_train,
        x_val=x_val,
        x_test=x_test,
        y_train=y_train,
        y_val=y_val,
        y_test=y_test,
    )


def artifacts_dir(config: dict[str, Any]) -> Path:
    """ml/artifacts/, resolved the same way train.main() resolves it."""
    return resolve_path(config["artifacts"]["output_dir"])


def production_model_name(config: dict[str, Any]) -> str:
    """Which algorithm is inside readmission_model.joblib, per metrics.json.

    train.main() writes best_model into metrics.json in the same run that
    writes the joblib, so this is the authoritative label for the file.
    """
    summary = json.loads(
        (artifacts_dir(config) / config["artifacts"]["metrics_filename"]).read_text("utf-8")
    )
    return str(summary["best_model"])


def train_candidate(name: str, data: SplitData) -> Any:
    """Retrain one model exactly as train.main()'s loop body does, and return it.

    Only called when that model's artifact is missing. Steps: preprocessor
    fit on train -> estimator from config -> fit on train -> isotonic
    calibration on validation. Same functions, same order, same data as
    train.main(), so the result is the model train.py fitted and discarded.
    """
    params = data.config["models"][name]
    pipeline = Pipeline(
        [
            ("preprocess", build_preprocessor(data.x_train, data.config)),
            ("model", build_estimator(name, params, data.y_train)),
        ]
    )
    pipeline.fit(data.x_train, data.y_train)
    return calibrate_probabilities(pipeline, data.x_val, data.y_val)


def load_or_train_models(data: SplitData) -> dict[str, dict[str, Any]]:
    """Return {model_name: {model, path, retrained}} for every enabled model.

    The production model always comes from readmission_model.joblib (never
    retrained here - that file is what the backend serves). Any other enabled
    model is loaded from ml/artifacts/<name>.joblib, or retrained with
    train_candidate() and saved there if that file does not exist yet.
    `retrained` is passed through to the report so the retraining is never
    silent.
    """
    out_dir = artifacts_dir(data.config)
    production = production_model_name(data.config)
    models: dict[str, dict[str, Any]] = {}
    for name, params in data.config["models"].items():
        if not params.get("enabled", False):
            continue
        if name == production:
            path = out_dir / PRODUCTION_ARTIFACT
            if not path.exists():
                raise SystemExit(f"{path} is missing - run `python -m src.models.train` first.")
            models[name] = {"model": joblib.load(path), "path": path, "retrained": False}
            continue
        path = out_dir / CANDIDATE_ARTIFACT_TEMPLATE.format(name=name)
        retrained = not path.exists()
        if retrained:
            print(f"[lineage] {path.name} missing - retraining {name} with train.py's functions")
            joblib.dump(train_candidate(name, data), path)
        models[name] = {"model": joblib.load(path), "path": path, "retrained": retrained}
    return models


def validation_threshold(model: Any, data: SplitData) -> tuple[float, float, float]:
    """Re-derive a model's decision threshold the way train.main() did: on validation.

    Calls the M2 select_decision_threshold() with the config's recall floor
    (evaluation.thresholds.recall = 0.50): the highest-precision cutoff on
    the validation split whose recall is still >= 0.50. Returns (threshold,
    val_precision, val_recall). For the production model this must equal
    metrics.json's decision_threshold (0.1117...) - checked by the caller.
    """
    min_recall = float(data.config["evaluation"]["thresholds"].get("recall", 0.50))
    y_proba_val = model.predict_proba(data.x_val)[:, 1]
    return select_decision_threshold(data.y_val, y_proba_val, min_recall)


def read_metrics_json(config: dict[str, Any]) -> dict[str, Any]:
    """Load train.py's metrics.json summary - the M2/M3 numbers being reproduced."""
    path = artifacts_dir(config) / config["artifacts"]["metrics_filename"]
    return json.loads(path.read_text(encoding="utf-8"))
