import os
import subprocess
from pathlib import Path

def generate_sql():
    sql_lines = []
    
    sql_lines.append("SET DEFINE OFF;")
    sql_lines.append("SET SERVEROUTPUT ON;")
    sql_lines.append("ALTER SESSION SET NLS_DATE_FORMAT = 'YYYY-MM-DD';")
    sql_lines.append("ALTER SESSION SET NLS_TIMESTAMP_FORMAT = 'YYYY-MM-DD HH24:MI:SS';")
    sql_lines.append("")
    
    # Drops
    tables = [
        "AUDIT_LOGS", "CARE_RECOMMENDATIONS", "RECOVERY_MONITORING", "TREATMENTS",
        "READMISSION_PREDICTIONS", "MEDICAL_HISTORIES", "PATIENTS", "DATASET_METRICS",
        "AI_MODELS", "HOSPITAL_ANALYTICS", "USERS"
    ]
    for t in tables:
        sql_lines.append(f"BEGIN EXECUTE IMMEDIATE 'DROP TABLE {t} CASCADE CONSTRAINTS'; EXCEPTION WHEN OTHERS THEN NULL; END;\n/")
        
    seqs = [
        "USER_SEQ", "PATIENT_SEQ", "HISTORY_SEQ", "PREDICTION_SEQ", "TREATMENT_SEQ",
        "RECOVERY_SEQ", "RECOMMENDATION_SEQ", "MODEL_SEQ", "METRIC_SEQ", "ANALYTICS_SEQ", "AUDIT_SEQ"
    ]
    for s in seqs:
        sql_lines.append(f"BEGIN EXECUTE IMMEDIATE 'DROP SEQUENCE {s}'; EXCEPTION WHEN OTHERS THEN NULL; END;\n/")

    sql_lines.append("")
    sql_lines.append("-- CREATE SEQUENCES")
    sql_lines.append("CREATE SEQUENCE USER_SEQ START WITH 1 INCREMENT BY 1;")
    sql_lines.append("CREATE SEQUENCE PATIENT_SEQ START WITH 1001 INCREMENT BY 1;")
    sql_lines.append("CREATE SEQUENCE HISTORY_SEQ START WITH 5001 INCREMENT BY 1;")
    sql_lines.append("CREATE SEQUENCE PREDICTION_SEQ START WITH 8001 INCREMENT BY 1;")
    sql_lines.append("CREATE SEQUENCE TREATMENT_SEQ START WITH 3001 INCREMENT BY 1;")
    sql_lines.append("CREATE SEQUENCE RECOVERY_SEQ START WITH 4001 INCREMENT BY 1;")
    sql_lines.append("CREATE SEQUENCE RECOMMENDATION_SEQ START WITH 2001 INCREMENT BY 1;")
    sql_lines.append("CREATE SEQUENCE MODEL_SEQ START WITH 1 INCREMENT BY 1;")
    sql_lines.append("CREATE SEQUENCE METRIC_SEQ START WITH 1 INCREMENT BY 1;")
    sql_lines.append("CREATE SEQUENCE ANALYTICS_SEQ START WITH 1 INCREMENT BY 1;")
    sql_lines.append("CREATE SEQUENCE AUDIT_SEQ START WITH 1 INCREMENT BY 1;")
    sql_lines.append("")

    sql_lines.append("-- CREATE TABLES")
    sql_lines.append("""
CREATE TABLE USERS (
    USER_ID NUMBER PRIMARY KEY,
    FULL_NAME VARCHAR2(100) NOT NULL,
    EMAIL VARCHAR2(100) UNIQUE NOT NULL,
    HASHED_PASSWORD VARCHAR2(255) NOT NULL,
    ROLE VARCHAR2(50) NOT NULL,
    DEPARTMENT VARCHAR2(100),
    IS_ACTIVE NUMBER(1) DEFAULT 1,
    CREATED_AT TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE PATIENTS (
    PATIENT_ID NUMBER PRIMARY KEY,
    MEDICAL_RECORD_NUMBER VARCHAR2(50) UNIQUE NOT NULL,
    FIRST_NAME VARCHAR2(50) NOT NULL,
    LAST_NAME VARCHAR2(50) NOT NULL,
    GENDER VARCHAR2(20),
    AGE_GROUP VARCHAR2(20),
    RACE VARCHAR2(50),
    BLOOD_TYPE VARCHAR2(10),
    CONTACT_NUMBER VARCHAR2(30),
    PRIMARY_DOCTOR_ID NUMBER REFERENCES USERS(USER_ID),
    CREATED_AT TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE MEDICAL_HISTORIES (
    HISTORY_ID NUMBER PRIMARY KEY,
    PATIENT_ID NUMBER NOT NULL REFERENCES PATIENTS(PATIENT_ID) ON DELETE CASCADE,
    PRIMARY_DIAGNOSIS VARCHAR2(255),
    SECONDARY_DIAGNOSIS VARCHAR2(255),
    ADDITIONAL_DIAGNOSIS VARCHAR2(255),
    COMORBIDITIES_COUNT NUMBER DEFAULT 0,
    ADMISSION_TYPE VARCHAR2(50),
    NUM_LAB_PROCEDURES NUMBER DEFAULT 0,
    NUM_PROCEDURES NUMBER DEFAULT 0,
    NUM_MEDICATIONS NUMBER DEFAULT 0,
    NUMBER_OUTPATIENT NUMBER DEFAULT 0,
    NUMBER_EMERGENCY NUMBER DEFAULT 0,
    NUMBER_INPATIENT NUMBER DEFAULT 0,
    TIME_IN_HOSPITAL NUMBER DEFAULT 1,
    ADMISSION_DATE DATE,
    DISCHARGE_DATE DATE
);

CREATE TABLE READMISSION_PREDICTIONS (
    PREDICTION_ID NUMBER PRIMARY KEY,
    PATIENT_ID NUMBER NOT NULL REFERENCES PATIENTS(PATIENT_ID) ON DELETE CASCADE,
    MODEL_NAME VARCHAR2(50) NOT NULL,
    READMISSION_RISK_SCORE NUMBER(6,4) NOT NULL,
    RISK_CATEGORY VARCHAR2(20) NOT NULL,
    PREDICTED_READMIT_30D NUMBER(1) NOT NULL,
    CONFIDENCE_INTERVAL VARCHAR2(50),
    PREDICTION_DATE TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE TREATMENTS (
    TREATMENT_ID NUMBER PRIMARY KEY,
    PATIENT_ID NUMBER NOT NULL REFERENCES PATIENTS(PATIENT_ID) ON DELETE CASCADE,
    MEDICATION_NAME VARCHAR2(100) NOT NULL,
    DOSAGE VARCHAR2(50),
    FREQUENCY VARCHAR2(50),
    START_DATE DATE,
    END_DATE DATE,
    EFFECTIVENESS_SCORE NUMBER(5,2),
    STATUS VARCHAR2(30) DEFAULT 'ACTIVE'
);

CREATE TABLE RECOVERY_MONITORING (
    OUTCOME_ID NUMBER PRIMARY KEY,
    PATIENT_ID NUMBER NOT NULL REFERENCES PATIENTS(PATIENT_ID) ON DELETE CASCADE,
    TREATMENT_ID NUMBER REFERENCES TREATMENTS(TREATMENT_ID) ON DELETE CASCADE,
    RECOVERY_SCORE NUMBER(5,2),
    SIDE_EFFECTS VARCHAR2(255),
    READMITTED_30D NUMBER(1) DEFAULT 0,
    FOLLOW_UP_DATE DATE,
    OUTCOME_NOTES VARCHAR2(500)
);

CREATE TABLE CARE_RECOMMENDATIONS (
    RECOMMENDATION_ID NUMBER PRIMARY KEY,
    PATIENT_ID NUMBER NOT NULL REFERENCES PATIENTS(PATIENT_ID) ON DELETE CASCADE,
    DOCTOR_ID NUMBER REFERENCES USERS(USER_ID),
    RISK_LEVEL VARCHAR2(20),
    CARE_PLAN_SUMMARY VARCHAR2(1000),
    FOLLOW_UP_SCHEDULE VARCHAR2(255),
    MEDICATION_ADJUSTMENT VARCHAR2(500),
    DISCHARGE_SUPPORT VARCHAR2(500),
    CREATED_AT TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE AI_MODELS (
    MODEL_ID NUMBER PRIMARY KEY,
    MODEL_NAME VARCHAR2(50) UNIQUE NOT NULL,
    ALGORITHM VARCHAR2(50) NOT NULL,
    ACCURACY NUMBER(6,4),
    PRECISION_SCORE NUMBER(6,4),
    RECALL_SCORE NUMBER(6,4),
    F1_SCORE NUMBER(6,4),
    ROC_AUC NUMBER(6,4),
    HYPERPARAMETERS VARCHAR2(1000),
    IS_PROMOTED NUMBER(1) DEFAULT 0,
    TRAINED_AT TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE DATASET_METRICS (
    METRIC_ID NUMBER PRIMARY KEY,
    DATASET_NAME VARCHAR2(100) NOT NULL,
    TOTAL_RECORDS NUMBER NOT NULL,
    TRAIN_RECORDS NUMBER NOT NULL,
    TEST_RECORDS NUMBER NOT NULL,
    NUM_FEATURES NUMBER NOT NULL,
    DECISION_THRESHOLD NUMBER(6,4),
    UPDATED_AT TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE HOSPITAL_ANALYTICS (
    ANALYTICS_ID NUMBER PRIMARY KEY,
    REPORT_DATE DATE NOT NULL,
    TOTAL_ADMISSIONS NUMBER NOT NULL,
    READMISSION_RATE NUMBER(5,2) NOT NULL,
    HIGH_RISK_COUNT NUMBER NOT NULL,
    AVG_LENGTH_OF_STAY NUMBER(4,1),
    TREATMENT_SUCCESS_RATE NUMBER(5,2)
);

CREATE TABLE AUDIT_LOGS (
    LOG_ID NUMBER PRIMARY KEY,
    USER_ID NUMBER REFERENCES USERS(USER_ID),
    ACTION VARCHAR2(100) NOT NULL,
    RESOURCE_NAME VARCHAR2(100),
    TIMESTAMP TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    DETAILS VARCHAR2(500)
);
""")

    # Seed data
    sql_lines.append("-- SEED USERS")
    # Passwords hashed with bcrypt for Password123!
    pwd_hash = "$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeg6Lruj3vjPGga31lW"
    
    users_data = [
        (1, 'System Administrator', 'admin@healthforecast.org', pwd_hash, 'system_admin', 'IT & Operations'),
        (2, 'Hospital Administrator', 'admin.ops@healthforecast.org', pwd_hash, 'hospital_admin', 'Hospital Management'),
        (3, 'Dr. Rajesh Reddy', 'dr.reddy@healthforecast.org', pwd_hash, 'doctor', 'Endocrinology & Internal Medicine'),
        (4, 'Dr. Ananya Sharma', 'dr.sharma@healthforecast.org', pwd_hash, 'doctor', 'Cardiology'),
        (5, 'Dr. Vikram Malhotra', 'dr.malhotra@healthforecast.org', pwd_hash, 'doctor', 'Nephrology'),
        (6, 'Healthcare Researcher', 'researcher@healthforecast.org', pwd_hash, 'researcher', 'Clinical Analytics & AI Research')
    ]
    for u in users_data:
        sql_lines.append(
            f"INSERT INTO USERS (USER_ID, FULL_NAME, EMAIL, HASHED_PASSWORD, ROLE, DEPARTMENT) "
            f"VALUES ({u[0]}, '{u[1]}', '{u[2]}', '{u[3]}', '{u[4]}', '{u[5]}');"
        )
        
    sql_lines.append("")
    sql_lines.append("-- SEED PATIENTS")
    patients_data = [
        (1001, 'MRN-789012', 'Aarav', 'Patel', 'Male', '[60-70)', 'Caucasian', 'O+', '+1-555-0101', 3),
        (1002, 'MRN-789013', 'Priya', 'Sharma', 'Female', '[70-80)', 'AfricanAmerican', 'A+', '+1-555-0102', 3),
        (1003, 'MRN-789014', 'Rohan', 'Verma', 'Male', '[50-60)', 'Asian', 'B+', '+1-555-0103', 4),
        (1004, 'MRN-789015', 'Sunita', 'Deshmukh', 'Female', '[80-90)', 'Caucasian', 'AB+', '+1-555-0104', 3),
        (1005, 'MRN-789016', 'Karan', 'Singh', 'Male', '[40-50)', 'Hispanic', 'O-', '+1-555-0105', 5),
        (1006, 'MRN-789017', 'Meera', 'Nair', 'Female', '[60-70)', 'Other', 'A-', '+1-555-0106', 4),
        (1007, 'MRN-789018', 'Vikram', 'Joshi', 'Male', '[70-80)', 'Caucasian', 'B-', '+1-555-0107', 3),
        (1008, 'MRN-789019', 'Neha', 'Gupta', 'Female', '[50-60)', 'AfricanAmerican', 'O+', '+1-555-0108', 5)
    ]
    for p in patients_data:
        sql_lines.append(
            f"INSERT INTO PATIENTS (PATIENT_ID, MEDICAL_RECORD_NUMBER, FIRST_NAME, LAST_NAME, GENDER, AGE_GROUP, RACE, BLOOD_TYPE, CONTACT_NUMBER, PRIMARY_DOCTOR_ID) "
            f"VALUES ({p[0]}, '{p[1]}', '{p[2]}', '{p[3]}', '{p[4]}', '{p[5]}', '{p[6]}', '{p[7]}', '{p[8]}', {p[9]});"
        )

    sql_lines.append("")
    sql_lines.append("-- SEED MEDICAL HISTORIES")
    histories_data = [
        (5001, 1001, 'Diabetes mellitus with renal manifestations (ICD 250.4)', 'Hypertensive chronic kidney disease (ICD 403)', 'Hyperlipidemia (ICD 272.4)', 4, 'Emergency', 68, 3, 18, 1, 2, 3, 7, '2026-08-01', '2026-08-08'),
        (5002, 1002, 'Type 2 diabetes with neurological complications (ICD 250.6)', 'Coronary atherosclerosis (ICD 414.0)', 'Congestive heart failure (ICD 428.0)', 5, 'Urgent', 74, 4, 22, 2, 1, 4, 9, '2026-08-05', '2026-08-14'),
        (5003, 1003, 'Uncontrolled Type 2 Diabetes Mellitus (ICD 250.02)', 'Essential primary hypertension (ICD 401.9)', 'None', 2, 'Elective', 42, 1, 12, 0, 0, 1, 3, '2026-08-10', '2026-08-13'),
        (5004, 1004, 'Diabetic ketoacidosis (ICD 250.13)', 'Acute kidney failure (ICD 584.9)', 'Atrial fibrillation (ICD 427.31)', 6, 'Emergency', 85, 5, 26, 3, 4, 5, 12, '2026-08-12', '2026-08-24'),
        (5005, 1005, 'Diabetes mellitus with ophthalmic manifestations (ICD 250.5)', 'Obesity (ICD 278.0)', 'Asthma (ICD 493.9)', 3, 'Urgent', 51, 2, 14, 1, 0, 2, 5, '2026-08-15', '2026-08-20'),
        (5006, 1006, 'Type 2 diabetes mellitus without complications (ICD 250.00)', 'Osteoarthritis (ICD 715.9)', 'None', 1, 'Elective', 38, 1, 9, 0, 0, 1, 2, '2026-08-18', '2026-08-20'),
        (5007, 1007, 'Diabetic peripheral angiopathy (ICD 250.7)', 'Peripheral vascular disease (ICD 443.9)', 'Hypertension (ICD 401.9)', 4, 'Emergency', 62, 3, 19, 2, 1, 3, 8, '2026-08-22', '2026-08-30'),
        (5008, 1008, 'Type 2 diabetes with hypoglycemia (ICD 250.8)', 'Major depressive disorder (ICD 296.2)', 'Hypothyroidism (ICD 244.9)', 3, 'Emergency', 49, 2, 15, 1, 1, 2, 4, '2026-08-25', '2026-08-29')
    ]
    for h in histories_data:
        sql_lines.append(
            f"INSERT INTO MEDICAL_HISTORIES (HISTORY_ID, PATIENT_ID, PRIMARY_DIAGNOSIS, SECONDARY_DIAGNOSIS, ADDITIONAL_DIAGNOSIS, COMORBIDITIES_COUNT, ADMISSION_TYPE, NUM_LAB_PROCEDURES, NUM_PROCEDURES, NUM_MEDICATIONS, NUMBER_OUTPATIENT, NUMBER_EMERGENCY, NUMBER_INPATIENT, TIME_IN_HOSPITAL, ADMISSION_DATE, DISCHARGE_DATE) "
            f"VALUES ({h[0]}, {h[1]}, '{h[2]}', '{h[3]}', '{h[4]}', {h[5]}, '{h[6]}', {h[7]}, {h[8]}, {h[9]}, {h[10]}, {h[11]}, {h[12]}, {h[13]}, TO_DATE('{h[14]}', 'YYYY-MM-DD'), TO_DATE('{h[15]}', 'YYYY-MM-DD'));"
        )

    sql_lines.append("")
    sql_lines.append("-- SEED READMISSION PREDICTIONS")
    predictions_data = [
        (8001, 1001, 'Random Forest Classifier', 0.8150, 'HIGH', 1, '95% CI (0.76 - 0.86)'),
        (8002, 1002, 'XGBoost Classifier', 0.8820, 'HIGH', 1, '95% CI (0.83 - 0.92)'),
        (8003, 1003, 'Random Forest Classifier', 0.2410, 'LOW', 0, '95% CI (0.19 - 0.29)'),
        (8004, 1004, 'XGBoost Classifier', 0.9140, 'HIGH', 1, '95% CI (0.87 - 0.95)'),
        (8005, 1005, 'Random Forest Classifier', 0.4850, 'MEDIUM', 0, '95% CI (0.42 - 0.54)'),
        (8006, 1006, 'Random Forest Classifier', 0.1820, 'LOW', 0, '95% CI (0.13 - 0.23)'),
        (8007, 1007, 'XGBoost Classifier', 0.7640, 'HIGH', 1, '95% CI (0.71 - 0.81)'),
        (8008, 1008, 'Random Forest Classifier', 0.3950, 'MEDIUM', 0, '95% CI (0.33 - 0.45)')
    ]
    for pr in predictions_data:
        sql_lines.append(
            f"INSERT INTO READMISSION_PREDICTIONS (PREDICTION_ID, PATIENT_ID, MODEL_NAME, READMISSION_RISK_SCORE, RISK_CATEGORY, PREDICTED_READMIT_30D, CONFIDENCE_INTERVAL) "
            f"VALUES ({pr[0]}, {pr[1]}, '{pr[2]}', {pr[3]}, '{pr[4]}', {pr[5]}, '{pr[6]}');"
        )

    sql_lines.append("")
    sql_lines.append("-- SEED TREATMENTS")
    treatments_data = [
        (3001, 1001, 'Metformin + Insulin Glargine', '1000mg / 20 units', 'Twice daily', '2026-08-08', '2026-09-08', 84.50, 'ACTIVE'),
        (3002, 1002, 'Insulin Lispro + Empagliflozin', '15 units / 10mg', 'Three times daily', '2026-08-14', '2026-09-14', 78.20, 'ACTIVE'),
        (3003, 1003, 'Metformin HCl', '500mg', 'Twice daily', '2026-08-13', '2026-11-13', 92.00, 'ACTIVE'),
        (3004, 1004, 'Insulin Regular + Sitagliptin', '25 units / 100mg', 'Four times daily', '2026-08-24', '2026-09-24', 69.50, 'ACTIVE'),
        (3005, 1005, 'Glipizide XL', '5mg', 'Once daily', '2026-08-20', '2026-10-20', 88.00, 'ACTIVE'),
        (3006, 1006, 'Metformin XR', '850mg', 'Once daily', '2026-08-20', '2026-11-20', 95.00, 'ACTIVE'),
        (3007, 1007, 'Insulin Glargine + Pioglitazone', '30 units / 15mg', 'Twice daily', '2026-08-30', '2026-09-30', 81.00, 'ACTIVE'),
        (3008, 1008, 'Liraglutide (Victoza)', '1.2mg injection', 'Once daily', '2026-08-29', '2026-09-29', 86.50, 'ACTIVE')
    ]
    for tr in treatments_data:
        sql_lines.append(
            f"INSERT INTO TREATMENTS (TREATMENT_ID, PATIENT_ID, MEDICATION_NAME, DOSAGE, FREQUENCY, START_DATE, END_DATE, EFFECTIVENESS_SCORE, STATUS) "
            f"VALUES ({tr[0]}, {tr[1]}, '{tr[2]}', '{tr[3]}', '{tr[4]}', TO_DATE('{tr[5]}', 'YYYY-MM-DD'), TO_DATE('{tr[6]}', 'YYYY-MM-DD'), {tr[7]}, '{tr[8]}');"
        )

    sql_lines.append("")
    sql_lines.append("-- SEED RECOVERY MONITORING")
    recovery_data = [
        (4001, 1001, 3001, 82.00, 'Mild nausea, controlled HbA1c', 0, '2026-09-15', 'HbA1c decreased from 9.2% to 7.8%. Blood pressure stabilized.'),
        (4002, 1002, 3002, 74.50, 'Occasional hypoglycemia episodes', 1, '2026-09-10', 'Readmitted due to heart failure exacerbation; insulin dosage adjusted.'),
        (4003, 1003, 3003, 94.00, 'None reported', 0, '2026-09-20', 'Excellent glycemic control. Glucose levels within target 110-130 mg/dL.'),
        (4004, 1004, 3004, 68.00, 'Renal clearance monitoring required', 1, '2026-09-05', 'High risk readmission within 18 days; transition care team assigned.'),
        (4005, 1005, 3005, 89.00, 'Mild dizziness in morning', 0, '2026-09-18', 'Patient compliant with diet and medication routine.'),
        (4006, 1006, 3006, 96.00, 'None', 0, '2026-09-25', 'Complete symptom resolution. Normal fasting blood glucose.'),
        (4007, 1007, 3007, 79.00, 'Mild peripheral edema', 0, '2026-09-12', 'Wound healing progressing following vascular consult.'),
        (4008, 1008, 3008, 87.50, 'Transient appetite suppression', 0, '2026-09-22', 'Significant improvement in mood and glycemic stability.')
    ]
    for rc in recovery_data:
        sql_lines.append(
            f"INSERT INTO RECOVERY_MONITORING (OUTCOME_ID, PATIENT_ID, TREATMENT_ID, RECOVERY_SCORE, SIDE_EFFECTS, READMITTED_30D, FOLLOW_UP_DATE, OUTCOME_NOTES) "
            f"VALUES ({rc[0]}, {rc[1]}, {rc[2]}, {rc[3]}, '{rc[4]}', {rc[5]}, TO_DATE('{rc[6]}', 'YYYY-MM-DD'), '{rc[7]}');"
        )

    sql_lines.append("")
    sql_lines.append("-- SEED CARE RECOMMENDATIONS")
    recommendations_data = [
        (2001, 1001, 3, 'HIGH', 'Intensive 30-day post-discharge monitoring. Weekly tele-health nurse check-in.', '2026-09-15', 'Adjust Insulin Glargine to 18 units if morning glucose > 140 mg/dL.', 'Provide home blood glucose monitor and nephrology follow-up voucher.'),
        (2002, 1002, 3, 'HIGH', 'Cardiology & Endocrinology co-management. Strict sodium and fluid restriction.', '2026-09-10', 'Hold Empagliflozin if eGFR drops below 30 mL/min.', 'Home health nurse visit within 48 hours of discharge.'),
        (2003, 1003, 4, 'LOW', 'Standard diabetes management and routine quarterly HbA1c review.', '2026-09-20', 'Maintain Metformin 500mg BID.', 'Nutritional counseling and exercise guidance provided.'),
        (2004, 1004, 3, 'HIGH', 'High-Risk Readmission protocol. Outpatient dialysis coordination.', '2026-09-05', 'Taper regular insulin based on sliding scale.', 'Dedicated case manager appointed for medication reconciliation.')
    ]
    for rm in recommendations_data:
        sql_lines.append(
            f"INSERT INTO CARE_RECOMMENDATIONS (RECOMMENDATION_ID, PATIENT_ID, DOCTOR_ID, RISK_LEVEL, CARE_PLAN_SUMMARY, FOLLOW_UP_SCHEDULE, MEDICATION_ADJUSTMENT, DISCHARGE_SUPPORT) "
            f"VALUES ({rm[0]}, {rm[1]}, {rm[2]}, '{rm[3]}', '{rm[4]}', '{rm[5]}', '{rm[6]}', '{rm[7]}');"
        )

    sql_lines.append("")
    sql_lines.append("-- SEED AI MODELS")
    models_data = [
        (1, 'Random Forest Classifier', 'RandomForestClassifier', 0.7871, 0.7450, 0.3620, 0.4870, 0.6512, '{"n_estimators": 250, "max_depth": 10, "min_samples_split": 10, "class_weight": "balanced", "random_state": 42}', 1),
        (2, 'XGBoost Classifier', 'XGBClassifier', 0.7903, 0.7580, 0.3410, 0.4710, 0.6391, '{"n_estimators": 200, "max_depth": 4, "learning_rate": 0.03, "subsample": 0.8, "scale_pos_weight": 2.5, "random_state": 42}', 0),
        (3, 'Logistic Regression', 'LogisticRegression', 0.7883, 0.7410, 0.3580, 0.4830, 0.6502, '{"C": 0.1, "max_iter": 1000, "solver": "lbfgs", "class_weight": "balanced", "random_state": 42}', 0)
    ]
    for m in models_data:
        sql_lines.append(
            f"INSERT INTO AI_MODELS (MODEL_ID, MODEL_NAME, ALGORITHM, ACCURACY, PRECISION_SCORE, RECALL_SCORE, F1_SCORE, ROC_AUC, HYPERPARAMETERS, IS_PROMOTED) "
            f"VALUES ({m[0]}, '{m[1]}', '{m[2]}', {m[3]}, {m[4]}, {m[5]}, {m[6]}, {m[7]}, '{m[8]}', {m[9]});"
        )

    sql_lines.append("")
    sql_lines.append("-- SEED DATASET METRICS")
    metrics_data = [
        (1, 'Diabetes 130-US Hospitals Dataset', 101766, 81412, 20354, 42, 0.1285)
    ]
    for dm in metrics_data:
        sql_lines.append(
            f"INSERT INTO DATASET_METRICS (METRIC_ID, DATASET_NAME, TOTAL_RECORDS, TRAIN_RECORDS, TEST_RECORDS, NUM_FEATURES, DECISION_THRESHOLD) "
            f"VALUES ({dm[0]}, '{dm[1]}', {dm[2]}, {dm[3]}, {dm[4]}, {dm[5]}, {dm[6]});"
        )

    sql_lines.append("")
    sql_lines.append("-- SEED HOSPITAL ANALYTICS")
    analytics_data = [
        (1, '2026-08-31', 1250, 11.20, 142, 4.8, 88.50),
        (2, '2026-07-31', 1190, 11.80, 155, 5.1, 86.20),
        (3, '2026-06-30', 1310, 12.10, 168, 5.0, 85.70),
        (4, '2026-05-31', 1280, 12.50, 174, 5.3, 84.90)
    ]
    for ha in analytics_data:
        sql_lines.append(
            f"INSERT INTO HOSPITAL_ANALYTICS (ANALYTICS_ID, REPORT_DATE, TOTAL_ADMISSIONS, READMISSION_RATE, HIGH_RISK_COUNT, AVG_LENGTH_OF_STAY, TREATMENT_SUCCESS_RATE) "
            f"VALUES ({ha[0]}, TO_DATE('{ha[1]}', 'YYYY-MM-DD'), {ha[2]}, {ha[3]}, {ha[4]}, {ha[5]}, {ha[6]});"
        )

    sql_lines.append("")
    sql_lines.append("-- SEED AUDIT LOGS")
    audit_data = [
        (1, 1, 'USER_LOGIN', 'AUTH_SERVICE', 'System Administrator logged in successfully.'),
        (2, 3, 'VIEW_PATIENT_RECORD', 'PATIENT_1001', 'Dr. Rajesh Reddy accessed medical history for Aarav Patel.'),
        (3, 1, 'MODEL_RETRAIN', 'RANDOM_FOREST', 'Model retrained on 101,766 records. Test accuracy: 78.71%.'),
        (4, 2, 'GENERATE_REPORT', 'HOSPITAL_ANALYTICS', 'Hospital Administrator generated monthly readmission performance report.')
    ]
    for ad in audit_data:
        sql_lines.append(
            f"INSERT INTO AUDIT_LOGS (LOG_ID, USER_ID, ACTION, RESOURCE_NAME, DETAILS) "
            f"VALUES ({ad[0]}, {ad[1]}, '{ad[2]}', '{ad[3]}', '{ad[4]}');"
        )

    sql_lines.append("")
    sql_lines.append("COMMIT;")
    sql_lines.append("PROMPT --- HEALTHFORECAST AI ORACLE DATABASE SETUP COMPLETED ---")
    sql_lines.append("EXIT;")
    
    return "\n".join(sql_lines)

if __name__ == '__main__':
    sql_script = generate_sql()
    out_path = Path("scripts/setup_oracle_db.sql")
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(sql_script, encoding="utf-8")
    print(f"Generated Oracle SQL script at {out_path.resolve()}")
