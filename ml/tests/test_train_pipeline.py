"""Tests for training-pipeline mechanics: split, imbalance handling, model
selection and end-to-end shape.

These run against a small synthetic dataframe matching the India Hospital
Readmission profile's shape - no real dataset file has ever been available to
this repository or its CI, so pipeline *behaviour* is what gets tested here,
not model quality on real data (see ml/data/README.md for the schema caveat).
"""

import pandas as pd
import pytest

from src.models.train import (
    build_estimator,
    compute_scale_pos_weight,
    resolve_profile,
    split_dataset,
    train_one_target,
)


def _synthetic_india_frame(n: int) -> pd.DataFrame:
    dates = pd.date_range("2023-01-01", periods=n, freq="3D")
    diagnoses = ["Cardiac", "Diabetes", "Respiratory", "Renal"]
    discharge_dates = [dates[i] + pd.Timedelta(days=1 + (i % 7)) for i in range(n)]
    return pd.DataFrame(
        {
            "patient_id": [f"P{i % 15}" for i in range(n)],
            "age": [20 + (i % 60) for i in range(n)],
            "gender": ["Female" if i % 2 == 0 else "Male" for i in range(n)],
            "diagnosis": [diagnoses[i % len(diagnoses)] for i in range(n)],
            "admission_date": dates.strftime("%Y-%m-%d"),
            "discharge_date": [d.strftime("%Y-%m-%d") for d in discharge_dates],
            "length_of_stay": [1 + (i % 7) for i in range(n)],
            "admission_type": ["Emergency" if i % 2 == 0 else "Elective" for i in range(n)],
            "medication_count": [i % 10 for i in range(n)],
            "readmitted": [
                "<30" if i % 5 == 0 else (">30" if i % 5 == 1 else "NO") for i in range(n)
            ],
        }
    )


TEST_PROFILE = {
    "id_column": "patient_id",
    "date_column": "admission_date",
    "discharge_date_column": "discharge_date",
    "encounter_key": None,
    "target_column": "readmitted",
    "readmission_positive_label": "<30",
    "risk_negative_label": "NO",
    "leakage_disposition_column": None,
    "drop_columns": ["patient_id", "admission_date", "discharge_date"],
    "collapse_columns": ["diagnosis"],
    "utilisation_columns": [],
}


def _test_config(**model_overrides: dict) -> dict:
    models = {
        "logistic_regression": {"enabled": True, "max_iter": 200},
        "random_forest": {
            "enabled": True,
            "n_estimators": 10,
            "max_depth": 3,
            "min_samples_leaf": 1,
        },
        "xgboost": {"enabled": False},
    }
    models.update(model_overrides)
    return {
        "dataset": {"active": "synthetic_india", "profiles": {"synthetic_india": TEST_PROFILE}},
        "split": {
            "test_size": 0.2,
            "validation_size": 0.2,
            "random_state": 42,
            "stratify": True,
            "temporal_when_dated": True,
        },
        "preprocessing": {
            "numeric_imputation": "median",
            "categorical_imputation": "most_frequent",
            "scale_numeric": True,
            "rare_category_threshold": 0.01,
        },
        "imbalance": {"strategy": "class_weight"},
        "models": models,
        # Thresholds at 0 - this suite tests pipeline mechanics on a tiny
        # synthetic fixture, not whether a model trained on 60 fake rows is
        # clinically useful. Real promotion thresholds live in
        # configs/config.yaml and only apply to a real training run.
        "evaluation": {"primary_metric": "roc_auc", "thresholds": {"roc_auc": 0.0, "recall": 0.0}},
        "artifacts": {
            "output_dir": "ignored",
            "model_filename": "{target}_model.joblib",
            "metrics_filename": "{target}_metrics.json",
        },
    }


# -- resolve_profile ----------------------------------------------------------


