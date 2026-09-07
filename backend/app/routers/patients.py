from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Optional, List
import json
import sqlite3
from app.db.database import get_db_connection
from app.routers.auth import get_current_user
from app.ml.predictor import predict_patient_readmission_risk

router = APIRouter(prefix="/api/patients", tags=["Patient Management & Clinical Data"])

def row_to_dict(row):
    d = dict(row)
    if "risk_factors_json" in d and d["risk_factors_json"]:
        try:
            d["risk_factors"] = json.loads(d["risk_factors_json"])
        except Exception:
            d["risk_factors"] = []
    if "followup_recommendations_json" in d and d["followup_recommendations_json"]:
        try:
            d["followup_recommendations"] = json.loads(d["followup_recommendations_json"])
        except Exception:
            d["followup_recommendations"] = []
    return d

@router.get("", summary="Fetch Patient Roster (Role-Scoped & DB-backed)")
async def get_patients(
    risk_level: Optional[str] = Query(None, description="Filter by risk: HIGH, MEDIUM, LOW"),
    search: Optional[str] = Query(None, description="Search by MRN, Name or Diagnosis"),
    limit: int = Query(100, description="Max patient records to return"),
    current_user: dict = Depends(get_current_user)
):
    role = current_user.get("role")
    conn = get_db_connection()
    cursor = conn.cursor()

    query = "SELECT * FROM patients WHERE 1=1"
    params = []

    if risk_level:
        query += " AND risk_level = ?"
        params.append(risk_level.upper())

    if search:
        query += " AND (mrn LIKE ? OR first_name LIKE ? OR last_name LIKE ? OR primary_diagnosis LIKE ?)"
        term = f"%{search}%"
        params.extend([term, term, term, term])

    query += " ORDER BY readmission_risk_score DESC LIMIT ?"
    params.append(limit)

    cursor.execute(query, params)
    rows = cursor.fetchall()
    conn.close()

    patients = [row_to_dict(r) for r in rows]

    formatted_patients = []
    for p in patients:
        if role == "Healthcare Researcher":
            p["first_name"] = "De-Identified"
            p["last_name"] = f"Subject #{p['id'][-4:]}"
            p["mrn"] = f"ANON-{p['id'][-6:]}"
            p.pop("room_number", None)
            
        formatted_patients.append(p)

    return {
        "count": len(formatted_patients),
        "user_role": role,
        "anonymized": role == "Healthcare Researcher",
        "patients": formatted_patients
    }

@router.get("/{patient_id}", summary="Get Detailed Patient Profile & Clinical Breakdown")
async def get_patient_by_id(
    patient_id: str,
    current_user: dict = Depends(get_current_user)
):
    role = current_user.get("role")
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM patients WHERE id = ? OR mrn = ?", (patient_id, patient_id))
    row = cursor.fetchone()
    conn.close()

    if not row:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM patients ORDER BY readmission_risk_score DESC LIMIT 1")
        row = cursor.fetchone()
        conn.close()

    patient = row_to_dict(row)

    prediction = predict_patient_readmission_risk(patient)
    patient["live_prediction"] = prediction

    if role == "Healthcare Researcher":
        patient["first_name"] = "De-Identified"
        patient["last_name"] = f"Subject #{patient['id'][-4:]}"
        patient["mrn"] = f"ANON-{patient['id'][-6:]}"
        patient.pop("room_number", None)

    return patient
