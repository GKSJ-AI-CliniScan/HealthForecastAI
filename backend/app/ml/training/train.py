"""Main model training and serialization orchestration script."""

from __future__ import annotations

import json
from datetime import UTC, datetime
from pathlib import Path

import joblib
from sklearn.model_selection import train_test_split

from app.ml.data.loader import load_raw_dataset, prepare_data
from app.ml.preprocessing.preprocessing import ClinicalDataPreprocessor
from app.ml.training.compare_models import compare_models
from app.ml.training.train_random_forest import train_random_forest
from app.ml.training.train_xgboost import train_xgboost


def run_training_pipeline(dataset_path: str | Path | None = None) -> dict:
    """Execute complete end-to-end training and serialization pipeline."""
    print("=" * 70)
    print("HealthForecast AI - ML Training Pipeline (Milestone 2)")
    print("=" * 70)

    # 1. Load dataset
    print("[1/6] Loading raw dataset...")
    df_raw = load_raw_dataset(dataset_path)
    print(f"Loaded {len(df_raw)} records with {len(df_raw.columns)} columns.")

    # 2. Prepare features and target
    print("[2/6] Preparing features and target (30-day readmission)...")
    X, y = prepare_data(df_raw)
    print(f"Features: {X.shape[1]} columns. Target distribution: {y.value_counts().to_dict()}")

    # 3. Stratified train/test split to prevent leakage
    print("[3/6] Splitting data (80% train, 20% test, stratified)...")
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.20, random_state=42, stratify=y
    )

    # 4. Preprocessing
    print("[4/6] Fitting clinical preprocessor on training split...")
    preprocessor = ClinicalDataPreprocessor()
    X_train_trans = preprocessor.fit_transform(X_train)
    X_test_trans = preprocessor.transform(X_test)
    print(f"Transformed feature matrix shape: {X_train_trans.shape}")

    # 5. Model Training
    print("[5/6] Training Candidate Models...")
    print(" -> Training Random Forest Classifier...")
    rf_model = train_random_forest(X_train_trans, y_train.values)

    print(" -> Training XGBoost Classifier...")
    xgb_model = train_xgboost(X_train_trans, y_train.values)

    # 6. Evaluation and Model Comparison
    print("[6/6] Evaluating and Comparing Candidate Models...")
    models = {
        "Random Forest": rf_model,
        "XGBoost": xgb_model,
    }
    best_name, all_metrics, table_str = compare_models(models, X_test_trans, y_test.values)

    print("\n" + table_str + "\n")
    print(f"Selected Best Model: {best_name}")

    best_model = models[best_name]
    best_metrics = all_metrics[best_name]

    # Serialization paths
    base_dir = Path(__file__).resolve().parent.parent
    saved_dir = base_dir / "models" / "saved"
    meta_dir = base_dir / "models" / "metadata"
    saved_dir.mkdir(parents=True, exist_ok=True)
    meta_dir.mkdir(parents=True, exist_ok=True)

    model_path = saved_dir / "readmission_model_v1.joblib"
    preprocessor_path = saved_dir / "preprocessor_v1.joblib"
    metadata_path = meta_dir / "metadata.json"
    feature_config_path = meta_dir / "feature_config.json"

    # Save model and preprocessor
    print(f"Saving model to {model_path}...")
    joblib.dump(best_model, model_path)

    print(f"Saving preprocessor to {preprocessor_path}...")
    preprocessor.save(preprocessor_path)

    # Save metadata
    metadata = {
        "model_name": "readmission_prediction",
        "version": "v1.0",
        "algorithm": best_name,
        "accuracy": best_metrics["accuracy"],
        "precision": best_metrics["precision"],
        "recall": best_metrics["recall"],
        "f1_score": best_metrics["f1_score"],
        "roc_auc": best_metrics["roc_auc"],
        "training_date": datetime.now(UTC).isoformat(),
        "all_model_metrics": all_metrics,
        "positive_class": "Readmitted within 30 days (<30)",
        "negative_class": "Not readmitted or readmitted after 30 days (>30 / NO)",
    }
    with open(metadata_path, "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=4)

    # Save feature names configuration
    feature_config = {
        "feature_names": preprocessor.feature_names_,
        "num_features": len(preprocessor.feature_names_),
    }
    with open(feature_config_path, "w", encoding="utf-8") as f:
        json.dump(feature_config, f, indent=4)

    print("Pipeline training, evaluation, and serialization completed successfully!")
    return metadata


if __name__ == "__main__":
    run_training_pipeline()
