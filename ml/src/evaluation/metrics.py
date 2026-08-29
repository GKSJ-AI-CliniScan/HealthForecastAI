"""Model evaluation metrics.

These are the metrics listed in section 8 of the brief: accuracy, precision,
recall, F1 and ROC-AUC. Report all five - accuracy alone is misleading on an
imbalanced readmission target.
"""

from typing import Any

import numpy as np
from sklearn.metrics import (
    accuracy_score,
    confusion_matrix,
    f1_score,
    precision_recall_curve,
    precision_score,
    recall_score,
    roc_auc_score,
)


def classification_metrics(
    y_true: np.ndarray, y_pred: np.ndarray, y_proba: np.ndarray | None = None
) -> dict[str, float]:
    """Return the standard classification metric set."""
    metrics = {
        "accuracy": float(accuracy_score(y_true, y_pred)),
        "precision": float(precision_score(y_true, y_pred, zero_division=0)),
        "recall": float(recall_score(y_true, y_pred, zero_division=0)),
        "f1": float(f1_score(y_true, y_pred, zero_division=0)),
    }
    if y_proba is not None and len(np.unique(y_true)) > 1:
        metrics["roc_auc"] = float(roc_auc_score(y_true, y_proba))
    return metrics


def confusion_counts(y_true: np.ndarray, y_pred: np.ndarray) -> dict[str, int]:
    """Return true/false positive and negative counts.

    In a clinical setting a false negative - a high risk patient discharged
    without follow-up - costs more than a false positive. Track both.
    """
    tn, fp, fn, tp = confusion_matrix(y_true, y_pred, labels=[0, 1]).ravel()
    return {
        "true_negative": int(tn),
        "false_positive": int(fp),
        "false_negative": int(fn),
        "true_positive": int(tp),
    }


def select_decision_threshold(
    y_true: np.ndarray, y_proba: np.ndarray, min_recall: float = 0.50
) -> tuple[float, float, float]:
    """Pick the highest-precision cutoff whose recall is at least ``min_recall``.

    The default 0.5 cutoff from ``predict()`` is arbitrary - it is not tuned to
    the recall the platform actually needs. ``precision_recall_curve`` returns
    thresholds in increasing order, paired with precision/recall that
    (generically) rises/falls as the threshold rises, so the candidate with the
    best precision among those that still clear the recall floor is the
    tightest cutoff before recall would drop below it.

    Returns ``(threshold, precision_at_threshold, recall_at_threshold)``. Falls
    back to the lowest threshold (maximum achievable recall) if no cutoff
    reaches ``min_recall``.
    """
    precision, recall, thresholds = precision_recall_curve(y_true, y_proba)
    candidates = [
        (float(t), float(precision[i]), float(recall[i])) for i, t in enumerate(thresholds)
    ]
    reachable = [c for c in candidates if c[2] >= min_recall]
    if not reachable:
        return min(candidates, key=lambda c: c[0])
    return max(reachable, key=lambda c: (c[1], c[0]))


def meets_promotion_thresholds(metrics: dict[str, float], thresholds: dict[str, Any]) -> bool:
    """Return True when every configured minimum threshold is satisfied.

    A model that fails this check must not be promoted to the API.
    """
    return all(
        metrics.get(name) is not None and float(metrics[name]) >= float(minimum)
        for name, minimum in thresholds.items()
    )


def categorise_risk(probability: float, high: float = 0.70, medium: float = 0.40) -> str:
    """Map a probability onto the platform risk bands.

    Must stay in sync with backend/app/services/risk_service.py.
    """
    if not 0.0 <= probability <= 1.0:
        raise ValueError("probability must be between 0.0 and 1.0")
    if probability >= high:
        return "high"
    if probability >= medium:
        return "medium"
    return "low"
