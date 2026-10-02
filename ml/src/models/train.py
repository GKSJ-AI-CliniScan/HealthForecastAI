"""Training entrypoint for the readmission risk models.

Usage:
    python -m src.models.train --config configs/config.yaml
"""

import argparse
import json
from pathlib import Path
from typing import Any

import joblib
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
    select_decision_threshold,
)
from src.features.build_features import build_features, build_preprocessor
from src.utils.config import load_config

REPO_ROOT = Path(__file__).resolve().parents[3]

# Identifiers must never reach the model. patient_nbr survives basic_clean
# because the database seeding needs it; here it would be a per-patient number
# the model can memorise, inflating scores on a dataset this size.
IDENTIFIER_COLUMNS = ("encounter_id", "patient_nbr")

# WHAT      : the four columns that must never appear in the resolved
#             feature matrix, checked by name after every column-dropping
#             step in main() has already run.
# WHY       : "readmitted" is the target itself; "readmitted_30d" is the
#             same target materialised as a column by
#             src/data/build_dataset.py (a separate Milestone 1 script that
#             writes ml/data/processed/admissions_features.csv for the
#             backend seed - this training entrypoint never reads that file,
#             but the column name is a real, named risk if that ever
#             changes). "encounter_id"/"patient_nbr" are identifiers a model
#             this size can memorise per-row, which would inflate every
#             metric without generalising to an unseen patient.
# FOR WHOM  : assert_no_leaked_columns(), called once in main() right after
#             `features` is built and before any model is fit.
# BENEFIT   : a leak is caught as a loud AssertionError before a single
#             model trains, not discovered later as a suspiciously high
#             ROC-AUC that has to be diagnosed after the fact.
# COST      : a fixed list that has to be updated by hand if a fifth
#             leak-shaped column is ever introduced - this check only knows
#             about the four columns named in the M2 contract's C4.
# ALTERNATIVES : (1) rely on IDENTIFIER_COLUMNS and dataset["target_column"]
#             already being dropped from `features` and trust that without
#             a runtime check; (2) diff the feature columns against the raw
#             dataset's columns and flag anything that looks target-derived
#             by a heuristic (e.g. name containing "readmit").
# CHOSEN BECAUSE : (1) is exactly the "trust it worked" gap N2 exists to
#             close - C4 requires the assertion to run, not just the drop to
#             happen to be correct today; (2) is a heuristic that could
#             either miss a genuine leak with an unrelated name or flag a
#             legitimate feature, where an explicit named list is
#             unambiguous and matches the four columns C4 names specifically.
FORBIDDEN_FEATURE_COLUMNS = ("readmitted", "readmitted_30d", "encounter_id", "patient_nbr")


def assert_no_leaked_columns(columns: list[str]) -> None:
    """Raise if any of the four forbidden columns reached the feature matrix."""
    leaked = [column for column in FORBIDDEN_FEATURE_COLUMNS if column in columns]
    if leaked:
        raise AssertionError(f"Leakage: forbidden column(s) reached the feature matrix: {leaked}")


def resolve_path(value: str) -> Path:
    """Resolve a config path against the repository root.

    Paths in config.yaml are written relative to the repo root, so the training
    run works the same from the repo root or from ml/.
    """
    candidate = Path(value)
    return candidate if candidate.is_absolute() else REPO_ROOT / candidate


def positive_class_weight(y: Any) -> float:
    """Return negatives / positives, the imbalance ratio XGBoost needs.

    Logistic regression and random forest take ``class_weight="balanced"`` and
    compute this themselves. XGBoost has no such option: without an explicit
    ``scale_pos_weight`` it optimises for the majority class, which on a target
    that is roughly 9% positive means it learns to predict "no readmission" for
    almost everyone.
    """
    positives = int(sum(y))
    negatives = len(y) - positives
    if positives == 0:
        raise ValueError("Training data contains no positive examples.")
    return negatives / positives


def build_estimator(name: str, params: dict[str, Any], y_train: Any = None) -> Any:
    """Return an untrained estimator by config name."""
    options = {key: value for key, value in params.items() if key != "enabled"}
    if name == "logistic_regression":
        return LogisticRegression(class_weight="balanced", **options)
    if name == "random_forest":
        return RandomForestClassifier(class_weight="balanced", random_state=42, **options)
    if name == "xgboost":
        from xgboost import XGBClassifier

        # Only set scale_pos_weight when the config has not pinned it, so an
        # explicit value in config.yaml still wins.
        if y_train is not None and "scale_pos_weight" not in options:
            options["scale_pos_weight"] = positive_class_weight(y_train)
        return XGBClassifier(eval_metric="logloss", random_state=42, **options)
    raise ValueError(f"Unknown model: {name}")


