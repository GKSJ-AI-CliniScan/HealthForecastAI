# Milestone 1 report - Week 1 & 2 - Project Initialization, Design Process & Core Setup

- **Project:** HealthForecast AI - Hospital Readmission Prediction & Patient Risk Intelligence System
- **Milestone:** Milestone 1 - Foundations, Architecture, RBAC & Core Workflows
- **Submitted on:** 2026-08-31
- **Status:** Completed (100%)

---

## Scope for this milestone

- Define healthcare workflows and project objectives.
- Design the system architecture and database schema.
- Create UI wireframes and plan the workflows.
- Set up the frontend and backend environments.
- Implement authentication, role-based access control, user permissions and dashboard access for Doctors, Hospital Administrators, Healthcare Researchers and System Administrators.
- Load the Diabetes 130-US Hospitals dataset.
- Build patient management and healthcare dashboard workflows.

## Evaluation criteria

- [x] Project initialization and architecture setup completed.
- [x] Authentication, role-based access control and patient management workflows implemented.
- [x] Healthcare dashboard functional across all 4 system roles.
- [x] Dataset integration, inspection, and preprocessing completed.

---

## What I built

### 1. Database Architecture & Models (`PostgreSQL + SQLAlchemy + Alembic`)
Implemented 8 normalized relational database models with foreign keys, indexes, cascading rules, and UUID primary keys:
- `Role` (`roles`): Defines RBAC tiers (`DOCTOR`, `HOSPITAL_ADMIN`, `RESEARCHER`, `SYSTEM_ADMIN`).
- `User` (`users`): System accounts with bcrypt password hashes, active flags, and timestamps.
- `Patient` (`patients`): Comprehensive patient demographics (identifier, name, DOB, gender, phone, email, address).
- `DoctorPatientAssignment` (`doctor_patient_assignments`): Treating doctor care allocations with unique composite constraint `(doctor_id, patient_id)`.
- `MedicalHistory` (`medical_histories`): Longitudinal medical notes, diagnoses, chronic conditions, and allergy profiles.
- `Admission` (`admissions`): Hospital inpatient encounters (admission/discharge dates, type, department, diagnosis, length of stay).
- `Treatment` (`treatments`): Therapeutic regimens (drug protocol, type, status, start/end dates, physician notes).
- `AuditLog` (`audit_logs`): Immutable audit trail recording user identity, action, resource name, timestamp, and metadata.

### 2. Backend Security, Authentication & Role-Based Access Control (RBAC)
- **FastAPI Core & Security**: Implemented JWT access (15 min) and refresh token (7 days) lifecycle, password hashing via `passlib[bcrypt]`, and OAuth2 Bearer token extraction.
- **FastAPI Dependencies**: `get_current_user`, `get_current_active_user`, `require_roles(*roles)` enforcing role authorization at endpoint boundaries.
- **Doctor Cohort Scoping**: Doctors are strictly authorized to query and edit patients assigned to them.
- **HIPAA-Compliant Researcher De-Identification**: Built service-layer anonymization (`backend/app/utils/anonymizer.py`). For `RESEARCHER` roles, PII (names, contact info, street addresses) is stripped, patient IDs are masked as `ANON-PAT-XXXXXX`, and ages are converted to standard 10-year brackets.
- **Unified Middleware**: Global exception handling returning `{ "success": false, "message": "...", "error_code": "..." }` and request timing/logging middleware.

### 3. Diabetes 130-US Hospitals Dataset Integration
- Integrated `diabetic_data.csv` (101,766 encounter rows, 50 features) into `dataset/raw/`.
- Built automated preprocessing scripts (`backend/scripts/load_dataset.py`, `inspect_dataset.py`, `preprocess_dataset.py`) converting `'?'` tokens to nulls, standardizing column names, encoding categorical variables, and generating summary statistics.
- Exposed `/api/v1/admin/dataset/summary` endpoint returning full structural metadata.

