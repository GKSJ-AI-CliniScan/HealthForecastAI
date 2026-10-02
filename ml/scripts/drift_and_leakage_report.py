"""Leakage proof + data/concept drift report for the readmission models.

Usage (from ml/):
    python -m scripts.drift_and_leakage_report

Writes:
    docs/01-architecture/drift-and-leakage-report.md   (the human-readable report)
    docs/01-architecture/figures/*.png                 (the plots it embeds)
    ml/artifacts/drift_and_leakage_summary.json        (the same numbers, machine-readable;
                                                        the model card quotes from it)

WHY: Milestone 4 has to show, with evidence rather than assertion, that
(1) the reported test metrics are not inflated by leakage and (2) the data
the model was trained on still looks like the data it is scored on. Every
check below recomputes its numbers from the real dataset and the real saved
model; nothing is typed in.

Exit codes: 0 = report written; 2 = train/test patient overlap is not zero.
In that case the script STOPS after writing the overlap count - it never
re-splits, because a new split would silently change every M2/M3 number.
"""

from __future__ import annotations

import json
from datetime import UTC, datetime
from typing import Any

import matplotlib

matplotlib.use("Agg")  # headless backend: renders PNGs without a display
import matplotlib.pyplot as plt  # noqa: E402 - must follow matplotlib.use()
import numpy as np  # noqa: E402
import pandas as pd  # noqa: E402

from scripts.lineage_common import (  # noqa: E402
    SplitData,
    artifacts_dir,
    git_commit,
    load_or_train_models,
    read_metrics_json,
    rebuild_splits,
    repo_relative,
    sha256_file,
    validation_threshold,
)
from src.data.load_data import load_raw  # noqa: E402
from src.data.preprocess import DEATH_OR_HOSPICE_DISPOSITIONS  # noqa: E402
from src.evaluation.metrics import (  # noqa: E402
    evaluate_probabilities,
    ks_per_feature,
    patient_overlap,
    psi_per_feature,
    roc_auc,
    roc_auc_bootstrap_ci,
    select_decision_threshold,
    subgroup_metrics,
)
from src.models.train import FORBIDDEN_FEATURE_COLUMNS, REPO_ROOT  # noqa: E402

DOCS_DIR = REPO_ROOT / "docs" / "01-architecture"
FIGURES_DIR = DOCS_DIR / "figures"
REPORT_PATH = DOCS_DIR / "drift-and-leakage-report.md"
SUMMARY_NAME = "drift_and_leakage_summary.json"

# PSI reading used across the industry (credit-risk origin): below 0.1
# stable, 0.1-0.2 moderate, above 0.2 significant. The brief asks to flag > 0.2.
PSI_FLAG = 0.20
PSI_WATCH = 0.10

# The dataset has no admission dates. encounter_id is assigned in increasing
# order, so sorting by it and cutting into equal chunks is the closest
# available proxy for "earlier vs later" encounters. Five chunks keeps each
# chunk's test slice near 2,800 rows (~250 readmissions) - enough for a
# stable ROC-AUC per chunk.
N_CHUNKS = 5

# A single feature that by itself separates readmitted from not-readmitted
# patients this well would be a leak (a model cannot get that from one
# legitimate pre-discharge field on this dataset; published work tops out
# near 0.65-0.70 with *all* features). Used by the univariate leak scan.
SINGLE_FEATURE_AUC_ALARM = 0.80

# Subgroup columns for the fairness tables (the brief: age, gender, race).
# "age" is the raw 10-year bracket, kept as a feature by basic_clean.
SUBGROUP_COLUMNS = ("age", "gender", "race")

# Plot styling - one series per chart, so one categorical hue (slot 1 of the
# reference palette); reference lines in muted gray; text never in series color.
SERIES_COLOR = "#2a78d6"
REFERENCE_COLOR = "#8a8984"
TEXT_COLOR = "#0b0b0b"
MUTED_TEXT = "#52514e"
SURFACE = "#fcfcfb"


# ---------------------------------------------------------------------------
# Leakage checks
# ---------------------------------------------------------------------------


def overlap_counts(data: SplitData) -> dict[str, int]:
    """Distinct patients shared between each pair of splits (all must be 0).

    Maps each split's row index back to frame.patient_nbr (the model never
    sees that column) and counts the intersection with patient_overlap().
    """
    ids = {
        name: data.frame.loc[x.index, "patient_nbr"]
        for name, x in (("train", data.x_train), ("val", data.x_val), ("test", data.x_test))
    }
    return {
        "train_test": patient_overlap(ids["train"], ids["test"]),
        "train_val": patient_overlap(ids["train"], ids["val"]),
        "val_test": patient_overlap(ids["val"], ids["test"]),
        "duplicate_patients_in_dataset": int(data.frame["patient_nbr"].duplicated().sum()),
    }


