"""Feature ablation: what does the model lose when an input is removed?

Milestone 3. Built to answer one question - does the model need race as an
input? - but written generally, because "is this feature earning its place" is a
question worth being able to ask cheaply and answer with numbers.

Each variant is trained by the same code path as the real model, on the same
split, so any difference is the feature and not the setup.

Usage:
    python -m src.evaluation.ablation                  # the default variants
    python -m src.evaluation.ablation race,gender      # a custom exclusion set
"""

from __future__ import annotations

import sys
from typing import Any

import numpy as np

from src.evaluation.fairness import subgroup_metrics
from src.models.train import fit_candidate, prepare_data
from src.utils.config import load_config

DEFAULT_VARIANTS: list[list[str]] = [[], ["race"], ["race", "gender"]]


def run_variant(
    config: dict[str, Any], splits: Any, exclude: list[str], model: str = "logistic_regression"
) -> dict[str, Any]:
    """Train one variant and return its headline and per-race numbers."""
    params = config["models"][model]
    fitted = fit_candidate(model, params, splits, config, exclude=exclude)

    rows = subgroup_metrics(
        np.asarray(splits.y_test),
        fitted.test_proba,
        fitted.threshold,
        splits.x_test["race"],
    )
    return {
        "excluded": exclude,
        "metrics": fitted.test_metrics,
        "threshold": fitted.threshold,
        "race_recall": {
            row["group"]: (row["recall"], row["recall_ci"], row["n"], row["positives"])
            for row in rows
        },
    }


def main() -> None:
    """Command line entrypoint."""
    config = load_config()
    variants = [[c for c in sys.argv[1].split(",") if c]] if len(sys.argv) > 1 else DEFAULT_VARIANTS

    splits = prepare_data(config)
    print(f"rows: test={len(splits.x_test)} positives={int(np.asarray(splits.y_test).sum())}\n")

    results = [run_variant(config, splits, exclude) for exclude in variants]

    print(
        f"{'excluded':18} {'roc_auc':>8} {'recall':>8} {'precision':>10} {'f1':>8} {'threshold':>10}"
    )
    for result in results:
        m = result["metrics"]
        label = ",".join(result["excluded"]) or "(none)"
        print(
            f"{label:18} {m['roc_auc']:>8.4f} {m['recall']:>8.4f} {m['precision']:>10.4f} "
            f"{m['f1']:>8.4f} {result['threshold']:>10.4f}"
        )

    print("\nRecall by race in each variant (recall [95% CI], positives):")
    groups = sorted({g for r in results for g in r["race_recall"]})
    header = f"{'race':18}" + "".join(
        f"{(','.join(r['excluded']) or '(none)'):>30}" for r in results
    )
    print(header)
    for group in groups:
        line = f"{group:18}"
        for result in results:
            recall, ci, _, positives = result["race_recall"].get(group, (None, None, 0, 0))
            cell = (
                "-" if recall is None else f"{recall:.3f} [{ci[0]:.2f}-{ci[1]:.2f}] n+={positives}"
            )
            line += f"{cell:>30}"
        print(line)

    if len(results) > 1:
        base = results[0]["metrics"]["roc_auc"]
        print("\nROC-AUC change against the first variant:")
        for result in results[1:]:
            delta = result["metrics"]["roc_auc"] - base
            print(f"  excluding {','.join(result['excluded']):14} {delta:+.4f}")


if __name__ == "__main__":
    main()
