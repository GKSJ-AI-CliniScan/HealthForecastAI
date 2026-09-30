"""Held-out validation of the promoted model - Milestone 4.

Scores the test split (never used to fit, calibrate or tune) and reports what a
reviewer needs before trusting the model: discrimination with a bootstrap
interval, calibration and lift by risk band, and how the model compares with a
one-line rule a clinician would already use. Writes artifacts/validation.json.

    python -m src.evaluation.validate

The numbers here are the honest ones. The dashboard scores every patient in the
database, including those the model was trained on, so its bands look sharper
than this; the test split is the figure to quote.
"""

from __future__ import annotations

import json

import joblib
import numpy as np
from sklearn.metrics import brier_score_loss, roc_auc_score

from src.evaluation.metrics import wilson_interval
from src.models.train import prepare_data
from src.utils.config import load_config, resolve_path

BOOTSTRAPS = 1000
SEED = 42


def bootstrap_auc(y: np.ndarray, scores: np.ndarray) -> tuple[float, float]:
    """95% percentile bootstrap interval for ROC-AUC."""
    rng = np.random.default_rng(SEED)
    draws = []
    for _ in range(BOOTSTRAPS):
        index = rng.integers(0, len(y), len(y))
        if y[index].min() == y[index].max():
            continue
        draws.append(roc_auc_score(y[index], scores[index]))
    low, high = np.percentile(draws, [2.5, 97.5])
    return float(low), float(high)


def band_table(y: np.ndarray, probability: np.ndarray, high: float, medium: float) -> list[dict]:
    """Predicted against observed rate and lift for each risk band."""
    base = float(y.mean())
    bands = {
        "high": probability >= high,
        "medium": (probability >= medium) & (probability < high),
        "low": probability < medium,
    }
    rows = []
    for name, mask in bands.items():
        n, events = int(mask.sum()), int(y[mask].sum())
        low, high_ci = wilson_interval(events, n) if n else (0.0, 0.0)
        rows.append(
            {
                "band": name,
                "patients": n,
                "share": round(n / len(y), 4),
                "predicted_rate": round(float(probability[mask].mean()), 4) if n else None,
                "observed_rate": round(events / n, 4) if n else None,
                "observed_ci": [round(low, 4), round(high_ci, 4)],
                "lift": round(events / n / base, 2) if n else None,
            }
        )
    return rows


def main() -> None:
    config = load_config(None)
    artifact = joblib.load(
        resolve_path(config["artifacts"]["output_dir"]) / "readmission_model.joblib"
    )
    splits = prepare_data(config)
    x_test = splits.x_test[artifact["feature_columns"]]
    y = np.asarray(splits.y_test)

    probability = artifact["pipeline"].predict_proba(x_test)[:, 1]
    auc = float(roc_auc_score(y, probability))
    low, high = bootstrap_auc(y, probability)

    # The rule a ward already uses: any earlier inpatient stay in the last year.
    rule = x_test["number_inpatient"].fillna(0).to_numpy(dtype=float)
    rule_auc = float(roc_auc_score(y, rule))

    bands = config["risk_bands"]
    report = {
        "model": artifact["model_name"],
        "version": artifact["model_version"],
        "test_rows": int(len(y)),
        "test_positives": int(y.sum()),
        "roc_auc": round(auc, 4),
        "roc_auc_95ci": [round(low, 4), round(high, 4)],
        "brier_score": round(float(brier_score_loss(y, probability)), 4),
        "brier_of_predicting_the_base_rate": round(
            float(brier_score_loss(y, np.full(len(y), y.mean()))), 4
        ),
        "mean_predicted": round(float(probability.mean()), 4),
        "observed_rate": round(float(y.mean()), 4),
        "rule_prior_inpatient_stays_roc_auc": round(rule_auc, 4),
        "bands": band_table(y, probability, float(bands["high"]), float(bands["medium"])),
    }

    out = resolve_path(config["artifacts"]["output_dir"]) / "validation.json"
    out.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
