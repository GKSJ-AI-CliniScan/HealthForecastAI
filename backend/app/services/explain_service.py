"""Per-patient explanation of a risk score, at serving time.

Milestone 3. The arithmetic is the same as ml/src/models/explain.py, which writes
the spec into the model artifact and explains the batch-scored patients. It is
re-implemented here, in a few lines of numpy, because the API cannot import the
`src` package - and because a real-time request scores a *partial* record, which
the batch path never sees.

For a logistic regression the attribution is exact:

    contribution_j = scale * coef_j * (x_j - mean_j)

summed per original feature, where mean_j is the training average and `scale`
undoes the Platt calibration. `baseline + sum(contributions)` reproduces the
calibrated log-odds the clinician sees; tests/test_explain.py checks that against
the real artifact rather than asserting it.
"""

from __future__ import annotations

from typing import Any

import numpy as np
import pandas as pd
from scipy import sparse

MIN_EFFECT = 0.01  # ignore contributions smaller than this many log-odds
TOP_N = 5


def _dense(matrix: Any) -> np.ndarray:
    return matrix.toarray() if sparse.issparse(matrix) else np.asarray(matrix)


def _logit(probability: np.ndarray | float) -> np.ndarray | float:
    clipped = np.clip(np.asarray(probability, dtype=float), 1e-6, 1 - 1e-6)
    return np.log(clipped / (1 - clipped))


def contribution_matrix(
    spec: dict[str, Any], preprocessor: Any, frame: pd.DataFrame, predict: Any = None
) -> tuple[float, np.ndarray, list[str]]:
    """Return (baseline log-odds, per-feature contributions, feature names).

    Occlusion (tree models): log-odds of the score minus log-odds with that one
    factor set to its typical value. Not additive; see ml/src/models/explain.py.
    """
    if spec["kind"] == "occlusion":
        base = _logit(predict(frame)[:, 1])
        names = list(spec["groups"])
        out = np.zeros((len(frame), len(names)))
        for j, column in enumerate(names):
            altered = frame.copy()
            altered[column] = spec["reference_values"][column]
            out[:, j] = base - _logit(predict(altered)[:, 1])
        return float(_logit(spec["average_probability"])), out, names

    transformed = _dense(preprocessor.transform(frame))
    coef = np.asarray(spec["coef"], dtype=float)
    means = np.asarray(spec["means"], dtype=float)
    scale = float(spec["scale"])
    offset = float(spec["offset"])
    contributions = scale * coef * (transformed - means)
    baseline = scale * (spec["intercept"] + float(coef @ means)) + offset

    names = list(dict.fromkeys(spec["groups"]))
    membership = np.zeros((len(spec["groups"]), len(names)))
    index_of = {name: i for i, name in enumerate(names)}
    for feature_index, group in enumerate(spec["groups"]):
        membership[feature_index, index_of[group]] = 1.0

    return float(baseline), contributions @ membership, names


def explain_frame(
    spec: dict[str, Any],
    preprocessor: Any,
    frame: pd.DataFrame,
    top: int = TOP_N,
    supplied: set[str] | None = None,
    predict: Any = None,
) -> list[dict[str, Any]]:
    """Explain every row of a frame.

    `supplied` names the columns the caller actually provided. For a real-time
    request most of the record is imputed from the training distribution, and an
    imputed value is not a finding about this patient - so a factor whose input
    was imputed is reported with `imputed: true` instead of a value.
    """
    baseline_logit, grouped, names = contribution_matrix(spec, preprocessor, frame, predict)
    baseline = spec.get("average_probability") or 1.0 / (1.0 + np.exp(-baseline_logit))

    results: list[dict[str, Any]] = []
    for row_index in range(len(frame)):
        row = grouped[row_index]

        def describe(group_index: int, row_index: int = row_index, row: np.ndarray = row) -> dict:
            name = names[group_index]
            imputed = supplied is not None and name not in supplied
            value = None
            if not imputed and name in frame.columns:
                raw = frame.iloc[row_index][name]
                value = None if pd.isna(raw) else (raw.item() if hasattr(raw, "item") else raw)
            return {
                "feature": name,
                "value": value,
                "imputed": imputed,
                "log_odds": round(float(row[group_index]), 4),
                "odds_ratio": round(float(np.exp(row[group_index])), 3),
            }

        up = np.argsort(row)[::-1][:top]
        down = np.argsort(row)[:top]
        results.append(
            {
                "baseline_probability": round(float(baseline), 4),
                "exact": bool(spec.get("exact_on_probability", True)),
                "up": [describe(i) for i in up if row[i] >= MIN_EFFECT],
                "down": [describe(i) for i in down if row[i] <= -MIN_EFFECT],
            }
        )

    return results