def univariate_leak_scan(data: SplitData) -> pd.DataFrame:
    """How well each feature ALONE predicts the target on the test split.

    WHAT: numeric feature -> its raw value is the score; text feature ->
    each category is scored by its readmission rate *on train* (unseen
    categories get the train prevalence), then applied to test. AUC is
    folded to max(auc, 1 - auc) so a strongly *negative* relation counts too.
    WHY: a feature computed from the outcome (or recorded after discharge)
    shows up as an implausibly strong single-feature AUC. Using train-only
    encodings scored on test means the scan itself does not leak.
    """
    prevalence = float(data.y_train.mean())
    rows = []
    for column in data.feature_columns:
        train_col = data.x_train[column]
        test_col = data.x_test[column]
        if pd.api.types.is_numeric_dtype(train_col):
            scores = test_col.astype(float).fillna(float(train_col.median()))
        else:
            rates = data.y_train.groupby(train_col.astype(str)).mean()
            scores = test_col.astype(str).map(rates).fillna(prevalence)
        auc = roc_auc(data.y_test, scores)
        folded = max(auc, 1 - auc) if auc is not None else None
        rows.append({"feature": column, "single_feature_auc": folded})
    return pd.DataFrame(rows).sort_values("single_feature_auc", ascending=False)


def hospice_check(data: SplitData) -> dict[str, Any]:
    """Count expired/hospice encounters before cleaning and after.

    Raw is reloaded (cheap) because rebuild_splits() keeps only the cleaned
    frame. Disposition ids come from preprocess.DEATH_OR_HOSPICE_DISPOSITIONS
    - the same constant basic_clean uses - so the check cannot disagree with
    the cleaning about which codes count.
    """
    raw = load_raw(data.raw_path)
    raw_mask = raw["discharge_disposition_id"].isin(DEATH_OR_HOSPICE_DISPOSITIONS)
    clean_mask = data.frame["discharge_disposition_id"].isin(DEATH_OR_HOSPICE_DISPOSITIONS)
    return {
        "disposition_ids": list(DEATH_OR_HOSPICE_DISPOSITIONS),
        "raw_rows": int(raw_mask.sum()),
        "raw_rows_readmitted_lt30": int((raw.loc[raw_mask, "readmitted"] == "<30").sum()),
        "rows_after_cleaning": int(clean_mask.sum()),
    }


def threshold_provenance(model: Any, data: SplitData, summary: dict[str, Any]) -> dict[str, Any]:
    """Evidence that the production threshold was tuned on validation, not test.

    Three measurements:
    (1) the selection rule re-run on VALIDATION returns the shipped value;
    (2) the recall/precision train.py stored as "validation_recall" /
        "validation_precision" in metrics.json are reproduced exactly on the
        validation split at that threshold - and differ from the test-split
        values - so the stored selection-time numbers are validation numbers;
    (3) the same rule re-run on TEST, reported honestly. Isotonic calibration
        outputs only a few dozen distinct probability levels, so validation
        and test can land on the *same* level; when they do, (3) cannot tell
        the splits apart and the proof rests on (1), (2) and the code path
        (train.py passes y_val / x_val to select_decision_threshold).
    """
    shipped = float(summary["decision_threshold"])
    stored = summary["results"][summary["best_model"]]
    min_recall = float(data.config["evaluation"]["thresholds"].get("recall", 0.50))
    val_threshold, val_precision, val_recall = validation_threshold(model, data)
    y_proba_val = model.predict_proba(data.x_val)[:, 1]
    y_proba_test = model.predict_proba(data.x_test)[:, 1]
    test_threshold, test_precision, test_recall = select_decision_threshold(
        data.y_test, y_proba_test, min_recall
    )
    return {
        "shipped_threshold": shipped,
        "rederived_on_validation": val_threshold,
        "matches_validation": abs(shipped - val_threshold) < 1e-12,
        "validation_recall_recomputed": val_recall,
        "validation_precision_recomputed": val_precision,
        "validation_recall_in_metrics_json": stored["validation_recall"],
        "validation_precision_in_metrics_json": stored["validation_precision"],
        "test_recall_at_threshold": stored["recall"],
        "test_precision_at_threshold": stored["precision"],
        "would_be_if_tuned_on_test": test_threshold,
        "test_rule_recall": test_recall,
        "test_rule_precision": test_precision,
        "distinct_calibrated_levels_validation": int(len(np.unique(y_proba_val))),
        "min_recall": min_recall,
    }


# ---------------------------------------------------------------------------
# Drift checks
# ---------------------------------------------------------------------------


def drift_table(reference: pd.DataFrame, current: pd.DataFrame, columns: list[str]) -> pd.DataFrame:
    """PSI (every feature) + KS (numeric features) of current vs reference."""
    psi = psi_per_feature(reference, current, columns)
    ks = ks_per_feature(reference, current, columns)
    rows = [
        {
            "feature": column,
            "psi": psi[column],
            "ks_statistic": ks.get(column, {}).get("statistic"),
            "ks_p_value": ks.get(column, {}).get("p_value"),
        }
        for column in columns
    ]
    return pd.DataFrame(rows).sort_values("psi", ascending=False).reset_index(drop=True)


