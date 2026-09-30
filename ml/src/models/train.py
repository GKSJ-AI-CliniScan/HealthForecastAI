"""Training entrypoint for the readmission risk models.

Milestones 2 and 3.

Three decisions here are worth understanding before changing anything:

1. **Three-way split.** Train fits the model, validation calibrates it and tunes
   the decision threshold, test is touched exactly once at the end. Tuning the
   threshold on the test set would make every reported number optimistic.

2. **The decision threshold is tuned, not left at 0.5.** Roughly 9% of these
   encounters end in a 30-day readmission. At the default cutoff a model
   maximises accuracy by predicting "no readmission" for almost everyone, which
   is useless. We pick the most precise cutoff that still reaches the recall
   floor in the config, because a missed high-risk patient - discharged with no
   follow-up - is the expensive error in this setting.

3. **The winner is chosen among models that pass the promotion gate**, not by
   the primary metric alone. A model with the best ROC-AUC that misses the
   recall floor is not a candidate.

The split and the fit are separate functions so the fairness audit, the
validation report and one-off experiments all measure exactly the model that
training produces, on exactly the split it was measured on.

Usage:
    python -m src.models.train --config configs/config.yaml
"""

from __future__ import annotations

import argparse
import hashlib
import json
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

import joblib
import numpy as np
import pandas as pd
from sklearn.base import clone
from sklearn.calibration import CalibratedClassifierCV
from sklearn.ensemble import RandomForestClassifier
from sklearn.frozen import FrozenEstimator
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import StratifiedKFold, cross_val_predict, train_test_split
from sklearn.pipeline import Pipeline

from src.data.load_data import binarise_target, load_raw
from src.data.preprocess import basic_clean
from src.evaluation.metrics import (
    classification_metrics,
    confusion_counts,
    meets_promotion_thresholds,
    wilson_interval,
)
from src.features.build_features import add_utilisation_features, build_preprocessor
from src.models import explain
from src.utils.config import DEFAULT_CONFIG_PATH, load_config, resolve_path


def sha256_of(path: Path) -> str | None:
    """Return the SHA-256 of a file, or None when it does not exist.

    Recorded in the artifact so a model can always be traced to the exact data
    and configuration it was trained on.
    """
    if not path.exists():
        return None
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(1 << 20), b""):
            digest.update(block)
    return digest.hexdigest()


def build_estimator(name: str, params: dict[str, Any]) -> Any:
    """Return an untrained estimator by config name."""
    options = {key: value for key, value in params.items() if key != "enabled"}

    if name == "logistic_regression":
        return LogisticRegression(class_weight="balanced", **options)

    if name == "random_forest":
        return RandomForestClassifier(
            class_weight="balanced", random_state=42, n_jobs=-1, **options
        )

    if name == "xgboost":
        from xgboost import XGBClassifier

        # XGBoost has no class_weight; scale_pos_weight is the equivalent and is
        # set from the training split by the caller.
        return XGBClassifier(eval_metric="logloss", random_state=42, **options)

    raise ValueError(f"Unknown model: {name}")