# WHAT      : wrap an already-fitted pipeline so its predict_proba output is
#             rescaled to match observed prevalence, fit on a split disjoint
#             from both training and test.
# WHY       : found while comparing this project's own promoted artifact
#             against a second, independently-built implementation of this
#             same brief (see docs/06-milestones/evidence/reference-comparison.md):
#             class_weight="balanced" (logistic_regression, random_forest)
#             and scale_pos_weight (xgboost) both train the estimator as if
#             the classes were roughly 50/50, which is exactly what ranking
#             (ROC-AUC) wants, but leaves predict_proba centred on that
#             fictional 50/50 prior instead of the real ~9% prevalence.
#             Measured directly on this project's promoted xgboost artifact
#             before this fix: mean predicted probability 0.4564 against a
#             true prevalence of 0.0898 - about 5x too high. Every fixed
#             absolute cutoff downstream (the 0.40/0.70 risk bands) and every
#             sum-of-probabilities aggregate (/risk/forecast) inherits that
#             distortion; a threshold tuned per-model on this same
#             mis-scaled output does not.
# FOR WHOM  : main(), once per enabled model, between fitting on x_train and
#             selecting a decision threshold on x_val - so both the
#             threshold search and the final test-set scoring run on
#             probabilities that mean what they say.
# BENEFIT   : predict_proba's output becomes interpretable on its own terms -
#             "this patient's probability" stops requiring a silent mental
#             correction for the training-time class weighting - without
#             retraining the underlying estimator or discarding its ranking.
# COST      : one more fitted object between the raw estimator and its
#             output, one more validation-split use (calibration and
#             threshold selection now share x_val - legitimate, since
#             neither ever touches test, but a smaller val split would make
#             both noisier), and a second wrapper class to keep compatible
#             with any code that expects a bare Pipeline
#             (backend/app/services/model_service.py's `.named_steps` access
#             for feature-importance introspection - handled there by
#             unwrapping the fitted calibrator back to the pipeline it wraps).
# ALTERNATIVES : (1) drop class_weight="balanced"/scale_pos_weight entirely
#             and let the estimators train on the true ~9% prior directly;
#             (2) Platt scaling (method="sigmoid") instead of isotonic.
# CHOSEN BECAUSE : (1) would very likely cost real recall - published work
#             on imbalanced clinical outcomes consistently finds
#             class-weighted training finds the minority class better than
#             training on the raw prior, and undoing that here risks
#             reversing N3/P4's tuning work rather than just rescaling its
#             output; the M2 contract also treats class_weight as the
#             chosen imbalance strategy (config.yaml's `imbalance.strategy`),
#             not something to remove mid-milestone. (2) assumes the
#             distortion is sigmoid-shaped; the calibration split here has
#             several thousand rows (comfortably above the "isotonic
#             overfits under roughly 1000 samples" caution in scikit-learn's
#             own calibration guidance), so a non-parametric fit can follow
#             whatever shape the class-weighting actually produced instead
#             of assuming one in advance.
def calibrate_probabilities(
    fitted_pipeline: Pipeline, x_calibration: Any, y_calibration: Any
) -> Any:
    """Return a calibrated wrapper around an already-fitted pipeline.

    The pipeline is frozen (never refit) and calibrated once against the
    given data - the caller is responsible for that data being disjoint from
    whatever fit the pipeline. Isotonic regression is monotonic, so ranking
    (and therefore ROC-AUC) is unaffected; only the probability scale moves.
    """
    calibrated = CalibratedClassifierCV(FrozenEstimator(fitted_pipeline), method="isotonic")
    calibrated.fit(x_calibration, y_calibration)
    return calibrated