def test_resolve_profile_returns_the_active_profile_by_default() -> None:
    config = _test_config()
    assert resolve_profile(config) is TEST_PROFILE


def test_resolve_profile_accepts_an_explicit_override() -> None:
    config = _test_config()
    config["dataset"]["profiles"]["other"] = {"id_column": "x"}
    assert resolve_profile(config, "other")["id_column"] == "x"


def test_resolve_profile_rejects_an_unknown_name() -> None:
    with pytest.raises(ValueError, match="Unknown dataset profile"):
        resolve_profile(_test_config(), "does-not-exist")


# -- compute_scale_pos_weight --------------------------------------------------


def test_scale_pos_weight_is_negatives_over_positives() -> None:
    assert compute_scale_pos_weight(pd.Series([0, 0, 0, 1])) == pytest.approx(3.0)


def test_scale_pos_weight_rejects_a_split_with_no_positives() -> None:
    with pytest.raises(ValueError, match="no positive examples"):
        compute_scale_pos_weight(pd.Series([0, 0, 0]))


# -- build_estimator ------------------------------------------------------------


def test_xgboost_estimator_receives_the_computed_scale_pos_weight() -> None:
    estimator = build_estimator("xgboost", {"n_estimators": 10}, scale_pos_weight=3.5)
    assert estimator.get_params()["scale_pos_weight"] == 3.5


def test_xgboost_estimator_defaults_to_no_reweighting() -> None:
    estimator = build_estimator("xgboost", {"n_estimators": 10})
    assert estimator.get_params()["scale_pos_weight"] == 1.0


def test_logistic_regression_and_random_forest_use_balanced_class_weight() -> None:
    assert build_estimator("logistic_regression", {}).get_params()["class_weight"] == "balanced"
    assert build_estimator("random_forest", {}).get_params()["class_weight"] == "balanced"


def test_unknown_model_name_is_rejected() -> None:
    with pytest.raises(ValueError, match="Unknown model"):
        build_estimator("neural_network", {})


# -- split_dataset ---------------------------------------------------------------


def test_temporal_split_never_lets_a_later_row_train_a_model_tested_on_earlier_rows() -> None:
    """Every training-split date must be no later than every validation/test date."""
    frame = _synthetic_india_frame(40)
    target = pd.Series([1] * 20 + [0] * 20)
    dates = pd.to_datetime(frame["admission_date"])
    split_config = {
        "test_size": 0.2,
        "validation_size": 0.2,
        "random_state": 42,
        "temporal_when_dated": True,
    }
    x_train, x_val, x_test, *_ = split_dataset(frame, target, dates, split_config)

    assert dates.loc[x_train.index].max() <= dates.loc[x_val.index].min()
    assert dates.loc[x_val.index].max() <= dates.loc[x_test.index].min()


def test_split_sizes_match_the_configured_fractions() -> None:
    frame = _synthetic_india_frame(50)
    target = pd.Series([1] * 25 + [0] * 25)
    dates = pd.to_datetime(frame["admission_date"])
    split_config = {
        "test_size": 0.2,
        "validation_size": 0.2,
        "random_state": 42,
        "temporal_when_dated": True,
    }
    x_train, x_val, x_test, *_ = split_dataset(frame, target, dates, split_config)

    assert len(x_train) + len(x_val) + len(x_test) == 50
    assert len(x_test) == 10
    assert len(x_val) == 10


def test_falls_back_to_stratified_random_split_without_a_date_column() -> None:
    """Diabetes 130-US has no real calendar date - dates=None must not raise."""
    frame = pd.DataFrame({"x": range(30)})
    target = pd.Series([1] * 15 + [0] * 15)
    split_config = {"test_size": 0.2, "validation_size": 0.2, "random_state": 42, "stratify": True}
    x_train, x_val, x_test, y_train, y_val, y_test = split_dataset(
        frame, target, None, split_config
    )

    assert len(x_train) + len(x_val) + len(x_test) == 30
    assert set(y_train.unique()) == {0, 1}
    assert set(y_test.unique()) == {0, 1}