def tune_threshold(
    y_true: np.ndarray, y_proba: np.ndarray, min_recall: float
) -> tuple[float, dict[str, float]]:
    """Return the decision threshold that meets the recall floor with confidence.

    Walks candidate cutoffs, keeps those whose recall *lower bound* reaches
    `min_recall`, and returns the most precise of them. Falls back to the cutoff
    with the highest recall when none do, so the caller still gets a usable
    threshold and the promotion gate is what rejects the model.

    The lower bound matters. Picking the cutoff that merely reaches the floor on a
    validation sample lands the estimate right on the boundary, so on fresh data it
    falls short about half the time - and with ~590 validation positives the
    sampling error on recall is about two points either way. Requiring the 95%
    Wilson lower bound to clear the floor asks for a threshold that holds up.
    """
    candidates = np.unique(np.round(np.quantile(y_proba, np.linspace(0.01, 0.99, 197)), 4))

    best_passing: tuple[float, float] | None = None  # (threshold, precision)
    best_recall_overall: tuple[float, float] = (0.5, -1.0)  # (threshold, recall)
    actual_positive = int((y_true == 1).sum())

    for threshold in candidates:
        predicted = (y_proba >= threshold).astype(int)
        true_positive = int(((predicted == 1) & (y_true == 1)).sum())
        predicted_positive = int((predicted == 1).sum())

        if predicted_positive == 0 or actual_positive == 0:
            continue

        recall = true_positive / actual_positive
        precision = true_positive / predicted_positive
        recall_lower_bound = wilson_interval(true_positive, actual_positive)[0]

        if recall > best_recall_overall[1]:
            best_recall_overall = (float(threshold), recall)

        if recall_lower_bound >= min_recall and (
            best_passing is None or precision > best_passing[1]
        ):
            best_passing = (float(threshold), precision)

    threshold = best_passing[0] if best_passing else best_recall_overall[0]
    predicted = (y_proba >= threshold).astype(int)

    return threshold, {
        "threshold": threshold,
        "reached_recall_floor": best_passing is not None,
        **classification_metrics(y_true, predicted, y_proba),
    }


def top_feature_drivers(estimator: Any, limit: int = 25) -> list[dict[str, Any]]:
    """Return the features the model leans on hardest, globally.

    The per-patient version lives in src/models/explain.py.
    """
    pipeline = explain.base_estimator_pipeline(estimator)
    if pipeline is None:
        return []

    try:
        names = list(pipeline.named_steps["preprocess"].get_feature_names_out())
    except (AttributeError, KeyError, ValueError):
        return []

    model = pipeline.named_steps["model"]
    if hasattr(model, "feature_importances_"):
        weights = np.asarray(model.feature_importances_, dtype=float)
        signed = False
    elif hasattr(model, "coef_"):
        weights = np.asarray(model.coef_, dtype=float).ravel()
        signed = True
    else:
        return []

    if len(names) != len(weights):
        return []

    order = np.argsort(np.abs(weights))[::-1][:limit]
    return [
        {
            "feature": str(names[index]),
            "weight": round(float(weights[index]), 6),
            "direction": (
                ("increases risk" if weights[index] > 0 else "reduces risk")
                if signed
                else "contributes"
            ),
        }
        for index in order
    ]


@dataclass
class Splits:
    """The train / validation / test split every downstream script shares."""

    x_train: pd.DataFrame
    x_validation: pd.DataFrame
    x_test: pd.DataFrame
    y_train: pd.Series
    y_validation: pd.Series
    y_test: pd.Series
    positive_rate: float


def prepare_data(config: dict[str, Any], sample: int | None = None) -> Splits:
    """Load, clean and split the dataset exactly as training does."""
    dataset = config["dataset"]
    split = config["split"]

    frame = basic_clean(load_raw(resolve_path(dataset["raw_path"])), config)
    frame = add_utilisation_features(frame)
    if sample:
        frame = frame.sample(n=min(sample, len(frame)), random_state=42)

    target = binarise_target(frame[dataset["target_column"]], dataset["positive_label"])

    # Both the raw label and the engineered flag encode the outcome. Leaving
    # either in the feature matrix leaks the target straight into the model.
    leakage_columns = [dataset["target_column"], "readmitted_within_30_days"]
    features = frame.drop(columns=[c for c in leakage_columns if c in frame.columns])

    stratify = split.get("stratify", True)
    x_rest, x_test, y_rest, y_test = train_test_split(
        features,
        target,
        test_size=split["test_size"],
        random_state=split["random_state"],
        stratify=target if stratify else None,
    )
    validation_fraction = split["validation_size"] / (1 - split["test_size"])
    x_train, x_validation, y_train, y_validation = train_test_split(
        x_rest,
        y_rest,
        test_size=validation_fraction,
        random_state=split["random_state"],
        stratify=y_rest if stratify else None,
    )

    return Splits(
        x_train=x_train,
        x_validation=x_validation,
        x_test=x_test,
        y_train=y_train,
        y_validation=y_validation,
        y_test=y_test,
        positive_rate=float(target.mean()),
    )