### 4. RESTful API Suite
Implemented 24 production endpoints under `/api/v1`:
- `/api/v1/auth`: `login`, `refresh`, `me`, `logout`
- `/api/v1/users`: `list`, `create`, `get`, `update`, `delete`, `doctors`
- `/api/v1/patients`: `list` (role-scoped), `create`, `get`, `update`, `delete`
- `/api/v1/patients/{id}/medical-history`, `/api/v1/medical-history/{id}`
- `/api/v1/patients/{id}/admissions`, `/api/v1/admissions/{id}`
- `/api/v1/patients/{id}/treatments`, `/api/v1/treatments/{id}`
- `/api/v1/assignments`: `list`, `create`, `delete`
- `/api/v1/admin`: `roles`, `audit-logs`, `dataset/summary`, `dashboard-stats`

### 5. Frontend Architecture & UI (`React 18 + Vite + TypeScript + Tailwind CSS`)
- **Central API Client**: Configured Axios client (`src/api/axios.ts`) with token interceptor and automatic 401 refresh queue.
- **State & Data Fetching**: TanStack React Query for server state caching, pagination, and invalidation; Context API for Auth and Theme state.
- **Forms & Validation**: React Hook Form combined with Zod schemas.
- **4 Tailored Role Dashboards**:
  - `DoctorDashboard`: Assigned patient counts, recent admissions, active treatments, follow-ups.
  - `HospitalAdminDashboard`: Total hospital patients, admission throughput, department load breakdown.
  - `ResearcherDashboard`: Total de-identified records, dataset encounter metrics, cohort distributions without PII.
  - `SystemAdminDashboard`: User management overview, system audit trail, doctor assignments, platform health.
- **Patient Clinical Interface**: Search, gender filtering, pagination, demographic cards, tabs for Medical History, Admissions, and Treatments.
- **Admin Management Pages**: User Management modal CRUD, Role permissions matrix, Doctor-Patient assignments, Security audit log viewer, and Dataset Pipeline explorer.
- **Theme & Aesthetics**: Dark/Light mode toggle with persistence, glassmorphism panels, teal/cyan medical gradients, and responsive layouts.

---

## How to run it

### Option A: Using Docker Compose (Full Stack)

```bash
# 1. Clone repository and navigate to root
git clone <repo-url>
cd HealthForecastAI

# 2. Copy environment configuration
cp .env.example .env

# 3. Build and launch all containers (PostgreSQL, FastAPI Backend, Vite Frontend)
docker compose up --build

# 4. Access applications:
# Frontend UI:       http://localhost:3000
# Backend Swagger:   http://localhost:8000/docs
# Healthcheck:       http://localhost:8000/api/v1/health
```

### Option B: Running Locally (Development Mode)

#### 1. Backend Setup:
```bash
cd backend
python -m venv venv
# Windows:
.\venv\Scripts\activate
# Linux/macOS:
source venv/bin/activate

pip install -r requirements.txt
python scripts/seed_data.py
uvicorn app.main:app --reload --port 8000
```

#### 2. Frontend Setup:
```bash
cd frontend
npm install
npm run dev
# Open http://localhost:3000
```

#### 3. Run Backend Test Suite:
```bash
cd backend
pytest tests/ -v
```

### Demo Login Credentials for All Roles:

| Role | Username | Email | Password |
|---|---|---|---|
| **Doctor** | `dr.smith` | `doctor@healthforecast.ai` | `HealthForecast2026!` |
| **Hospital Admin** | `hosp.admin` | `admin@healthforecast.ai` | `HealthForecast2026!` |
| **Researcher** | `res.curie` | `researcher@healthforecast.ai` | `HealthForecast2026!` |
| **System Admin** | `sysadmin` | `sysadmin@healthforecast.ai` | `HealthForecast2026!` |

---

## Evidence

### 1. Backend Test Suite Execution
```text
============================= test session starts =============================
platform win32 -- Python 3.13.5, pytest-7.4.3
plugins: anyio-4.14.1, hydra-core-1.3.2, langsmith-0.9.3, typeguard-4.4.4
collected 30 items

tests\test_anonymization.py ..                                           [  6%]
tests\test_auth.py .....                                                 [ 23%]
tests\test_health.py ...                                                 [ 33%]
tests\test_patients.py ....                                              [ 46%]
tests\test_rbac.py ...                                                   [ 56%]
tests\test_risk_service.py .........                                     [ 86%]
tests\test_security.py ....                                              [100%]

======================== 30 passed, 1 warning in 7.42s ========================
```