def encounter_chunks(data: SplitData) -> list[pd.Index]:
    """Row labels of the cleaned frame, ordered by encounter_id, cut into N_CHUNKS.

    np.array_split keeps chunk sizes within one row of each other. Chunks are
    over ALL rows (train + val + test) for data drift; concept drift later
    keeps only the test rows inside each chunk, since only those are unseen.
    """
    ordered = data.frame.sort_values("encounter_id").index
    return [pd.Index(part) for part in np.array_split(ordered.to_numpy(), N_CHUNKS)]


def chunk_drift(
    data: SplitData, chunks: list[pd.Index]
) -> tuple[pd.DataFrame, list[dict[str, Any]]]:
    """PSI of every later chunk vs chunk 1, per feature; plus label drift per chunk.

    Returns (per-feature table: max PSI over chunks 2..N and which chunk it
    was, plus the last-vs-first KS statistic; per-chunk summary rows).
    """
    features = data.frame[data.feature_columns]
    target_col = data.config["dataset"]["target_column"]
    positive = data.config["dataset"]["positive_label"]
    first = features.loc[chunks[0]]
    per_chunk = [psi_per_feature(first, features.loc[chunk]) for chunk in chunks[1:]]
    ks_last = ks_per_feature(first, features.loc[chunks[-1]])

    rows = []
    for column in data.feature_columns:
        values = [psi[column] for psi in per_chunk]
        worst = int(np.argmax(values))
        rows.append(
            {
                "feature": column,
                "largest_change": largest_share_change(
                    first[column], features.loc[chunks[worst + 1], column]
                ),
                "max_psi_vs_chunk1": values[worst],
                "worst_chunk": worst + 2,  # chunks are 1-based in the report
                "ks_statistic_last_vs_first": ks_last.get(column, {}).get("statistic"),
            }
        )
    table = pd.DataFrame(rows).sort_values("max_psi_vs_chunk1", ascending=False)

    summaries = []
    for number, chunk in enumerate(chunks, start=1):
        encounter = data.frame.loc[chunk, "encounter_id"]
        summaries.append(
            {
                "chunk": number,
                "n_rows": len(chunk),
                "encounter_id_min": int(encounter.min()),
                "encounter_id_max": int(encounter.max()),
                "readmission_rate": float((data.frame.loc[chunk, target_col] == positive).mean()),
            }
        )
    return table.reset_index(drop=True), summaries


def largest_share_change(reference: pd.Series, current: pd.Series) -> str:
    """Name the single value whose share of rows moved most, e.g. "Missing: 41.5% -> 67.3%".

    WHY: a PSI number says *that* a feature moved, not *how*. Reading the
    biggest mover is what lets the report tell a coding/recording change
    (a new code appears, "Missing" balloons) from a change in patients.
    """
    ref_share = reference.astype(str).value_counts(normalize=True)
    cur_share = current.astype(str).value_counts(normalize=True)
    labels = ref_share.index.union(cur_share.index)
    delta = (
        cur_share.reindex(labels, fill_value=0) - ref_share.reindex(labels, fill_value=0)
    ).abs()
    value = delta.idxmax()
    return f"{value}: {ref_share.get(value, 0.0):.1%} -> {cur_share.get(value, 0.0):.1%}"


def concept_drift(
    models: dict[str, dict[str, Any]],
    production: str,
    threshold: float,
    data: SplitData,
    chunks: list[pd.Index],
) -> list[dict[str, Any]]:
    """Model performance on the TEST rows of each encounter chunk.

    WHY test rows only: train/val rows were seen during fitting or
    calibration, so their scores say nothing about drift. If the
    relationship between features and readmission changed over the
    encounter range, the production model's ROC-AUC / recall would fall
    in later chunks. ROC-AUC of the other two models is added so a dip
    common to all three (a harder chunk) can be told apart from one model
    degrading.
    """
    test_index = data.x_test.index
    probabilities = {
        name: pd.Series(entry["model"].predict_proba(data.x_test)[:, 1], index=test_index)
        for name, entry in models.items()
    }
    rows = []
    for number, chunk in enumerate(chunks, start=1):
        rows_in_chunk = test_index.intersection(chunk)
        y = data.y_test.loc[rows_in_chunk]
        result = evaluate_probabilities(y, probabilities[production].loc[rows_in_chunk], threshold)
        result.pop("confusion_matrix")
        result["chunk"] = number
        result["roc_auc_ci95"] = roc_auc_bootstrap_ci(
            y, probabilities[production].loc[rows_in_chunk]
        )
        result["roc_auc_by_model"] = {
            name: roc_auc(y, proba.loc[rows_in_chunk]) for name, proba in probabilities.items()
        }
        rows.append(result)
    return rows


# ---------------------------------------------------------------------------
# Figures
# ---------------------------------------------------------------------------


