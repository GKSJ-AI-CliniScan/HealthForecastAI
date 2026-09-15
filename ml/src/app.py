from fastapi import FastAPI
from pydantic import BaseModel
import joblib
import pandas as pd

# 1. Load the saved model and feature columns
model = joblib.load("risk_model.pkl")
feature_columns = joblib.load("feature_columns.pkl")

# 2. Create the FastAPI app
app = FastAPI(title="Patient Risk Prediction API")

# 3. Define the input format (patient data as a dictionary)
class PatientData(BaseModel):
    data: dict  # patient features as key-value pairs

# 4. Define the categorization logic (same thresholds as before)
def categorize_risk(score):
    if score < 0.48:
        return "Low"
    elif score < 0.62:
        return "Medium"
    else:
        return "High"

# 5. Health check endpoint (to confirm API is running)
@app.get("/")
def read_root():
    return {"message": "Patient Risk Prediction API is running"}

# 6. Prediction endpoint
@app.post("/predict-risk")
def predict_risk(patient: PatientData):
    # Convert input dict to DataFrame
    input_df = pd.DataFrame([patient.data])
    
    # Ensure all expected columns are present, fill missing ones with 0
    for col in feature_columns:
        if col not in input_df.columns:
            input_df[col] = 0
    input_df = input_df[feature_columns]  # reorder columns to match training
    
    # Predict risk score
    risk_score = model.predict_proba(input_df)[:, 1][0]
    risk_category = categorize_risk(risk_score)
    
    return {
        "risk_score": round(float(risk_score), 4),
        "risk_category": risk_category
    }