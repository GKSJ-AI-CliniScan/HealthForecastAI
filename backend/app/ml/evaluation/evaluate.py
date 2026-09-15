"""Standalone model evaluation report generator."""

from __future__ import annotations

from pathlib import Path

import joblib
from sklearn.metrics import classification_report, confusion_matrix, roc_auc_score
from sklearn.model_selection import train_test_split

from app.ml.data.loader import load_raw_dataset, prepare_data
from app.ml.preprocessing.preprocessing import ClinicalDataPreprocessor


def evaluate_saved_model():
    """Load serialized model and preprocessor, compute evaluation metrics and display report."""
    base_dir = Path(__file__).resolve().parent.parent
    saved_dir = base_dir / "models" / "saved"
    model_path = saved_dir / "readmission_model_v1.joblib"
    preprocessor_path = saved_dir / "preprocessor_v1.joblib"

    if not model_path.is_file() or not preprocessor_path.is_file():
        print("Serialized model artifacts not found. Please run train.py first.")
        return

    print("Loading test data and model artifacts...")
    df_raw = load_raw_dataset()
    X, y = prepare_data(df_raw)
    _, X_test, _, y_test = train_test_split(X, y, test_size=0.20, random_state=42, stratify=y)

    preprocessor = ClinicalDataPreprocessor.load(preprocessor_path)
    model = joblib.load(model_path)

    X_test_trans = preprocessor.transform(X_test)
    y_pred = model.predict(X_test_trans)
    y_prob = model.predict_proba(X_test_trans)[:, 1]

    auc = roc_auc_score(y_test, y_prob)
    cm = confusion_matrix(y_test, y_pred)
    report = classification_report(
        y_test, y_pred, target_names=["Not Readmitted (30d)", "Readmitted (30d)"]
    )

    print("\n" + "=" * 60)
    print("Model Evaluation Summary")
    print("=" * 60)
    print(f"ROC-AUC: {auc:.4f}")
    print("\nConfusion Matrix:")
    print(cm)
    print("\nClassification Report:")
    print(report)


if __name__ == "__main__":
    evaluate_saved_model()
