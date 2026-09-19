"""Build the two Milestone 3 artefacts from the raw dataset and the trained model.

Usage:
    python -m src.evaluation.treatment_report --config configs/config.yaml

Writes ml/artifacts/treatment_metrics.json (recovery scores, treatment
effectiveness, cohorts, model evaluation) and ml/artifacts/feature_importance.json
(global and per-patient risk drivers). Both are read by
src/serving/insights_loader.py, which is what the backend calls.

The cleaning and feature steps here are the training ones, imported, not
repeated: the analytics population has to be the population the model was
trained on or the two sets of numbers describe different patients.
"""

from __future__ import annotations

import argparse
import json
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

import joblib
import pandas as pd
from sklearn.model_selection import train_test_split

from src.data.load_data import binarise_target, load_raw
from src.data.preprocess import basic_clean
from src.evaluation.cohorts import cohort_analytics
from src.evaluation.metrics import calibration_check, threshold_metrics
from src.evaluation.treatment import recovery_score_series, treatment_effectiveness
from src.features.build_features import build_features
from src.models.explain import explain, model_version
from src.utils.config import load_config

REPO_ROOT = Path(__file__).resolve().parents[3]
SCHEMA_VERSION = "1.0"

TREATMENT_FILENAME = "treatment_metrics.json"
IMPORTANCE_FILENAME = "feature_importance.json"

IDENTIFIER_COLUMNS = ("encounter_id", "patient_nbr")


def resolve_path(value: str) -> Path:
    """Resolve a config path against the repository root, as train.py does."""
    candidate = Path(value)
    return candidate if candidate.is_absolute() else REPO_ROOT / candidate


def medication_columns(artifacts_dir: Path) -> list[str]:
    """Read the drug column list from the feature contract.

    Taken from the contract rather than detected here so the analysis covers
    exactly the columns the model was trained on. Detection on a filtered frame
    could quietly miss a drug that happens to be constant in that slice.
    """
    contract = artifacts_dir / "feature_contract.json"
    if not contract.exists():
        return []
    return list(json.loads(contract.read_text(encoding="utf-8")).get("medication_columns", []))


def prepare_frames(config: dict[str, Any]) -> tuple[pd.DataFrame, pd.Series, pd.Series]:
    """Return the cleaned analysis frame, its encounter ids and the binary target.

    encounter_id is dropped by basic_clean, so it is recovered from the raw frame
    by index. basic_clean only ever drops rows and columns, never reindexes, so
    the alignment holds - the alternative would be re-running the cleaning with a
    different column list, which would be a second cleaning path to keep in step.
    """
    dataset = config["dataset"]
    raw = load_raw(resolve_path(dataset["raw_path"]))
    cleaned = basic_clean(raw, config)
    encounter_ids = raw.loc[cleaned.index, "encounter_id"]
    target = binarise_target(cleaned[dataset["target_column"]], dataset["positive_label"])
    return cleaned, encounter_ids, target


def evaluate_model(
    model: Any,
    features: pd.DataFrame,
    target: pd.Series,
    config: dict[str, Any],
    metrics: dict[str, Any],
) -> tuple[dict[str, Any], pd.DataFrame, pd.Series]:
    """Score the saved model on its own held-out test split.

    The split is rebuilt from the same config values and random_state train.py
    used, so this is the same test set, not a fresh random one - re-splitting
    differently would let training rows into the evaluation. Returns the metrics
    plus the test features and their ids, which the SHAP step then samples from.
    """
    split = config["split"]
    x_trainval, x_test, _, y_test = train_test_split(
        features,
        target,
        test_size=split["test_size"],
        random_state=split["random_state"],
        stratify=target if split.get("stratify", True) else None,
    )
    threshold = float(metrics.get("decision_threshold", 0.5))
    probabilities = model.predict_proba(x_test)[:, 1]

    evaluation = threshold_metrics(y_test.to_numpy(), probabilities, threshold)
    evaluation["test_rows"] = int(len(x_test))
    evaluation["calibration"] = calibration_check(y_test.to_numpy(), probabilities)
    evaluation["note"] = (
        "Measured offline on the full 51-column feature set. The API currently "
        "supplies 7 of those 51 per request - see ml/artifacts/a16_serving_fidelity.json "
        "for what that costs in production."
    )
    # x_trainval is unused here on purpose: it exists only so the split call
    # matches train.py's exactly and the test rows are the same ones.
    del x_trainval
    return evaluation, x_test, y_test


