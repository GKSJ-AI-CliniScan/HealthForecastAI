"""Subgroup performance audit for the readmission model.

Milestone 3, closing a gap recorded in the Milestone 2 report: the dataset
carries race and gender, and nobody had checked whether the model serves them
equally. A readmission model that under-flags one group sends fewer of those
patients to a discharge planner, which is a real harm and not a tuning detail.

What is measured, per group, on the held-out test split only:

  recall           of the patients who *were* readmitted, how many did the model
                   flag. This is the number that matters here - a missed
                   high-risk patient is the expensive error. Reported with a
                   Wilson interval, because a group with 40 positives has a very
                   wide one and a bare percentage would overstate what is known.
  precision        of the flagged, how many were readmitted.
  flagged rate     the share of the group the model sends for review.
  calibration      mean predicted probability against the observed rate. A model
                   can rank well and still be systematically too high or too low
                   for one group; that skews the forecast for that group.

What is deliberately not claimed: "fair". Equal recall, equal flag rates and
calibration cannot all hold at once when base rates differ, and choosing which
to prioritise is a clinical and ethical decision, not a statistical one. This
reports the gaps and how much statistical confidence there is in each.

Usage:
    python -m src.evaluation.fairness
"""

from __future__ import annotations

import argparse
import json
from typing import Any

import joblib
import numpy as np
import pandas as pd
from sklearn.metrics import roc_auc_score

from src.evaluation.metrics import wilson_interval
from src.models.train import prepare_data
from src.utils.config import load_config, resolve_path

MIN_GROUP_ROWS = 100  # below this a group is reported but never interpreted
MIN_GROUP_POSITIVES = 30  # below this a recall figure is too noisy to compare
ATTRIBUTES = ("gender", "race", "age_group")


def subgroup_metrics(
    y_true: np.ndarray, proba: np.ndarray, threshold: float, groups: pd.Series
) -> list[dict[str, Any]]:
    """Return one metrics row per distinct value of `groups`."""
    y_true = np.asarray(y_true)
    proba = np.asarray(proba)
    flagged = proba >= threshold
    labels = groups.fillna("Unknown").astype(str).to_numpy()

    rows: list[dict[str, Any]] = []
    for value in sorted(set(labels)):
        mask = labels == value
        n = int(mask.sum())
        positives = int(y_true[mask].sum())
        true_positive = int((flagged[mask] & (y_true[mask] == 1)).sum())
        flagged_n = int(flagged[mask].sum())
        negatives = n - positives
        false_positive = flagged_n - true_positive

        recall = true_positive / positives if positives else None
        low, high = wilson_interval(true_positive, positives) if positives else (None, None)

        observed = positives / n if n else 0.0
        obs_low, obs_high = wilson_interval(positives, n)
        predicted = float(proba[mask].mean()) if n else 0.0

        auc = None
        if positives >= 20 and negatives >= 20:
            auc = float(roc_auc_score(y_true[mask], proba[mask]))

        rows.append(
            {
                "group": value,
                "n": n,
                "positives": positives,
                "prevalence": round(observed, 4),
                "flagged_rate": round(flagged_n / n, 4) if n else 0.0,
                "recall": None if recall is None else round(recall, 4),
                "recall_ci": None if low is None else [round(low, 4), round(high, 4)],
                "precision": round(true_positive / flagged_n, 4) if flagged_n else None,
                "false_positive_rate": round(false_positive / negatives, 4) if negatives else None,
                "mean_predicted": round(predicted, 4),
                "observed_ci": [round(obs_low, 4), round(obs_high, 4)],
                "calibration_ratio": round(observed / predicted, 3) if predicted else None,
                "roc_auc": None if auc is None else round(auc, 4),
                "interpretable": n >= MIN_GROUP_ROWS and positives >= MIN_GROUP_POSITIVES,
            }
        )
    return rows


def equalising_cutoff(
    y_true: np.ndarray, proba: np.ndarray, target_recall: float
) -> dict[str, float] | None:
    """What cutoff would bring one group's recall up to a target, and at what cost.

    This is information for a governance decision, not a recommendation. Using a
    different cutoff per group means a patient's protected attribute changes the
    decision made about them, which is contested ethically and unlawful in some
    jurisdictions. It is reported because "the gap could be closed by flagging
    X% more of this group" is a fact the people deciding need in front of them.
    """
    y_true = np.asarray(y_true)
    proba = np.asarray(proba)
    positives = int(y_true.sum())
    if positives == 0:
        return None

    for cutoff in np.unique(np.round(proba, 4))[::-1]:
        flagged = proba >= cutoff
        true_positive = int((flagged & (y_true == 1)).sum())
        if true_positive / positives >= target_recall:
            flagged_n = int(flagged.sum())
            return {
                "cutoff": round(float(cutoff), 4),
                "flagged_rate": round(flagged_n / len(proba), 4),
                "precision": round(true_positive / flagged_n, 4),
            }
    return None


def summarise_attribute(
    rows: list[dict[str, Any]], overall_recall: float, overall_observed: float
) -> dict[str, Any]:
    """Reduce one attribute's rows to the findings a reader needs.

    A group is called out only when its interval excludes the overall figure -
    a point estimate that merely differs is not evidence of anything.
    """
    usable = [row for row in rows if row["interpretable"] and row["recall"] is not None]

    lower_recall: list[str] = []
    miscalibrated: list[str] = []
    for row in usable:
        low, high = row["recall_ci"]
        if high < overall_recall:
            lower_recall.append(row["group"])
        obs_low, obs_high = row["observed_ci"]
        if not obs_low <= row["mean_predicted"] <= obs_high:
            miscalibrated.append(row["group"])

    recalls = [row["recall"] for row in usable]
    return {
        "groups_compared": len(usable),
        "groups_too_small_to_interpret": [row["group"] for row in rows if not row["interpretable"]],
        "recall_range": [min(recalls), max(recalls)] if recalls else None,
        "recall_gap": round(max(recalls) - min(recalls), 4) if len(recalls) > 1 else None,
        "significantly_lower_recall": lower_recall,
        "miscalibrated": miscalibrated,
        "overall_recall": round(overall_recall, 4),
        "overall_observed_rate": round(overall_observed, 4),
    }