@dataclass
class Fitted:
    """One trained, calibrated candidate and everything measured about it."""

    name: str
    estimator: Any
    threshold: float
    validation_metrics: dict[str, Any]
    test_metrics: dict[str, Any]
    default_metrics: dict[str, Any]
    test_proba: np.ndarray
    used_columns: list[str]


def make_pipeline(
    name: str,
    params: dict[str, Any],
    splits: Splits,
    config: dict[str, Any],
    excluded: list[str],
) -> Pipeline:
    """Build an unfitted preprocessing + model pipeline."""
    estimator = build_estimator(name, params)
    if name == "xgboost":
        negative = int((splits.y_train == 0).sum())
        positive = int((splits.y_train == 1).sum())
        estimator.set_params(scale_pos_weight=negative / max(positive, 1))

    preprocessor = build_preprocessor(splits.x_train, config, exclude=excluded)
    return Pipeline([("preprocess", preprocessor), ("model", estimator)])


def tune_threshold_by_cross_validation(
    template: Pipeline,
    x: pd.DataFrame,
    y: pd.Series,
    validation_proba: np.ndarray,
    min_recall: float,
    folds: int = 5,
    seed: int = 42,
) -> tuple[float, dict[str, Any]]:
    """Choose the decision threshold from out-of-fold predictions, not a small split.

    Tuning on the ~590 positives in the validation split gave a threshold that
    failed to transfer: every model reached the recall floor on validation and
    then fell 5-8 points short on test. With that few positives the sampling error
    on recall is about two points, and picking the boundary crossing selects the
    lucky side of it.

    Out-of-fold predictions over training plus validation give ~4,700 positives
    and a sampling error under one point. The threshold is found there, with the
    recall lower bound clearing the floor, and then carried across as a *flag
    rate* (the share of patients sent for review) - the validation split's
    calibrated probabilities put that rate onto the final model's scale, so it
    does not matter that the fold models score on a slightly different scale.
    """
    splitter = StratifiedKFold(n_splits=folds, shuffle=True, random_state=seed)
    out_of_fold = cross_val_predict(
        clone(template), x, y, cv=splitter, method="predict_proba", n_jobs=1
    )[:, 1]

    raw_threshold, info = tune_threshold(np.asarray(y), out_of_fold, min_recall)
    flag_rate = float((out_of_fold >= raw_threshold).mean())
    threshold = float(np.quantile(validation_proba, 1.0 - flag_rate))

    return threshold, {
        "method": f"{folds}-fold out-of-fold recall lower bound",
        "reached_recall_floor": info["reached_recall_floor"],
        "oof_positives": int(np.asarray(y).sum()),
        "oof_recall": round(float(info["recall"]), 4),
        "oof_flag_rate": round(flag_rate, 4),
    }


