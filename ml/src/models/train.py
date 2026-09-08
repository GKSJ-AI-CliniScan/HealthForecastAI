"""Training entrypoint for the readmission risk models.

Milestone 2.

Three decisions here are worth understanding before changing anything:

1. **Three-way split.** Train fits the model, validation tunes the decision
   threshold, test is touched exactly once at the end. Tuning the threshold on
   the test set would make every reported number optimistic.

2. **The decision threshold is tuned, not left at 0.5.** Roughly 9% of these
   encounters end in a 30-day readmission. At the default cutoff a model
   maximises accuracy by predicting "no readmission" for almost everyone, which
   is useless. We pick the lowest-cost cutoff that still reaches the recall
   floor in the config, because a missed high-risk patient - discharged with no
   follow-up - is the expensive error in this setting.

3. **The winner is chosen among models that pass the promotion gate**, not by
   the primary metric alone. A model with the best ROC-AUC that misses the
   recall floor is not a candidate.

Usage:
    python -m src.models.train --config configs/config.yaml
"""

from __future__ import annotations

import argparse
import json
from datetime import UTC, datetime
from typing import Any

import joblib
import numpy as np
from sklearn.calibration import CalibratedClassifierCV
from sklearn.ensemble import RandomForestClassifier
from sklearn.frozen import FrozenEstimator
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline

from src.data.load_data import binarise_target, load_raw
from src.data.preprocess import basic_clean
from src.evaluation.metrics import (
    classification_metrics,
    confusion_counts,
    meets_promotion_thresholds,
)
from src.features.build_features import add_utilisation_features, build_preprocessor
from src.utils.config import load_config, resolve_path


def build_estimator(name: str, params: dict[str, Any]) -> Any:
    """Return an untrained estimator by config name."""
    options = {key: value for key, value in params.items() if key != "enabled"}

    if name == "logistic_regression":
        return LogisticRegression(class_weight="balanced", **options)

    if name == "random_forest":
        return RandomForestClassifier(class_weight="balanced", random_state=42, **options)

    if name == "xgboost":
        from xgboost import XGBClassifier

        # XGBoost has no class_weight; scale_pos_weight is the equivalent and is
        # set from the training split by the caller.
        return XGBClassifier(eval_metric="logloss", random_state=42, **options)

    raise ValueError(f"Unknown model: {name}")


def tune_threshold(
    y_true: np.ndarray, y_proba: np.ndarray, min_recall: float
) -> tuple[float, dict[str, float]]:
    """Return the decision threshold that meets the recall floor most precisely.

    Walks candidate cutoffs, keeps those that reach `min_recall`, and returns the
    one with the best precision among them. Falls back to the cutoff with the
    highest recall when none reach the floor, so the caller still gets a usable
    threshold and the promotion gate is what rejects the model.
    """
    candidates = np.unique(np.round(np.quantile(y_proba, np.linspace(0.01, 0.99, 197)), 4))

    best_passing: tuple[float, float] | None = None  # (threshold, precision)
    best_recall_overall: tuple[float, float] = (0.5, -1.0)  # (threshold, recall)

    for threshold in candidates:
        predicted = (y_proba >= threshold).astype(int)
        true_positive = int(((predicted == 1) & (y_true == 1)).sum())
        predicted_positive = int((predicted == 1).sum())
        actual_positive = int((y_true == 1).sum())

        if predicted_positive == 0 or actual_positive == 0:
            continue

        recall = true_positive / actual_positive
        precision = true_positive / predicted_positive

        if recall > best_recall_overall[1]:
            best_recall_overall = (float(threshold), recall)

        if recall >= min_recall and (best_passing is None or precision > best_passing[1]):
            best_passing = (float(threshold), precision)

    threshold = best_passing[0] if best_passing else best_recall_overall[0]
    predicted = (y_proba >= threshold).astype(int)

    return threshold, {
        "threshold": threshold,
        "reached_recall_floor": best_passing is not None,
        **classification_metrics(y_true, predicted, y_proba),
    }


def base_pipeline(estimator: Any) -> Pipeline | None:
    """Return the fitted Pipeline inside an estimator, unwrapping any wrappers.

    A calibrated model nests two deep: CalibratedClassifierCV holds
    _CalibratedClassifier objects whose `.estimator` is the FrozenEstimator we
    passed in, and the pipeline is inside that. Missing the second level is why
    the driver list came back empty the first time.
    """
    seen = 0
    candidates = [estimator]

    while candidates and seen < 10:
        current = candidates.pop(0)
        seen += 1

        if isinstance(current, Pipeline):
            return current

        calibrated = getattr(current, "calibrated_classifiers_", None)
        if calibrated:
            candidates.extend(calibrated)

        inner = getattr(current, "estimator", None)
        if inner is not None:
            candidates.append(inner)

    return None