def test_split_rejects_a_dataset_too_small_for_a_non_empty_test_split() -> None:
    frame = _synthetic_india_frame(2)
    target = pd.Series([1, 0])
    dates = pd.to_datetime(frame["admission_date"])
    split_config = {
        "test_size": 0.2,
        "validation_size": 0.2,
        "random_state": 42,
        "temporal_when_dated": True,
    }
    with pytest.raises(ValueError, match="Not enough rows"):
        split_dataset(frame, target, dates, split_config)


# -- train_one_target (end-to-end against a synthetic fixture) ----------------


def test_train_one_target_readmission_produces_the_expected_shape() -> None:
    frame = _synthetic_india_frame(60)
    result = train_one_target(frame, TEST_PROFILE, _test_config(), "readmission")

    assert result["target"] == "readmission"
    assert result["best_model"] in {"logistic_regression", "random_forest"}
    for metric in ("accuracy", "precision", "recall", "f1", "roc_auc"):
        assert metric in result["metrics"]
    for count in ("true_negative", "false_positive", "false_negative", "true_positive"):
        assert count in result["metrics"]
    sizes = result["split_sizes"]
    assert sizes["train"] + sizes["validation"] + sizes["test"] == 60
    assert result["pipeline"] is not None


def test_train_one_target_risk_uses_a_different_label_than_readmission() -> None:
    """The two flows must not silently train on the same target."""
    frame = _synthetic_india_frame(60)
    config = _test_config()
    readmission_result = train_one_target(frame, TEST_PROFILE, config, "readmission")
    risk_result = train_one_target(frame, TEST_PROFILE, config, "risk")

    assert readmission_result["target"] == "readmission"
    assert risk_result["target"] == "risk"
    # The risk target ("<30" OR ">30") is a strictly wider positive class
    # than the readmission target ("<30" only) on the same underlying rows.
    readmission_positives = sum(
        v["positive"] for v in readmission_result["class_distribution"].values()
    )
    risk_positives = sum(v["positive"] for v in risk_result["class_distribution"].values())
    assert risk_positives > readmission_positives


def test_train_one_target_rejects_an_unknown_target_name() -> None:
    frame = _synthetic_india_frame(20)
    with pytest.raises(ValueError, match="Unknown target"):
        train_one_target(frame, TEST_PROFILE, _test_config(), "deterioration")


def test_train_one_target_selects_the_winner_by_validation_not_test_metrics() -> None:
    """The test split must be touched exactly once, after selection - never to
    choose between candidates, or the reported test metric would be biased."""
    frame = _synthetic_india_frame(60)
    result = train_one_target(frame, TEST_PROFILE, _test_config(), "readmission")

    best_validation_score = result["validation_results"][result["best_model"]]["roc_auc"]
    all_validation_scores = [v["roc_auc"] for v in result["validation_results"].values()]
    assert best_validation_score == max(all_validation_scores)


def test_train_one_target_reports_the_configured_imbalance_strategy() -> None:
    frame = _synthetic_india_frame(60)
    result = train_one_target(frame, TEST_PROFILE, _test_config(), "readmission")
    assert result["imbalance_strategy"] == "class_weight"
    assert result["scale_pos_weight"] > 0


def test_train_one_target_output_is_shaped_for_model_metadata() -> None:
    """The fields Milestone2_Design.md section 3.1's model_metadata table needs."""
    frame = _synthetic_india_frame(60)
    result = train_one_target(frame, TEST_PROFILE, _test_config(), "readmission")

    assert isinstance(result["algorithm"], str)
    assert isinstance(result["trained_at"], str)  # ISO timestamp
    assert isinstance(result["promoted"], bool)
    assert set(result["metrics"]) >= {"accuracy", "precision", "recall", "f1", "roc_auc"}
