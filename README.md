# HealthForecast AI

**Hospital Readmission Prediction & Patient Risk Intelligence System**

[![CI Status](https://img.shields.io/badge/CI-Passing-brightgreen)]()
[![Tests](https://img.shields.io/badge/Tests-52%20Passing-success)]()
[![Python](https://img.shields.io/badge/Python-3.11.9-blue)]()
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688)]()
[![React](https://img.shields.io/badge/React-18-61DAFB)]()
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6)]()
[![Deployment](https://img.shields.io/badge/Deployment-Vercel%20%7C%20Render%20%7C%20Neon-blueviolet)]()

An enterprise-grade Clinical Decision Support System (CDSS) that predicts 30-day hospital readmissions, identifies high-risk patients, provides transparent clinical explainability, and supports proactive post-discharge care planning.

---

## 1. Executive Summary & Clinical Context

Unplanned 30-day hospital readmissions cost healthcare systems over $26 billion annually and trigger penalties under the CMS Hospital Readmissions Reduction Program (HRRP). In diabetic and complex chronic populations, multi-system comorbidities and volatile medication regimens elevate readmission rates above 15%.

HealthForecast AI bridges clinical workflow and predictive intelligence:
- **Core Clinical Objective**: Accurate 30-day acute all-cause hospital readmission forecasting.
- **Dataset**: Diabetes 130-US Hospitals (101,766 inpatient encounters, 71,518 unique patients).
- **Production ML Architecture**: Calibrated Random Forest Classifier (**ROC-AUC: 0.6830**, **Accuracy: 70.27%**, **Recall: 52.88%**).
- **Inference SLA**: Sub-50ms real-time prediction latency (actual: **32–45 ms**).
- **Target Audience**: Attending Physicians, Discharge Planners, Hospital Administrators, Healthcare Researchers.

---

## 2. Platform Modules & Capabilities

| # | Module | Clinical & Technical Capability |
|---|--------|---------------------------------|
| 1 | **User Management & RBAC** | Role-based authorization for Doctor, Admin, Researcher, and SysAdmin with RFC 7519 JWT tokens and bcrypt password encryption. |
| 2 | **Patient Data Management** | Longitudinal patient records, chronic condition histories, inpatient admissions, and active medication regimens. |
| 3 | **Risk Prediction Engine** | Vectorized inference engine mapping multi-hospital EHR features to an actionable 0–100 readmission risk score. |
| 4 | **Clinical Explainability** | Transparent breakdown of top risk drivers (e.g., prior admissions $+24.5\%$, polypharmacy $+16.2\%$, insulin changes $+9.4\%$). |
| 5 | **Clinical Decision Support (CDSS)** | Evidence-based post-discharge care protocols (7-day follow-up consultation, clinical pharmacy review, nurse outreach). |
| 6 | **Executive Healthcare Analytics** | Facility-wide census monitoring, department risk breakdowns (Cardiology, Endocrinology, Internal Medicine), and 30-day trends. |
| 7 | **HIPAA Researcher De-Identification** | Safe Harbor compliant automated pseudonymization generating salted SHA-256 hashes (`ANON-PAT-XXXXXX`) and suppressing PHI. |

---

## 3. Technology Stack & Production Cloud Architecture

```
User Browser (Desktop / Tablet / Mobile)
       │
       ▼ (HTTPS / TLS 1.3)
Vercel Edge Global CDN (React 18 + Vite SPA)
       │
       ▼ (REST API / HTTPS / JWT)
Render Web Service (FastAPI + Python 3.11 + Uvicorn + ML Inference)
       │
       ▼ (TLS / SSL `?sslmode=require` / PgBouncer Pooling)
Neon PostgreSQL (Serverless Database 16)
```

| Layer | Component | Description |
|---|---|---|
| **Frontend** | React 18, Vite 6, TypeScript 5 | Responsive glassmorphic UI, role-based route guards, animated gauges, Lucide icons |
| **Backend** | FastAPI, Python 3.11.9, Uvicorn | High-throughput asynchronous REST API with Pydantic v2 schemas and structured logging |
| **Database** | Neon Serverless PostgreSQL 16 | ACID-compliant relational persistence with Alembic migrations, connection pooling, and SSL |
| **ML Engine** | Scikit-learn, Random Forest, Joblib | Calibrated ensemble pipeline preloaded in memory during application startup |
| **Deployment** | **Vercel** + **Render** + **Neon** | Single dedicated production cloud architecture with zero legacy cloud overhead |

---

## 4. Live Server Endpoints & URLs

| Service | Local Development URL | Production Cloud URL |
|---|---|---|
| **Frontend Web App** | [http://localhost:3000](http://localhost:3000) | `https://healthforecast-ai.vercel.app` |
| **Backend API Base** | [http://127.0.0.1:8000/api/v1](http://127.0.0.1:8000/api/v1) | `https://healthforecast-api.onrender.com/api/v1` |
| **Health Check Endpoint** | [http://127.0.0.1:8000/health](http://127.0.0.1:8000/health) | `https://healthforecast-api.onrender.com/health` |
| **Interactive Swagger Docs** | [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs) | `https://healthforecast-api.onrender.com/docs` |
| **OpenAPI Specification** | [http://127.0.0.1:8000/api/v1/openapi.json](http://127.0.0.1:8000/api/v1/openapi.json) | `https://healthforecast-api.onrender.com/api/v1/openapi.json` |

---

## 5. Verified Demonstration Accounts

The platform includes seeded accounts for all four organizational roles:

| Role | Username / Email | Password | Access Scope |
|---|---|---|---|
| **Doctor** | `doctor@healthforecast.ai` | `HealthForecast2026!` | Assigned patient roster, risk prediction, care plan formulation |
| **Hospital Admin** | `admin@healthforecast.ai` | `HealthForecast2026!` | Hospital census, department risk analytics, readmission trends |
| **Researcher** | `researcher@healthforecast.ai` | `HealthForecast2026!` | De-identified cohorts (`ANON-PAT-`), model telemetry |
| **System Admin** | `sysadmin@healthforecast.ai` | `HealthForecast2026!` | User lifecycle management, immutable audit logs |

---

## 6. How to Run the Platform Locally

### Prerequisites
- Python 3.11+
- Node.js 18+ and npm
- Git

---

### Step 1: Run the Backend Server (FastAPI / Uvicorn)

Open a terminal at the repository root (`HealthForecastAI`):

#### On Windows (PowerShell):
```powershell
# 1. Activate Python virtual environment
.\.venv\Scripts\Activate.ps1

# 2. Run the backend server
uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 8000 --reload
```

#### On Linux / macOS (Bash):
```bash
# 1. Activate Python virtual environment
source .venv/bin/activate

# 2. Run the backend server
uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 8000 --reload
```

*(Alternatively, run directly from inside the `backend` folder: `cd backend && uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload`)*

---

### Step 2: Run the Frontend Server (Vite / React)

Open a second terminal window:

```bash
cd frontend
npm install   # Only required on initial clone
npm run dev
```

The frontend will start at **[http://localhost:3000](http://localhost:3000)** and automatically connect to the backend at `http://127.0.0.1:8000`.

---

### Step 3: Quick API Verification Commands

#### Health Check:
```bash
# PowerShell
Invoke-RestMethod -Uri "http://127.0.0.1:8000/health"

# cURL
curl http://127.0.0.1:8000/health
```

#### Authenticate & Fetch Patients:
```bash
# PowerShell
$body = @{ username_or_email = "doctor@healthforecast.ai"; password = "<demo-password>" } | ConvertTo-Json
$login = Invoke-RestMethod -Uri "http://127.0.0.1:8000/api/v1/auth/login" -Method Post -Body $body -ContentType "application/json"
$token = $login.access_token

# cURL (Linux / macOS)
curl -X POST http://127.0.0.1:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username_or_email":"doctor@healthforecast.ai","password":"<demo-password>"}'
```

---

## 7. Machine Learning Model & Evaluation Benchmark

Models were trained and evaluated on an independent holdout test split ($N = 20,354$ encounters, 11.16% readmission base rate):

| Metric | Random Forest (Production) | XGBoost (Benchmark) | Clinical Significance |
|---|---|---|---|
| **ROC-AUC** | **0.6830** | **0.6829** | Consistent discrimination between readmitted vs. non-readmitted encounters. |
| **Accuracy** | **70.27%** | 66.82% | Superior overall accuracy preserving clinician bandwidth and reducing false alarms. |
| **Recall (Sensitivity)** | **52.88%** | 57.99% | Captures over half of all acute 30-day readmissions for early intervention. |
| **Precision** | **0.1942** | 0.1851 | 1.74× enrichment over the 11.16% baseline random guessing rate. |
| **F1 Score** | **0.2841** | 0.2806 | Balanced harmonic score on severe class imbalance. |
| **Inference Latency** | **32–45 ms** | 45–60 ms | Real-time clinical chart evaluation SLA (<50 ms). |

### Top Predictive Feature Drivers:
1. **Prior Acute Inpatient Hospitalizations (`number_inpatient`)**: **24.5%**
2. **Polypharmacy (>15 Medications) (`num_medications`)**: **16.2%**
3. **Length of Inpatient Stay (`time_in_hospital`)**: **11.8%**
4. **Diagnostic Intensity (`num_lab_procedures`)**: **10.4%**
5. **Comorbidity Count (`number_diagnoses`)**: **9.6%**
6. **Glycemic Volatility (Insulin Dosage Increase) (`insulin`)**: **9.4%**

---

## 8. Role-Based Access Control (RBAC) Matrix

| Capability / Resource | DOCTOR | HOSPITAL_ADMIN | RESEARCHER | SYSTEM_ADMIN |
|---|:---:|:---:|:---:|:---:|
| View Assigned Patients |  |  |  (De-Identified) |  |
| Run Readmission Prediction |  |  |  (Cohort Aggregate) |  |
| Prescribe Care Plan & Discharge Plan |  |  |  |  |
| Departmental Analytics & Hospital Census |  |  |  |  |
| Historical Readmission Trends |  |  |  |  |
| Model Evaluation Telemetry |  |  |  |  |
| User Account Management |  |  |  |  |
| Immutable Audit Logs |  |  |  |  |

---

## 9. Comprehensive Documentation Sitemap

All documentation is located in the repository:

### Core Architecture & System Specifications
- **[System Architecture](docs/architecture.md)**: Visual Mermaid diagram, component boundaries, and request lifecycle.
- **[Security & Compliance](docs/security.md)**: JWT token architecture, bcrypt hashing, parameterized SQL, and HIPAA Safe Harbor de-identification.
- **[REST API Specification](docs/api.md)**: Complete endpoint catalog, request/response JSON schemas, and error codes.
- **[Clinical User Guide](docs/user-guide.md)**: Step-by-step role workflows for Doctors, Admins, Researchers, and SysAdmins.
- **[Final Project Report](docs/final-project-report.md)**: Formal 26-section comprehensive technical and clinical project report.
- **[Presentation Outline](docs/presentation-outline.md)**: 21-slide structured executive and technical presentation deck.
- **[Screenshot Checklist](docs/screenshot-checklist.md)**: 25-item visual UI and demonstration checklist.

### Machine Learning Documentation Suite
- **[Dataset Description](docs/ml/dataset.md)**: 130-US Hospitals dataset, encounter inclusion criteria, and demographics.
- **[Feature Engineering & Preprocessing](docs/ml/preprocessing.md)**: Data cleaning, ICD-9 groupings, and column transformers.
- **[Model Training Protocol](docs/ml/training.md)**: Class imbalance mitigation, cost-sensitive weights, and hyperparameters.
- **[Model Evaluation Report](docs/ml/evaluation.md)**: Benchmark comparisons, confusion matrices, and feature importance rankings.
- **[Real-Time Inference Engine](docs/ml/inference.md)**: Sub-50ms inference latency, risk scoring formula, and clinical bands.
- **[Clinical Limitations & Safety](docs/ml/limitations.md)**: Decision support disclaimer, boundary conditions, and model drift guidelines.

### Production Deployment Suite
- **[Deployment Runbook](docs/08-deployment/README.md)**: Production architecture and release procedures.
- **[Vercel Frontend Guide](docs/deployment/vercel.md)**: Vercel setup, SPA deep-link routing rewrites, and CDN optimization.
- **[Render Backend Guide](docs/deployment/render.md)**: Render web service, Uvicorn start commands, and `/health` checks.
- **[Neon PostgreSQL Guide](docs/deployment/neon.md)**: Serverless Postgres 16 setup, pooling, SSL, and Alembic migrations.
- **[Production Readiness Checklist](docs/deployment/production-checklist.md)**: Pre-deploy and post-deploy operational checklist.

### Project Milestones
- **[Milestone 1 Report](docs/06-milestones/milestone-1.md)**: Core Architecture & Setup.
- **[Milestone 2 Report](docs/06-milestones/milestone-2.md)**: Risk Prediction & Readmission Forecasting.
- **[Milestone 3 Report](docs/06-milestones/milestone-3.md)**: Treatment Effectiveness & Healthcare Analytics.
- **[Milestone 4 Report](docs/06-milestones/milestone-4.md)**: Testing, Deployment & Final Documentation.

---

## 10. Automated Testing & Quality Assurance

Run the complete test and code hygiene pipeline locally:

```bash
# Run 52-test automated backend test suite
pytest backend/tests/ -v

# Run Python code quality linters and formatters
ruff check backend/
black --check backend/

# Run TypeScript typechecker and production build
cd frontend
npm run typecheck
npm run build

# Run repository CI integrity scripts
python scripts/ci/check_secrets.py
python scripts/ci/check_structure.py
python scripts/ci/check_docs.py
python scripts/ci/check_milestones.py
python scripts/ci/check_files.py
python scripts/ci/check_notebooks.py
```

---

## 11. Clinical Safety Disclaimer

> **MANDATORY CLINICAL SAFETY NOTICE**:  
> HealthForecast AI is a **Clinical Decision Support System (CDSS)** engineered to augment clinical evaluation and discharge planning.
>
> - The platform **does not** provide autonomous clinical diagnoses.
> - The platform **does not** prescribe medications or dictate medical treatments.
> - All risk predictions and care suggestions must be reviewed and validated by licensed healthcare professionals.
> - Under no circumstances should algorithmic risk scores be used to deny care or refuse hospital admission.
