import os
import joblib
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, roc_auc_score
import xgboost as xgb

MODELS_DIR = os.path.join(os.path.dirname(__file__), "saved_models")
os.makedirs(MODELS_DIR, exist_ok=True)

DATASET_PATH = r"c:\Users\AQBALL\Downloads\dhana infosyss\diabetes+130-us+hospitals+for+years+1999-2008 (1)\diabetic_data.csv"

def parse_age_to_numeric(age_str):
    try:
        if isinstance(age_str, str) and "[" in age_str:
            parts = age_str.replace("[", "").replace(")", "").split("-")
            return (int(parts[0]) + int(parts[1])) // 2
        return int(age_str)
    except Exception:
        return 65

def load_and_preprocess_diabetic_data():
    """
    Loads and preprocesses the official Diabetes 130-US Hospitals Dataset (101,766 records).
    """
    if not os.path.exists(DATASET_PATH):
        raise FileNotFoundError(f"Dataset file not found at {DATASET_PATH}")

    df = pd.read_csv(DATASET_PATH)

    # Feature transformations
    df["age_numeric"] = df["age"].apply(parse_age_to_numeric)
    df["length_of_stay"] = df["time_in_hospital"].astype(int)
    df["num_lab_procedures"] = df["num_lab_procedures"].astype(int)
    df["num_procedures"] = df["num_procedures"].astype(int)
    df["num_medications"] = df["num_medications"].astype(int)
    df["number_outpatient"] = df["number_outpatient"].astype(int)
    df["number_emergency"] = df["number_emergency"].astype(int)
    df["number_inpatient"] = df["number_inpatient"].astype(int)

    df["glucose_high"] = df["max_glu_serum"].apply(lambda x: 1 if x in [">200", ">300"] else 0)
    df["a1c_high"] = df["A1Cresult"].apply(lambda x: 1 if x in [">7", ">8"] else 0)
    df["med_changed"] = df["change"].apply(lambda x: 1 if x == "Ch" else 0)

    # Target: 30-day readmission (<30)
    df["readmitted_30d"] = df["readmitted"].apply(lambda x: 1 if x == "<30" else 0)

    feature_cols = [
        "age_numeric",
        "length_of_stay",
        "num_lab_procedures",
        "num_procedures",
        "num_medications",
        "number_outpatient",
        "number_emergency",
        "number_inpatient",
        "glucose_high",
        "a1c_high",
        "med_changed"
    ]

    X = df[feature_cols]
    y = df["readmitted_30d"]

    return X, y, df

def train_and_save_models():
    """
    Trains Random Forest and XGBoost classifiers on Diabetes 130-US Hospitals dataset.
    """
    X, y, df_full = load_and_preprocess_diabetic_data()

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.20, random_state=42, stratify=y
    )

    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)

    # 1. Random Forest Classifier
    rf_model = RandomForestClassifier(
        n_estimators=120,
        max_depth=10,
        class_weight="balanced",
        random_state=42,
        n_jobs=-1
    )
    rf_model.fit(X_train_scaled, y_train)
    y_pred_rf = rf_model.predict(X_test_scaled)
    y_proba_rf = rf_model.predict_proba(X_test_scaled)[:, 1]

    rf_metrics = {
        "accuracy": round(float(accuracy_score(y_test, y_pred_rf)), 4),
        "precision": round(float(precision_score(y_test, y_pred_rf, zero_division=0)), 4),
        "recall": round(float(recall_score(y_test, y_pred_rf)), 4),
        "f1_score": round(float(f1_score(y_test, y_pred_rf)), 4),
        "roc_auc": round(float(roc_auc_score(y_test, y_proba_rf)), 4),
    }

    # 2. XGBoost Classifier
    scale_pos_weight = (len(y_train) - sum(y_train)) / max(sum(y_train), 1)
    xgb_model = xgb.XGBClassifier(
        n_estimators=120,
        max_depth=6,
        learning_rate=0.05,
        scale_pos_weight=scale_pos_weight,
        random_state=42,
        eval_metric="logloss"
    )
    xgb_model.fit(X_train_scaled, y_train)
    y_pred_xgb = xgb_model.predict(X_test_scaled)
    y_proba_xgb = xgb_model.predict_proba(X_test_scaled)[:, 1]

    xgb_metrics = {
        "accuracy": round(float(accuracy_score(y_test, y_pred_xgb)), 4),
        "precision": round(float(precision_score(y_test, y_pred_xgb, zero_division=0)), 4),
        "recall": round(float(recall_score(y_test, y_pred_xgb)), 4),
        "f1_score": round(float(f1_score(y_test, y_pred_xgb)), 4),
        "roc_auc": round(float(roc_auc_score(y_test, y_proba_xgb)), 4),
    }

    # Save artifacts
    joblib.dump(scaler, os.path.join(MODELS_DIR, "scaler.pkl"))
    joblib.dump(rf_model, os.path.join(MODELS_DIR, "model_rf.pkl"))
    joblib.dump(xgb_model, os.path.join(MODELS_DIR, "model_xgb.pkl"))

    results = {
        "dataset_name": "Diabetes 130-US Hospitals Dataset (1999-2008)",
        "total_records": len(df_full),
        "train_records": len(X_train),
        "test_records": len(X_test),
        "random_forest": rf_metrics,
        "xgboost": xgb_metrics,
        "feature_importance": dict(zip(X.columns, [round(float(w), 4) for w in rf_model.feature_importances_]))
    }

    return results

if __name__ == "__main__":
    res = train_and_save_models()
    print("DIABETES 130-US HOSPITALS MODEL TRAINING COMPLETE:")
    print(res)
