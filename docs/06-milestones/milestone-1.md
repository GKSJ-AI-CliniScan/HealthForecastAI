# Milestone 1 report - Week 1 & 2

- **Branch:** `main` (reference implementation)
- **Submitted on:** 2026-09-05

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

### Authentication

`POST /api/v1/auth/login` verifies a bcrypt hash and returns a signed JWT with
the caller's role and effective permission list. Supporting endpoints: `/auth/me`,
`/auth/permissions` (drives the frontend navigation) and `/auth/roles`.

Three decisions worth calling out:

- **The unknown-email path runs a hash comparison anyway**
  ([`auth_service.authenticate`](../../backend/app/services/auth_service.py)), so
  response timing does not reveal whether an account exists. The error message is
  byte-identical to the wrong-password one.
- **The user row is re-loaded on every request** rather than trusting the role
  claim in the token. Deactivating an account revokes live sessions immediately
  instead of at token expiry.
- **Every login attempt is audited**, success and failure both.

### Role-based access control

The access matrix from section 4 of the brief is encoded in
[`app/core/rbac.py`](../../backend/app/core/rbac.py) as `Role`, `Permission` and a
`PERMISSIONS` mapping. Endpoints declare their requirement with
`require_permission(...)`; no endpoint reaches a service without one.

Live verification of all four roles against every endpoint:

| Endpoint | Doctor | Hosp. Admin | Researcher | Sys. Admin | No token |
|---|---|---|---|---|---|
| `GET /patients` | 200 | 200 | **403** | 200 | 401 |
| `GET /patients/anonymised` | **403** | **403** | 200 | 200 | 401 |
| `GET /users` | **403** | **403** | **403** | 200 | 401 |
| `GET /analytics/summary` | **403** | 200 | 200 | 200 | 401 |
| `GET /analytics/population-health` | **403** | **403** | 200 | 200 | 401 |
| `GET /models` | **403** | **403** | **403** | 200 | 401 |

### Patient management

Scoping is applied **in the query**, not by filtering results
([`patient_service.scoped_query`](../../backend/app/services/patient_service.py)):
a row the caller may not see is never loaded.

- Doctor → only `assigned_doctor_id = <caller>`
- Hospital Administrator → hospital wide, read only (no `patient:write`)
- Researcher → `/patients/anonymised` only, MRN replaced by a salted SHA-256
  pseudonym that is stable across queries
- System Administrator → everything

A patient outside the caller's caseload returns **404, not 403**. Returning 403
would confirm the record exists, which is itself a disclosure.

### Healthcare dashboard

Five screens in Next.js 15 (App Router, Tailwind, Recharts): login, dashboard,
patients + patient detail, analytics, research cohort, user management.
Navigation is built from the caller's permission list, and the API authorises
independently — hiding a nav item is convenience, never the boundary.

### Dataset integration and preprocessing

[`ml/src/data/etl.py`](../../ml/src/data/etl.py) loads the raw CSV, runs the
cleaning pipeline, writes a processed parquet file, and bulk-inserts patients and
admissions into PostgreSQL.

Two cleaning decisions change the numbers materially, and both are tested:

1. **Encounters that cannot be readmitted are removed** — discharge dispositions
   11, 13, 14, 19, 20, 21 mean the patient died or entered hospice. Keeping them
   teaches the model "disposition 11 implies no readmission": true, and useless.
2. **Only the first encounter per patient is kept** — repeat encounters are not
   independent observations, and leaving them in lets information about one
   patient land in both the training and the test split.

## How to run it

From a clean clone:

```bash
git clone https://github.com/GKSJ-AI-CliniScan/HealthForecastAI.git
cd HealthForecastAI
cp .env.example .env
python -c "import secrets; print(secrets.token_urlsafe(48))"   # paste into SECRET_KEY
```

```bash
docker compose up -d postgres mongodb
```

```bash
curl -L -o ml/data/raw/diabetic_data.csv https://archive.ics.uci.edu/static/public/296/data.csv
```

```bash
cd backend && pip install -r requirements-dev.txt && SEED_PASSWORD='Demo#Passw0rd' python -m app.db.init_db
```

```bash
cd ml && pip install -r requirements-dev.txt && python -m src.data.etl --truncate
```

```bash
cd backend && uvicorn app.main:app --reload
```