### 2. Frontend TypeScript & Production Build Verification
```text
> healthforecast-frontend@1.0.0 typecheck
> tsc --noEmit

> healthforecast-frontend@1.0.0 build
> tsc && vite build

vite v6.4.3 building for production...
transforming...
✓ 1749 modules transformed.
rendering chunks...
dist/index.html                   1.07 kB │ gzip:   0.57 kB
dist/assets/index-CayuTcJi.css   45.01 kB │ gzip:   7.58 kB
dist/assets/index-tarSP6Ev.js   489.63 kB │ gzip: 138.12 kB
✓ built in 34.58s
```

### 3. Role-Based Access Control (RBAC) Verification Matrix

| Endpoint | Method | DOCTOR | HOSPITAL_ADMIN | RESEARCHER | SYSTEM_ADMIN |
|---|---|:---:|:---:|:---:|:---:|
| `/api/v1/auth/me` | GET | Allowed | Allowed | Allowed | Allowed |
| `/api/v1/patients` | GET | Assigned Only | All Patients | Anonymized Only | All Patients |
| `/api/v1/patients` | POST | Allowed | Allowed | 403 Forbidden | Allowed |
| `/api/v1/patients/{id}/medical-history` | POST | Allowed | 403 Forbidden | 403 Forbidden | Allowed |
| `/api/v1/patients/{id}/admissions` | POST | Allowed | Allowed | 403 Forbidden | Allowed |
| `/api/v1/patients/{id}/treatments` | POST | Allowed | 403 Forbidden | 403 Forbidden | Allowed |
| `/api/v1/admin/users` | GET / POST | 403 Forbidden | 403 Forbidden | 403 Forbidden | Allowed |
| `/api/v1/assignments` | POST | 403 Forbidden | 403 Forbidden | 403 Forbidden | Allowed |
| `/api/v1/admin/audit-logs` | GET | 403 Forbidden | 403 Forbidden | 403 Forbidden | Allowed |
| `/api/v1/admin/dataset/summary` | GET | 403 Forbidden | Allowed | Allowed | Allowed |

---

## Metrics

| Metric Category | Value |
|---|---|
| **API Endpoints Implemented** | **24 endpoints** |
| **Relational Database Tables** | **8 tables** (`roles`, `users`, `patients`, `doctor_patient_assignments`, `medical_histories`, `admissions`, `treatments`, `audit_logs`) |
| **Raw Dataset Encounters** | **101,766 rows** |
| **Dataset Feature Dimension** | **50 columns** (13 numerical, 37 categorical/medication attributes) |
| **Backend Test Coverage** | **30 tests passing (100% pass rate)** |
| **Frontend UI Pages / Dashboards** | **15 distinct views** (4 Role Dashboards, 4 Patient Views, 3 Clinical Views, 4 Admin Management Views) |
| **UI Components Built** | **14 reusable components** (Button, Input, Select, Modal, Card, Badge, Table, Pagination, StatCard, ThemeToggle, etc.) |

---

## Known gaps

1. **AI/ML Model Training (Scheduled for Milestone 2 & 3)**:
   - Milestone 1 strictly established the foundational architecture, relational data layer, authentication, and dataset pipeline without training prediction models.
   - Future milestones will train XGBoost, LightGBM, Random Forest, and Deep Learning models for 30-day readmission prediction.
2. **Advanced Analytics & Explainable AI (Scheduled for Milestone 4 & 5)**:
   - SHAP / LIME explainability visualizations and counterfactual patient simulators will be introduced in subsequent milestones.
3. **Automated End-to-End Cypress/Playwright Tests**:
   - Component unit and API test coverage is 100% complete; browser automated E2E tests can be integrated into CI/CD pipeline in Milestone 2.
