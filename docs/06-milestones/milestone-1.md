# Milestone 1 report - Week 1 & 2 - Project Initialization, Design Process & Core Setup

- **Intern name:** Raniya Raseen M M
- **Branch:** `intern/18-raniya-raseen-m-m`
- **Submitted on:** 2026-10-20

---

## Scope for this milestone

- Define healthcare workflows and project objectives.
- Design the system architecture and database schema.
- Create UI wireframes and plan the workflows.
- Set up the frontend and backend environments.
- Implement authentication, role-based access control, user permissions and
  dashboard access for Doctors, Hospital Administrators, Healthcare Researchers
  and System Administrators.
- Load the Diabetes 130-US Hospitals dataset.
- Build patient management and healthcare dashboard workflows.

## Evaluation criteria

- Project initialization and architecture setup completed.
- Authentication, role-based access control and patient management workflows implemented.
- Healthcare dashboard functional.
- Dataset integration and preprocessing completed.

---

## What I built

I used an AI assistant (Claude) to help write the backend, dashboard and reports, and I tested what I could. The ML pipeline in `ml/` is my own earlier work.

- **Authentication** (`backend/app/services/auth_service.py`, `api/v1/endpoints/auth.py`): `POST /auth/login` checks a bcrypt password hash and returns a JWT carrying the user's id and role. A wrong password and an unknown e-mail give the same 401 message. Every attempt is written to an audit trail.
- **Role-based access control** (`core/rbac.py` and `api/deps.py`, provided in the starter): I wired it to real endpoints. Each endpoint uses `require_permission`, so the four roles see different things. A doctor sees only assigned patients, the hospital administrator is read-only, and the researcher gets anonymised data only.
- **User management** (`endpoints/users.py`): the system administrator can list and create users and read the audit log.
- **Patient management** (`services/patient_service.py`, `endpoints/patients.py`): list (scoped by role), view one, create (system administrator), and an anonymised cohort for researchers (SHA-256 pseudonym, no MRN, no doctor id, no race). Data is held in memory and seeded with 120 synthetic patients.
- **Dataset preprocessing** (`ml/src/features/preprocess.py`, `feature_engineering.py`): cleans `diabetic_data.csv` (101,766 encounters), drops mostly-empty columns, groups diagnosis codes into nine categories and one-hot encodes to 101 features.
- **Dashboard** (`frontend/src/components/dashboard/`): a Next.js login form and a role-aware dashboard that shows only the panels the signed-in role may read.

## How to run it

Download the dataset into `ml/data/processed/` for the ML part (see `ml/data/README.md`). For the platform:

```bash
git clone https://github.com/GKSJ-AI-CliniScan/HealthForecastAI
cd HealthForecastAI
git checkout intern/18-raniya-raseen-m-m

# backend (terminal 1) - http://localhost:8000/docs
cd backend
pip install -r requirements.txt -r requirements-dev.txt
uvicorn app.main:app --reload

# frontend (terminal 2) - http://localhost:3000
cd frontend
npm install
npm run dev
```

Demo logins (synthetic data): `doctor1@hospital-demo.com` / `Doctor@123`, `admin@hospital-demo.com` / `Admin@123`, `researcher@hospital-demo.com` / `Research@123`, `sysadmin@hospital-demo.com` / `SysAdmin@123`.

## Evidence

- Running the services directly with Python (not through the web server) on the seeded data gave: 120 patients; doctor 1 sees 60 of them, doctor 2 sees 60, the hospital administrator sees all 120; the researcher's cohort has no `medical_record_number` field; a wrong password is refused and logged.
- Backend tests that check these rules are in `backend/tests/test_rbac.py`, `test_auth_flow.py` and `test_patients_scope.py`. The CI run for this branch shows their result.
- The ML preprocessing output (80,195 training and 20,049 test rows, 101 features) is shown in `milestone-2.md`.

## Metrics

- Roles implemented: 4 of 4.
- API endpoints implemented for this milestone: 10 (login, me, roles, list users, create user, audit log, list patients, get patient, create patient, anonymised patients).
- Backend tests for this milestone: 26 (RBAC 10, security 4, login and users 6, patient scope 6).
- Dataset rows loaded: 101,766; model features after encoding: 101.

## Known gaps

- **No database.** Users and patients live in memory and reset when the server restarts. The PostgreSQL schema in `database/postgres/schema` and the repositories were not wired up. The service functions are the only place that would change.
- **The platform runs on synthetic patients,** not the Diabetes 130 dataset. The real dataset is only used by the ML pipeline in `ml/`.
- **No wireframes and no new architecture write-up.** I used the starter's architecture and RBAC documents as they are. `docs/05-wireframes` has not been filled in.
- **Not run before submission:** I could not run the backend tests or `npm run build` on my own machine before pushing. The CI result for this branch is the evidence.
- **No refresh tokens, rate limiting or account lockout.** Tokens expire after 30 minutes.
- The dashboard keeps the token in memory, so a page refresh signs the user out.
- The ML scripts read and write CSV files in the folder they are run from, so they must be run from `ml/data/processed/`.
