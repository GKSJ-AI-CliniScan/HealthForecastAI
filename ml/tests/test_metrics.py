"""Tests for the evaluation metrics and risk banding."""

import numpy as np
import pytest

from src.evaluation.metrics import (
    calibration_summary,
    categorise_risk,
    choose_threshold,
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
    """ROC-AUC and PR-AUC are undefined when only one class is present."""
    y_true = np.zeros(4, dtype=int)
    metrics = classification_metrics(y_true, y_true, np.zeros(4))
    assert "roc_auc" not in metrics
    assert "pr_auc" not in metrics
    assert metrics["brier_score"] == 0.0


def test_probability_metrics_are_omitted_without_probabilities() -> None:
    """Hard labels alone cannot give ROC-AUC, PR-AUC or a Brier score."""
    y_true = np.array([0, 1, 0, 1])
    metrics = classification_metrics(y_true, y_true)
    assert not {"roc_auc", "pr_auc", "brier_score"} & set(metrics)


def test_pr_auc_and_brier_score_use_positive_class_probabilities() -> None:
    """Both are computed on the label-1 probability, from probabilities not labels."""
    y_true = np.array([0, 0, 1, 1])
    y_proba = np.array([0.1, 0.4, 0.35, 0.8])
    metrics = classification_metrics(y_true, (y_proba >= 0.5).astype(int), y_proba)
    # Ranked by score: 0.8 (pos), 0.4 (neg), 0.35 (pos), 0.1 (neg) ->
    # average precision = (1/1 + 2/3) / 2.
    assert metrics["pr_auc"] == pytest.approx((1 + 2 / 3) / 2)
    expected_brier = np.mean((y_proba - y_true) ** 2)
    assert metrics["brier_score"] == pytest.approx(expected_brier)


def test_brier_score_penalises_inflated_probabilities_that_rank_perfectly() -> None:
    """Same ranking, same ROC-AUC - but over-stated probabilities score worse."""
    y_true = np.array([0, 0, 0, 1])
    honest = classification_metrics(y_true, y_true, np.array([0.05, 0.1, 0.15, 0.9]))
    inflated = classification_metrics(y_true, y_true, np.array([0.6, 0.65, 0.7, 0.95]))
    assert honest["roc_auc"] == inflated["roc_auc"] == 1.0
    assert inflated["brier_score"] > honest["brier_score"]


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
    """A model must clear every threshold, not just the primary metric."""
    thresholds = {"roc_auc": 0.65, "recall": 0.50}
    assert meets_promotion_thresholds({"roc_auc": 0.70, "recall": 0.55}, thresholds)
    assert not meets_promotion_thresholds({"roc_auc": 0.70, "recall": 0.40}, thresholds)
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


# -- calibration_summary / threshold helpers ---------------------------------


def test_calibration_summary_reports_inflated_probabilities() -> None:
    """Calibration-in-the-large is mean predicted minus observed rate."""
    y_true = np.array([0, 0, 0, 1] * 25)
    inflated = np.array([0.4, 0.45, 0.5, 0.8] * 25)
    summary = calibration_summary(y_true, inflated)
    assert summary["observed_rate"] == pytest.approx(0.25)
    assert summary["mean_predicted"] == pytest.approx(0.5375)
    assert summary["calibration_in_the_large"] == pytest.approx(0.2875)
    assert {"brier_score", "log_loss", "calibration_slope", "calibration_intercept"} <= set(summary)


def test_calibration_slope_is_one_for_well_calibrated_probabilities() -> None:
    rng = np.random.default_rng(0)
    p = rng.uniform(0.05, 0.95, 20000)
    y = (rng.uniform(size=p.size) < p).astype(int)
    summary = calibration_summary(y, p)
    assert summary["calibration_slope"] == pytest.approx(1.0, abs=0.05)
    assert summary["calibration_intercept"] == pytest.approx(0.0, abs=0.05)


def test_threshold_metrics_flag_at_or_above_the_threshold() -> None:
    y_true = np.array([0, 0, 1, 1])
    y_proba = np.array([0.2, 0.5, 0.5, 0.9])
    row = threshold_metrics(y_true, y_proba, 0.5)
    assert (row["true_positive"], row["false_positive"]) == (2, 1)
    assert (row["false_negative"], row["true_negative"]) == (0, 1)
    assert row["specificity"] == pytest.approx(0.5)
    assert row["flagged_fraction"] == pytest.approx(0.75)


def test_fixed_threshold_is_returned_as_configured() -> None:
    assert choose_threshold(np.array([0, 1]), np.array([0.1, 0.9]), {"strategy": "fixed"}) == 0.5
    spec = {"strategy": "fixed", "value": 0.3}
    assert choose_threshold(np.array([0, 1]), np.array([0.1, 0.9]), spec) == 0.3


def test_min_recall_picks_the_highest_threshold_meeting_the_recall_target() -> None:
    y_true = np.array([0, 0, 0, 1, 1, 1, 1])
    y_proba = np.array([0.1, 0.3, 0.6, 0.2, 0.5, 0.7, 0.9])
    # recall >= 0.75 needs 3 of 4 positives: thresholds 0.5 and below qualify.
    assert choose_threshold(y_true, y_proba, {"strategy": "min_recall", "min_recall": 0.75}) == 0.5
    assert threshold_metrics(y_true, y_proba, 0.5)["recall"] == pytest.approx(0.75)


def test_max_f1_picks_the_best_f1_operating_point() -> None:
    y_true = np.array([0, 0, 0, 1, 1, 1, 1])
    y_proba = np.array([0.1, 0.3, 0.6, 0.2, 0.5, 0.7, 0.9])
    chosen = choose_threshold(y_true, y_proba, {"strategy": "max_f1"})
    best = max(threshold_metrics(y_true, y_proba, t)["f1"] for t in np.unique(y_proba))
    assert threshold_metrics(y_true, y_proba, chosen)["f1"] == pytest.approx(best)


def test_threshold_strategies_reject_bad_input() -> None:
    with pytest.raises(ValueError, match="both classes"):
        choose_threshold(np.zeros(3), np.array([0.1, 0.2, 0.3]), {"strategy": "max_f1"})
    with pytest.raises(ValueError, match="Unknown threshold strategy"):
        choose_threshold(np.array([0, 1]), np.array([0.1, 0.9]), {"strategy": "youden"})
