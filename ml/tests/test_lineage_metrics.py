"""Tests for the Milestone 4 metric functions in src/evaluation/metrics.py.

Small hand-checkable inputs: each test pins one property a reader can verify
on paper, so a regression points straight at the broken function.
"""

import numpy as np
import pandas as pd
import pytest

from src.evaluation.metrics import (
    brier_score,
    confusion_matrix_at_threshold,
    evaluate_probabilities,
    ks_per_feature,
    metrics_at_threshold,
    patient_overlap,
    population_stability_index,
    pr_auc,
    psi_per_feature,
    roc_auc,
    roc_auc_bootstrap_ci,
    subgroup_metrics,
)

# Four patients, two readmitted; the model ranks both positives above both negatives.
Y_TRUE = [0, 0, 1, 1]
Y_PERFECT = [0.1, 0.2, 0.8, 0.9]


def test_roc_and_pr_auc_are_one_for_a_perfect_ranking() -> None:
    """A model that ranks every positive above every negative scores 1.0 on both."""
    assert roc_auc(Y_TRUE, Y_PERFECT) == 1.0
    assert pr_auc(Y_TRUE, Y_PERFECT) == 1.0


def test_auc_metrics_are_none_when_only_one_class_is_present() -> None:
    """Undefined metrics come back as None, never as a fake 0.5 or 0.0."""
    assert roc_auc([0, 0, 0], [0.1, 0.2, 0.3]) is None
    assert pr_auc([1, 1], [0.4, 0.6]) is None


def test_brier_score_matches_hand_calculation() -> None:
    """Brier = mean squared error of the probabilities: (0.1² + 0.2² + 0.2² + 0.1²) / 4."""
    assert brier_score(Y_TRUE, Y_PERFECT) == pytest.approx((0.01 + 0.04 + 0.04 + 0.01) / 4)


def test_threshold_metrics_use_greater_or_equal() -> None:
    """A probability exactly on the threshold is flagged (same >= rule as train.py)."""
    result = metrics_at_threshold([0, 1], [0.5, 0.5], threshold=0.5)
    assert result["recall"] == 1.0  # the positive at exactly 0.5 was flagged
    assert result["precision"] == 0.5  # ...and so was the negative


def test_threshold_metrics_on_a_mixed_example() -> None:
    """At 0.5: flags rows 2 and 3 -> TP=1, FP=1, FN=1 -> P=R=F1=0.5."""
    y_true = [0, 1, 0, 1]
    y_proba = [0.2, 0.7, 0.6, 0.3]
    result = metrics_at_threshold(y_true, y_proba, 0.5)
    assert result["precision"] == pytest.approx(0.5)
    assert result["recall"] == pytest.approx(0.5)
    assert result["f1"] == pytest.approx(0.5)
    assert confusion_matrix_at_threshold(y_true, y_proba, 0.5) == {
        "true_negative": 1,
        "false_positive": 1,
        "false_negative": 1,
        "true_positive": 1,
    }


def test_evaluate_probabilities_has_every_model_runs_metric() -> None:
    """The bundle the seed script stores must carry all the model_runs metric keys."""
    result = evaluate_probabilities(Y_TRUE, Y_PERFECT, 0.5)
    for key in ("roc_auc", "pr_auc", "brier", "precision", "recall", "f1", "accuracy"):
        assert key in result
    assert result["n"] == 4
    assert result["prevalence"] == 0.5


def test_psi_is_zero_for_identical_samples() -> None:
    """Same distribution on both sides -> no drift."""
    rng = np.random.default_rng(0)
    values = rng.normal(size=2000)
    assert population_stability_index(values, values) == pytest.approx(0.0, abs=1e-12)


def test_psi_flags_a_large_shift() -> None:
    """A mean shift of two standard deviations is far above the 0.2 flag level."""
    rng = np.random.default_rng(0)
    reference = rng.normal(0, 1, 5000)
    current = rng.normal(2, 1, 5000)
    assert population_stability_index(reference, current) > 0.2


def test_psi_handles_categories_including_new_ones() -> None:
    """Categorical PSI works on text, and a category only seen in `current` counts as drift."""
    reference = pd.Series(["a"] * 50 + ["b"] * 50)
    same = pd.Series(["a"] * 50 + ["b"] * 50)
    new_category = pd.Series(["a"] * 50 + ["c"] * 50)
    assert population_stability_index(reference, same) == pytest.approx(0.0, abs=1e-12)
    assert population_stability_index(reference, new_category) > 0.2


def test_psi_is_finite_for_a_bin_that_is_empty_on_one_side() -> None:
    """Epsilon clipping stops ln(0) from turning PSI into infinity."""
    value = population_stability_index(pd.Series([0, 0, 0, 1]), pd.Series([0, 0, 0, 0]))
    assert np.isfinite(value)


def test_psi_and_ks_per_feature_cover_the_right_columns() -> None:
    """PSI covers every shared column; KS only the numeric ones (categories have no order)."""
    reference = pd.DataFrame({"num": np.arange(100.0), "cat": ["x", "y"] * 50})
    current = pd.DataFrame({"num": np.arange(100.0) + 50, "cat": ["x", "y"] * 50})
    psi = psi_per_feature(reference, current)
    ks = ks_per_feature(reference, current)
    assert set(psi) == {"num", "cat"}
    assert set(ks) == {"num"}
    assert ks["num"]["statistic"] == pytest.approx(0.5)  # half the values no longer overlap


def test_subgroup_metrics_split_by_group_and_mark_small_groups() -> None:
    """Each group is scored on its own rows; groups under min_size are marked unreliable."""
    y_true = [1, 0, 1, 0, 1, 0]
    y_proba = [0.9, 0.1, 0.9, 0.8, 0.2, 0.1]
    groups = ["F", "F", "M", "M", "M", "M"]
    rows = {row["group"]: row for row in subgroup_metrics(y_true, y_proba, groups, 0.5, min_size=3)}
    assert rows["F"]["n"] == 2 and rows["F"]["reliable"] is False
    assert rows["F"]["recall"] == 1.0
    assert rows["M"]["n"] == 4 and rows["M"]["reliable"] is True
    assert rows["M"]["recall"] == 0.5  # caught 1 of 2 positives
    assert rows["M"]["false_positive_rate"] == 0.5  # flagged 1 of 2 negatives


def test_bootstrap_ci_brackets_the_point_estimate() -> None:
    """The 95% interval contains the ROC-AUC it was built around."""
    rng = np.random.default_rng(1)
    y_true = rng.integers(0, 2, 400)
    y_proba = y_true * 0.3 + rng.random(400) * 0.7
    low, high = roc_auc_bootstrap_ci(y_true, y_proba, n_boot=200)
    assert low <= roc_auc(y_true, y_proba) <= high


def test_patient_overlap_counts_distinct_shared_ids() -> None:
    """Only ids present in both sets count, each once; missing ids never match."""
    assert patient_overlap([1, 2, 3], [4, 5, 6]) == 0
    assert patient_overlap([1, 2, 2, 3], [2, 3, 3, 9]) == 2
    assert patient_overlap([1, None], [None, 7]) == 0
