# HealthForecast AI — Final Project Presentation Outline
## 21-Slide Executive & Technical Presentation Deck

---

### Slide 1: Title Slide
- **Title**: HealthForecast AI
- **Subtitle**: Hospital Readmission Prediction & Patient Risk Intelligence Platform
- **Presenter**: Engineering Team
- **Stack**: React 18 (Vercel) | FastAPI & Scikit-Learn (Render) | Serverless PostgreSQL (Neon)

---

### Slide 2: The Healthcare Challenge: 30-Day Readmissions
- **The Problem**: 30-day all-cause hospital readmission is a critical driver of patient mortality and hospital financial distress.
- **Financial Toll**: Over $26 Billion in annual preventable healthcare expenditures in the US alone.
- **Regulatory Pressure**: CMS Hospital Readmissions Reduction Program (HRRP) penalizes hospitals with up to 3% reimbursement cuts.
- **Diabetic Population**: Acute glycemic volatility and comorbidities lead to >15% readmission rates.

---

### Slide 3: Project Vision & Strategic Objectives
- **Core Vision**: Transform reactive hospital discharge into predictive, proactive transitional care.
- **Key Deliverables**:
  - Sub-50ms real-time readmission risk scoring.
  - Transparent clinical explainability (top contributing risk factors).
  - Role-based clinical workflows tailored to physicians, administrators, and researchers.
  - HIPAA-compliant de-identification for population health research.
  - Production deployment on modern cloud platforms (Vercel, Render, Neon).

---

### Slide 4: System Architecture Overview
- **Decoupled 3-Tier Design**:
  - **Frontend (Vercel)**: React 18, Vite, TypeScript, glassmorphism design system.
  - **Backend (Render)**: Python 3.11, FastAPI, Uvicorn, SQLAlchemy 2.0 ORM.
  - **Database (Neon)**: Serverless PostgreSQL 16 with TLS/SSL encryption and connection pooling.
- **Integration**: Secure HTTPS REST communication with JWT stateless authentication.

---

### Slide 5: The Clinical Dataset (130-US Hospitals)
- **Data Source**: Retrospective inpatient encounters from 130 medical centers (1999–2008).
- **Volume**: 101,766 inpatient encounters across 71,518 unique patients.
- **Features**: 50 clinical, demographic, pharmaceutical, and administrative attributes.
- **Target Outcome**: Binary acute 30-day readmission ($11.16\%$ positive prevalence).

---

### Slide 6: Clinical Feature Engineering & Data Preparation
- **Healthcare Aggregations**:
  - Total prior utilization (`total_prior_visits` = emergency + inpatient + outpatient).
  - Prior inpatient severity ratio (`prior_inpatient_ratio`).
- **ICD-9 Groupings**: Grouped 700+ codes into 9 clinical categories (Circulatory, Respiratory, Diabetes, etc.).
- **Medication Signals**: Active diabetic medication adjustments (`change == 'Ch'`).
- **Robust Preprocessing**: Missing value imputation and one-hot encoding fitted strictly on training data.

---

### Slide 7: Model Exploration & Training Methodology
- **Tackling Class Imbalance**:
  - Severe class skew (11.16% readmitted vs. 88.84% not readmitted).
  - Implemented cost-sensitive learning via balanced class weights (`class_weight='balanced'`).
- **Candidate Models Evaluated**:
  - Random Forest Classifier (200 trees, depth 16).
  - XGBoost Classifier (150 trees, depth 6, `scale_pos_weight=7.96`).
- **Validation**: 80/20 stratified train/test split with 5-fold cross-validation.

---

### Slide 8: Model Evaluation & Benchmark Results
- **Comparison on Holdout Test Set ($N=20,354$)**:
  - **Random Forest**: **ROC-AUC: 0.6830** | **Accuracy: 70.27%** | **Recall: 52.88%** | **F1: 0.2841**
  - **XGBoost**: ROC-AUC: 0.6829 | Accuracy: 66.82% | Recall: 57.99% | F1: 0.2806
- **Selection Decision**: Random Forest selected for superior ROC-AUC and 70.27% accuracy, reducing clinical alert fatigue.

---

### Slide 9: Clinical Explainability & Top Risk Drivers
- **Opening the "Black Box"**:
  - Inpatient hospitalizations in past year: $+24.5\%$ risk impact.
  - Polypharmacy (>15 medications): $+16.2\%$ risk impact.
  - Inpatient length of stay: $+11.8\%$ risk impact.
  - Glycemic volatility (insulin dose increase): $+9.4\%$ risk impact.
- **Clinical Value**: Clinicians see exactly why a patient is categorized as high risk.

---

