import joblib
import numpy as np
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# 1. Load the saved model and feature columns
model = joblib.load("../artifacts/risk_model.pkl")
feature_columns = joblib.load("../artifacts/feature_columns.pkl")

# 2. Create the FastAPI app
app = FastAPI(title="Patient Risk Prediction API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5500"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


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
    # Build a feature vector in the exact order the model expects,
    # filling missing values with 0 - no pandas needed
    row = [patient.data.get(col, 0) for col in feature_columns]
    input_array = np.array([row], dtype=float)

    # Predict risk score
    risk_score = model.predict_proba(input_array)[:, 1][0]
    risk_category = categorize_risk(risk_score)

    return {"risk_score": round(float(risk_score), 4), "risk_category": risk_category}
