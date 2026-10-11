"""Model evaluation metrics.

These are the metrics listed in section 8 of the brief: accuracy, precision,
recall, F1 and ROC-AUC. Report all five - accuracy alone is misleading on an
imbalanced readmission target.

When probabilities are available two more are reported: PR-AUC (average
precision), which unlike ROC-AUC reflects the positive-class prevalence, and
the Brier score, which measures probability quality rather than ranking - a
model can rank patients well and still state inflated probabilities.
"""

from typing import Any

import numpy as np
from sklearn.metrics import (
    accuracy_score,
    average_precision_score,
    brier_score_loss,
    confusion_matrix,
    f1_score,
    log_loss,
    precision_recall_curve,
    precision_score,
    recall_score,
    roc_auc_score,
)


def classification_metrics(
    y_true: np.ndarray, y_pred: np.ndarray, y_proba: np.ndarray | None = None
) -> dict[str, float]:
    """Return the standard classification metric set.

    ``y_pred`` are hard 0/1 labels; ``y_proba`` are positive-class (label 1)
    probabilities. ROC-AUC and PR-AUC need both classes present and are
    omitted otherwise; the Brier score is defined for any probabilities.
    """
    metrics = {
        "accuracy": float(accuracy_score(y_true, y_pred)),
        "precision": float(precision_score(y_true, y_pred, zero_division=0)),
        "recall": float(recall_score(y_true, y_pred, zero_division=0)),
        "f1": float(f1_score(y_true, y_pred, zero_division=0)),
    }
    if y_proba is not None:
        if len(np.unique(y_true)) > 1:
            metrics["roc_auc"] = float(roc_auc_score(y_true, y_proba))
            metrics["pr_auc"] = float(average_precision_score(y_true, y_proba))
        metrics["brier_score"] = float(brier_score_loss(y_true, y_proba, pos_label=1))
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


def calibration_summary(y_true: np.ndarray, y_proba: np.ndarray) -> dict[str, float]:
    """Describe probability quality, separately from ranking quality.

    calibration_in_the_large is mean predicted minus observed rate (0 when the
    average is right). The slope and intercept come from a logistic fit of the
    outcome on logit(probability): slope 1 / intercept 0 is perfect, a slope
    below 1 means the probabilities are too extreme.
    """
    y = np.asarray(y_true).astype(int)
    p = np.clip(np.asarray(y_proba, dtype=float), 1e-6, 1 - 1e-6)
    summary = {
        "brier_score": float(brier_score_loss(y, p, pos_label=1)),
        "log_loss": float(log_loss(y, p, labels=[0, 1])),
        "mean_predicted": float(p.mean()),
        "observed_rate": float(y.mean()),
        "calibration_in_the_large": float(p.mean() - y.mean()),
    }
    if len(np.unique(y)) > 1:
        from sklearn.linear_model import LogisticRegression

        logit = np.log(p / (1 - p)).reshape(-1, 1)
        fit = LogisticRegression(penalty=None).fit(logit, y)
        summary["calibration_slope"] = float(fit.coef_[0][0])
        summary["calibration_intercept"] = float(fit.intercept_[0])
    return summary


def threshold_metrics(y_true: np.ndarray, y_proba: np.ndarray, threshold: float) -> dict[str, Any]:
    """Operating-point metrics when patients with probability >= threshold are flagged."""
    y = np.asarray(y_true).astype(int)
    y_pred = (np.asarray(y_proba) >= threshold).astype(int)
    counts = confusion_counts(y, y_pred)
    negatives = counts["true_negative"] + counts["false_positive"]
    result: dict[str, Any] = {"threshold": float(threshold)}
    result.update(classification_metrics(y, y_pred))
    result["specificity"] = counts["true_negative"] / negatives if negatives else 0.0
    result["flagged_fraction"] = float(y_pred.mean()) if len(y_pred) else 0.0
    result.update(counts)
    return result


def choose_threshold(y_true: np.ndarray, y_proba: np.ndarray, spec: dict[str, Any]) -> float:
    """Pick the decision threshold from VALIDATION predictions only.

    Strategies (config ``decision_threshold.strategy``):
      fixed      - ``value`` as given (0.5 keeps the historical behaviour);
      max_f1     - the threshold with the highest F1;
      min_recall - the highest threshold whose recall is at least
                   ``min_recall``, i.e. the most precise operating point
                   that still catches that share of positives.
    """
    strategy = spec.get("strategy", "fixed")
    if strategy == "fixed":
        return float(spec.get("value", 0.5))
    y = np.asarray(y_true).astype(int)
    if len(np.unique(y)) < 2:
        raise ValueError("Choosing a threshold needs both classes in the validation split.")
    precision, recall, thresholds = precision_recall_curve(y, y_proba)
    # precision/recall have one more entry than thresholds (the final 1/0 point).
    precision, recall = precision[:-1], recall[:-1]
    if strategy == "max_f1":
        denominator = precision + recall
        f1 = np.divide(
            2 * precision * recall,
            denominator,
            out=np.zeros_like(denominator),
            where=denominator > 0,
        )
        return float(thresholds[int(np.argmax(f1))])
    if strategy == "min_recall":
        target = float(spec["min_recall"])
        eligible = thresholds[recall >= target]
        if eligible.size == 0:
            raise ValueError(f"No threshold reaches recall {target} on validation.")
        return float(eligible.max())
    raise ValueError(f"Unknown threshold strategy '{strategy}'.")


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
