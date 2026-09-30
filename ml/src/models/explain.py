"""Per-patient explanation for the linear readmission model.

Milestone 3. A risk score with no explanation is not something a clinician can
act on, and the global driver list from Milestone 2 is the same for every
patient. This says why *this* patient scored what they did.

The promoted model is a logistic regression, which is linear in its transformed
features, so the attribution is exact rather than an approximation - no SHAP, no
sampling. For feature j on a patient with transformed value x_j:

    contribution_j = scale * coef_j * (x_j - mean_j)

where mean_j is the training-set average of that feature, so the number reads as
"how much does this factor move the log-odds compared with the average patient".
`scale` undoes the Platt calibration: the calibrated log-odds is an affine
function of the base model's log-odds, so multiplying by the sigmoid slope puts
the contributions on the same scale as the probability the clinician sees, and
`baseline + sum(contributions)` reproduces that probability exactly.

One-hot columns are folded back into the original feature (all the
discharge_disposition_* columns become "discharge_disposition"), because "the
patient was discharged to a skilled nursing facility" is a finding and
"discharge_disposition_Discharged/transferred to SNF = 1" is an encoding detail.

This module writes the spec into the model artifact. The backend carries its own
small numpy implementation of the same arithmetic (backend/app/services/
explain_service.py), because the API cannot import the `src` package - the two
are tested against each other.
"""

from __future__ import annotations

from typing import Any

import numpy as np
import pandas as pd
from scipy import sparse
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline
from xgboost import XGBClassifier

MIN_EFFECT = 0.01  # ignore contributions smaller than this many log-odds
TOP_N = 5


def unwrap(estimator: Any) -> tuple[Pipeline | None, Any | None]:
    """Return (fitted base pipeline, sigmoid calibrator or None) for an estimator.

    A calibrated model nests: CalibratedClassifierCV -> _CalibratedClassifier ->
    FrozenEstimator -> Pipeline. Walk down until the Pipeline is found.
    """
    calibrator = None
    queue = [estimator]
    seen = 0

    while queue and seen < 12:
        current = queue.pop(0)
        seen += 1

        if isinstance(current, Pipeline):
            return current, calibrator

        fitted = getattr(current, "calibrated_classifiers_", None)
        if fitted:
            first = fitted[0]
            calibrators = getattr(first, "calibrators", None)
            if calibrators:
                calibrator = calibrators[0]
            queue.append(first)

        inner = getattr(current, "estimator", None)
        if inner is not None:
            queue.append(inner)

    return None, calibrator


def _dense(matrix: Any) -> np.ndarray:
    """Return a dense ndarray from a dense or sparse matrix."""
    return matrix.toarray() if sparse.issparse(matrix) else np.asarray(matrix)


def _group_of(feature_name: str, columns: list[str]) -> str:
    """Map a transformed feature name back to the original column.

    Names look like "numeric__time_in_hospital" or
    "categorical__discharge_disposition_Discharged to home". The longest original
    column name that prefixes the remainder wins, so "diag_1_group" is not
    mistaken for "diag_1".
    """
    remainder = feature_name.split("__", 1)[-1]
    best = ""
    for column in columns:
        if (remainder == column or remainder.startswith(column + "_")) and len(column) > len(best):
            best = column
    return best or remainder


def build_spec(estimator: Any, reference: pd.DataFrame) -> dict[str, Any] | None:
    """Build the explanation spec for a fitted estimator, or None if unsupported.

    `reference` is the training frame; its transformed mean is the baseline.
    Supports logistic regression (exact) and XGBoost (TreeSHAP on the raw
    margin, flagged inexact against the calibrated probability). Anything else
    returns None rather than approximate numbers under the same name.
    """
    pipeline, calibrator = unwrap(estimator)
    if pipeline is None:
        return None

    model = pipeline.named_steps.get("model")
    if not isinstance(model, LogisticRegression | XGBClassifier):
        return None

    preprocessor = pipeline.named_steps["preprocess"]
    names = [str(n) for n in preprocessor.get_feature_names_out()]
    used_columns = used_columns_of(preprocessor)

    if isinstance(model, XGBClassifier):
        # A tree ensemble has no exact additive form on the displayed probability
        # (TreeSHAP on the raw margin was tried and rejected: the model is
        # class-weighted, so its baseline is not the average patient and the
        # attribution could point the opposite way to the displayed risk).
        # Occlusion answers a plainer question about the score the clinician
        # actually sees: how much lower would it be if this one factor took its
        # typical value? Each factor is scored separately, so the numbers do NOT
        # sum to the total, and the spec says so.
        if reference is None:
            return None
        reference_values: dict[str, Any] = {}
        for column in dict.fromkeys(used_columns):
            values = reference[column].dropna()
            if values.empty:
                continue
            numeric = pd.api.types.is_numeric_dtype(values)
            reference_values[column] = (
                float(values.median()) if numeric else str(values.mode().iloc[0])
            )
        return {
            "kind": "occlusion",
            "exact_on_probability": False,
            "additive": False,
            "feature_names": list(reference_values),
            "groups": list(reference_values),
            "reference_values": reference_values,
            "average_probability": float(estimator.predict_proba(reference)[:, 1].mean()),
        }

    transformed = _dense(preprocessor.transform(reference))
    means = transformed.mean(axis=0)
    coef = np.asarray(model.coef_, dtype=float).ravel()
    if len(coef) != len(names):
        return None

    exact = True
    scale, offset = 1.0, 0.0
    if calibrator is not None:
        slope, intercept = getattr(calibrator, "a_", None), getattr(calibrator, "b_", None)
        if slope is None or intercept is None:
            exact = False  # isotonic: no affine relation to the base log-odds
        else:
            scale, offset = -float(slope), -float(intercept)

    return {
        "kind": "logistic-linear",
        "exact_on_probability": exact,
        "feature_names": names,
        "groups": [_group_of(name, used_columns) for name in names],
        "coef": coef.tolist(),
        "means": means.tolist(),
        "intercept": float(np.asarray(model.intercept_).ravel()[0]),
        "scale": scale,
        "offset": offset,
    }


