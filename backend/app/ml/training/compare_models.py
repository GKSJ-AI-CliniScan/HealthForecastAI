"""Model evaluation and comparison engine."""

from __future__ import annotations

import numpy as np
from sklearn.metrics import (
    accuracy_score,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
)


def evaluate_model(model, X_test: np.ndarray, y_test: np.ndarray) -> dict[str, float]:
    """Calculate key clinical validation metrics."""
    y_pred = model.predict(X_test)
    y_prob = model.predict_proba(X_test)[:, 1]

    acc = float(accuracy_score(y_test, y_pred))
    prec = float(precision_score(y_test, y_pred, zero_division=0))
    rec = float(recall_score(y_test, y_pred, zero_division=0))
    f1 = float(f1_score(y_test, y_pred, zero_division=0))
    auc = float(roc_auc_score(y_test, y_prob))

    return {
        "accuracy": round(acc, 4),
        "precision": round(prec, 4),
        "recall": round(rec, 4),
        "f1_score": round(f1, 4),
        "roc_auc": round(auc, 4),
    }


def compare_models(
    models: dict[str, any],
    X_test: np.ndarray,
    y_test: np.ndarray,
) -> tuple[str, dict[str, dict[str, float]], str]:
    """Compare multiple models and select the best model based on clinical ROC-AUC and F1.

    Returns
    -------
    tuple[str, dict, str]
        (best_model_name, all_metrics, comparison_table_str)
    """
    results: dict[str, dict[str, float]] = {}

    lines = [
        f"{'Model':<20} {'Accuracy':<12} {'Precision':<12} {'Recall':<12} {'F1':<10} {'ROC-AUC':<10}",
        "-" * 78,
    ]

    best_model_name = ""
    best_score = -1.0

    for name, model in models.items():
        metrics = evaluate_model(model, X_test, y_test)
        results[name] = metrics

        lines.append(
            f"{name:<20} {metrics['accuracy']:<12.4f} {metrics['precision']:<12.4f} "
            f"{metrics['recall']:<12.4f} {metrics['f1_score']:<10.4f} {metrics['roc_auc']:<10.4f}"
        )

        # Primary selection: ROC-AUC combined with F1 score (clinical balance)
        selection_score = (metrics["roc_auc"] * 0.7) + (metrics["f1_score"] * 0.3)
        if selection_score > best_score:
            best_score = selection_score
            best_model_name = name

    comparison_table = "\n".join(lines)
    return best_model_name, results, comparison_table