def audit(config: dict[str, Any], artifact: dict[str, Any]) -> dict[str, Any]:
    """Audit the deployed artifact on the held-out test split."""
    splits = prepare_data(config)
    estimator = artifact["pipeline"]
    threshold = float(artifact["decision_threshold"])

    y_true = np.asarray(splits.y_test)
    proba = estimator.predict_proba(splits.x_test)[:, 1]

    flagged = proba >= threshold
    positives = int(y_true.sum())
    overall_recall = float((flagged & (y_true == 1)).sum() / positives)
    overall_observed = float(y_true.mean())

    attributes: dict[str, Any] = {}
    for attribute in ATTRIBUTES:
        if attribute not in splits.x_test.columns:
            continue
        rows = subgroup_metrics(y_true, proba, threshold, splits.x_test[attribute])
        summary = summarise_attribute(rows, overall_recall, overall_observed)

        labels = splits.x_test[attribute].fillna("Unknown").astype(str).to_numpy()
        what_if: dict[str, Any] = {}
        for group in summary["significantly_lower_recall"]:
            mask = labels == group
            cutoff = equalising_cutoff(y_true[mask], proba[mask], overall_recall)
            current = next(row for row in rows if row["group"] == group)
            if cutoff:
                what_if[group] = {
                    **cutoff,
                    "current_flagged_rate": current["flagged_rate"],
                    "current_precision": current["precision"],
                }
        summary["what_if_equal_recall"] = what_if

        attributes[attribute] = {"rows": rows, "summary": summary}

    return {
        "model": f"{artifact.get('model_name')} v{artifact.get('model_version')}",
        "decision_threshold": threshold,
        "excluded_features": artifact.get("excluded_features", []),
        "test_rows": int(len(y_true)),
        "test_positives": positives,
        "overall": {
            "recall": round(overall_recall, 4),
            "observed_rate": round(overall_observed, 4),
            "mean_predicted": round(float(proba.mean()), 4),
        },
        "attributes": attributes,
        "method": (
            "Held-out test split only. Intervals are 95% Wilson. A group is called out "
            "only when its recall interval lies wholly below the overall recall, or "
            "its predicted mean lies outside the interval of its observed rate."
        ),
    }


def print_report(report: dict[str, Any]) -> None:
    """Print a readable summary of an audit."""
    print(f"Model: {report['model']}  threshold={report['decision_threshold']}")
    print(f"Excluded from the model: {report['excluded_features'] or 'nothing'}")
    print(
        f"Overall: recall={report['overall']['recall']}  "
        f"observed={report['overall']['observed_rate']}  "
        f"predicted={report['overall']['mean_predicted']}\n"
    )
    for attribute, block in report["attributes"].items():
        print(f"--- {attribute} ---")
        print(
            f"{'group':22} {'n':>6} {'pos':>5} {'recall':>7} {'95% CI':>15} {'flag%':>6} {'O/E':>6}"
        )
        for row in block["rows"]:
            ci = (
                "-"
                if row["recall_ci"] is None
                else f"{row['recall_ci'][0]:.2f}-{row['recall_ci'][1]:.2f}"
            )
            recall = "-" if row["recall"] is None else f"{row['recall']:.3f}"
            ratio = "-" if row["calibration_ratio"] is None else f"{row['calibration_ratio']:.2f}"
            note = "" if row["interpretable"] else "  (too small)"
            print(
                f"{row['group']:22} {row['n']:>6} {row['positives']:>5} {recall:>7} "
                f"{ci:>15} {row['flagged_rate'] * 100:>5.1f} {ratio:>6}{note}"
            )
        summary = block["summary"]
        print(
            f"  recall gap: {summary['recall_gap']}  | lower than overall: "
            f"{summary['significantly_lower_recall'] or 'none'}  | miscalibrated: "
            f"{summary['miscalibrated'] or 'none'}"
        )
        for group, info in summary.get("what_if_equal_recall", {}).items():
            print(
                f"  what-if {group}: matching overall recall needs cutoff {info['cutoff']} "
                f"(flag {info['current_flagged_rate'] * 100:.1f}% -> "
                f"{info['flagged_rate'] * 100:.1f}%, precision "
                f"{info['current_precision']} -> {info['precision']})"
            )
        print()


def main() -> None:
    """Command line entrypoint."""
    parser = argparse.ArgumentParser(description="Audit the model across patient subgroups")
    parser.add_argument("--config", default=None, help="Path to config.yaml")
    args = parser.parse_args()

    config = load_config(args.config)
    output_dir = resolve_path(config["artifacts"]["output_dir"])
    artifact_path = output_dir / config["artifacts"]["model_filename"]
    if not artifact_path.exists():
        raise SystemExit(f"No trained model at {artifact_path}. Run: python -m src.models.train")

    report = audit(config, joblib.load(artifact_path))
    (output_dir / "fairness.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
    print_report(report)
    print(f"Wrote {output_dir / 'fairness.json'}")


if __name__ == "__main__":
    main()