def build_treatment_metrics(
    cleaned: pd.DataFrame,
    config: dict[str, Any],
    drugs: list[str],
    evaluation: dict[str, Any],
) -> dict[str, Any]:
    """Assemble the treatment_metrics.json payload."""
    scores = recovery_score_series(cleaned, config)
    scored = scores.dropna()
    return {
        "schema_version": SCHEMA_VERSION,
        "generated_at": datetime.now(tz=UTC).isoformat(),
        "population": {
            "rows": int(len(cleaned)),
            "description": (
                "one row per patient after basic_clean - first encounter only, "
                "death and hospice discharges removed; the same population the "
                "model was trained on"
            ),
        },
        "recovery_score": {
            "version": "1.0",
            "definition": (
                "0-100, higher is better. readmitted 50%, time_in_hospital 25%, "
                "A1Cresult 25%; weights re-normalised over whichever components "
                "are present. Defined in configs/config.yaml under recovery_score."
            ),
            "scored_rows": int(len(scored)),
            "unscored_rows": int(len(scores) - len(scored)),
            "mean": round(float(scored.mean()), 2) if len(scored) else None,
            "median": round(float(scored.median()), 2) if len(scored) else None,
            "percentiles": {
                name: round(float(scored.quantile(value)), 2) if len(scored) else None
                for name, value in (("p10", 0.10), ("p25", 0.25), ("p75", 0.75), ("p90", 0.90))
            },
        },
        "treatment_effectiveness": treatment_effectiveness(cleaned, config, drugs),
        "cohorts": cohort_analytics(cleaned, config),
        "model_evaluation": evaluation,
        "limitations": [
            "Associations only. Patients whose medication changed were not "
            "randomised into that group, so a rate difference is not an effect.",
            "No HbA1c improvement is measured anywhere. The dataset holds one "
            "A1Cresult per encounter and no follow-up value.",
            "No time trends. The dataset carries no admission dates.",
        ],
    }


def main() -> None:
    """Build and write both Milestone 3 artefacts."""
    parser = argparse.ArgumentParser(description="Build the Milestone 3 analytics artefacts")
    parser.add_argument("--config", default=None, help="Path to config.yaml")
    args = parser.parse_args()

    config = load_config(args.config)
    artifacts_dir = resolve_path(config["artifacts"]["output_dir"])
    model_path = artifacts_dir / config["artifacts"]["model_filename"]
    if not model_path.exists():
        raise SystemExit(f"No trained model at {model_path}. Run python -m src.models.train first.")

    metrics_path = artifacts_dir / config["artifacts"]["metrics_filename"]
    metrics = json.loads(metrics_path.read_text(encoding="utf-8")) if metrics_path.exists() else {}

    cleaned, encounter_ids, target = prepare_frames(config)
    print(f"Analysis population: {len(cleaned)} rows, 30-day rate {float(target.mean()):.4f}")

    # Same feature build and same dropped columns as train.py, so the frame
    # handed to the model here is the one it was fitted on.
    featured = build_features(cleaned)
    drop_columns = [config["dataset"]["target_column"]]
    drop_columns += [c for c in IDENTIFIER_COLUMNS if c in featured.columns]
    features = featured.drop(columns=drop_columns)

    model = joblib.load(model_path)
    evaluation, x_test, _ = evaluate_model(model, features, target, config, metrics)
    print(
        f"Model evaluation on {evaluation['test_rows']} held-out rows: {evaluation['roc_auc']:.4f} ROC-AUC"
    )

    drugs = medication_columns(artifacts_dir)
    treatment = build_treatment_metrics(cleaned, config, drugs, evaluation)
    (artifacts_dir / TREATMENT_FILENAME).write_text(
        json.dumps(treatment, indent=2), encoding="utf-8"
    )
    print(f"Wrote {TREATMENT_FILENAME}")

    # SHAP runs on a sample of the test split only. The full test set would be
    # slower and would make the artefact far larger for no extra insight.
    sample_size = min(int(config["explainability"]["sample_size"]), len(x_test))
    sample = x_test.head(sample_size)
    importance = explain(
        model,
        sample,
        encounter_ids.loc[sample.index],
        config,
        model_version(model_path, metrics),
    )
    (artifacts_dir / IMPORTANCE_FILENAME).write_text(
        json.dumps(importance, indent=2), encoding="utf-8"
    )
    print(f"Wrote {IMPORTANCE_FILENAME} using {importance['method']}")


if __name__ == "__main__":
    main()
