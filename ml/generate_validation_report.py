"""
Generates validation_report/  (metrics table, plots, markdown) for the
Milestone-4 documentation.   Run:  python generate_validation_report.py
"""
import json
from pathlib import Path
import numpy as np
import pandas as pd
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from sklearn.model_selection import train_test_split, StratifiedKFold, cross_val_score
from sklearn.metrics import (accuracy_score, precision_score, recall_score, f1_score,
                             roc_auc_score, roc_curve, precision_recall_curve,
                             average_precision_score, confusion_matrix, ConfusionMatrixDisplay)
from sklearn.calibration import calibration_curve
from sklearn.base import clone
import ml_adapter as A

OUT = Path("validation_report"); OUT.mkdir(exist_ok=True)

df = A.load_raw_data()
X, y = A.get_features(df), A.make_target(df)
X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.2, stratify=y, random_state=42)
model = A.load_model()
p = A.predict_proba(model, X_te)
yt = y_te.to_numpy()
yhat = (p >= A.DECISION_THRESHOLD).astype(int)

m = {"Accuracy": accuracy_score(yt, yhat), "Precision": precision_score(yt, yhat, zero_division=0),
     "Recall": recall_score(yt, yhat, zero_division=0), "F1-score": f1_score(yt, yhat, zero_division=0),
     "ROC-AUC": roc_auc_score(yt, p), "PR-AUC": average_precision_score(yt, p)}

# 95% bootstrap CI for ROC-AUC
rng = np.random.default_rng(0)
boots = []
for _ in range(300):
    i = rng.integers(0, len(yt), len(yt))
    if yt[i].min() != yt[i].max():
        boots.append(roc_auc_score(yt[i], p[i]))
ci = np.percentile(boots, [2.5, 97.5])

# 5-fold CV (only possible when the model is a re-fittable sklearn estimator)
cv_txt = "n/a (model not re-fittable with sklearn clone)"
try:
    cv = cross_val_score(clone(model), X, y, cv=StratifiedKFold(5, shuffle=True, random_state=42),
                         scoring="roc_auc", n_jobs=-1)
    cv_txt = f"{cv.mean():.3f} ± {cv.std():.3f}"
except Exception:
    pass

# threshold sweep
rows = []
for t in np.arange(0.1, 0.91, 0.1):
    h = (p >= t).astype(int)
    rows.append(dict(threshold=round(t, 1), precision=precision_score(yt, h, zero_division=0),
                     recall=recall_score(yt, h, zero_division=0), f1=f1_score(yt, h, zero_division=0),
                     flagged_pct=h.mean()))
sweep = pd.DataFrame(rows).round(3)

# --- plots
fpr, tpr, _ = roc_curve(yt, p)
plt.figure(figsize=(5, 4)); plt.plot(fpr, tpr, label=f"AUC={m['ROC-AUC']:.3f}"); plt.plot([0, 1], [0, 1], "--", c="grey")
plt.xlabel("False positive rate"); plt.ylabel("True positive rate"); plt.title("ROC curve"); plt.legend()
plt.tight_layout(); plt.savefig(OUT / "roc_curve.png", dpi=150); plt.close()

pr, rc, _ = precision_recall_curve(yt, p)
plt.figure(figsize=(5, 4)); plt.plot(rc, pr); plt.axhline(yt.mean(), ls="--", c="grey", label="base rate")
plt.xlabel("Recall"); plt.ylabel("Precision"); plt.title(f"Precision-Recall (AP={m['PR-AUC']:.3f})"); plt.legend()
plt.tight_layout(); plt.savefig(OUT / "pr_curve.png", dpi=150); plt.close()

ConfusionMatrixDisplay(confusion_matrix(yt, yhat), display_labels=["Not readmitted", "Readmitted"]).plot(cmap="Blues")
plt.title(f"Confusion matrix @ {A.DECISION_THRESHOLD}"); plt.tight_layout(); plt.savefig(OUT / "confusion_matrix.png", dpi=150); plt.close()