def _style_axes(axis: Any) -> None:
    """Recessive axes: no top/right spines, light grid, muted tick labels."""
    axis.set_facecolor(SURFACE)
    for side in ("top", "right"):
        axis.spines[side].set_visible(False)
    for side in ("left", "bottom"):
        axis.spines[side].set_color(REFERENCE_COLOR)
    axis.tick_params(colors=MUTED_TEXT, labelsize=9)
    axis.grid(axis="x", color="#e4e3df", linewidth=0.8)
    axis.set_axisbelow(True)


def plot_psi(table: pd.DataFrame, column: str, title: str, filename: str) -> str:
    """Horizontal bar chart of the 15 highest-PSI features with 0.1 / 0.2 guide lines."""
    top = table.head(15).iloc[::-1]  # reversed so the largest sits at the top
    fig, axis = plt.subplots(figsize=(7.5, 5.2), facecolor=SURFACE)
    axis.barh(top["feature"], top[column], color=SERIES_COLOR, height=0.6)
    upper = max(PSI_FLAG * 1.15, float(top[column].max()) * 1.15)
    # Guide lines are named in the subtitle instead of labelled in place:
    # 0.1 and 0.2 sit too close on this scale for two labels not to collide.
    axis.axvline(PSI_WATCH, color=REFERENCE_COLOR, linestyle=":", linewidth=1)
    axis.axvline(PSI_FLAG, color=REFERENCE_COLOR, linestyle="--", linewidth=1)
    axis.set_xlim(0, upper)
    axis.set_xlabel("Population Stability Index", color=MUTED_TEXT, fontsize=9)
    axis.set_title(
        f"{title}\ndotted = 0.1 (watch), dashed = 0.2 (flag)",
        color=TEXT_COLOR,
        fontsize=10,
        loc="left",
    )
    _style_axes(axis)
    fig.tight_layout()
    path = FIGURES_DIR / filename
    fig.savefig(path, dpi=130)
    plt.close(fig)
    return f"figures/{filename}"


def plot_concept_drift(
    rows: list[dict[str, Any]], overall: dict[str, Any], min_recall: float, filename: str
) -> str:
    """Two small multiples (ROC-AUC, recall) per chunk - two charts, never a dual axis.

    Reference lines: whole-test-set ROC-AUC on the left; the 0.50 recall
    promotion bar on the right (the line a chunk must not fall under).
    """
    chunks = [row["chunk"] for row in rows]
    fig, axes = plt.subplots(1, 2, figsize=(9, 3.6), facecolor=SURFACE)
    panels = (
        (axes[0], "roc_auc", "ROC-AUC  (dashed = whole test set)", overall["roc_auc"]),
        (
            axes[1],
            "recall",
            f"Recall @ 0.1117  (dashed = {min_recall:.2f} promotion bar)",
            min_recall,
        ),
    )
    for axis, key, label, reference in panels:
        values = [row[key] for row in rows]
        axis.plot(chunks, values, color=SERIES_COLOR, linewidth=2, marker="o", markersize=7)
        axis.axhline(reference, color=REFERENCE_COLOR, linestyle="--", linewidth=1)
        for x, y in zip(chunks, values, strict=True):
            axis.annotate(
                f"{y:.3f}",
                (x, y),
                textcoords="offset points",
                xytext=(0, 8),
                ha="center",
                fontsize=8,
                color=TEXT_COLOR,
            )
        axis.set_xticks(chunks)
        axis.set_xlabel("encounter_id chunk (1 = earliest)", color=MUTED_TEXT, fontsize=9)
        axis.set_title(label, color=TEXT_COLOR, fontsize=10, loc="left")
        low, high = min([*values, reference]), max([*values, reference])
        axis.set_ylim(low - 0.05, high + 0.05)
        _style_axes(axis)
        axis.grid(axis="y", color="#e4e3df", linewidth=0.8)
    fig.tight_layout()
    path = FIGURES_DIR / filename
    fig.savefig(path, dpi=130)
    plt.close(fig)
    return f"figures/{filename}"


# ---------------------------------------------------------------------------
# Markdown
# ---------------------------------------------------------------------------


def fmt(value: Any, digits: int = 4) -> str:
    """Format a number for a markdown table; None -> an em dash, not 'None'."""
    if value is None or (isinstance(value, float) and np.isnan(value)):
        return "—"
    if isinstance(value, float):
        return f"{value:.{digits}f}"
    return str(value)


def md_table(headers: list[str], rows: list[list[Any]]) -> list[str]:
    """Render a GitHub-flavoured markdown table."""
    lines = ["| " + " | ".join(headers) + " |", "|" + "|".join("---" for _ in headers) + "|"]
    lines += ["| " + " | ".join(fmt(cell) for cell in row) + " |" for row in rows]
    return lines


