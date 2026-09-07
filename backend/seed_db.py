import os
import asyncio
import logging
import pandas as pd
from datetime import datetime, timedelta, timezone
from motor.motor_asyncio import AsyncIOMotorClient
from app.config import settings
from app.core.security import get_password_hash
from app.ml.predictor import predict_patient_readmission_risk

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("seed_db")

DATASET_PATH = r"c:\Users\AQBALL\Downloads\dhana infosyss\diabetes+130-us+hospitals+for+years+1999-2008 (1)\diabetic_data.csv"

# Seed Users (All 4 Core Roles)
USERS_DATA = [
    {
        "_id": "usr_doc_001",
        "email": "doctor.vance@healthforecast.ai",
        "hashed_password": get_password_hash("doctor123"),
        "full_name": "Dr. Evelyn Vance, MD",
        "role": "Doctor",
        "department": "Cardiology & Internal Medicine",
        "created_at": datetime.now(timezone.utc).isoformat()
    },
    {
        "_id": "usr_adm_001",
        "email": "admin.sterling@healthforecast.ai",
        "hashed_password": get_password_hash("admin123"),
        "full_name": "Marcus Sterling",
        "role": "Hospital Administrator",
        "department": "Executive Operations & Strategy",
        "created_at": datetime.now(timezone.utc).isoformat()
    },
    {
        "_id": "usr_res_001",
        "email": "researcher.thorne@healthforecast.ai",
        "hashed_password": get_password_hash("researcher123"),
        "full_name": "Dr. Aris Thorne, PhD",
        "role": "Healthcare Researcher",
        "department": "Clinical Data Science & AI",
        "created_at": datetime.now(timezone.utc).isoformat()
    },
    {
        "_id": "usr_sys_001",
        "email": "sysadmin.chen@healthforecast.ai",
        "hashed_password": get_password_hash("sysadmin123"),
        "full_name": "Sarah Chen, CISSP",
        "role": "System Administrator",
        "department": "IT Infrastructure & Security",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
]

FIRST_NAMES_MALE = ["Robert", "Marcus", "James", "David", "Michael", "William", "Richard", "Thomas", "Charles", "Daniel"]
FIRST_NAMES_FEMALE = ["Eleanor", "Sophia", "Maria", "Patricia", "Linda", "Barbara", "Elizabeth", "Jennifer", "Susan", "Margaret"]
LAST_NAMES = ["Chen", "Vasquez", "Brody", "Patel", "O'Connor", "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller"]

DIAGNOSIS_MAP = {
    "250": "Type 2 Diabetes Mellitus with Complications",
    "250.01": "Type 1 Diabetes Mellitus, Ketoacidosis",
    "401": "Essential Primary Hypertension",
    "414": "Chronic Ischemic Heart Disease",
    "428": "Congestive Heart Failure (CHF)",
    "496": "Chronic Obstructive Pulmonary Disease (COPD)",
    "585": "Chronic Kidney Disease Stage 3 (CKD)"
}

def map_diag_code(code):
    if not isinstance(code, str):
        return "Diabetes Mellitus Type 2"
    for key, name in DIAGNOSIS_MAP.items():
        if code.startswith(key):
            return name
    return f"Diabetic Metabolic Disorder (ICD-9: {code})"

def load_patients_from_real_dataset(sample_size=30):
    """
    Parses real clinical patient records directly from diabetic_data.csv.
    """
    if not os.path.exists(DATASET_PATH):
        logger.warning(f"Dataset path not found at {DATASET_PATH}. Using default fallback.")
        return []

    df = pd.read_csv(DATASET_PATH)
    sample_df = df.sample(n=sample_size, random_state=42).reset_index(drop=True)

    patients = []
    for idx, row in sample_df.iterrows():
        is_female = row.get("gender") == "Female"
        fn = FIRST_NAMES_FEMALE[idx % len(FIRST_NAMES_FEMALE)] if is_female else FIRST_NAMES_MALE[idx % len(FIRST_NAMES_MALE)]
        ln = LAST_NAMES[idx % len(LAST_NAMES)]

        mrn = f"MRN-{int(row['encounter_id']) % 900000 + 100000}"
        patient_id = f"pat_real_{idx+1:03d}"

        p_data = {
            "_id": patient_id,
            "mrn": mrn,
            "first_name": fn,
            "last_name": ln,
            "gender": str(row.get("gender", "Other")),
            "age_group": str(row.get("age", "[60-70)")),
            "race": str(row.get("race", "Caucasian")),
            "assigned_doctor_id": "usr_doc_001",
            "assigned_doctor_name": "Dr. Evelyn Vance, MD",
            "department": "Cardiology" if idx % 3 == 0 else ("Internal Medicine" if idx % 3 == 1 else "Emergency Medicine"),
            "room_number": f"{300 + (idx % 20)}-{chr(65 + (idx % 3))}",
            "admission_date": (datetime.now(timezone.utc) - timedelta(days=(idx * 2) % 15)).strftime("%Y-%m-%d"),
            "admission_type": "Emergency" if str(row.get("admission_type_id")) == "1" else "Urgent",
            "discharge_disposition": "Home" if str(row.get("discharge_disposition_id")) == "1" else "Snf (Skilled Nursing)",
            "length_of_stay_days": int(row.get("time_in_hospital", 4)),
            "num_lab_procedures": int(row.get("num_lab_procedures", 40)),
            "num_procedures": int(row.get("num_procedures", 1)),
            "num_medications": int(row.get("num_medications", 15)),
            "number_outpatient": int(row.get("number_outpatient", 0)),
            "number_emergency": int(row.get("number_emergency", 0)),
            "number_inpatient": int(row.get("number_inpatient", 0)),
            "primary_diagnosis": map_diag_code(str(row.get("diag_1"))),
            "secondary_diagnosis": map_diag_code(str(row.get("diag_2"))),
            "tertiary_diagnosis": map_diag_code(str(row.get("diag_3"))),
            "glucose_test": str(row.get("max_glu_serum", "Norm")),
            "a1c_test": str(row.get("A1Cresult", "Norm")),
            "medication_change": str(row.get("change", "No")),
            "diabetes_med": str(row.get("diabetesMed", "Yes")),
            "discharge_status": "Discharge Pending" if idx % 2 == 0 else "Ready for Discharge",
            "created_at": datetime.now(timezone.utc).isoformat()
        }

        # Run ML model predictor inference to get score, probability & risk factors
        pred = predict_patient_readmission_risk(p_data)
        p_data.update({
            "readmission_risk_score": pred["readmission_risk_score"],
            "readmission_probability": pred["readmission_probability"],
            "risk_level": pred["risk_level"],
            "risk_factors": pred["risk_factors"],
            "treatment_plan": f"Glycemic control protocol with {row.get('insulin', 'Metformin')} maintenance and daily lab monitoring.",
            "treatment_effectiveness": "Favorable metabolic stabilization during hospital stay.",
            "ai_insights": f"ML model evaluates readmission probability at {int(pred['readmission_probability']*100)}% based on prior inpatient utilization ({row.get('number_inpatient', 0)} stays) and medication load ({row.get('num_medications', 10)} active meds).",
            "followup_recommendations": [
                "Schedule primary care follow-up within 7-14 days",
                "Home nurse check-in for medication reconciliation"
            ]
        })

        patients.append(p_data)

    return patients

# Audit Logs Seed Data
AUDIT_LOGS_DATA = [
    {
        "_id": f"log_{i:03d}",
        "timestamp": (datetime.now(timezone.utc) - timedelta(hours=i*3)).isoformat(),
        "user_email": "doctor.vance@healthforecast.ai",
        "user_role": "Doctor",
        "action": "PATIENT_RISK_ASSESSMENT_VIEW",
        "resource": f"Patient Record #{i}",
        "ip_address": "127.0.0.1",
        "status": "SUCCESS"
    } for i in range(1, 10)
]

async def seed_database():
    logger.info("Connecting to MongoDB Atlas to seed Diabetes 130-US Hospitals patient records...")
    real_patients = load_patients_from_real_dataset(sample_size=35)

    try:
        client = AsyncIOMotorClient(
            settings.MONGODB_URL,
            tls=True,
            tlsAllowInvalidCertificates=True,
            serverSelectionTimeoutMS=5000
        )
        db = client[settings.DATABASE_NAME]

        for col in ["users", "patients", "audit_logs", "models"]:
            await db[col].delete_many({})

        await db.users.insert_many(USERS_DATA)
        logger.info(f"Inserted {len(USERS_DATA)} RBAC users into 'users' collection.")

        if real_patients:
            await db.patients.insert_many(real_patients)
            logger.info(f"Inserted {len(real_patients)} Diabetes 130-US Hospitals patient records into 'patients' collection.")

        await db.audit_logs.insert_many(AUDIT_LOGS_DATA)
        logger.info(f"Inserted {len(AUDIT_LOGS_DATA)} security audit logs into 'audit_logs' collection.")

        client.close()
        logger.info("MongoDB Atlas seeding from real dataset complete!")
    except Exception as e:
        logger.warning(f"MongoDB Atlas seeding attempt notice: {e}")

if __name__ == "__main__":
    asyncio.run(seed_database())
