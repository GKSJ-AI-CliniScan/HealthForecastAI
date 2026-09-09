"""Tests for the evaluation metrics and risk banding."""

import numpy as np
import pytest

from src.evaluation.metrics import (
    categorise_risk,
    classification_metrics,
    confusion_counts,
    find_best_threshold,
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

    assert meets_promotion_thresholds(
        {"roc_auc": 0.70, "recall": 0.55},
        thresholds,
    )
    assert not meets_promotion_thresholds(
        {"roc_auc": 0.70, "recall": 0.40},
        thresholds,
    )
    assert not meets_promotion_thresholds(
        {"roc_auc": 0.70},
        thresholds,
    )


@pytest.mark.parametrize(
    ("probability", "expected"),
    [
        (0.0, "low"),
        (0.39, "low"),
        (0.4, "medium"),
        (0.69, "medium"),
        (0.7, "high"),
        (1.0, "high"),
    ],
)
def test_risk_bands_match_the_backend(
    probability: float,
    expected: str,
) -> None:
    """The ML banding must agree with the backend risk service."""
    assert categorise_risk(probability) == expected


@pytest.mark.parametrize("probability", [-0.5, 1.5])
def test_invalid_probability_raises(probability: float) -> None:
    """A probability outside [0, 1] is a bug."""
    with pytest.raises(ValueError):
        categorise_risk(probability)


def test_find_best_threshold_meets_recall_floor() -> None:
    """Selected threshold must satisfy the configured recall floor."""
    y_true = np.array([0, 0, 0, 1, 1, 1])
    y_proba = np.array([0.05, 0.20, 0.35, 0.40, 0.60, 0.90])

    threshold, metrics = find_best_threshold(
        y_true,
        y_proba,
        minimum_recall=0.50,
    )

    assert 0.01 <= threshold <= 0.99
    assert metrics["recall"] >= 0.50


def test_find_best_threshold_rejects_impossible_recall_floor() -> None:
    """An impossible recall requirement should fail explicitly."""
    y_true = np.array([0, 0, 1, 1])
    y_proba = np.array([0.1, 0.2, 0.3, 0.4])

    with pytest.raises(ValueError):
        find_best_threshold(
            y_true,
            y_proba,
            minimum_recall=1.1,
        )