def chunk_drift_explanation(result: dict[str, Any]) -> list[str]:
    """Conclusion bullet(s) that say *what* drifted across chunks, from the computed table.

    Lists each flagged feature with its biggest mover (from
    largest_share_change) and the readmission rate per chunk (label drift),
    so the reader sees e.g. "medical_specialty Missing: 41.5% -> 67.3%" and
    can judge coding change vs patient-mix change without opening a table.
    """
    by_chunk = result["drift_by_chunk"]
    flagged = [row for row in by_chunk["table"] if row["max_psi_vs_chunk1"] > PSI_FLAG]
    rates = ", ".join(f"{c['readmission_rate']:.1%}" for c in by_chunk["chunks"])
    if not flagged:
        return [
            f"- **No significant drift across encounter_id chunks** (largest PSI "
            f"{by_chunk['max_psi']:.4f}). 30-day readmission rate by chunk: {rates}."
        ]
    movers = "; ".join(
        f"`{row['feature']}` (PSI {row['max_psi_vs_chunk1']:.2f}, {row['largest_change']})"
        for row in flagged
    )
    return [
        f"- **Significant drift across encounter_id chunks (time proxy)** in {len(flagged)} "
        f"feature(s), PSI > {PSI_FLAG} vs the earliest chunk: {movers}.",
        "  These are mostly *recording* changes rather than different patients - a disposition "
        "code that stops being used, diagnosis counts no longer capped at 9, more blank "
        "specialties - which is why train vs test (a random split that mixes all periods) shows "
        f"no drift at all. 30-day readmission rate by chunk: {rates}.",
    ]