def main() -> None:
    """Train every enabled model, keep the best one and persist it."""
    parser = argparse.ArgumentParser(description="Train readmission risk models")
    parser.add_argument("--config", default=None, help="Path to config.yaml")
    args = parser.parse_args()

    config = load_config(args.config)
    dataset = config["dataset"]
    split = config["split"]

    frame = load_raw(resolve_path(dataset["raw_path"]))
    frame = basic_clean(frame, config)
    # Milestone 1 built prior-visit and medication-change features; use them.
    # Medication instability during a stay is one of the stronger published
    # predictors of an early return, and it was not reaching the model.
    frame = build_features(frame)

    target = binarise_target(frame[dataset["target_column"]], dataset["positive_label"])
    drop_from_features = [dataset["target_column"]]
    drop_from_features += [c for c in IDENTIFIER_COLUMNS if c in frame.columns]
    features = frame.drop(columns=drop_from_features)
    print(f"Dropped from features: {drop_from_features}")

    # N2 (leakage proof): print the resolved feature-column list and assert
    # none of the four forbidden columns reached it (C4), before any model
    # sees a single row.
    feature_columns = list(features.columns)
    print(f"Resolved feature columns ({len(feature_columns)}): {feature_columns}")
    assert_no_leaked_columns(feature_columns)
    print("Leakage check passed: readmitted, readmitted_30d, encounter_id, patient_nbr all absent.")

    stratify = split.get("stratify", True)
    x_trainval, x_test, y_trainval, y_test = train_test_split(
        features,
        target,
        test_size=split["test_size"],
        random_state=split["random_state"],
        stratify=target if stratify else None,
    )
    # validation_size in the config is a fraction of the full dataset, same as
    # test_size, so it is rescaled to a fraction of what train_test_split above
    # left in x_trainval.
    val_fraction = split["validation_size"] / (1 - split["test_size"])
    x_train, x_val, y_train, y_val = train_test_split(
        x_trainval,
        y_trainval,
        test_size=val_fraction,
        random_state=split["random_state"],
        stratify=y_trainval if stratify else None,
    )

    # N2 (leakage proof): confirm the class-imbalance ratio XGBoost will use
    # for scale_pos_weight, computed on the training split only.
    train_positive_rate = float(sum(y_train)) / len(y_train)
    train_scale_pos_weight = positive_class_weight(y_train)
    print(
        f"Training set positive rate: {train_positive_rate:.4f} "
        f"({int(sum(y_train))}/{len(y_train)})"
    )
    print(f"scale_pos_weight for XGBoost (negatives/positives): {train_scale_pos_weight:.4f}")

    results: dict[str, dict[str, float]] = {}
    best_name: str | None = None
    # Not typed as Pipeline: this is calibrate_probabilities()'s output, a
    # CalibratedClassifierCV wrapping the fitted pipeline, not the pipeline
    # itself.
    best_pipeline: Any | None = None
    best_score = -1.0
    primary = config["evaluation"]["primary_metric"]
    thresholds = config["evaluation"]["thresholds"]
    min_recall = float(thresholds.get("recall", 0.50))

    for name, params in config["models"].items():
        if not params.get("enabled", False):
            continue
        pipeline = Pipeline(
            [
                ("preprocess", build_preprocessor(x_train, config)),
                ("model", build_estimator(name, params, y_train)),
            ]
        )
        pipeline.fit(x_train, y_train)

        # Uncalibrated mean probability on the test set, purely to report the
        # before/after gap this fixes - not used for anything downstream.
        uncalibrated_test_mean = float(pipeline.predict_proba(x_test)[:, 1].mean())

        # Calibrated against x_val/y_val - disjoint from x_train (what fit
        # the pipeline) and from x_test (touched once, below, for final
        # numbers only). See calibrate_probabilities()'s comment block for
        # why this is needed at all.
        calibrated = calibrate_probabilities(pipeline, x_val, y_val)

        # The default 0.5 cutoff from predict() is not tuned to the recall the
        # platform needs, so pick the operating point off the precision-recall
        # curve instead. It is selected on the validation split and only then
        # applied to the test split - choosing it on the test set itself would
        # bias the reported test recall/precision upward.
        y_proba_val = calibrated.predict_proba(x_val)[:, 1]
        decision_threshold, val_precision, val_recall = select_decision_threshold(
            y_val, y_proba_val, min_recall
        )

        y_proba_test = calibrated.predict_proba(x_test)[:, 1]
        y_pred_test = (y_proba_test >= decision_threshold).astype(int)
        calibrated_test_mean = float(y_proba_test.mean())

        metrics = classification_metrics(y_test, y_pred_test, y_proba_test)
        metrics["decision_threshold"] = decision_threshold
        metrics["validation_recall"] = val_recall
        metrics["validation_precision"] = val_precision
        metrics["mean_predicted_probability_uncalibrated"] = uncalibrated_test_mean
        metrics["mean_predicted_probability_calibrated"] = calibrated_test_mean
        metrics.update(confusion_counts(y_test, y_pred_test))
        results[name] = metrics
        print(f"{name}: {json.dumps(metrics, indent=2)}")
        print(
            f"{name}: mean predicted probability - uncalibrated={uncalibrated_test_mean:.4f}, "
            f"calibrated={calibrated_test_mean:.4f}, true prevalence={float(y_test.mean()):.4f}"
        )

        if metrics.get(primary, -1.0) > best_score:
            best_name = name
            best_pipeline = calibrated
            best_score = metrics[primary]

    if best_pipeline is None or best_name is None:
        raise SystemExit("No model was enabled in the config - nothing to train.")

    promoted = meets_promotion_thresholds(results[best_name], thresholds)
    summary = {
        "best_model": best_name,
        "promoted": promoted,
        "decision_threshold": results[best_name]["decision_threshold"],
        "results": results,
    }

    output_dir = resolve_path(config["artifacts"]["output_dir"])
    output_dir.mkdir(parents=True, exist_ok=True)
    joblib.dump(best_pipeline, output_dir / config["artifacts"]["model_filename"])
    metrics_path = output_dir / config["artifacts"]["metrics_filename"]
    metrics_path.write_text(json.dumps(summary, indent=2), encoding="utf-8")

    print(f"Best model: {best_name} ({primary}={best_score:.4f}), promoted={promoted}")
    if not promoted:
        raise SystemExit(f"Best model failed the promotion thresholds {thresholds}")


if __name__ == "__main__":
    main()
