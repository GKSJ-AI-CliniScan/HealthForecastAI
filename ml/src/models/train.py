"""Train and compare Logistic Regression, Random Forest, and XGBoost —
using ONLY fields a real form can collect. Selects the best model."""

from pathlib import Path

import joblib
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    accuracy_score,
    f1_score,
    precision_recall_curve,
    precision_score,
    recall_score,
    roc_auc_score,
)
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from xgboost import XGBClassifier

DATA_PATH = Path("data/raw/diabetic_data.csv")
ARTIFACTS_DIR = Path("artifacts")
ARTIFACTS_DIR.mkdir(exist_ok=True)

NUMERIC_FEATURES = [
    "time_in_hospital",
    "num_medications",
    "num_lab_procedures",
    "number_diagnoses",
    "number_inpatient",
    "number_emergency",
]
CATEGORICAL_FEATURES = ["age_group"]
ALL_FEATURES = NUMERIC_FEATURES + CATEGORICAL_FEATURES

PROMOTION_ROC_AUC = 0.60
PROMOTION_RECALL = 0.50


def best_threshold_by_f1(y_true, y_proba, min_recall=0.5):
    """Pick the threshold with the best F1 among those meeting the recall floor."""
    precisions, recalls, thresholds = precision_recall_curve(y_true, y_proba)
    best_t, best_f1 = 0.5, -1.0
    for p, r, t in zip(precisions, recalls, thresholds, strict=False):
        if r >= min_recall:
            f1 = 2 * p * r / (p + r) if (p + r) > 0 else 0
            if f1 > best_f1:
                best_f1, best_t = f1, float(t)
    return best_t


def evaluate(name, pipeline, x_test, y_test):
    y_proba = pipeline.predict_proba(x_test)[:, 1]
    threshold = best_threshold_by_f1(y_test, y_proba, min_recall=0.5)
    y_pred = (y_proba >= threshold).astype(int)

    metrics = {
        "model": name,
        "threshold": round(threshold, 4),
        "accuracy": round(accuracy_score(y_test, y_pred), 4),
        "precision": round(precision_score(y_test, y_pred), 4),
        "recall": round(recall_score(y_test, y_pred), 4),
        "f1": round(f1_score(y_test, y_pred), 4),
        "roc_auc": round(roc_auc_score(y_test, y_proba), 4),
    }
    print(f"\n{name}:")
    for k, v in metrics.items():
        if k != "model":
            print(f"  {k}: {v}")
    return metrics


# --- Load data ---
df = pd.read_csv(DATA_PATH)
df = df.rename(columns={"age": "age_group"})
df["target"] = (df["readmitted"] == "<30").astype(int)

X = df[ALL_FEATURES]
y = df["target"]

x_train, x_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y
)

preprocessor = ColumnTransformer(
    [
        ("num", StandardScaler(), NUMERIC_FEATURES),
        ("cat", OneHotEncoder(handle_unknown="ignore"), CATEGORICAL_FEATURES),
    ]
)

candidates = {
    "logistic_regression": LogisticRegression(max_iter=1000, class_weight="balanced"),
    "random_forest": RandomForestClassifier(
        n_estimators=300,
        max_depth=12,
        min_samples_leaf=5,
        class_weight="balanced",
        random_state=42,
    ),
    "xgboost": XGBClassifier(
        n_estimators=400,
        max_depth=6,
        learning_rate=0.05,
        subsample=0.8,
        colsample_bytree=0.8,
        eval_metric="logloss",
        random_state=42,
    ),
}

print("=" * 60)
print("MODEL COMPARISON — 7 realistic features only")
print("=" * 60)

results = []
pipelines = {}

for name, estimator in candidates.items():
    pipeline = Pipeline([("preprocess", preprocessor), ("model", estimator)])
    pipeline.fit(x_train, y_train)
    metrics = evaluate(name, pipeline, x_test, y_test)
    results.append(metrics)
    pipelines[name] = pipeline

# --- Pick the best model: highest ROC-AUC among those clearing the bar ---
# --- Pick the best model: highest F1 among those clearing the promotion bar ---
qualified = [
    r for r in results if r["roc_auc"] >= PROMOTION_ROC_AUC and r["recall"] >= PROMOTION_RECALL
]

if qualified:
    best = max(qualified, key=lambda r: r["f1"])
    promoted = True
else:
    best = max(results, key=lambda r: r["f1"])
    promoted = False

print("\n" + "=" * 60)
print(f"BEST MODEL: {best['model']}  (promoted: {promoted})")
print("=" * 60)
for k, v in best.items():
    print(f"  {k}: {v}")

best_pipeline = pipelines[best["model"]]
joblib.dump(best_pipeline, ARTIFACTS_DIR / "readmission_model.joblib")
joblib.dump(
    {"threshold": best["threshold"], "model_name": best["model"]},
    ARTIFACTS_DIR / "threshold.joblib",
)

print(f"\nSaved: {ARTIFACTS_DIR / 'readmission_model.joblib'}")
