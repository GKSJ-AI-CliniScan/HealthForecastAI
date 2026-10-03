# User Guide & Clinical Workflows — HealthForecast AI

Welcome to the HealthForecast AI platform user guide. This document describes end-to-end workflows tailored to each clinical and administrative role.

---

## 1. Getting Started & Logging In

1. Open your web browser and navigate to the application URL:
   - **Production**: `https://healthforecast-ai.vercel.app`
   - **Local**: `http://localhost:5173`
2. Enter your email and password on the login screen.
3. Upon authentication, you will be automatically routed to the dashboard corresponding to your assigned role.

### Sample Role Credentials (Development / Demonstration):
- **Doctor**: `doctor@healthforecast.ai` / `Password123!`
- **Hospital Administrator**: `admin@healthforecast.ai` / `Password123!`
- **Healthcare Researcher**: `researcher@healthforecast.ai` / `Password123!`
- **System Administrator**: `sysadmin@healthforecast.ai` / `Password123!`

---

## 2. Physician / Doctor Workflow

### 2.1 Navigating the Patient Roster
1. Click **Patients** in the primary navigation sidebar.
2. Use the search bar to locate patients by name, medical record number (MRN), or diagnosis keyword.
3. Sort patients by **Risk Score (Highest First)** to prioritize critical reviews.

### 2.2 Running a 30-Day Readmission Risk Assessment
1. Select a patient from your roster.
2. Click **Run Risk Assessment** or select an existing encounter.
3. Review clinical features populated from the electronic health record:
   - Prior acute hospitalizations within 12 months.
   - Total active medications (polypharmacy threshold).
   - Inpatient length of stay.
   - Diabetic medication adjustments (`Insulin: Up/Down/Steady`).
4. Click **Calculate Prediction**.
5. The model computes the risk score within 50ms:
   - **Risk Gauge**: 0–100 score with visual color coding (Green = Low, Amber = Medium, Red = High/Critical).
   - **Feature Impact Breakdown**: Highlights the top clinical contributors driving the risk score.
   - **Clinical Care Recommendations**: Displays suggested post-discharge pathways (e.g., 7-day outpatient consult, clinical pharmacy medication reconciliation).

### 2.3 Prescribing Treatments & Discharge Planning
1. Under the **Care Plan** tab, enter discharge instructions or select an evidence-based care protocol.
2. Click **Save Care Plan**. All updates are permanently logged to the patient's record with timestamp and clinician signature.

---

## 3. Hospital Administrator Workflow

### 3.1 Hospital-Wide Executive Dashboard
1. The **Hospital Dashboard** provides real-time facility intelligence:
   - **Total Monitored Inpatients**: Total active census.
   - **High-Risk Readmission Rate**: Proportion of current inpatients categorized as High/Critical.
   - **Readmission Trends**: 30-day historical trend comparing actual vs. predicted readmission curves.
2. Filter statistics by **Department** (Cardiology, Endocrinology, Internal Medicine, Surgery).

### 3.2 Departmental Bed & Resource Planning
1. View the **Department Risk Distribution** chart to allocate post-discharge nurse outreach coordinators to departments with the highest concentration of high-risk discharges.
2. Export weekly summary reports in PDF or CSV format for executive hospital committee review.

---

## 4. Healthcare Researcher Workflow

### 4.1 Accessing De-Identified Cohort Data
1. Navigate to the **Research & Cohorts** view.
2. Notice that HIPAA Safe Harbor de-identification is active:
   - Patient names and MRNs are automatically transformed into cryptographic pseudonyms (`ANON-PAT-XXXXXX`).
   - Dates of birth are aggregated into decade cohorts (`[60-70)`).
   - Direct contact information (phone numbers, addresses) is completely hidden.

### 4.2 Model Performance & Statistical Analysis
1. Inspect the **Model Telemetry** panel to view holdout validation statistics:
   - **ROC-AUC (0.6830)**
   - **Recall (52.88%)**
   - **Accuracy (70.27%)**
2. Download de-identified tabular datasets for academic evaluation and clinical studies.

---

## 5. System Administrator Workflow

### 5.1 User & Role Management
1. Click **Admin Console** > **Users**.
2. Create new clinical or research accounts, assign roles (`DOCTOR`, `HOSPITAL_ADMIN`, `RESEARCHER`), or deactivate inactive user profiles.

### 5.2 Audit Log Inspection
1. Navigate to **Audit Logs**.
2. Filter security logs by user, date, or action type (`PATIENT_READ`, `PREDICTION_EXECUTED`, `CARE_PLAN_SAVED`).
3. Audit logs are immutable and provide verifiable proof of regulatory compliance.