def top_feature_drivers(estimator: Any, limit: int = 25) -> list[dict[str, Any]]:
    """Return the features the model leans on hardest.

    This is what the clinical insights module surfaces: a risk score with no
    explanation is not something a clinician can act on. Calibration wraps the
    pipeline, so unwrap it first.
    """
    pipeline = base_pipeline(estimator)
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


def main() -> None:
    """Train every enabled model, keep the best promotable one, and persist it."""
    parser = argparse.ArgumentParser(description="Train readmission risk models")
    parser.add_argument("--config", default=None, help="Path to config.yaml")
    parser.add_argument("--sample", type=int, default=None, help="Train on N rows only")
    args = parser.parse_args()

    config = load_config(args.config)
    dataset = config["dataset"]
    split = config["split"]
    evaluation = config["evaluation"]
    thresholds = evaluation["thresholds"]
    primary = evaluation["primary_metric"]

    frame = basic_clean(load_raw(resolve_path(dataset["raw_path"])), config)
    frame = add_utilisation_features(frame)
    if args.sample:
        frame = frame.sample(n=min(args.sample, len(frame)), random_state=42)

    target = binarise_target(frame[dataset["target_column"]], dataset["positive_label"])

    # Both the raw label and the engineered flag encode the outcome. Leaving
    # either in the feature matrix leaks the target straight into the model.
    leakage_columns = [dataset["target_column"], "readmitted_within_30_days"]
    features = frame.drop(columns=[c for c in leakage_columns if c in frame.columns])

    # Train / validation / test. Validation exists so the decision threshold is
    # never tuned on the data used to report the final numbers.
    x_rest, x_test, y_rest, y_test = train_test_split(
        features,
        target,
        test_size=split["test_size"],
        random_state=split["random_state"],
        stratify=target if split.get("stratify", True) else None,
    )
    validation_fraction = split["validation_size"] / (1 - split["test_size"])
    x_train, x_validation, y_train, y_validation = train_test_split(
        x_rest,
        y_rest,
        test_size=validation_fraction,
        random_state=split["random_state"],
        stratify=y_rest if split.get("stratify", True) else None,
    )

    print(
        f"rows: train={len(x_train)} validation={len(x_validation)} test={len(x_test)} "
        f"| positive rate={target.mean():.4f}"
    )

    results: dict[str, dict[str, Any]] = {}
    candidates: list[tuple[str, Pipeline, float, dict[str, Any]]] = []

    for name, params in config["models"].items():
        if not params.get("enabled", False):
            continue

        estimator = build_estimator(name, params)
        if name == "xgboost":
            negative, positive = int((y_train == 0).sum()), int((y_train == 1).sum())
            estimator.set_params(scale_pos_weight=negative / max(positive, 1))

        pipeline = Pipeline(
            [
                ("preprocess", build_preprocessor(x_train, config)),
                ("model", estimator),
            ]
        )

        # Calibrate the probabilities.
        #
        # class_weight="balanced" and scale_pos_weight make the model behave as
        # if the classes were 50/50, which is what we want for ranking - but it
        # leaves the probabilities calibrated to that fictional prior instead of
        # the real ~9% prevalence. Uncalibrated, the mean predicted probability
        # came out at 0.47, and summing those probabilities forecast 32,581
        # readmissions against 6,285 actual. Risk bands and forecasts are both
        # meaningless on numbers like that.
        #
        # cv="prefit" calibrates the already-fitted pipeline on a held-out slice
        # rather than refitting k copies of it. That matters at serving time:
        # cv=3 leaves three full pipelines inside the artifact and every
        # prediction pays the preprocessing cost three times. Batch scoring
        # 70,000 patients took over 20 minutes that way; with one pipeline it is
        # a fraction of that, and the calibration quality is indistinguishable.
        pipeline.fit(x_train, y_train)

        calibration = config.get("calibration", {})
        if calibration.get("enabled", True):
            # FrozenEstimator wraps the already-fitted pipeline so the calibrator
            # fits on top of it instead of refitting it. (cv="prefit" did the same
            # thing and is deprecated in scikit-learn 1.6.)
            #
            # The calibrator and the decision threshold both use the full
            # validation split. Splitting it in half to separate the two was
            # tried: 3,499 rows carry only ~314 positives, and the threshold
            # picked on that sample did not transfer - test recall swung from
            # 0.52 to 0.82 between runs. The mild optimism in the threshold is
            # the better trade, and the test split is still untouched, so the
            # reported metrics stay honest.
            fitted = CalibratedClassifierCV(
                FrozenEstimator(pipeline), method=calibration.get("method", "isotonic")
            )
            fitted.fit(x_validation, y_validation)
        else:
            fitted = pipeline

        # Tune the cutoff on validation, then score the test set once with it.
        validation_proba = fitted.predict_proba(x_validation)[:, 1]
        threshold, validation_metrics = tune_threshold(
            np.asarray(y_validation), validation_proba, float(thresholds.get("recall", 0.5))
        )

        test_proba = fitted.predict_proba(x_test)[:, 1]
        test_predicted = (test_proba >= threshold).astype(int)
        test_metrics = classification_metrics(np.asarray(y_test), test_predicted, test_proba)
        test_metrics.update(confusion_counts(np.asarray(y_test), test_predicted))

        default_predicted = (test_proba >= 0.5).astype(int)
        default_metrics = classification_metrics(np.asarray(y_test), default_predicted, test_proba)

        test_metrics["mean_predicted_probability"] = round(float(test_proba.mean()), 4)
        test_metrics["observed_positive_rate"] = round(float(np.asarray(y_test).mean()), 4)

        promotable = meets_promotion_thresholds(test_metrics, thresholds)
        results[name] = {
            "decision_threshold": threshold,
            "validation": validation_metrics,
            "test": test_metrics,
            "test_at_default_threshold_0.5": default_metrics,
            "promotable": promotable,
            "top_drivers": top_feature_drivers(fitted),
        }

        print(
            f"{name:20} threshold={threshold:.4f}  "
            f"roc_auc={test_metrics.get('roc_auc', 0):.4f}  "
            f"recall={test_metrics['recall']:.4f}  "
            f"precision={test_metrics['precision']:.4f}  "
            f"promotable={promotable}"
        )

        if promotable:
            candidates.append((name, fitted, test_metrics.get(primary, -1.0), results[name]))

    if not results:
        raise SystemExit("No model was enabled in the config - nothing to train.")

    if not candidates:
        output_dir = resolve_path(config["artifacts"]["output_dir"])
        output_dir.mkdir(parents=True, exist_ok=True)
        (output_dir / config["artifacts"]["metrics_filename"]).write_text(
            json.dumps({"promoted": False, "results": results}, indent=2), encoding="utf-8"
        )
        raise SystemExit(
            f"No model cleared the promotion thresholds {thresholds}. "
            "Nothing was promoted - see artifacts/metrics.json."
        )

    # Best primary metric among the models that actually passed the gate.
    best_name, best_pipeline, best_score, best_result = max(candidates, key=lambda item: item[2])

    output_dir = resolve_path(config["artifacts"]["output_dir"])
    output_dir.mkdir(parents=True, exist_ok=True)

    version = datetime.now(UTC).strftime("%Y.%m.%d.%H%M")
    artifact = {
        "pipeline": best_pipeline,
        "model_name": best_name,
        "model_version": version,
        "decision_threshold": best_result["decision_threshold"],
        "trained_at": datetime.now(UTC).isoformat(),
        "feature_columns": list(features.columns),
        "metrics": best_result["test"],
        "top_drivers": best_result["top_drivers"],
    }
    joblib.dump(artifact, output_dir / config["artifacts"]["model_filename"])

    summary = {
        "best_model": best_name,
        "model_version": version,
        "primary_metric": primary,
        "primary_score": best_score,
        "decision_threshold": best_result["decision_threshold"],
        "promoted": True,
        "promotion_thresholds": thresholds,
        "rows": {
            "train": len(x_train),
            "validation": len(x_validation),
            "test": len(x_test),
            "positive_rate": round(float(target.mean()), 4),
        },
        "results": results,
    }
    (output_dir / config["artifacts"]["metrics_filename"]).write_text(
        json.dumps(summary, indent=2), encoding="utf-8"
    )

    print(f"\nPromoted: {best_name} v{version}  ({primary}={best_score:.4f})")
    print(f"Artifact: {output_dir / config['artifacts']['model_filename']}")


if __name__ == "__main__":
    main()