### Slide 10: Real-Time Machine Learning Inference Engine
- **In-Memory Preloading**: Zero cold-start latency; models loaded during FastAPI startup.
- **Latency Benchmark**: **32–45 ms** per prediction (under the 50 ms clinical target).
- **Clinical Risk Bands**:
  - Low Risk (0–30%): Standard discharge pathway.
  - Medium Risk (31–70%): Post-discharge care coordination.
  - High Risk (71–100%): Intensive multidisciplinary transitional care.

---

### Slide 11: Frontend Experience & Design Philosophy
- **Rich Aesthetics**: Custom dark-mode glassmorphic interface with translucent cards, glowing indicators, and fluid typography.
- **Responsive Layouts**: Optimized for desktop clinical workstations, tablets, and mobile devices.
- **Interactive Visualizations**: Risk score gauges, trend sparklines, and patient priority rosters.

---

### Slide 12: Doctor / Physician Clinical Workflow
- **Patient Roster**: Sort and filter assigned patients by predicted risk score.
- **Instant Risk Assessment**: 1-click risk calculation with immediate feature breakdown.
- **Actionable Care Protocols**: Evidence-based suggestions (e.g., 7-day follow-up, clinical pharmacy consult).
- **Care Plan Documentation**: Save post-discharge instructions directly into the patient record.

---

### Slide 13: Hospital Administrator Executive Dashboard
- **Operational Intelligence**:
  - Monitored bed census and high-risk patient count.
  - Historical 30-day actual vs. predicted readmission trends.
  - Departmental risk comparisons (Cardiology, Endocrinology, Internal Medicine).
- **Resource Allocation**: Direct discharge care coordinators to departments with peak readmission spikes.

---

### Slide 14: Healthcare Researcher & HIPAA De-Identification
- **Safe Harbor Compliance**: Automatic anonymization for research accounts.
- **Salted Pseudonymization**: Real patient identities transformed into `ANON-PAT-XXXXXX` hashes.
- **Protected Health Information**: Contact numbers, SSNs, and exact dates suppressed.
- **Cohort Analysis**: Population-level trend modeling and model validation telemetry.

---

### Slide 15: Security, RBAC & Governance
- **Defense in Depth**:
  - Stateless JWT authentication (HS256 with 256-bit cryptographically secure keys).
  - Role-Based Access Control enforced at backend API endpoints and frontend route guards.
  - Strict production CORS whitelisting (no wildcard origins).
  - 100% parameterized SQLAlchemy 2.0 ORM queries preventing SQL injection.
  - Append-only immutable audit trail recording all patient record interactions.

---

### Slide 16: Cloud Deployment Architecture
- **Dedicated Single Approach**:
  - **Frontend**: Vercel (Edge CDN, SPA routing via `vercel.json`).
  - **Backend**: Render (FastAPI web service, Python 3.11, Uvicorn, health check `/health`).
  - **Database**: Neon (Serverless PostgreSQL 16 with SSL `?sslmode=require`).
- **No legacy cloud overhead**: Clean, cost-effective, serverless-ready stack.

---

### Slide 17: CI/CD & Automated Quality Assurance
- **Automated Validation Pipeline**:
  - Backend Tests: **52/52 tests passing** via Pytest in 13.6s.
  - Code Hygiene: Ruff linting (0 errors), Black formatting (100% compliant).
  - Frontend Build: TypeScript compilation (0 errors), Vite production bundle generated cleanly.
  - Security Scan: Zero secrets or credentials committed (`scripts/ci/check_secrets.py`).

---

### Slide 18: Live System Demonstration
- **Scenario**: Diabetic inpatient admission nearing discharge with multiple prior visits and insulin adjustments.
- **Demo Steps**:
  1. Physician logs in to Doctor Dashboard.
  2. Selects patient and triggers Readmission Risk Assessment.
  3. Evaluates 78% High-Risk score and top drivers (prior admissions + polypharmacy).
  4. Prescribes transitional care protocol.
  5. Demonstrates Administrator overview and Researcher de-identified cohort view.

---

### Slide 19: Clinical Limitations & Safety Guardrails
- **Decision Support Only**: Explicit disclaimer that AI outputs augment physician judgment and never provide autonomous diagnoses.
- **Data Scope**: Administrative EHR data; unmeasured post-discharge social determinants must be evaluated by clinical staff.
- **Drift Monitoring**: Continuous calibration tracking to trigger retraining if hospital demographics shift.

---

### Slide 20: Future Enhancements & Strategic Roadmap
- **FHIR / HL7 Interoperability**: SMART-on-FHIR connectors for Epic and Cerner EHRs.
- **Wearable Telemetry**: Ingesting real-time Continuous Glucose Monitor (CGM) streams post-discharge.
- **Generative AI Summaries**: Multilingual patient discharge instructions generated using specialized medical LLMs.

---

### Slide 21: Q&A and Conclusion
- **Summary**: HealthForecast AI provides an end-to-end, validated, cloud-ready solution for reducing 30-day hospital readmissions.
- **Thank You!**
- **Questions & Discussion**.
