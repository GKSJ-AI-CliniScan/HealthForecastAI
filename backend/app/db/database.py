import sqlite3
import json
import os
import pandas as pd
from datetime import datetime, timedelta, timezone
from app.core.security import get_password_hash
from app.ml.predictor import predict_patient_readmission_risk

DB_FILE = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "healthforecast.db")
DATASET_PATH = r"c:\Users\AQBALL\Downloads\dhana infosyss\diabetes+130-us+hospitals+for+years+1999-2008 (1)\diabetic_data.csv"

def get_db_connection():
    conn = sqlite3.connect(DB_FILE, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn

FIRST_NAMES_MALE = ["Robert", "Marcus", "James", "David", "Michael", "William", "Richard", "Thomas", "Charles", "Daniel", "Christopher", "Matthew", "Anthony", "Donald", "Mark"]
FIRST_NAMES_FEMALE = ["Eleanor", "Sophia", "Maria", "Patricia", "Linda", "Barbara", "Elizabeth", "Jennifer", "Susan", "Margaret", "Jessica", "Sarah", "Karen", "Nancy", "Lisa"]
LAST_NAMES = ["Chen", "Vasquez", "Brody", "Patel", "O'Connor", "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez"]

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

def init_and_seed_db():
    conn = get_db_connection()
    cursor = conn.cursor()

    # Create Tables
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE,
        hashed_password TEXT,
        full_name TEXT,
        role TEXT,
        department TEXT,
        created_at TEXT
    )
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS patients (
        id TEXT PRIMARY KEY,
        mrn TEXT,
        first_name TEXT,
        last_name TEXT,
        gender TEXT,
        age_group TEXT,
        race TEXT,
        assigned_doctor_id TEXT,
        assigned_doctor_name TEXT,
        department TEXT,
        room_number TEXT,
        admission_date TEXT,
        admission_type TEXT,
        discharge_disposition TEXT,
        length_of_stay_days INTEGER,
        num_lab_procedures INTEGER,
        num_procedures INTEGER,
        num_medications INTEGER,
        number_outpatient INTEGER,
        number_emergency INTEGER,
        number_inpatient INTEGER,
        primary_diagnosis TEXT,
        secondary_diagnosis TEXT,
        tertiary_diagnosis TEXT,
        glucose_test TEXT,
        a1c_test TEXT,
        medication_change TEXT,
        diabetes_med TEXT,
        readmission_risk_score INTEGER,
        readmission_probability REAL,
        risk_level TEXT,
        risk_factors_json TEXT,
        treatment_plan TEXT,
        treatment_effectiveness TEXT,
        ai_insights TEXT,
        followup_recommendations_json TEXT,
        discharge_status TEXT,
        created_at TEXT
    )
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS predictions (
        id TEXT PRIMARY KEY,
        patient_id TEXT,
        patient_name TEXT,
        mrn TEXT,
        readmission_risk_score INTEGER,
        readmission_probability REAL,
        risk_level TEXT,
        risk_factors_json TEXT,
        model_used TEXT,
        timestamp TEXT
    )
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS audit_logs (
        id TEXT PRIMARY KEY,
        timestamp TEXT,
        user_email TEXT,
        user_role TEXT,
        action TEXT,
        resource TEXT,
        ip_address TEXT,
        status TEXT
    )
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS model_registry (
        id TEXT PRIMARY KEY,
        model_name TEXT,
        model_type TEXT,
        accuracy REAL,
        f1_score REAL,
        roc_auc REAL,
        dataset_size INTEGER,
        trained_at TEXT,
        is_active INTEGER
    )
    """)

    conn.commit()

    # Check if Users empty, seed users
    cursor.execute("SELECT COUNT(*) FROM users")
    if cursor.fetchone()[0] == 0:
        users = [
            ("usr_doc_001", "doctor@healthforecast.ai", get_password_hash("Doctor123!"), "Dr. Evelyn Vance, MD", "Doctor", "Cardiology & Internal Medicine", datetime.now(timezone.utc).isoformat()),
            ("usr_doc_001_alt", "doctor.vance@healthforecast.ai", get_password_hash("doctor123"), "Dr. Evelyn Vance, MD", "Doctor", "Cardiology & Internal Medicine", datetime.now(timezone.utc).isoformat()),
            ("usr_adm_001", "admin@healthforecast.ai", get_password_hash("Admin123!"), "Marcus Sterling", "Hospital Administrator", "Executive Operations & Strategy", datetime.now(timezone.utc).isoformat()),
            ("usr_adm_001_alt", "admin.sterling@healthforecast.ai", get_password_hash("admin123"), "Marcus Sterling", "Hospital Administrator", "Executive Operations & Strategy", datetime.now(timezone.utc).isoformat()),
            ("usr_res_001", "researcher@healthforecast.ai", get_password_hash("Researcher123!"), "Dr. Aris Thorne, PhD", "Healthcare Researcher", "Clinical Data Science & AI", datetime.now(timezone.utc).isoformat()),
            ("usr_res_001_alt", "researcher.thorne@healthforecast.ai", get_password_hash("researcher123"), "Dr. Aris Thorne, PhD", "Healthcare Researcher", "Clinical Data Science & AI", datetime.now(timezone.utc).isoformat()),
            ("usr_sys_001", "sysadmin@healthforecast.ai", get_password_hash("SysAdmin123!"), "Sarah Chen, CISSP", "System Administrator", "IT Infrastructure & Security", datetime.now(timezone.utc).isoformat()),
            ("usr_sys_001_alt", "sysadmin.chen@healthforecast.ai", get_password_hash("sysadmin123"), "Sarah Chen, CISSP", "System Administrator", "IT Infrastructure & Security", datetime.now(timezone.utc).isoformat())
        ]
        cursor.executemany("INSERT INTO users VALUES (?, ?, ?, ?, ?, ?, ?)", users)
        conn.commit()

    # Seed Patients from diabetic_data.csv
    cursor.execute("SELECT COUNT(*) FROM patients")
    if cursor.fetchone()[0] == 0:
        if os.path.exists(DATASET_PATH):
            df = pd.read_csv(DATASET_PATH)
            # Sample 100 real clinical patients
            sample_df = df.sample(n=100, random_state=42).reset_index(drop=True)
            patients_rows = []
            
            for idx, row in sample_df.iterrows():
                is_female = row.get("gender") == "Female"
                fn = FIRST_NAMES_FEMALE[idx % len(FIRST_NAMES_FEMALE)] if is_female else FIRST_NAMES_MALE[idx % len(FIRST_NAMES_MALE)]
                ln = LAST_NAMES[idx % len(LAST_NAMES)]
                mrn = f"MRN-{int(row['encounter_id']) % 900000 + 100000}"
                pat_id = f"pat_db_{idx+1:04d}"

                p_dict = {
                    "length_of_stay_days": int(row.get("time_in_hospital", 4)),
                    "num_lab_procedures": int(row.get("num_lab_procedures", 40)),
                    "num_procedures": int(row.get("num_procedures", 1)),
                    "num_medications": int(row.get("num_medications", 15)),
                    "number_outpatient": int(row.get("number_outpatient", 0)),
                    "number_emergency": int(row.get("number_emergency", 0)),
                    "number_inpatient": int(row.get("number_inpatient", 0)),
                    "glucose_test": str(row.get("max_glu_serum", "Norm")),
                    "a1c_test": str(row.get("A1Cresult", "Norm")),
                    "medication_change": str(row.get("change", "No")),
                    "diabetes_med": str(row.get("diabetesMed", "Yes")),
                    "primary_diagnosis": map_diag_code(str(row.get("diag_1")))
                }
                pred = predict_patient_readmission_risk(p_dict)

                factors = pred["risk_factors"]
                recs = [
                    "Schedule primary care follow-up within 7-14 days",
                    "Home nurse check-in for medication reconciliation",
                    "Continuous metabolic lab monitoring"
                ]

                p_row = (
                    pat_id,
                    mrn,
                    fn,
                    ln,
                    str(row.get("gender", "Other")),
                    str(row.get("age", "[60-70)")),
                    str(row.get("race", "Caucasian")),
                    "usr_doc_001",
                    "Dr. Evelyn Vance, MD",
                    "Cardiology" if idx % 3 == 0 else ("Internal Medicine" if idx % 3 == 1 else "Emergency Medicine"),
                    f"{300 + (idx % 25)}-{chr(65 + (idx % 3))}",
                    (datetime.now(timezone.utc) - timedelta(days=(idx * 2) % 30)).strftime("%Y-%m-%d"),
                    "Emergency" if str(row.get("admission_type_id")) == "1" else "Urgent",
                    "Discharged to Home" if str(row.get("discharge_disposition_id")) == "1" else "Snf (Skilled Nursing)",
                    int(row.get("time_in_hospital", 4)),
                    int(row.get("num_lab_procedures", 40)),
                    int(row.get("num_procedures", 1)),
                    int(row.get("num_medications", 15)),
                    int(row.get("number_outpatient", 0)),
                    int(row.get("number_emergency", 0)),
                    int(row.get("number_inpatient", 0)),
                    map_diag_code(str(row.get("diag_1"))),
                    map_diag_code(str(row.get("diag_2"))),
                    map_diag_code(str(row.get("diag_3"))),
                    str(row.get("max_glu_serum", "Norm")),
                    str(row.get("A1Cresult", "Norm")),
                    str(row.get("change", "No")),
                    str(row.get("diabetesMed", "Yes")),
                    pred["readmission_risk_score"],
                    pred["readmission_probability"],
                    pred["risk_level"],
                    json.dumps(factors),
                    f"Glycemic control protocol with {row.get('insulin', 'Metformin')} maintenance and daily lab monitoring.",
                    "Favorable metabolic stabilization during hospital stay.",
                    f"ML Random Forest model evaluates 30-day readmission probability at {int(pred['readmission_probability']*100)}% based on prior inpatient stays ({row.get('number_inpatient', 0)}) and lab procedures ({row.get('num_lab_procedures', 40)}).",
                    json.dumps(recs),
                    "Discharge Approved" if pred["risk_level"] != "HIGH" else "Requires High-Risk Monitoring",
                    datetime.now(timezone.utc).isoformat()
                )
                patients_rows.append(p_row)

            cursor.executemany("""
            INSERT INTO patients VALUES (
                ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
                ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
                ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
                ?, ?, ?, ?, ?, ?, ?, ?
            )
            """, patients_rows)
            conn.commit()

    # Seed Audit Logs
    cursor.execute("SELECT COUNT(*) FROM audit_logs")
    if cursor.fetchone()[0] == 0:
        logs = []
        for i in range(1, 15):
            logs.append((
                f"log_db_{i:03d}",
                (datetime.now(timezone.utc) - timedelta(hours=i*2)).isoformat(),
                "doctor@healthforecast.ai",
                "Doctor",
                "PATIENT_READMISSION_PREDICTION_EVAL",
                f"Patient Clinical Record #pat_db_{i:04d}",
                "127.0.0.1",
                "SUCCESS"
            ))
        cursor.executemany("INSERT INTO audit_logs VALUES (?, ?, ?, ?, ?, ?, ?, ?)", logs)
        conn.commit()

    # Seed AI Models
    cursor.execute("SELECT COUNT(*) FROM model_registry")
    if cursor.fetchone()[0] == 0:
        models = [
            ("mod_rf_01", "RandomForest-ClinicalEnsemble", "Random Forest Classifier", 0.7005, 0.6842, 0.6421, 101766, datetime.now(timezone.utc).isoformat(), 1),
            ("mod_xgb_01", "XGBoost-ReadmissionRiskV2", "XGBoost Gradient Booster", 0.6506, 0.6418, 0.6438, 101766, datetime.now(timezone.utc).isoformat(), 0)
        ]
        cursor.executemany("INSERT INTO model_registry VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)", models)
        conn.commit()

    conn.close()

# Execute initial seeding on module import
init_and_seed_db()
