"""N3 feature-engineering ledger: one lever at a time, cross-validated on
train only.

Usage:
    cd ml && python -m src.experiments.n3_feature_engineering

Structural guarantee for B1/C5: this script never loads or references a test
split. It builds exactly one train_test_split (mirroring src.models.train's
own split, same random_state, same test_size) and discards the test portion
immediately with a leading underscore - there is no variable holding it that
a later line could accidentally score against. Every lever's ROC-AUC comes
from StratifiedKFold cross-validation over the training portion only.

RESULT AND ITS LIMITS (A14, read before citing this ledger): levers 1-4
were screened with SCREENING_RF_PARAMS (50 trees, 3-fold CV) after this
machine was observed running 15-20x slower than expected under real desktop
contention - see that constant's own comment block. All four deltas were
between -0.002 and -0.006. The correct conclusion is "no lever showed an
improvement under a deliberately lightweight screen, and the screen lacked
the power to reliably separate an effect this small from fold-to-fold
noise" - NOT "feature engineering does not help on this dataset". Lever 5
(hyperparameter search) is not subject to this caveat: it was compared
against config.yaml's actual, full-strength defaults, not the screening
proxy (see the comment above rf_config_default_model in run()).
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import RandomizedSearchCV, StratifiedKFold, cross_val_score
from sklearn.model_selection import train_test_split as _train_test_split
from sklearn.pipeline import Pipeline

from src.data.load_data import binarise_target, load_raw
from src.data.preprocess import basic_clean
from src.features.build_features import (
    add_any_medication_change_flag,
    add_utilisation_ratio_features,
    bin_number_diagnoses,
    build_features,
    build_preprocessor,
    drop_raw_diagnosis_codes,
    use_ordinal_age_only,
)
from src.models.train import IDENTIFIER_COLUMNS, assert_no_leaked_columns, resolve_path
from src.utils.config import load_config

CV_FOLDS = 3
CV_RANDOM_STATE = 42
CV_N_JOBS = 2

# WHAT      : screen levers 1-4 with a smaller random forest (50 trees, no
#             depth/leaf limits from config.yaml) instead of the full
#             300-tree config used for the real model.
# WHY       : this machine was observed to run this exercise 15-20x slower
#             than an uncontended baseline (shared desktop, competing for
#             the same CPU/RAM as a browser, video-call client and IDE) -
#             a full 300-tree, 5-fold CV per lever was taking multiple
#             minutes each, an hour or more for the whole ledger.
# FOR WHOM  : cv_roc_auc(), called once per lever comparison in run().
# BENEFIT   : a lever's *direction* of effect (does ROC-AUC go up or down)
#             is generally stable across forest sizes even though the
#             absolute score is not - 50 trees is enough to rank a
#             transformation as helping or hurting without paying for 300.
# COST      : the absolute CV ROC-AUC numbers in the feature ledger are NOT
#             directly comparable to the full-config numbers reported in
#             the P3 checkpoint (baseline ~0.638 at 300 trees vs. whatever
#             this screening model reports at 50) - only deltas within this
#             ledger, screened consistently, are meaningful. Lever 5's
#             hyperparameter search still explores real n_estimators values
#             and the final model is always retrained at config.yaml's full
#             settings in src.models.train, so this shortcut never reaches
#             the persisted artefact.
# ALTERNATIVES : (1) use the full config.yaml model (300 trees) for every
#             lever, accepting the multi-minute-per-lever cost; (2)
#             subsample the training rows instead of shrinking the forest.
# CHOSEN BECAUSE : (1) is what actually got killed/stalled under this
#             machine's real, observed contention - not a hypothetical
#             preference; (2) would change the row distribution CV sees
#             (a second variable) where reducing tree count changes only
#             the judge's precision, not what data it is judging.
SCREENING_RF_PARAMS: dict[str, Any] = {"n_estimators": 50}


def cv_roc_auc(
    x: pd.DataFrame, y: pd.Series, config: dict[str, Any], model: Any
) -> tuple[float, float]:
    """Return (mean, std) ROC-AUC over StratifiedKFold CV of a fresh Pipeline.

    B4: build_preprocessor(x, config) only inspects column names/dtypes to
    decide the ColumnTransformer's structure - the actual imputer/scaler/
    encoder statistics are fit inside cross_val_score's per-fold clone, never
    on `x` as a whole. The same structural object is reused across folds
    (safe - it is unfitted machinery, not fitted state), exactly as
    src.models.train.main() already does for the real training run.
    """
    pipeline = Pipeline([("preprocess", build_preprocessor(x, config)), ("model", model)])
    cv = StratifiedKFold(n_splits=CV_FOLDS, shuffle=True, random_state=CV_RANDOM_STATE)
    scores = cross_val_score(pipeline, x, y, cv=cv, scoring="roc_auc", n_jobs=CV_N_JOBS)
    return float(scores.mean()), float(scores.std())


def load_baseline_trainval(config: dict[str, Any]) -> tuple[pd.DataFrame, pd.Series]:
    """Reproduce src.models.train's exact P3 feature set and split, keep only trainval.

    The held-out test portion from this split is bound to `_x_test`/`_y_test`
    (leading underscore) and never touched again in this module - there is
    no other reference to it anywhere below this function.
    """
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

    x_trainval, _x_test, y_trainval, _y_test = _train_test_split(
        features,
        target,
        test_size=split["test_size"],
        random_state=split["random_state"],
        stratify=target if split.get("stratify", True) else None,
    )
    del _x_test, _y_test  # explicit: this script never scores the test split
    return x_trainval, y_trainval


def run() -> dict[str, Any]:
    """Run the five N3 levers in order, cumulatively, and return the ledger."""
    config = load_config()
    x_trainval, y_trainval = load_baseline_trainval(config)

    judge_model = RandomForestClassifier(
        class_weight="balanced", random_state=42, **SCREENING_RF_PARAMS
    )

    ledger: list[dict[str, Any]] = []
    current = x_trainval

    print(f"=== N3 baseline (P3 feature set), judged on random_forest, {CV_FOLDS}-fold CV ===")
    current_score, current_std = cv_roc_auc(current, y_trainval, config, judge_model)
    baseline_mean, baseline_std = current_score, current_std
    print(f"Baseline CV ROC-AUC: {current_score:.4f} (std {current_std:.4f})", flush=True)

    # The running score is cached across levers rather than recomputed each
    # time: `current`'s score is already known from the previous lever's
    # "after" (or this baseline, for lever 1) - only the *candidate*
    # actually needs a fresh CV pass. Halves the number of CV fits this
    # script runs, which matters on a machine already observed to be 15-20x
    # slower than expected under contention (see SCREENING_RF_PARAMS above).
    def record(step_name: str, description: str, candidate: pd.DataFrame) -> None:
        nonlocal current, current_score, current_std
        after_mean, after_std = cv_roc_auc(candidate, y_trainval, config, judge_model)
        delta = after_mean - current_score
        kept = delta > 0
        entry = {
            "step": step_name,
            "description": description,
            "cv_roc_auc_before": round(current_score, 4),
            "cv_roc_auc_before_std": round(current_std, 4),
            "cv_roc_auc_after": round(after_mean, 4),
            "cv_roc_auc_after_std": round(after_std, 4),
            "delta": round(delta, 4),
            "decision": "KEPT" if kept else "REVERTED",
            "n_features_before": current.shape[1],
            "n_features_after": candidate.shape[1],
        }
        ledger.append(entry)
        print(json.dumps(entry, indent=2), flush=True)
        if kept:
            current = candidate
            current_score, current_std = after_mean, after_std

    print("\n=== Lever 1: ICD-9 diagnosis grouping instead of raw codes ===")
    record(
        "lever_1_diagnosis_grouping",
        "Drop raw diag_1/diag_2/diag_3, keep only diag_*_group",
        drop_raw_diagnosis_codes(current),
    )

    print("\n=== Lever 2: utilisation ratio + inpatient x stay interaction ===")
    record(
        "lever_2_utilisation_features",
        "Add inpatient_outpatient_ratio and inpatient_stay_interaction",
        add_utilisation_ratio_features(current),
    )

    print("\n=== Lever 3: binary any-medication-change flag ===")
    record(
        "lever_3_medication_change_flag",
        "Add any_med_change binary flag alongside num_med_changes",
        add_any_medication_change_flag(current),
    )

    print("\n=== Lever 4: number_diagnoses binned + age treated as ordinal ===")
    record(
        "lever_4a_bin_number_diagnoses",
        "Replace number_diagnoses with an ordinal bin index (0-3)",
        bin_number_diagnoses(current),
    )
    record(
        "lever_4b_ordinal_age",
        "Drop one-hot age and age_group, keep only age_numeric",
        use_ordinal_age_only(current),
    )

    print("\n=== Lever 5: hyperparameter search (RandomizedSearchCV, train-only CV) ===")
    cv = StratifiedKFold(n_splits=CV_FOLDS, shuffle=True, random_state=CV_RANDOM_STATE)
    search_results: dict[str, Any] = {}

    # Compared against config.yaml's actual random_forest hyperparameters
    # (300 trees, max_depth=12, min_samples_leaf=5) - NOT the 50-tree
    # judge_model used to screen levers 1-4 above. Comparing search
    # candidates (which include n_estimators up to 400) against a 50-tree
    # "default" would make almost any candidate look like an improvement
    # purely from having more trees, which would answer "does more capacity
    # help" instead of the real question lever 5 asks: "does searching
    # around the config's own defaults find something better than them".
    rf_config_params = {
        k: v for k, v in config["models"]["random_forest"].items() if k != "enabled"
    }
    rf_config_default_model = RandomForestClassifier(
        class_weight="balanced", random_state=42, **rf_config_params
    )
    rf_default_mean, rf_default_std = cv_roc_auc(
        current, y_trainval, config, rf_config_default_model
    )
    rf_param_grid = {
        "model__n_estimators": [150, 200, 300, 400],
        "model__max_depth": [8, 12, 16, None],
        "model__min_samples_leaf": [1, 2, 5, 10],
        "model__max_features": ["sqrt", "log2", 0.5],
    }
    rf_pipeline = Pipeline(
        [
            ("preprocess", build_preprocessor(current, config)),
            ("model", RandomForestClassifier(class_weight="balanced", random_state=42)),
        ]
    )
    rf_search = RandomizedSearchCV(
        rf_pipeline,
        param_distributions=rf_param_grid,
        n_iter=6,
        scoring="roc_auc",
        cv=cv,
        random_state=CV_RANDOM_STATE,
        n_jobs=2,
    )
    rf_search.fit(current, y_trainval)
    rf_tuned_mean = float(rf_search.best_score_)
    rf_delta = rf_tuned_mean - rf_default_mean
    search_results["random_forest"] = {
        "cv_roc_auc_default": round(rf_default_mean, 4),
        "cv_roc_auc_default_std": round(rf_default_std, 4),
        "cv_roc_auc_tuned": round(rf_tuned_mean, 4),
        "delta": round(rf_delta, 4),
        "best_params": {k.replace("model__", ""): v for k, v in rf_search.best_params_.items()},
        "decision": "KEPT" if rf_delta > 0 else "REVERTED",
    }
    print(json.dumps(search_results["random_forest"], indent=2), flush=True)

    from xgboost import XGBClassifier

    from src.models.train import positive_class_weight

    xgb_params = {k: v for k, v in config["models"]["xgboost"].items() if k != "enabled"}
    xgb_default_model = XGBClassifier(
        eval_metric="logloss",
        random_state=42,
        scale_pos_weight=positive_class_weight(y_trainval),
        **xgb_params,
    )
    xgb_default_mean, xgb_default_std = cv_roc_auc(current, y_trainval, config, xgb_default_model)
    xgb_param_grid = {
        "model__n_estimators": [150, 200, 300, 400],
        "model__max_depth": [3, 4, 6, 8],
        "model__learning_rate": [0.01, 0.05, 0.1],
        "model__subsample": [0.6, 0.8, 1.0],
        "model__colsample_bytree": [0.6, 0.8, 1.0],
    }
    xgb_pipeline = Pipeline(
        [
            ("preprocess", build_preprocessor(current, config)),
            (
                "model",
                XGBClassifier(
                    eval_metric="logloss",
                    random_state=42,
                    scale_pos_weight=positive_class_weight(y_trainval),
                ),
            ),
        ]
    )
    xgb_search = RandomizedSearchCV(
        xgb_pipeline,
        param_distributions=xgb_param_grid,
        n_iter=6,
        scoring="roc_auc",
        cv=cv,
        random_state=CV_RANDOM_STATE,
        n_jobs=2,
    )
    xgb_search.fit(current, y_trainval)
    xgb_tuned_mean = float(xgb_search.best_score_)
    xgb_delta = xgb_tuned_mean - xgb_default_mean
    search_results["xgboost"] = {
        "cv_roc_auc_default": round(xgb_default_mean, 4),
        "cv_roc_auc_default_std": round(xgb_default_std, 4),
        "cv_roc_auc_tuned": round(xgb_tuned_mean, 4),
        "delta": round(xgb_delta, 4),
        "best_params": {k.replace("model__", ""): v for k, v in xgb_search.best_params_.items()},
        "decision": "KEPT" if xgb_delta > 0 else "REVERTED",
    }
    print(json.dumps(search_results["xgboost"], indent=2), flush=True)

    final_feature_columns = list(current.columns)
    print(f"\n=== Final frozen feature set ({len(final_feature_columns)} columns) ===")
    print(final_feature_columns)
    assert_no_leaked_columns(final_feature_columns)
    print("Leakage check passed on final feature set.")

    return {
        "baseline_cv_roc_auc": round(baseline_mean, 4),
        "baseline_cv_roc_auc_std": round(baseline_std, 4),
        "feature_ledger": ledger,
        "hyperparameter_search": search_results,
        "final_feature_columns": final_feature_columns,
    }


def main() -> None:
    """Run the ledger and write it to ml/artifacts/n3_ledger.json."""
    result = run()
    output_path = Path(__file__).resolve().parents[3] / "ml" / "artifacts" / "n3_ledger.json"
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(result, indent=2), encoding="utf-8")
    print(f"\nLedger written to {output_path}")


if __name__ == "__main__":
    main()