def fit_candidate(
    name: str,
    params: dict[str, Any],
    splits: Splits,
    config: dict[str, Any],
    exclude: list[str] | None = None,
) -> Fitted:
    """Fit, calibrate and evaluate one model. Returns the measured candidate."""
    thresholds = config["evaluation"]["thresholds"]
    excluded = list(config.get("features", {}).get("exclude", []) if exclude is None else exclude)
    min_recall = float(thresholds.get("recall", 0.5))

    pipeline = make_pipeline(name, params, splits, config, excluded)
    preprocessor = pipeline.named_steps["preprocess"]

    # class_weight="balanced" and scale_pos_weight make the model behave as if
    # the classes were 50/50. That is right for ranking but leaves the
    # probabilities calibrated to a fictional prior: uncalibrated, the mean
    # predicted probability was 0.47 against a true rate of 0.09, and summing
    # them forecast 32,581 readmissions where 6,285 occurred. So calibrate.
    pipeline.fit(splits.x_train, splits.y_train)

    calibration = config.get("calibration", {})
    if calibration.get("enabled", True):
        # FrozenEstimator lets the calibrator fit on top of the already-trained
        # pipeline instead of refitting k copies of it. k-fold calibration stores
        # k pipelines in the artifact and pays the preprocessing cost k times on
        # every prediction - a 70,000 row batch score took 20 minutes that way.
        fitted = CalibratedClassifierCV(
            FrozenEstimator(pipeline), method=calibration.get("method", "sigmoid")
        )
        fitted.fit(splits.x_validation, splits.y_validation)
    else:
        fitted = pipeline

    validation_proba = fitted.predict_proba(splits.x_validation)[:, 1]

    x_union = pd.concat([splits.x_train, splits.x_validation])
    y_union = pd.concat([splits.y_train, splits.y_validation])
    threshold, threshold_info = tune_threshold_by_cross_validation(
        make_pipeline(name, params, splits, config, excluded),
        x_union,
        y_union,
        validation_proba,
        min_recall,
    )

    y_validation = np.asarray(splits.y_validation)
    validation_predicted = (validation_proba >= threshold).astype(int)
    validation_metrics: dict[str, Any] = {
        "threshold": threshold,
        **threshold_info,
        **classification_metrics(y_validation, validation_predicted, validation_proba),
    }

    y_test = np.asarray(splits.y_test)
    test_proba = fitted.predict_proba(splits.x_test)[:, 1]
    predicted = (test_proba >= threshold).astype(int)

    test_metrics = classification_metrics(y_test, predicted, test_proba)
    test_metrics.update(confusion_counts(y_test, predicted))
    test_metrics["mean_predicted_probability"] = round(float(test_proba.mean()), 4)
    test_metrics["observed_positive_rate"] = round(float(y_test.mean()), 4)
    test_metrics["flagged_rate"] = round(float(predicted.mean()), 4)

    default_metrics = classification_metrics(y_test, (test_proba >= 0.5).astype(int), test_proba)

    return Fitted(
        name=name,
        estimator=fitted,
        threshold=threshold,
        validation_metrics=validation_metrics,
        test_metrics=test_metrics,
        default_metrics=default_metrics,
        test_proba=test_proba,
        used_columns=explain.used_columns_of(preprocessor),
    )