```bash
cd frontend && npm ci && npm run dev
```

Open <http://localhost:3000> and sign in as any seeded account
(`dr.reddy@`, `admin.ops@`, `researcher@`, `admin@` — all `@healthforecast.org`).

## Evidence

### ETL run against the full dataset

```json
{
  "raw_rows": 101766,
  "raw_columns": 50,
  "after_cleaning": {
    "rows": 69990,
    "columns": 60,
    "positives": 6285,
    "positive_rate": 0.0898
  },
  "patients_written": 69990,
  "admissions_written": 69990,
  "patients_assigned_to_doctors": 69990
}
```

### Readmission rate by age band, straight from PostgreSQL

```
 age_group | admissions | readmitted_30d |  pct
-----------+------------+----------------+-------
 0-10      |        153 |              3 |  1.96
 10-20     |        534 |             26 |  4.87
 20-30     |       1121 |             83 |  7.40
 30-40     |       2692 |            188 |  6.98
 40-50     |       6828 |            506 |  7.41
 50-60     |      12351 |            880 |  7.12
 60-70     |      15689 |           1415 |  9.02
 70-80     |      17751 |           1817 | 10.24
 80-90     |      11110 |           1199 | 10.79
 90-100    |       1761 |            168 |  9.54
```

Readmission risk rises steadily with age — the clearest single signal in this
dataset, and a sanity check that the pipeline is not scrambling rows.

### Scoping proven live

```
doctor dashboard   {"scope":"caseload","total_patients":34995,"readmission_rate":0.0896,...}
admin  dashboard   {"scope":"hospital","total_patients":69990,"readmission_rate":0.0898,...}

patient 1 as owning doctor  -> HTTP 200
patient 1 as other doctor   -> HTTP 404
```

### Researcher sees pseudonyms only

```json
{"items":[{"pseudo_id":"PT-0066DDF28ED99D50","age_group":"50-60",
           "gender":"Female","primary_diagnosis":"Circulatory"}],"total":69990}
```

No `medical_record_number`, no `assigned_doctor_id`, no `id`.

### Test suites

```
backend:  83 passed          84% statement coverage
ml:       41 passed
frontend: eslint clean, 9 routes build, tsc --noEmit clean
```

## Metrics

| Metric | Value |
|--------|-------|
| API operations | 33 total: **23 implemented** for this milestone, 10 authorised placeholders for Milestones 2-4 |
| Database tables | 6, plus `alembic_version` |
| Raw dataset rows | 101,766 encounters, 50 columns |
| Rows after cleaning | 69,990 (‑2,904 non-readmittable, ‑28,872 repeat patients) |
| 30-day readmission rate | 8.98% (6,285 positives) |
| Average length of stay | 4.27 days |
| Backend tests / coverage | 83 tests, 84% |
| ML tests | 41 tests |
| Frontend routes | 9 |

No model has been trained yet, so there are no accuracy, precision, recall, F1 or
ROC-AUC figures to report. Those are the Milestone 2 deliverable.

## Known gaps

**Carried into later milestones by design**

- Risk prediction, readmission forecasting, treatment effectiveness and clinical
  decision support endpoints are authorised and routed but return placeholder
  data. Tagged `TODO(milestone-2)` / `TODO(milestone-3)`.
- MongoDB is running and its collections documented, but nothing writes to it
  yet — it holds model runs and prediction events from Milestone 2.

**Real gaps that should be fixed**

- **Token storage.** The frontend keeps the JWT in `sessionStorage`, which is
  readable by any script on the page, so an XSS bug would expose it. An httpOnly
  cookie set by the backend is the correct answer and needs CSRF handling.
  Milestone 4 hardening.
- **No refresh token.** Access tokens last 30 minutes and the user is then
  silently logged out on the next request.
- **Doctor assignment is round-robin.** `assign_patients_to_doctors` in the ETL
  splits patients evenly so the caseload scope can be demonstrated. Real
  assignment would come from the hospital's own system.
- **No rate limiting on `/auth/login`.** Timing and message are constant, but
  nothing stops repeated attempts.
- **The ETL is not incremental.** `--truncate` reloads everything; there is no
  change-data-capture path.
- **Test coverage is uneven.** 84% overall, but `app/db/` and
  `app/repositories/` are largely uncovered because nothing calls them yet.