fp, mp = calibration_curve(yt, p, n_bins=10, strategy="quantile")
plt.figure(figsize=(5, 4)); plt.plot(mp, fp, "o-"); plt.plot([0, 1], [0, 1], "--", c="grey")
plt.xlabel("Mean predicted probability"); plt.ylabel("Observed rate"); plt.title("Calibration")
plt.tight_layout(); plt.savefig(OUT / "calibration.png", dpi=150); plt.close()

# risk band table
bands = pd.Series([A.risk_category(v) for v in p], name="band")
rb = pd.DataFrame({"band": bands, "y": yt}).groupby("band").agg(patients=("y", "size"), readmit_rate=("y", "mean"))
rb = rb.reindex([b for b in ["Low", "Medium", "High"] if b in rb.index]).round(3)

# feature importance (if available)
fi_txt = ""
try:
    from sklearn.inspection import permutation_importance
    r = permutation_importance(model, X_te.sample(min(2000, len(X_te)), random_state=0),
                               y_te.loc[X_te.sample(min(2000, len(X_te)), random_state=0).index],
                               scoring="roc_auc", n_repeats=3, random_state=0, n_jobs=-1)
    imp = pd.Series(r.importances_mean, index=X_te.columns).sort_values(ascending=False).head(10)
    plt.figure(figsize=(6, 4)); imp[::-1].plot.barh(); plt.title("Top-10 permutation importance (ΔAUC)")
    plt.tight_layout(); plt.savefig(OUT / "feature_importance.png", dpi=150); plt.close()
    fi_txt = "\n## Top features (permutation importance)\n" + imp.round(4).to_frame("ΔAUC").to_markdown() + \
             "\n\n![](feature_importance.png)\n"
except Exception as e:
    fi_txt = f"\n_Feature importance skipped: {e}_\n"

passed = {k: (m[k] >= A.THRESHOLDS[kk]) for k, kk in
          [("ROC-AUC", "roc_auc"), ("Recall", "recall"), ("Precision", "precision"),
           ("F1-score", "f1"), ("Accuracy", "accuracy")]}

mode = "**DEMO MODE – synthetic data, not valid for submission**\n\n" if A.DEMO_MODE else ""
md = f"""# Model Testing & Validation Report – HealthForecast AI (ML module)

{mode}- Test set: {len(yt):,} encounters ({yt.mean():.1%} positive) | Target: `{A.TARGET_MODE}` | Decision threshold: {A.DECISION_THRESHOLD}

## 1. Performance on hold-out set
| Metric | Value | Required | Result |
|---|---|---|---|
""" + "\n".join(
    f"| {k} | {m[k]:.3f} | ≥ {A.THRESHOLDS[kk]} | {'PASS' if passed[k] else 'FAIL'} |"
    for k, kk in [("ROC-AUC", "roc_auc"), ("Recall", "recall"), ("Precision", "precision"),
                  ("F1-score", "f1"), ("Accuracy", "accuracy")]) + f"""
| PR-AUC | {m['PR-AUC']:.3f} | (base rate {yt.mean():.3f}) | info |

- ROC-AUC 95% bootstrap CI: **{ci[0]:.3f} – {ci[1]:.3f}**
- 5-fold stratified CV ROC-AUC: **{cv_txt}**

Accuracy is shown for completeness only; with a minority positive class it is dominated by the
majority class, so ROC-AUC, recall and PR-AUC are the primary measures.

![](roc_curve.png) ![](pr_curve.png)
![](confusion_matrix.png) ![](calibration.png)

## 2. Threshold trade-off
{sweep.to_markdown(index=False)}

## 3. Risk categorisation quality
{rb.to_markdown()}

(Observed readmission rate should rise from Low → High.)
{fi_txt}
## 4. Automated test summary
Run `pytest -v` and paste the summary here (data validation, performance, robustness,
subgroup, latency and API tests).
"""
(OUT / "validation_report.md").write_text(md, encoding="utf-8")
(OUT / "metrics.json").write_text(json.dumps({**m, "auc_ci": list(ci)}, indent=2))
print(f"Report written to {OUT}/validation_report.md")
print(json.dumps({k: round(v, 3) for k, v in m.items()}, indent=2))
