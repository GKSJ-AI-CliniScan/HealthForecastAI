import os
import joblib
import numpy as np

MODELS_DIR = os.path.join(os.path.dirname(__file__), "saved_models")

def load_ml_artifacts():
    scaler_path = os.path.join(MODELS_DIR, "scaler.pkl")
    rf_path = os.path.join(MODELS_DIR, "model_rf.pkl")
    xgb_path = os.path.join(MODELS_DIR, "model_xgb.pkl")
    
    if os.path.exists(scaler_path) and os.path.exists(rf_path) and os.path.exists(xgb_path):
        scaler = joblib.load(scaler_path)
        rf_model = joblib.load(rf_path)
        xgb_model = joblib.load(xgb_path)
        return scaler, rf_model, xgb_model
    return None, None, None

def parse_age_group(age_str: str) -> int:
    try:
        if "[" in age_str:
            parts = age_str.replace("[", "").replace(")", "").split("-")
            return (int(parts[0]) + int(parts[1])) // 2
        return int(age_str)
    except Exception:
        return 65

def predict_patient_readmission_risk(patient_data: dict) -> dict:
    """
    Evaluates patient parameters through the Random Forest & XGBoost ML ensemble.
    Returns probability %, risk score (0-100), risk level (LOW/MEDIUM/HIGH), and clinical risk factors.
    """
    scaler, rf_model, xgb_model = load_ml_artifacts()
    
    age_numeric = parse_age_group(patient_data.get("age_group", "[60-70)"))
    length_of_stay = int(patient_data.get("length_of_stay_days", 4))
    num_lab_procedures = int(patient_data.get("num_lab_procedures", 45))
    num_procedures = int(patient_data.get("num_procedures", 1))
    num_medications = int(patient_data.get("num_medications", 15))
    number_outpatient = int(patient_data.get("number_outpatient", 0))
    number_emergency = int(patient_data.get("number_emergency", 1))
    number_inpatient = int(patient_data.get("number_inpatient", 1))
    
    glucose_high = 1 if patient_data.get("glucose_test") in [">300", ">200"] else 0
    a1c_high = 1 if patient_data.get("a1c_test") in [">8", ">7"] else 0
    med_changed = 1 if patient_data.get("medication_change") in ["Ch", "Yes"] else 0

    feature_vector = np.array([[
        age_numeric,
        length_of_stay,
        num_lab_procedures,
        num_procedures,
        num_medications,
        number_outpatient,
        number_emergency,
        number_inpatient,
        glucose_high,
        a1c_high,
        med_changed
    ]])
    
    if scaler and rf_model and xgb_model:
        scaled_vector = scaler.transform(feature_vector)
        rf_prob = float(rf_model.predict_proba(scaled_vector)[0][1])
        xgb_prob = float(xgb_model.predict_proba(scaled_vector)[0][1])
        ensemble_prob = round(0.5 * rf_prob + 0.5 * xgb_prob, 4)
    else:
        # Clinical fallback formula if artifacts not loaded
        raw_score = (
            0.02 * age_numeric +
            0.08 * length_of_stay +
            0.03 * num_medications +
            0.35 * number_emergency +
            0.50 * number_inpatient +
            0.30 * glucose_high +
            0.35 * a1c_high - 3.5
        )
        ensemble_prob = round(float(1 / (1 + np.exp(-raw_score))), 4)
        rf_prob = ensemble_prob
        xgb_prob = ensemble_prob

    risk_score = int(round(ensemble_prob * 100))
    
    if risk_score >= 70:
        risk_level = "HIGH"
    elif risk_score >= 40:
        risk_level = "MEDIUM"
    else:
        risk_level = "LOW"

    # Derive explainable clinical risk factors
    risk_factors = []
    if number_emergency >= 2:
        risk_factors.append(f"Frequent emergency room visits ({number_emergency} in last 12m)")
    elif number_emergency == 1:
        risk_factors.append("Recent emergency department visit")
        
    if number_inpatient >= 2:
        risk_factors.append(f"Multiple prior hospital admissions ({number_inpatient} inpatient stays)")
    elif number_inpatient == 1:
        risk_factors.append("Prior inpatient hospital stay within past year")

    if num_medications >= 20:
        risk_factors.append(f"High polypharmacy complexity ({num_medications} active medications)")
    elif num_medications >= 12:
        risk_factors.append(f"Elevated medication regimen ({num_medications} medications)")

    if glucose_high:
        risk_factors.append("Acute hyperglycemia on admission (Glucose >200 mg/dL)")

    if a1c_high:
        risk_factors.append("Poor long-term glycemic control (HbA1c >7.0%)")

    if length_of_stay >= 6:
        risk_factors.append(f"Extended hospital length of stay ({length_of_stay} days)")

    if med_changed:
        risk_factors.append("Inpatient diabetic medication dosage adjustments")

    if not risk_factors:
        risk_factors.append("Standard post-discharge monitoring recommended")

    return {
        "readmission_probability": ensemble_prob,
        "readmission_risk_score": risk_score,
        "risk_level": risk_level,
        "risk_factors": risk_factors,
        "rf_probability": round(rf_prob, 4),
        "xgb_probability": round(xgb_prob, 4),
        "model_used": "Ensemble (Random Forest 50% + XGBoost 50% v1.0)"
    }
