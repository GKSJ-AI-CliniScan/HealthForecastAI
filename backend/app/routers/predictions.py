from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List
import json
import uuid
from datetime import datetime, timezone
from app.db.database import get_db_connection
from app.routers.auth import get_current_user
from app.ml.predictor import predict_patient_readmission_risk

router = APIRouter(prefix="/api/predictions", tags=["AI Readmission Risk Engine"])

class RiskPredictionRequest(BaseModel):
    patient_id: Optional[str] = None
    age_group: Optional[str] = "[60-70)"
    length_of_stay_days: int = 4
    num_lab_procedures: int = 45
    num_procedures: int = 1
    num_medications: int = 15
    number_outpatient: int = 0
    number_emergency: int = 1
    number_inpatient: int = 1
    glucose_test: str = "Norm"
    a1c_test: str = ">7"
    medication_change: str = "No"

@router.post("/predict", summary="Run ML Ensemble Readmission Prediction")
async def run_prediction(
    request: RiskPredictionRequest,
    current_user: dict = Depends(get_current_user)
):
    patient_dict = request.model_dump()
    
    conn = get_db_connection()
    cursor = conn.cursor()

    patient_name = "Custom Assessment"
    mrn = "N/A"

    if request.patient_id:
        cursor.execute("SELECT * FROM patients WHERE id = ?", (request.patient_id,))
        row = cursor.fetchone()
        if row:
            p_data = dict(row)
            patient_name = f"{p_data.get('first_name', '')} {p_data.get('last_name', '')}"
            mrn = p_data.get('mrn', 'N/A')
            p_data.update(patient_dict)
            patient_dict = p_data

    # Run ML Inference
    result = predict_patient_readmission_risk(patient_dict)

    # Save to SQLite database
    if request.patient_id:
        cursor.execute("""
        UPDATE patients SET
            readmission_risk_score = ?,
            readmission_probability = ?,
            risk_level = ?,
            risk_factors_json = ?
        WHERE id = ?
        """, (
            result["readmission_risk_score"],
            result["readmission_probability"],
            result["risk_level"],
            json.dumps(result["risk_factors"]),
            request.patient_id
        ))

    # Log prediction execution to predictions history table
    pred_id = f"pred_{uuid.uuid4().hex[:8]}"
    cursor.execute("""
    INSERT INTO predictions VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        pred_id,
        request.patient_id or "adhoc",
        patient_name,
        mrn,
        result["readmission_risk_score"],
        result["readmission_probability"],
        result["risk_level"],
        json.dumps(result["risk_factors"]),
        "RandomForest-ClinicalEnsemble-v1.2",
        datetime.now(timezone.utc).isoformat()
    ))
    conn.commit()
    conn.close()

    return {
        "status": "success",
        "evaluated_by_user": current_user["email"],
        "evaluated_by_role": current_user["role"],
        "prediction": result
    }
