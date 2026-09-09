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


def find_best_threshold(
    y_true: np.ndarray,
    y_proba: np.ndarray,
    minimum_recall: float,
) -> tuple[float, dict[str, float]]:
    """Find the threshold with the best F1 while meeting a recall floor."""
    if len(y_true) != len(y_proba):
        raise ValueError("y_true and y_proba must have the same length")

    if not 0.0 <= minimum_recall <= 1.0:
        raise ValueError("minimum_recall must be between 0.0 and 1.0")

    best_threshold: float | None = None
    best_metrics: dict[str, float] | None = None
    best_f1 = -1.0

    for threshold in np.linspace(0.01, 0.99, 99):
        y_pred = (y_proba >= threshold).astype(int)

        recall = float(
            recall_score(
                y_true,
                y_pred,
                zero_division=0,
            )
        )

        if recall < minimum_recall:
            continue

        precision = float(
            precision_score(
                y_true,
                y_pred,
                zero_division=0,
            )
        )

        f1 = float(
            f1_score(
                y_true,
                y_pred,
                zero_division=0,
            )
        )

        if f1 > best_f1:
            best_f1 = f1
            best_threshold = float(threshold)
            best_metrics = {
                "precision": precision,
                "recall": recall,
                "f1": f1,
            }

    if best_threshold is None or best_metrics is None:
        raise ValueError(f"No threshold satisfies the minimum recall of {minimum_recall}")

    return best_threshold, best_metrics
