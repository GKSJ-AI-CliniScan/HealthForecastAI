"""Tests for the evaluation metrics and risk banding."""

import numpy as np
import pytest

from src.evaluation.metrics import (
    categorise_risk,
    classification_metrics,
    confusion_counts,
    meets_promotion_thresholds,
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
    """A model must clear every threshold, not just the primary metric."""
    thresholds = {"roc_auc": 0.65, "recall": 0.50}
    assert meets_promotion_thresholds({"roc_auc": 0.70, "recall": 0.55}, thresholds)
    assert not meets_promotion_thresholds({"roc_auc": 0.70, "recall": 0.40}, thresholds)
    assert not meets_promotion_thresholds({"roc_auc": 0.70}, thresholds)


@pytest.mark.parametrize(
    ("probability", "expected"),
    [
        (0.0, "low"),
        (0.119, "low"),
        (0.12, "medium"),
        (0.199, "medium"),
        (0.20, "high"),
        (1.0, "high"),
    ],
)
def test_risk_bands_match_the_backend(probability: float, expected: str) -> None:
    """The ML banding must agree with backend/app/services/risk_service.py."""
    assert categorise_risk(probability) == expected


@pytest.mark.parametrize("probability", [-0.5, 1.5])
def test_invalid_probability_raises(probability: float) -> None:
    """A probability outside [0, 1] is a bug."""
    with pytest.raises(ValueError):
        categorise_risk(probability)
