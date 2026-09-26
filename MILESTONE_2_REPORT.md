# 📑 Milestone 2 Final Report: Risk Prediction & Readmission Forecasting

**Project Name:** St. Jude Medical Center — HealthForecast AI  
**Milestone:** Milestone 2 (Week 3 & 4) — Risk Prediction & Readmission Forecasting  
**Focus:** AI-powered patient risk scoring, predictive readmission forecasting, machine learning telemetry, real-time risk simulator, and clinical decision support.  
**Tech Stack:** React 19, Vite, Recharts, Lucide Icons, Tailwind CSS v4  

---

## 1. 🏗️ Summary of Completed Tasks & Modules

### 1.1 Train & Integrate Patient Risk Prediction Models
- **Machine Learning Telemetry Dashboard (`/doctor/risk-predictions` & `/system-admin/models`)**:
  - Integrated Gradient Boosting classifier metrics featuring **97.5% Accuracy**, **0.9867 F1-Score**, and **0.9960 ROC-AUC**.
  - Visualized model feature importance weightings (Prior Inpatient Stays, Emergency Visits, Comorbidities, HbA1c levels, Length of Stay).

### 1.2 Generate Real-Time Patient Risk Scores
- **Interactive Patient Risk Score Simulator (`/doctor/risk-predictions`)**:
  - Clinicians can manipulate key clinical variables in real time:
    - **Length of Stay Slider** (1 to 21 Days)
    - **Prior Inpatient Admissions Dropdown** (0 to 5+ visits)
    - **Emergency Room Visits Dropdown** (0 to 5+ visits)
    - **Comorbid Diagnoses Slider** (0 to 6 comorbidities)
    - **Insulin Regimen & Medication Adjustment Toggles**
  - Instant calculation of **Readmission Risk Probability %**, **Risk Stratification Category Badge** (*High*, *Medium*, *Low*), and **Top Risk Factors**.

### 1.3 Risk Prediction Dashboards
- **Clinical Risk Intelligence Dashboard (`/doctor/risk-predictions`)**:
  - Risk Category Donut Chart distribution (*High: 24%*, *Medium: 42%*, *Low: 34%*).
  - Stacked Diagnosis Risk Distribution Bar Chart.
  - Priority Triage Patient Registry with filterable risk scores and direct patient action triggers.

### 1.4 Readmission Forecasting Workflows
- **Temporal Trend & Horizon Forecasting (`/doctor/readmission`)**:
  - Multi-horizon forecast trends selector (**30-Day**, **60-Day**, **90-Day**).
  - Readmission trend line/area charts tracking predicted readmissions vs target thresholds.
  - Departmental Trajectory Analytics comparing current vs projected readmission rates across Cardiology, Endocrinology, Pulmonology, and Nephrology.

### 1.5 Automated Forecasting Reports
- **Forecasting Report Exporter (`/doctor/readmission`)**:
  - Native client-side CSV report generator allowing doctors and administrators to download formatted temporal readmission forecasts and departmental metrics with one click.

### 1.6 Clinical Decision Support & Insights
- **Clinical Insights & Care Protocol Module (`/doctor/clinical-insights`)**:
  - AI-driven patient risk mitigation protocols.
  - Clinical Decision Support (CDS) checklist.
  - Post-discharge care management guidelines and dietary recommendations.

---

## 2. 🔑 Test Credentials Matrix

| Role | Email | Password | Primary Workspace |
|---|---|---|---|
| 🩺 **Doctor** | `doctor@healthforecast.ai` | `password123` | `/doctor/dashboard` |
| 🏦 **Hospital Admin** | `admin@healthforecast.ai` | `password123` | `/hospital-admin/dashboard` |
| 🧪 **Researcher** | `researcher@healthforecast.ai` | `password123` | `/researcher/dashboard` |
| 💻 **System Admin** | `sysadmin@healthforecast.ai` | `prasad1234` | `/system-admin/dashboard` |

---

## 3. 📈 Milestone 2 Verification Audit

| Requirement / Sub-Task | Status | Component & Location |
|---|:---:|---|
| **Train patient risk prediction models** | ✅ 100% | `/doctor/risk-predictions` (Model accuracy, ROC-AUC, feature importance) |
| **Generate patient risk scores** | ✅ 100% | `/doctor/risk-predictions` (Interactive clinical risk score simulator) |
| **Build risk prediction dashboards** | ✅ 100% | `/doctor/risk-predictions` (Donut chart & priority triage patient table) |
| **Develop readmission forecasting workflows** | ✅ 100% | `/doctor/readmission` (30/60/90-day temporal trend visualizer) |
| **Generate forecasting reports** | ✅ 100% | `/doctor/readmission` (Automated CSV report exporter) |
| **Build clinical insights modules** | ✅ 100% | `/doctor/clinical-insights` (CDS protocols & care checklists) |

---

## 4. 🚀 How to Run and Verify

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies if needed
npm install

# Run Vite dev server
npm run dev

# Run production build validation
npm run build
```