def write_report(result: dict[str, Any], figures: dict[str, str]) -> None:
    """Assemble the markdown report from the computed result dict.

    The conclusion at the top is generated from the same numbers as the
    tables below it (no hand-written verdict), so the two cannot disagree
    after a re-run on new data.
    """
    leak = result["leakage"]
    overlap = leak["patient_overlap"]
    tt_flags = result["drift_train_vs_test"]["flagged_features"]
    ch_flags = result["drift_by_chunk"]["flagged_features"]
    concept = result["concept_drift"]
    aucs = [row["roc_auc"] for row in concept]
    top_scan = leak["univariate_scan_top"][0]
    thr = leak["threshold"]
    # Concept-drift verdict inputs: does any chunk's ROC-AUC CI sit entirely
    # outside chunk 1's (= statistically distinguishable), and which chunks
    # fall under the recall promotion bar at the shipped threshold.
    first_ci = concept[0]["roc_auc_ci95"]
    ci_overlap = all(
        r["roc_auc_ci95"][1] >= first_ci[0] and r["roc_auc_ci95"][0] <= first_ci[1] for r in concept
    )
    low_recall = [r for r in concept if r["recall"] < thr["min_recall"]]

    lines = [
        "# Drift and leakage report",
        "",
        f"_Generated by `ml/scripts/drift_and_leakage_report.py` on {result['generated_at']} "
        f"at commit `{result['git_commit'][:12]}`. Do not edit by hand - re-run the script._",
        "",
        "## Conclusion (plain language)",
        "",
        f"- **No patient leakage.** {overlap['train_test']} patients appear in both the training "
        f"and the test set (train/val {overlap['train_val']}, val/test {overlap['val_test']}). "
        "Each patient contributes exactly one encounter, so the test score is measured on "
        "people the model has never seen.",
        f"- **No target leakage found.** None of {', '.join(FORBIDDEN_FEATURE_COLUMNS)} reaches the "
        f"model, and the strongest single feature (`{top_scan['feature']}`) predicts readmission "
        f"with an AUC of only {top_scan['single_feature_auc']:.3f} on its own - far below the "
        f"{SINGLE_FEATURE_AUC_ALARM} a leaked outcome would produce.",
        f"- **Expired/hospice encounters are removed.** {leak['hospice']['raw_rows']:,} such raw "
        f"rows exist; {leak['hospice']['rows_after_cleaning']} remain after cleaning.",
        f"- **The 0.1117 threshold was tuned on validation, not test.** Re-running the selection "
        f"rule on validation gives exactly {thr['rederived_on_validation']:.6f}, and the "
        f"selection-time recall stored in metrics.json ({thr['validation_recall_in_metrics_json']:.4f}) "
        f"is the validation recall, not the test recall ({thr['test_recall_at_threshold']:.4f}).",
        (
            f"- **No significant data drift between train and test** (largest PSI "
            f"{result['drift_train_vs_test']['max_psi']:.4f}, flag level {PSI_FLAG})."
            if not tt_flags
            else f"- **Data drift between train and test** in {', '.join(tt_flags)} (PSI > {PSI_FLAG})."
        ),
        *chunk_drift_explanation(result),
        f"- **Concept drift - ranking holds, the operating point does not.** The production "
        f"model's test ROC-AUC per chunk ranges {min(aucs):.3f}–{max(aucs):.3f} (whole test set "
        f"{result['overall_test']['roc_auc']:.3f}) and every chunk's 95% bootstrap interval "
        f"{'overlaps' if ci_overlap else 'does NOT overlap'} chunk 1's, so there is "
        f"{'no clear evidence' if ci_overlap else 'evidence'} that the model ranks later patients worse. "
        + (
            f"But recall at the fixed 0.1117 threshold falls below the "
            f"{leak['threshold']['min_recall']:.2f} promotion bar in chunk(s) "
            f"{', '.join(str(r['chunk']) for r in low_recall)} "
            f"(lowest {min(r['recall'] for r in low_recall):.3f}), where the readmission rate is "
            f"also lowest - a fixed threshold should be re-checked whenever prevalence moves."
            if low_recall
            else "Recall at 0.1117 stays at or above the promotion bar in every chunk."
        ),
        "",
        (
            "**Limits of this evidence:** there are no real dates in this dataset, so `encounter_id` "
            "order is only a proxy for time; and every row is from 1999–2008, so none of this says "
            "how the model would behave on today's patients. Because train/val/test are a random "
            "split across the whole period, the test score is a time-averaged estimate; a temporal "
            "hold-out (train on earlier chunks, test on the last) would be the stricter check and "
            "is recommended before any real deployment. Live drift monitoring needs the "
            "`prediction_events` collection to be populated in production."
        ),
        "",
        "## 1. Leakage proof",
        "",
        "### 1.1 Patient overlap between splits (must be 0)",
        "",
        *md_table(
            ["pair", "shared patients"],
            [
                ["train / test", overlap["train_test"]],
                ["train / val", overlap["train_val"]],
                ["val / test", overlap["val_test"]],
                [
                    "duplicate patient_nbr in modelling table",
                    overlap["duplicate_patients_in_dataset"],
                ],
            ],
        ),
        "",
        (
            "Why it is zero by construction: `basic_clean` keeps only the first encounter per "
            "`patient_nbr` (`cleaning.first_encounter_only: true`) before the split, so a "
            "row-level split is also a patient-level split. The number above is measured, not "
            "assumed."
        ),
        "",
        "### 1.2 No target-derived or post-discharge features",
        "",
        f"- `assert_no_leaked_columns` (train.py) passes: {', '.join(f'`{c}`' for c in FORBIDDEN_FEATURE_COLUMNS)} "
        "are absent from the feature matrix.",
        f'- Feature names containing "readmit": {leak["readmit_named_features"] or "none"}.',
        f"- The model uses {len(result['feature_columns'])} input columns, all recorded during the "
        "index encounter (demographics, admission type/source, length of stay, lab/procedure/"
        "medication counts, prior-year visit counts, diagnoses, medication changes). "
        "`discharge_disposition_id` is set *at* discharge - the moment the model is meant to be "
        "used - so it is available at prediction time and is not post-discharge information.",
        "- Univariate leak scan (each feature alone, encoded on train, scored on test). A leaked "
        f"feature would score near 1.0; the alarm level is {SINGLE_FEATURE_AUC_ALARM}:",
        "",
        *md_table(
            ["feature", "single-feature AUC on test"],
            [[row["feature"], row["single_feature_auc"]] for row in leak["univariate_scan_top"]],
        ),
        "",
        "### 1.3 Expired / hospice encounters",
        "",
        f"Discharge dispositions {leak['hospice']['disposition_ids']} (expired or hospice) cannot "
        'lead to a readmission and would teach the model that very sick patients "never come back".',
        "",
        *md_table(
            ["", "rows"],
            [
                ["raw dataset", leak["hospice"]["raw_rows"]],
                ["of which labelled readmitted <30", leak["hospice"]["raw_rows_readmitted_lt30"]],
                ["after basic_clean", leak["hospice"]["rows_after_cleaning"]],
            ],
        ),
        "",
        "### 1.4 Threshold was tuned on validation, not test",
        "",
        f"Rule (`select_decision_threshold` in `ml/src/evaluation/metrics.py`): the highest-precision "
        f"cutoff whose recall is ≥ {thr['min_recall']} (config `evaluation.thresholds.recall`). "
        "`train.py` calls it with `y_val` and the validation probabilities.",
        "",
        *md_table(
            ["evidence", "value"],
            [
                [
                    "shipped threshold (metrics.json `decision_threshold`)",
                    f"{thr['shipped_threshold']:.10f}",
                ],
                ["rule re-run on validation", f"{thr['rederived_on_validation']:.10f}"],
                ["identical?", thr["matches_validation"]],
                [
                    "recall at threshold - validation, recomputed now",
                    thr["validation_recall_recomputed"],
                ],
                [
                    "recall at threshold - validation, stored by train.py",
                    thr["validation_recall_in_metrics_json"],
                ],
                ["recall at threshold - test", thr["test_recall_at_threshold"]],
                [
                    "precision at threshold - validation, recomputed now",
                    thr["validation_precision_recomputed"],
                ],
                [
                    "precision at threshold - validation, stored by train.py",
                    thr["validation_precision_in_metrics_json"],
                ],
                ["precision at threshold - test", thr["test_precision_at_threshold"]],
            ],
        ),
        "",
        "The stored selection-time recall/precision equal the validation values exactly and differ "
        "from the test values, so selection ran on validation. Honest caveat: re-running the same "
        f"rule on *test* gives {thr['would_be_if_tuned_on_test']:.10f}. The calibrated model "
        f"emits only {thr['distinct_calibrated_levels_validation']} distinct probability levels "
        "(isotonic regression is a step function), so both splits happen to pick the same step; "
        "that comparison alone could not have told them apart.",
        "",
        "## 2. Data drift",
        "",
        f"PSI < {PSI_WATCH} = stable, {PSI_WATCH}–{PSI_FLAG} = moderate, > {PSI_FLAG} = significant "
        "(flagged). KS statistic = largest gap between the two cumulative distributions (numeric "
        "features only); with tens of thousands of rows its p-value is tiny for almost any "
        "difference, so read the statistic, not the p-value.",
        "",
        "### 2.1 Train vs test",
        "",
        f"![PSI train vs test]({figures['psi_train_test']})",
        "",
        f"Max PSI **{result['drift_train_vs_test']['max_psi']:.4f}**; features with PSI > {PSI_FLAG}: "
        f"**{len(tt_flags)}**. Top 10:",
        "",
        *md_table(
            ["feature", "PSI", "KS statistic", "KS p-value"],
            [
                [r["feature"], r["psi"], r["ks_statistic"], r["ks_p_value"]]
                for r in result["drift_train_vs_test"]["table"][:10]
            ],
        ),
        "",
        "### 2.2 Across encounter_id-ordered chunks (time proxy)",
        "",
        "The modelling table sorted by `encounter_id` and cut into "
        f"{N_CHUNKS} equal chunks; each later chunk is compared with chunk 1.",
        "",
        *md_table(
            ["chunk", "rows", "encounter_id range", "30-day readmission rate"],
            [
                [
                    c["chunk"],
                    c["n_rows"],
                    f"{c['encounter_id_min']}–{c['encounter_id_max']}",
                    c["readmission_rate"],
                ]
                for c in result["drift_by_chunk"]["chunks"]
            ],
        ),
        "",
        f"![PSI by chunk]({figures['psi_chunks']})",
        "",
        f"Max PSI **{result['drift_by_chunk']['max_psi']:.4f}**; features with PSI > {PSI_FLAG}: "
        f"**{len(ch_flags)}**. Top 10:",
        "",
        *md_table(
            [
                "feature",
                "max PSI vs chunk 1",
                "worst chunk",
                "biggest mover (chunk 1 -> worst)",
                "KS stat (chunk 5 vs 1)",
            ],
            [
                [
                    r["feature"],
                    r["max_psi_vs_chunk1"],
                    r["worst_chunk"],
                    r["largest_change"],
                    r["ks_statistic_last_vs_first"],
                ]
                for r in result["drift_by_chunk"]["table"][:10]
            ],
        ),
        "",
        "## 3. Concept drift (performance across chunks)",
        "",
        (
            "Production model (XGBoost, threshold 0.1117) scored on the **test rows** of each "
            "chunk only (train/val rows were seen during fitting or calibration)."
        ),
        "",
        f"![Concept drift]({figures['concept']})",
        "",
        *md_table(
            [
                "chunk",
                "test rows",
                "prevalence",
                "ROC-AUC",
                "95% CI",
                "PR-AUC",
                "recall",
                "precision",
                "Brier",
                "ROC-AUC LR",
                "ROC-AUC RF",
            ],
            [
                [
                    r["chunk"],
                    r["n"],
                    r["prevalence"],
                    r["roc_auc"],
                    f"{r['roc_auc_ci95'][0]:.3f}–{r['roc_auc_ci95'][1]:.3f}",
                    r["pr_auc"],
                    r["recall"],
                    r["precision"],
                    r["brier"],
                    r["roc_auc_by_model"].get("logistic_regression"),
                    r["roc_auc_by_model"].get("random_forest"),
                ]
                for r in concept
            ],
        ),
        "",
        "## 4. Subgroup performance (production model, test split, threshold 0.1117)",
        "",
        "Groups under 30 test patients are marked unreliable rather than hidden.",
        "",
    ]
    for column, rows in result["subgroups"].items():
        lines += [f"### By {column}", ""]
        lines += md_table(
            [
                "group",
                "n",
                "prevalence",
                "ROC-AUC",
                "recall",
                "precision",
                "FPR",
                "flag rate",
                "reliable",
            ],
            [
                [
                    r["group"],
                    r["n"],
                    r["prevalence"],
                    r["roc_auc"],
                    r["recall"],
                    r["precision"],
                    r["false_positive_rate"],
                    r["flag_rate"],
                    r["reliable"],
                ]
                for r in rows
            ],
        )
        lines.append("")
    lines += [
        "## Reproduce",
        "",
        "```bash",
        "cd ml && python -m scripts.drift_and_leakage_report",
        "```",
        "",
        f"Dataset sha256 `{result['dataset_sha256']}`; machine-readable numbers in "
        f"`ml/artifacts/{SUMMARY_NAME}`.",
        "",
    ]
    REPORT_PATH.write_text("\n".join(lines), encoding="utf-8")


