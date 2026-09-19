"""Tests for the evaluation metrics and risk banding."""

import numpy as np
import pytest

from src.evaluation.metrics import (
    calibration_check,
    categorise_risk,
    classification_metrics,
    confusion_counts,
    meets_promotion_thresholds,
    threshold_metrics,
)


def test_classification_metrics_on_a_perfect_prediction() -> None:
    """A perfect prediction scores 1.0 across the board."""
    y_true = np.array([0, 1, 0, 1])
    metrics = classification_metrics(y_true, y_true, y_true.astype(float))
    assert metrics["accuracy"] == 1.0
    assert metrics["precision"] == 1.0
    assert metrics["recall"] == 1.0
    assert metrics["f1"] == 1.0
    assert metrics["roc_auc"] == 1.0


def test_roc_auc_is_omitted_for_a_single_class() -> None:
    """ROC-AUC is undefined when only one class is present."""
    y_true = np.zeros(4, dtype=int)
    metrics = classification_metrics(y_true, y_true, np.zeros(4))
    assert "roc_auc" not in metrics


def test_confusion_counts_are_labelled_correctly() -> None:
    """Counts map onto the four confusion matrix cells."""
    y_true = np.array([0, 0, 1, 1])
    y_pred = np.array([0, 1, 0, 1])
    counts = confusion_counts(y_true, y_pred)
    assert counts == {
        "true_negative": 1,
        "false_positive": 1,
        "false_negative": 1,
        "true_positive": 1,
    }


def test_promotion_requires_every_threshold() -> None:
    """A model must clear every threshold, not just the primary metric.

    Checked in both directions: clearing ROC-AUC while missing recall is not
    enough (a model that is discriminative but underpowered on the minority
    class must not ship), and neither is the reverse (high recall alone,
    without genuine separation between the classes, is just as ungradeable).
    """
    thresholds = {"roc_auc": 0.65, "recall": 0.50}
    assert meets_promotion_thresholds({"roc_auc": 0.70, "recall": 0.55}, thresholds)
    assert not meets_promotion_thresholds({"roc_auc": 0.70, "recall": 0.40}, thresholds)
    assert not meets_promotion_thresholds({"roc_auc": 0.60, "recall": 0.80}, thresholds)
    assert not meets_promotion_thresholds({"roc_auc": 0.70}, thresholds)


@pytest.mark.parametrize(
    ("probability", "expected"),
    [(0.0, "low"), (0.39, "low"), (0.4, "medium"), (0.69, "medium"), (0.7, "high"), (1.0, "high")],
)
def test_risk_bands_match_the_backend(probability: float, expected: str) -> None:
    """The ML banding must agree with backend/app/services/risk_service.py."""
    assert categorise_risk(probability) == expected


@pytest.mark.parametrize("probability", [-0.5, 1.5])
def test_invalid_probability_raises(probability: float) -> None:
    """A probability outside [0, 1] is a bug."""
    with pytest.raises(ValueError):
        categorise_risk(probability)


def test_threshold_metrics_use_the_given_cutoff_not_the_default() -> None:
    """The platform ships a tuned threshold near 0.11, nowhere near predict()'s 0.5."""
    y_true = np.array([0, 0, 1, 1])
    y_proba = np.array([0.05, 0.20, 0.30, 0.40])
    at_low = threshold_metrics(y_true, y_proba, 0.25)
    at_high = threshold_metrics(y_true, y_proba, 0.45)
    assert at_low["recall"] == 1.0
    assert at_high["recall"] == 0.0
    assert at_low["decision_threshold"] == 0.25


def test_threshold_metrics_omit_auc_for_a_single_class() -> None:
    """ROC-AUC is undefined with one class; recall and precision still are not."""
    metrics = threshold_metrics(np.zeros(4, dtype=int), np.array([0.1, 0.2, 0.3, 0.4]), 0.25)
    assert "roc_auc" not in metrics
    assert metrics["precision"] == 0.0


def test_calibration_is_perfect_when_predictions_match_the_observed_rate() -> None:
    """Half the rows positive, every prediction 0.5 - the gap should be zero."""
    y_true = np.array([0, 1] * 50)
    y_proba = np.full(100, 0.5)
    result = calibration_check(y_true, y_proba, n_bins=5)
    assert result["expected_calibration_error"] == 0.0
    assert result["observed_prevalence"] == 0.5


def test_calibration_reports_the_gap_when_predictions_are_too_high() -> None:
    """This is the failure Milestone 2 fixed - predictions far above prevalence."""
    y_true = np.array([0] * 90 + [1] * 10)
    y_proba = np.full(100, 0.5)
    result = calibration_check(y_true, y_proba, n_bins=5)
    assert result["mean_predicted_probability"] == 0.5
    assert result["observed_prevalence"] == 0.1
    assert result["expected_calibration_error"] == pytest.approx(0.4)


def test_calibration_bins_cover_every_row() -> None:
    """No row may fall outside the bins, or the error is computed on a subset."""
    rng = np.random.default_rng(0)
    y_proba = rng.random(200)
    y_true = (rng.random(200) < y_proba).astype(int)
    result = calibration_check(y_true, y_proba, n_bins=10)
    assert sum(entry["n"] for entry in result["bins"]) == 200
    assert 0.0 <= result["brier_score"] <= 1.0
