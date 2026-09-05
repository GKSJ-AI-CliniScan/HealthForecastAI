"""A16: measure the ROC-AUC/recall cost of serving predictions with only
model_service.REQUEST_FEATURES supplied, versus the full 51-column feature
set the pipeline was trained on.

This is a serving-fidelity MEASUREMENT, not model selection or tuning:
- the already-trained, already-promoted artefact (ml/artifacts/
  readmission_model.joblib) is loaded, never re-fit
- the decision_threshold is read from metrics.json, never re-chosen
- the test split is the identical one P3/P4 already scored once (same
  random_state, same test_size) - this is the second, explicitly-authorised
  touch of that split, requested for exactly this diagnostic (see the P6
  checkpoint's A16)

Usage:
    cd ml && python -m src.experiments.a16_serving_fidelity
"""

from __future__ import annotations

import json
from pathlib import Path

import joblib
import numpy as np
from sklearn.model_selection import train_test_split

from src.data.load_data import binarise_target, load_raw
from src.data.preprocess import basic_clean
from src.evaluation.metrics import classification_metrics
from src.features.build_features import build_features
from src.models.train import IDENTIFIER_COLUMNS, assert_no_leaked_columns, resolve_path
from src.utils.config import load_config

# Must match backend/app/services/model_service.py's REQUEST_FEATURES
# exactly - these are the only columns a real prediction request ever
# supplies. Duplicated here (not imported) because ml/ and backend/ are
# separate packages with separate virtualenvs; see the P6 checkpoint for why
# a shared import was not worth introducing for one seven-item tuple.
REQUEST_FEATURES = (
    "time_in_hospital",
    "num_medications",
    "num_lab_procedures",
    "number_diagnoses",
    "number_inpatient",
    "number_emergency",
    "age_group",
)


def main() -> None:
    config = load_config()
    dataset = config["dataset"]
    split = config["split"]

    frame = load_raw(resolve_path(dataset["raw_path"]))
    frame = basic_clean(frame, config)
    frame = build_features(frame)

    target = binarise_target(frame[dataset["target_column"]], dataset["positive_label"])
    drop_from_features = [dataset["target_column"]]
    drop_from_features += [c for c in IDENTIFIER_COLUMNS if c in frame.columns]
    features = frame.drop(columns=drop_from_features)
    assert_no_leaked_columns(list(features.columns))

    _x_trainval, x_test, _y_trainval, y_test = train_test_split(
        features,
        target,
        test_size=split["test_size"],
        random_state=split["random_state"],
        stratify=target if split.get("stratify", True) else None,
    )
    del _x_trainval, _y_trainval  # this script only ever scores x_test/y_test

    artifact_dir = Path(config["artifacts"]["output_dir"])
    if not artifact_dir.is_absolute():
        artifact_dir = Path(__file__).resolve().parents[3] / artifact_dir
    # joblib.load executes arbitrary code for an untrusted pickle - safe here
    # because this loads the artefact this same repo's train.py just wrote to
    # this same machine's ml/artifacts/, the identical pattern backend/app/
    # services/model_service.py already uses to serve it.
    pipeline = joblib.load(artifact_dir / config["artifacts"]["model_filename"])
    summary = json.loads((artifact_dir / config["artifacts"]["metrics_filename"]).read_text())
    best_name = summary["best_model"]
    decision_threshold = summary["results"][best_name]["decision_threshold"]

    # Offline: the full feature set this same pipeline and threshold were
    # already scored with at P4 - reproduced here for a side-by-side print,
    # not re-derived from a different run or a different threshold.
    proba_full = pipeline.predict_proba(x_test)[:, 1]
    pred_full = (proba_full >= decision_threshold).astype(int)
    offline = classification_metrics(y_test, pred_full, proba_full)

    # As served: only REQUEST_FEATURES keep this row's real value; every
    # other column is set to NaN, exactly what model_service.predict_probability
    # does for a field a real request never supplies, and filled by the SAME
    # trained imputer already inside the pipeline - nothing is re-fit here.
    x_test_as_served = x_test.copy()
    imputed_columns = [c for c in x_test_as_served.columns if c not in REQUEST_FEATURES]
    x_test_as_served[imputed_columns] = np.nan

    proba_served = pipeline.predict_proba(x_test_as_served)[:, 1]
    pred_served = (proba_served >= decision_threshold).astype(int)
    served = classification_metrics(y_test, pred_served, proba_served)

    print(f"Best model: {best_name}")
    print(f"Decision threshold (unchanged, from metrics.json): {decision_threshold:.4f}")
    print(
        f"Total features: {x_test.shape[1]}  |  REQUEST_FEATURES supplied: {len(REQUEST_FEATURES)}  |  imputed: {len(imputed_columns)}"
    )
    print()
    print(
        f"OFFLINE   (all {x_test.shape[1]} features real):        {json.dumps(offline, indent=2)}"
    )
    print(
        f"AS SERVED ({len(REQUEST_FEATURES)} supplied, {len(imputed_columns)} imputed): {json.dumps(served, indent=2)}"
    )
    print()
    print(f"ROC-AUC gap (offline - as served): {offline['roc_auc'] - served['roc_auc']:.4f}")
    print(f"Recall gap  (offline - as served): {offline['recall'] - served['recall']:.4f}")

    result = {
        "best_model": best_name,
        "decision_threshold": decision_threshold,
        "request_features": list(REQUEST_FEATURES),
        "imputed_columns": imputed_columns,
        "offline_full_features": offline,
        "as_served_7_supplied_44_imputed": served,
        "roc_auc_gap": offline["roc_auc"] - served["roc_auc"],
        "recall_gap": offline["recall"] - served["recall"],
    }
    output_path = artifact_dir / "a16_serving_fidelity.json"
    output_path.write_text(json.dumps(result, indent=2), encoding="utf-8")
    print(f"\nWritten to {output_path}")


if __name__ == "__main__":
    main()