def used_columns_of(preprocessor: Any) -> list[str]:
    """Return the input columns a fitted ColumnTransformer actually reads."""
    columns: list[str] = []
    for _, _, selected in preprocessor.transformers_:
        if isinstance(selected, list | tuple | np.ndarray | pd.Index):
            columns.extend(str(c) for c in selected)
    return columns


def _sigmoid(value: np.ndarray | float) -> np.ndarray | float:
    return 1.0 / (1.0 + np.exp(-np.asarray(value, dtype=float)))


def _logit(probability: np.ndarray | float) -> np.ndarray | float:
    clipped = np.clip(np.asarray(probability, dtype=float), 1e-6, 1 - 1e-6)
    return np.log(clipped / (1 - clipped))


def contribution_matrix(
    spec: dict[str, Any], preprocessor: Any, frame: pd.DataFrame, predict: Any = None
) -> tuple[float, np.ndarray, list[str]]:
    """Return (baseline log-odds, per-group contributions, group names).

    Linear model: baseline_log_odds + contributions.sum(axis=1) == log_odds(p),
    exactly (asserted in the tests). Occlusion model: each contribution is
    log_odds(p) - log_odds(p with that one factor at its typical value); they are
    reported per factor and are not additive. `predict` is the fitted model's
    predict_proba and is required for occlusion.
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
    baseline_logit = scale * (spec["intercept"] + float(coef @ means)) + offset

    group_names = list(dict.fromkeys(spec["groups"]))
    membership = np.zeros((len(spec["groups"]), len(group_names)))
    index_of = {name: i for i, name in enumerate(group_names)}
    for feature_index, group in enumerate(spec["groups"]):
        membership[feature_index, index_of[group]] = 1.0

    return float(baseline_logit), contributions @ membership, group_names


def explain_frame(
    spec: dict[str, Any],
    preprocessor: Any,
    frame: pd.DataFrame,
    top: int = TOP_N,
    predict: Any = None,
) -> list[dict[str, Any]]:
    """Explain every row of a frame. One dict per row, in input order."""
    baseline_logit, grouped, group_names = contribution_matrix(spec, preprocessor, frame, predict)
    baseline = float(spec.get("average_probability") or _sigmoid(baseline_logit))

    results: list[dict[str, Any]] = []
    for row_index in range(len(frame)):
        row = grouped[row_index]
        up = np.argsort(row)[::-1][:top]
        down = np.argsort(row)[:top]

        def describe(group_index: int, row_index: int = row_index, row: np.ndarray = row) -> dict:
            name = group_names[group_index]
            value = None
            if name in frame.columns:
                raw = frame.iloc[row_index][name]
                value = None if pd.isna(raw) else (raw.item() if hasattr(raw, "item") else raw)
            return {
                "feature": name,
                "value": value,
                "log_odds": round(float(row[group_index]), 4),
                "odds_ratio": round(float(np.exp(row[group_index])), 3),
            }

        results.append(
            {
                "baseline_probability": round(baseline, 4),
                "exact": bool(spec.get("exact_on_probability", True)),
                "up": [describe(i) for i in up if row[i] >= MIN_EFFECT],
                "down": [describe(i) for i in down if row[i] <= -MIN_EFFECT],
            }
        )

    return results


def base_estimator_pipeline(estimator: Any) -> Pipeline | None:
    """Return the fitted base Pipeline inside a (possibly calibrated) estimator."""
    pipeline, _ = unwrap(estimator)
    return pipeline