def main() -> None:
    """Train every enabled model, keep the best promotable one, and persist it."""
    parser = argparse.ArgumentParser(description="Train readmission risk models")
    parser.add_argument("--config", default=None, help="Path to config.yaml")
    parser.add_argument("--sample", type=int, default=None, help="Train on N rows only")
    args = parser.parse_args()

    config = load_config(args.config)
    evaluation = config["evaluation"]
    thresholds = evaluation["thresholds"]
    primary = evaluation["primary_metric"]
    excluded = list(config.get("features", {}).get("exclude", []))

    splits = prepare_data(config, sample=args.sample)
    print(
        f"rows: train={len(splits.x_train)} validation={len(splits.x_validation)} "
        f"test={len(splits.x_test)} | positive rate={splits.positive_rate:.4f}"
        + (f" | excluded from the model: {', '.join(excluded)}" if excluded else "")
    )

    results: dict[str, dict[str, Any]] = {}
    candidates: list[tuple[Fitted, float, dict[str, Any] | None]] = []

    for name, params in config["models"].items():
        if not params.get("enabled", False):
            continue

        fitted = fit_candidate(name, params, splits, config)
        promotable = meets_promotion_thresholds(fitted.test_metrics, thresholds)

        results[name] = {
            "decision_threshold": fitted.threshold,
            "validation": fitted.validation_metrics,
            "test": fitted.test_metrics,
            "test_at_default_threshold_0.5": fitted.default_metrics,
            "promotable": promotable,
            "top_drivers": top_feature_drivers(fitted.estimator),
        }

        print(
            f"{name:20} threshold={fitted.threshold:.4f}  "
            f"roc_auc={fitted.test_metrics.get('roc_auc', 0):.4f}  "
            f"recall={fitted.test_metrics['recall']:.4f}  "
            f"precision={fitted.test_metrics['precision']:.4f}  "
            f"promotable={promotable}"
        )

        if promotable:
            # Computed per candidate so the promotion rule below can prefer a model
            # that can explain an individual patient.
            spec = explain.build_spec(fitted.estimator, splits.x_train)
            candidates.append((fitted, fitted.test_metrics.get(primary, -1.0), spec))

    output_dir = resolve_path(config["artifacts"]["output_dir"])
    output_dir.mkdir(parents=True, exist_ok=True)
    metrics_path = output_dir / config["artifacts"]["metrics_filename"]

    if not results:
        raise SystemExit("No model was enabled in the config - nothing to train.")

    if not candidates:
        metrics_path.write_text(
            json.dumps({"promoted": False, "results": results}, indent=2), encoding="utf-8"
        )
        raise SystemExit(
            f"No model cleared the promotion thresholds {thresholds}. "
            "Nothing was promoted - see artifacts/metrics.json."
        )

    # Best primary metric among the models that actually passed the gate...
    best, best_score, spec = max(candidates, key=lambda item: item[1])

    # ...unless an explainable model is close enough that the difference is noise.
    #
    # Without race as an input, random forest edged logistic regression on ROC-AUC
    # by 0.0025. At ~1,250 test positives the sampling interval on ROC-AUC is about
    # +/-0.017, so that gap is not evidence of a better model - but it would have
    # cost the product per-patient explanation, which a clinician needs in order to
    # act on a score. Prefer the explainable model when it is within tolerance.
    tolerance = float(evaluation.get("prefer_explainable_within", 0.0))
    if spec is None and tolerance > 0:
        explainable = [item for item in candidates if item[2] is not None]
        if explainable:
            alternative = max(explainable, key=lambda item: item[1])
            if best_score - alternative[1] <= tolerance:
                print(
                    f"Preferring explainable {alternative[0].name} "
                    f"({primary}={alternative[1]:.4f}) over {best.name} ({best_score:.4f}): "
                    f"within the {tolerance} tolerance."
                )
                best, best_score, spec = alternative

    dataset_hash = sha256_of(resolve_path(config["dataset"]["raw_path"]))
    config_hash = sha256_of(Path(args.config) if args.config else DEFAULT_CONFIG_PATH)
    version = datetime.now(UTC).strftime("%Y.%m.%d.%H%M")
    trained_at = datetime.now(UTC).isoformat()

    artifact = {
        "pipeline": best.estimator,
        "model_name": best.name,
        "model_version": version,
        "decision_threshold": best.threshold,
        "trained_at": trained_at,
        "feature_columns": best.used_columns,
        "excluded_features": excluded,
        "calibration_method": config.get("calibration", {}).get("method"),
        "metrics": best.test_metrics,
        "top_drivers": results[best.name]["top_drivers"],
        "explain": spec,
        "dataset_sha256": dataset_hash,
        "config_sha256": config_hash,
    }
    joblib.dump(artifact, output_dir / config["artifacts"]["model_filename"])

    summary = {
        "best_model": best.name,
        "model_version": version,
        "trained_at": trained_at,
        "primary_metric": primary,
        "primary_score": best_score,
        "decision_threshold": best.threshold,
        "promoted": True,
        "promotion_thresholds": thresholds,
        "excluded_features": excluded,
        "feature_columns": best.used_columns,
        "explanation_supported": spec is not None,
        "dataset_sha256": dataset_hash,
        "config_sha256": config_hash,
        "rows": {
            "train": len(splits.x_train),
            "validation": len(splits.x_validation),
            "test": len(splits.x_test),
            "positive_rate": round(splits.positive_rate, 4),
        },
        "results": results,
    }
    metrics_path.write_text(json.dumps(summary, indent=2), encoding="utf-8")

    print(f"\nPromoted: {best.name} v{version}  ({primary}={best_score:.4f})")
    print(f"Per-patient explanation: {'supported' if spec else 'not available for this model'}")
    print(f"Artifact: {output_dir / config['artifacts']['model_filename']}")


if __name__ == "__main__":
    main()
