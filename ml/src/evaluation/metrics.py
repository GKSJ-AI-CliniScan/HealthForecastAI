"""Model evaluation metrics.

These are the metrics listed in section 8 of the brief: accuracy, precision,
recall, F1 and ROC-AUC. Report all five - accuracy alone is misleading on an
imbalanced readmission target.
"""

from typing import Any

import numpy as np
import pandas as pd
from scipy.stats import ks_2samp
from sklearn.metrics import (
    accuracy_score,
    average_precision_score,
    brier_score_loss,
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


def threshold_metrics(
    y_true: np.ndarray, y_proba: np.ndarray, threshold: float
) -> dict[str, float]:
    """Score a probability column at one fixed decision threshold.

    ROC-AUC is threshold-free and is reported alongside on purpose: it says how
    well the model ranks patients, while recall and precision say what actually
    happens at the cutoff the platform ships with. Quoting only the first would
    hide the operating point; only the second would hide the ranking.
    """
    y_pred = (np.asarray(y_proba) >= threshold).astype(int)
    metrics = {
        "decision_threshold": float(threshold),
        "recall": float(recall_score(y_true, y_pred, zero_division=0)),
        "precision": float(precision_score(y_true, y_pred, zero_division=0)),
    }
    if len(np.unique(y_true)) > 1:
        metrics["roc_auc"] = float(roc_auc_score(y_true, y_proba))
    return metrics


def calibration_check(y_true: np.ndarray, y_proba: np.ndarray, n_bins: int = 10) -> dict[str, Any]:
    """Compare predicted probability against observed rate, in equal-count bins.

    Milestone 2 added isotonic calibration because the class-weighted models were
    predicting roughly five times the true prevalence. That fix is a property of
    the saved artefact, so it has to be re-measured rather than assumed to still
    hold. Bins are quantile-based, not equal-width: almost every prediction sits
    below 0.2, so equal-width bins would leave most of them in one bucket.

    Returns the per-bin table plus a Brier score and the expected calibration
    error, which is the row-count-weighted mean gap between the two columns.
    """
    y_true = np.asarray(y_true, dtype=float)
    y_proba = np.asarray(y_proba, dtype=float)
    edges = np.unique(np.quantile(y_proba, np.linspace(0, 1, n_bins + 1)))
    if len(edges) < 2:
        # Every prediction is the same number, so the quantiles collapse to a
        # single edge and there is nothing to bin by. One bin holding every row
        # still measures the gap correctly; leaving it at zero bins would report
        # a perfectly calibrated model, which is the opposite of what a constant
        # prediction against a non-constant outcome means.
        edges = np.array([edges[0], edges[0] + 1e-9])
    # np.digitize puts a value equal to the last edge in its own bin above the
    # top one, so the top bin is closed by hand.
    assignments = np.clip(np.digitize(y_proba, edges[1:-1], right=True), 0, len(edges) - 2)

    bins = []
    weighted_gap = 0.0
    for index in range(len(edges) - 1):
        mask = assignments == index
        count = int(mask.sum())
        if count == 0:
            continue
        predicted = float(y_proba[mask].mean())
        observed = float(y_true[mask].mean())
        weighted_gap += count * abs(predicted - observed)
        bins.append(
            {
                "bin": index,
                "n": count,
                "mean_predicted": round(predicted, 4),
                "observed_rate": round(observed, 4),
                "gap": round(predicted - observed, 4),
            }
        )

    return {
        "bins": bins,
        "brier_score": round(float(np.mean((y_proba - y_true) ** 2)), 6),
        "expected_calibration_error": round(weighted_gap / len(y_true), 4) if len(y_true) else None,
        "mean_predicted_probability": round(float(y_proba.mean()), 4),
        "observed_prevalence": round(float(y_true.mean()), 4),
    }


# ---------------------------------------------------------------------------
# Milestone 4 - model lineage and validation metrics.
#
# WHY this block exists: M4 needs the same numbers computed in three places -
# the model_runs seed (ml/scripts/seed_model_runs.py), the drift/leakage
# report (ml/scripts/drift_and_leakage_report.py) and the model card. Keeping
# one implementation here means a number in Mongo, in the report and in the
# card can never disagree because two scripts computed it two ways.
# Everything above this line is M2/M3 code and is left untouched: train.py,
# predict.py, treatment_report.py and a16_serving_fidelity.py import it.
# ---------------------------------------------------------------------------


# Probabilities and labels are coerced through these two helpers so every
# function below accepts a list, a pandas Series or a numpy array alike - the
# scripts pass Series straight out of a DataFrame, the tests pass plain lists.
def _as_labels(y_true: Any) -> np.ndarray:
    """Return labels as a 1-D int array (0 = not readmitted, 1 = readmitted <30d)."""
    return np.asarray(y_true, dtype=int).ravel()


def _as_scores(y_proba: Any) -> np.ndarray:
    """Return predicted probabilities as a 1-D float array."""
    return np.asarray(y_proba, dtype=float).ravel()


def roc_auc(y_true: Any, y_proba: Any) -> float | None:
    """ROC-AUC: how well the model *ranks* readmitted above non-readmitted patients.

    Threshold-free, so it is the metric train.py uses to pick the best model
    (config evaluation.primary_metric). Returns None - not 0.5, not 0.0 - when
    only one class is present, because the metric is undefined there and a
    made-up number would look like a real (terrible) result in model_runs.
    """
    labels = _as_labels(y_true)
    if len(np.unique(labels)) < 2:
        return None
    return float(roc_auc_score(labels, _as_scores(y_proba)))


def pr_auc(y_true: Any, y_proba: Any) -> float | None:
    """PR-AUC (average precision): ranking quality focused on the positive class.

    WHY it is reported next to ROC-AUC: with ~9% positives ROC-AUC can look
    respectable while precision is poor, because ROC's x-axis (false-positive
    rate) is diluted by the huge negative class. PR-AUC's baseline is the
    prevalence (~0.09), not 0.5, so it shows how much better than "flag at
    random" the model really is. Uses average_precision_score (step-wise, no
    optimistic linear interpolation). None when only one class is present.
    """
    labels = _as_labels(y_true)
    if len(np.unique(labels)) < 2:
        return None
    return float(average_precision_score(labels, _as_scores(y_proba)))


def brier_score(y_true: Any, y_proba: Any) -> float:
    """Mean squared gap between predicted probability and the 0/1 outcome.

    WHY: ROC-AUC and PR-AUC only care about order; Brier also checks the
    probability *values* are honest. That matters here because M2 added
    isotonic calibration, and the risk bands (0.40/0.70) and /risk/forecast
    sums read the raw probability. Lower is better; always predicting the
    prevalence p scores p*(1-p) (~0.082 at 9%), the bar a model must beat.
    """
    return float(brier_score_loss(_as_labels(y_true), _as_scores(y_proba)))


def metrics_at_threshold(y_true: Any, y_proba: Any, threshold: float) -> dict[str, float]:
    """Precision, recall, F1 and accuracy after cutting probabilities at ``threshold``.

    WHAT: turns a probability column into yes/no flags (>= threshold means
    "flag for follow-up") and scores those flags. The >= matches train.py's
    `(y_proba_test >= decision_threshold)` so numbers here reproduce
    metrics.json exactly. USE: the seed script stores these in
    model_runs.metrics; the drift report recomputes them per encounter chunk.
    """
    labels = _as_labels(y_true)
    predicted = (_as_scores(y_proba) >= threshold).astype(int)
    return {
        "precision": float(precision_score(labels, predicted, zero_division=0)),
        "recall": float(recall_score(labels, predicted, zero_division=0)),
        "f1": float(f1_score(labels, predicted, zero_division=0)),
        "accuracy": float(accuracy_score(labels, predicted)),
    }


def confusion_matrix_at_threshold(y_true: Any, y_proba: Any, threshold: float) -> dict[str, int]:
    """TN/FP/FN/TP counts at ``threshold`` - reuses confusion_counts() above.

    WHY a wrapper rather than a new implementation: confusion_counts() is the
    M2 function whose label order ([0, 1]) is already tested; this only adds
    the probability -> flag step so callers with probabilities don't repeat it.
    """
    predicted = (_as_scores(y_proba) >= threshold).astype(int)
    return confusion_counts(_as_labels(y_true), predicted)


def evaluate_probabilities(y_true: Any, y_proba: Any, threshold: float) -> dict[str, Any]:
    """Return the full M4 metric set for one model on one split.

    WHAT: one dict with the threshold-free metrics (roc_auc, pr_auc, brier),
    the threshold metrics (precision/recall/f1/accuracy) and the confusion
    counts. WHERE it flows: seed_model_runs.py stores it as a run's `metrics`
    (+ `confusion_matrix`) document; the drift report calls it per chunk.
    """
    labels = _as_labels(y_true)
    scores = _as_scores(y_proba)
    result: dict[str, Any] = {
        "roc_auc": roc_auc(labels, scores),
        "pr_auc": pr_auc(labels, scores),
        "brier": brier_score(labels, scores),
    }
    result.update(metrics_at_threshold(labels, scores, threshold))
    result["confusion_matrix"] = confusion_matrix_at_threshold(labels, scores, threshold)
    result["n"] = int(len(labels))
    result["prevalence"] = float(labels.mean()) if len(labels) else None
    return result


# PSI bins never contain exactly zero rows in the formula below: ln(0) is -inf
# and a single empty bin would make the whole index infinite. Clipping to a
# tiny share is the standard workaround; 1e-4 is small enough not to move a
# real PSI by more than a rounding error.
_PSI_EPSILON = 1e-4

# Numeric columns with this many distinct values or fewer are binned by exact
# value (like a category) instead of by quantile. Two reasons: counts such as
# number_emergency are mostly 0, so quantile edges collapse onto the same
# number; and coded ids such as discharge_disposition_id (up to 28 codes) are
# categories stored as integers - code 11 is not "between" 10 and 12, so
# quantile ranges over them would be meaningless. Truly continuous columns
# here (num_lab_procedures, num_medications) have far more than 30 values.
_DISCRETE_MAX_LEVELS = 30


def population_stability_index(reference: Any, current: Any, bins: int = 10) -> float:
    """PSI between a reference sample (e.g. train) and a current sample (e.g. test).

    WHAT: PSI = sum over bins of (cur% - ref%) * ln(cur% / ref%). It measures
    how much a feature's *distribution* moved. Conventional reading (used by
    the drift report): < 0.1 stable, 0.1-0.2 moderate shift, > 0.2 significant
    shift worth investigating.
    HOW bins are built: numeric continuous -> quantile edges taken from the
    reference only (so the current sample is judged on the reference's
    yardstick, and the outer edges are open so new extremes still land in a
    bin); low-cardinality numeric or text -> one bin per distinct value seen
    in either sample (a category that only appears in `current` still counts
    as drift). Missing values get their own bin, since "more missing" is
    itself drift.
    """
    ref = pd.Series(reference).reset_index(drop=True)
    cur = pd.Series(current).reset_index(drop=True)
    if len(ref) == 0 or len(cur) == 0:
        raise ValueError("PSI needs a non-empty reference and current sample")

    is_numeric = pd.api.types.is_numeric_dtype(ref) and pd.api.types.is_numeric_dtype(cur)
    if is_numeric and ref.nunique(dropna=True) > _DISCRETE_MAX_LEVELS:
        # Continuous branch: interior edges from reference quantiles, outer
        # edges open-ended. np.unique drops duplicate edges from tied values.
        interior = np.unique(np.nanquantile(ref.astype(float), np.linspace(0, 1, bins + 1)[1:-1]))
        edges = np.concatenate(([-np.inf], interior, [np.inf]))
        # labels=False returns the bin *number* (0..k): the default Interval
        # labels would hold -inf/inf, which pandas warns about when cast to text.
        ref_bins = pd.Series(pd.cut(ref.astype(float), edges, labels=False)).astype(str)
        cur_bins = pd.Series(pd.cut(cur.astype(float), edges, labels=False)).astype(str)
    else:
        # Discrete branch: the value itself is the bin label.
        ref_bins = ref.astype(str)
        cur_bins = cur.astype(str)

    # Share of rows per bin, aligned on the union of bins so a bin present in
    # only one sample counts as 0% (then epsilon) on the other side.
    ref_share = ref_bins.value_counts(normalize=True)
    cur_share = cur_bins.value_counts(normalize=True)
    labels = ref_share.index.union(cur_share.index)
    expected = ref_share.reindex(labels, fill_value=0.0).clip(lower=_PSI_EPSILON).to_numpy()
    actual = cur_share.reindex(labels, fill_value=0.0).clip(lower=_PSI_EPSILON).to_numpy()
    return float(np.sum((actual - expected) * np.log(actual / expected)))


def psi_per_feature(
    reference: pd.DataFrame, current: pd.DataFrame, columns: list[str] | None = None
) -> dict[str, float]:
    """PSI for every column shared by both frames (or the given ``columns``).

    USE: drift_and_leakage_report.py calls this for train-vs-test and for
    each encounter_id chunk vs the first chunk, then flags values > 0.2.
    """
    selected = columns or [c for c in reference.columns if c in current.columns]
    return {
        column: population_stability_index(reference[column], current[column])
        for column in selected
    }


def ks_per_feature(
    reference: pd.DataFrame, current: pd.DataFrame, columns: list[str] | None = None
) -> dict[str, dict[str, float]]:
    """Two-sample Kolmogorov-Smirnov test for every numeric column.

    WHAT: KS statistic = the largest vertical gap between the two empirical
    CDFs (0 = identical distributions, 1 = no overlap at all), plus its
    p-value. WHY next to PSI: PSI depends on how bins are drawn, KS does not,
    so the two cross-check each other. CAVEAT the report spells out: with
    ~49k vs ~14k rows the p-value flags even tiny, clinically meaningless
    shifts as "significant", so the *statistic* is what is read, not p < 0.05.
    Text columns are skipped - KS needs an ordering, categories have none.
    """
    selected = columns or [c for c in reference.columns if c in current.columns]
    results: dict[str, dict[str, float]] = {}
    for column in selected:
        if not (
            pd.api.types.is_numeric_dtype(reference[column])
            and pd.api.types.is_numeric_dtype(current[column])
        ):
            continue
        ref = reference[column].dropna().astype(float)
        cur = current[column].dropna().astype(float)
        if len(ref) == 0 or len(cur) == 0:
            continue
        test = ks_2samp(ref, cur)
        results[column] = {"statistic": float(test.statistic), "p_value": float(test.pvalue)}
    return results


def roc_auc_bootstrap_ci(
    y_true: Any, y_proba: Any, n_boot: int = 500, confidence: float = 0.95, seed: int = 42
) -> tuple[float, float] | None:
    """Percentile bootstrap confidence interval for ROC-AUC.

    WHY: the drift report compares ROC-AUC across chunks of ~2,800 test rows
    (~250 readmissions each). At that size ROC-AUC moves by a couple of
    points from sampling alone, so a chunk "dropping" from 0.66 to 0.64 is
    only evidence of concept drift if it falls outside this interval.
    HOW: resample rows with replacement n_boot times, recompute ROC-AUC,
    take the middle `confidence` share of the results. Fixed seed so the
    report is reproducible run to run. Resamples with one class are skipped.
    """
    labels = _as_labels(y_true)
    scores = _as_scores(y_proba)
    if len(np.unique(labels)) < 2:
        return None
    rng = np.random.default_rng(seed)
    values = []
    for _ in range(n_boot):
        sample = rng.integers(0, len(labels), len(labels))
        if len(np.unique(labels[sample])) < 2:
            continue
        values.append(roc_auc_score(labels[sample], scores[sample]))
    tail = (1 - confidence) / 2 * 100
    low, high = np.percentile(values, [tail, 100 - tail])
    return float(low), float(high)


def subgroup_metrics(
    y_true: Any,
    y_proba: Any,
    groups: Any,
    threshold: float,
    min_size: int = 30,
) -> list[dict[str, Any]]:
    """Per-group metrics at the production threshold - the fairness check.

    WHAT: splits the rows by ``groups`` (e.g. the age, gender or race column
    of the test split) and scores each group separately: size, prevalence,
    ROC-AUC, recall, precision and false-positive rate. WHY: one overall
    recall of ~0.51 can hide a group whose readmissions are missed far more
    often; the model card reports these tables so that gap is visible.
    Groups smaller than ``min_size`` are kept but marked reliable=False
    (same rule as config cohorts.min_size) instead of being dropped, so a
    tiny group is never mistaken for a group that does not exist.
    """
    labels = _as_labels(y_true)
    scores = _as_scores(y_proba)
    keys = pd.Series(groups).astype(str).to_numpy()
    rows: list[dict[str, Any]] = []
    for key in sorted(set(keys)):
        mask = keys == key
        group_labels = labels[mask]
        group_scores = scores[mask]
        flags = (group_scores >= threshold).astype(int)
        negatives = int((group_labels == 0).sum())
        false_positives = int(((flags == 1) & (group_labels == 0)).sum())
        rows.append(
            {
                "group": key,
                "n": int(mask.sum()),
                "prevalence": float(group_labels.mean()),
                "roc_auc": roc_auc(group_labels, group_scores),
                "recall": float(recall_score(group_labels, flags, zero_division=0)),
                "precision": float(precision_score(group_labels, flags, zero_division=0)),
                # FPR = share of patients who were NOT readmitted but still got
                # flagged - the "extra follow-up workload" side of the trade-off.
                "false_positive_rate": false_positives / negatives if negatives else None,
                "flag_rate": float(flags.mean()),
                "reliable": bool(mask.sum() >= min_size),
            }
        )
    return rows


def patient_overlap(train_ids: Any, test_ids: Any) -> int:
    """Number of distinct patient ids present in BOTH splits.

    WHY: if one patient is in train and test, the model is tested on someone
    it has effectively already seen, and every test metric is inflated. The
    drift report requires this to be 0; the M4 tests assert it on the real
    split. Missing ids are ignored rather than matched to each other.
    """
    train = set(pd.Series(train_ids).dropna().tolist())
    test = set(pd.Series(test_ids).dropna().tolist())
    return len(train & test)
