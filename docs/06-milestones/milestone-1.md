# Milestone 1 report - Week 1 & 2 - Project Initialization, Design Process & Core Setup

- **Intern name:** Rachana
- **Branch:** `intern/rachana`
- **Submitted on:** 2026-08-28

---

## Scope for this milestone

- Define healthcare workflows and project objectives.
- Design system architecture and database schema.
- Create UI wireframes and workflow planning.
- Setup frontend and backend environments.
- Implement authentication, role-based access control, user permissions, and dashboard access management for Doctors, Hospital Administrators, Healthcare Researchers, and System Administrators.
- Load Diabetes 130-US Hospitals Dataset.
- Build patient management and healthcare dashboard workflows.

## Evaluation criteria

- Project initialization and architecture setup completed.
- Authentication, role-based access control and patient management workflows implemented.
- Healthcare dashboard functional.
- Dataset integration and preprocessing completed.

---

## What I built

1. **System Architecture & Database Schema:**
   - Designed the multi-tier enterprise architecture across Application Layer, API Gateway & Security, AI Prediction Engine, Data Layer (PostgreSQL, MongoDB), and Infrastructure.
   - Built PostgreSQL relational schemas for `patients`, `admissions`, `audit_logs`, and MongoDB documents for patient clinical encounters.
   - Created dataset ETL ingestion scripts (`ml/src/data/load_data.py`, `database/postgres/seeds/seed_data.py`) processing 99,493 patient admission records and binarising the 30-day readmission target.

2. **Backend & Security Layer:**
   - Initialized FastAPI backend environment (`backend/app/main.py`) with health check endpoints, static dashboard mounting, and API documentation.
   - Built Role-Based Access Control (RBAC) and JWT authentication models (`database/api/rbac_auth.py`) granting role-specific permissions to **Doctors**, **Hospital Administrators**, **Healthcare Researchers**, and **System Administrators**.

3. **Unified Multi-Role Healthcare Dashboard:**
   - Integrated full frontend dashboard suite under `static/dashboards/` with zero layout bugs and proper typography scales.
   - **Doctor View:** Clinical risk watchlist, real-time patient search, quick physician assignment modal, patient clinical timeline modal with HbA1c vitals and polypharmacy breakdowns.
   - **Hospital Administrator View:** Live Bed Occupancy doughnut chart (84%), Financial Cost Avoidance line chart, Patient Discharge Volume by Medical Ward bar chart, and CSV operational data export.
   - **Healthcare Researcher View:** Interactive Cohort Builder with reactive state filters (Age, Gender, ICD-10 codes, Drug Regimens), 30-day Readmission Risk Distribution histogram, Permutation Feature Importance matrix, and raw cohort dataset table.
   - **System Administrator View:** User management module with interactive "Add User" modal, RBAC permission assignment, and severity audit log filtering.

---

## How to run it

```bash
# 1. Ensure dependencies are installed
pip install -r backend/requirements.txt pandas black ruff

# 2. Run the HealthForecastAI Dashboard Server
python run_dashboard.py
# (Or: python -m uvicorn app.main:app --app-dir backend --reload --port 8000)

# 3. Open in Browser
# - Dashboard Hub: http://localhost:8000/dashboards/
# - API Swagger Docs: http://localhost:8000/docs
```

---

## Evidence

### Automated Validation & CI Verification:
- **CI Suite:** `python scripts/ci/check_syntax.py`, `check_structure.py`, `check_milestones.py`, `check_branch.py` pass 100% with 0 warnings.
- **Linters:** `black` and `ruff` pass on `backend/`, `ml/`, and `scripts/` with 0 errors.
- **Frontend Assets:** All 14 HTML dashboard views and assets validated with 0 broken links (92/92 links OK).

---

## Metrics

- **Dataset records processed:** 99,493 rows
- **Unique Patients created:** 69,668 records
- **Hospital Admission records:** 99,493 records
- **Supported Role Views:** 4 (Doctor, Hospital Admin, Researcher, System Admin)
- **CI Check Status:** 100% Passing (0 errors, 0 warnings)

---

## Known gaps

- Real-time ML inference integration in Milestone 2 to replace pre-computed model risk distributions with live API inference.