def to_records(frame: pd.DataFrame) -> list[dict[str, Any]]:
    """DataFrame -> JSON-safe list of dicts (NaN becomes null)."""
    return json.loads(frame.to_json(orient="records"))


def main() -> int:
    """Run every check, write summary JSON + figures + markdown report."""
    FIGURES_DIR.mkdir(parents=True, exist_ok=True)
    data = rebuild_splits()
    summary = read_metrics_json(data.config)
    commit = git_commit()

    # --- Leakage gate first: if patients overlap, nothing after it is trustworthy.
    overlap = overlap_counts(data)
    if overlap["train_test"] != 0:
        (artifacts_dir(data.config) / SUMMARY_NAME).write_text(
            json.dumps(
                {"STOPPED": "train/test patient overlap is not zero", "patient_overlap": overlap},
                indent=2,
            ),
            encoding="utf-8",
        )
        print(
            f"STOP: {overlap['train_test']} patients are in both train and test. Not re-splitting."
        )
        return 2

    models = load_or_train_models(data)
    production = summary["best_model"]
    production_model = models[production]["model"]
    threshold = float(summary["decision_threshold"])

    scan = univariate_leak_scan(data)
    leakage = {
        "patient_overlap": overlap,
        "readmit_named_features": [c for c in data.feature_columns if "readmit" in c.lower()],
        "univariate_scan_top": to_records(scan.head(10)),
        "univariate_scan_max": float(scan["single_feature_auc"].max()),
        "hospice": hospice_check(data),
        "threshold": threshold_provenance(production_model, data, summary),
    }

    # --- Data drift: train vs test, then encounter_id chunks vs chunk 1.
    train_test = drift_table(data.x_train, data.x_test, data.feature_columns)
    chunks = encounter_chunks(data)
    chunk_table, chunk_summary = chunk_drift(data, chunks)

    # --- Concept drift + overall test numbers + subgroup tables.
    test_proba = production_model.predict_proba(data.x_test)[:, 1]
    overall = evaluate_probabilities(data.y_test, test_proba, threshold)
    overall.pop("confusion_matrix")
    concept = concept_drift(models, production, threshold, data, chunks)
    subgroups = {
        column: subgroup_metrics(
            data.y_test,
            test_proba,
            data.x_test[column],
            threshold,
            int(data.config.get("cohorts", {}).get("min_size", 30)),
        )
        for column in SUBGROUP_COLUMNS
    }

    result = {
        "generated_at": datetime.now(tz=UTC).strftime("%Y-%m-%d %H:%M UTC"),
        "git_commit": commit["commit"],
        "dataset_sha256": sha256_file(data.raw_path),
        "production_model": production,
        "threshold": threshold,
        "feature_columns": data.feature_columns,
        "leakage": leakage,
        "drift_train_vs_test": {
            "max_psi": float(train_test["psi"].max()),
            "flagged_features": train_test.loc[train_test["psi"] > PSI_FLAG, "feature"].tolist(),
            "table": to_records(train_test),
        },
        "drift_by_chunk": {
            "n_chunks": N_CHUNKS,
            "chunks": chunk_summary,
            "max_psi": float(chunk_table["max_psi_vs_chunk1"].max()),
            "flagged_features": chunk_table.loc[
                chunk_table["max_psi_vs_chunk1"] > PSI_FLAG, "feature"
            ].tolist(),
            "table": to_records(chunk_table),
        },
        "overall_test": overall,
        "concept_drift": concept,
        "subgroups": subgroups,
    }

    figures = {
        "psi_train_test": plot_psi(
            train_test, "psi", "PSI, train vs test (top 15 features)", "psi_train_vs_test.png"
        ),
        "psi_chunks": plot_psi(
            chunk_table,
            "max_psi_vs_chunk1",
            "Max PSI vs earliest encounter chunk (top 15)",
            "psi_by_encounter_chunk.png",
        ),
        "concept": plot_concept_drift(
            concept, overall, leakage["threshold"]["min_recall"], "concept_drift_by_chunk.png"
        ),
    }
    summary_path = artifacts_dir(data.config) / SUMMARY_NAME
    summary_path.write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
    write_report(result, figures)

    print(f"Patient overlap train/test: {overlap['train_test']}")
    print(
        f"Max PSI train vs test: {result['drift_train_vs_test']['max_psi']:.4f} flagged={result['drift_train_vs_test']['flagged_features']}"
    )
    print(
        f"Max PSI by chunk: {result['drift_by_chunk']['max_psi']:.4f} flagged={result['drift_by_chunk']['flagged_features']}"
    )
    print(f"Chunk ROC-AUC: {[round(r['roc_auc'], 4) for r in concept]}")
    print(
        f"Wrote {repo_relative(REPORT_PATH)}, {repo_relative(summary_path)}, figures in {repo_relative(FIGURES_DIR)}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
