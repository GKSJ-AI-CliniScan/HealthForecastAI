# Milestone 1 report - Week 1 & 2 - Project Initialization, Design Process & Core Setup

> **How to use this file**
> 1. Fill in every section below. Keep all five headings, even if an answer is short.
> 2. Delete the `_Not started_` line once you begin - that line is what tells CI
>    the report is still a blank template.
> 3. Commit it on your own branch. Do not open a pull request to `main`.

- **Intern name:** Niyati R
- **Branch:** `intern/niyati-r`
- **Submitted on:** 2026-08-31

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

**Design documents** - `docs/niyati/`: SRS, System Design, Database Design, ML
Design, Implementation Plan, plus a pre-implementation repository audit.

**Database.** `backend/alembic/versions/0001_initial_schema.py` is the first
migration in the repository; `alembic/versions/` was previously empty, so the
schema only existed because `docker-compose.yml` mounts `01_schema.sql` at
container init. The models were brought to exact parity with that reference
schema - the missing foreign key on `patients.assigned_doctor_id`, the
`users_role_check` constraint, the cascade rules, the date-order check, and the
named indexes. Added `doctor_patient_map` (`app/models/doctor_patient_map.py`)
so a patient can be co-managed by several doctors, which
`patients.assigned_doctor_id` alone cannot express.

**Repository layer** - `app/repositories/`: `UserRepository`,
`PatientRepository`, `AdmissionRepository`, `DoctorPatientRepository`,
`AuditRepository`. `PatientRepository.scope_clause` is the single place the
"assigned patients only" rule is written; it uses `EXISTS` rather than a join so
a patient who is both primary and mapped is returned once.

**Authentication** - `app/services/auth_service.py`, `api/v1/endpoints/auth.py`.
Registration, login, JWT issuance, bcrypt verification. `/auth/login` was a 501.
Registration takes a payload with no role field, so a caller cannot request one.
An unknown email and a wrong password produce the identical error, so login
cannot be used to enumerate accounts.

**RBAC** - `app/api/deps.py`. `require_permission` and `require_role` now resolve
the token subject to a real account and re-read the role from the database, so a
deleted, deactivated or demoted user loses access on their next request rather
than when their token expires. `patient_scope_for` decides which doctor id a
query is narrowed by, always from the authenticated caller and never from a
request parameter.

**User management** - `app/services/user_service.py`, `endpoints/users.py`.
Create, list, read, update, role assignment. Demoting or deactivating the last
active system administrator is refused: nobody could reach the user management
endpoints afterwards.

**Patient management** - `app/services/patient_service.py`,
`endpoints/patients.py`. Create, list, read, update, search. A patient outside
the caller's scope returns 404 rather than 403, because 403 would confirm the
record exists.

**Admissions** - `app/services/admission_service.py`, `endpoints/admissions.py`,
mounted under `/patients/{id}/admissions`. Create, read, update, timeline, and
readmission tracking that preserves the source dataset's own labels.

**Dataset pipeline** - `app/services/dataset_import_service.py`,
`scripts/import_dataset.py`. Profile-driven: profiles ship for both the Diabetes
130-US export named in the brief and the India Hospital Readmission export.
Validation follows the SRS rules and rejected rows are counted against a named
reason instead of being dropped silently. `ml/src/data/preprocess.py` now removes
expired and hospice discharge dispositions before any other step - those patients
cannot be readmitted, so training on them leaks the target.

**Frontend** - `frontend/src/`: login, dashboard shell with role-aware
navigation, patient list with search, patient detail with admission history, and
a user management view. The access token is stored in an httpOnly cookie set by a
Next route handler, so it never reaches client JavaScript.

## How to run it

```bash
git clone <repo-url>
cd HealthForecastAI
git checkout intern/niyati-r

# ---- Backend ----
cd backend
python -m venv .venv
.venv/Scripts/activate          # Linux/macOS: source .venv/bin/activate
pip install -r requirements-dev.txt
cp ../.env.example ../.env      # set SECRET_KEY and DATABASE_URL

alembic upgrade head
uvicorn app.main:app --reload   # http://localhost:8000/docs

# ---- Frontend (second terminal) ----
cd frontend
npm install
npm run dev                     # http://localhost:3000

# ---- First account ----
# The first registration on an empty database becomes the system administrator.
curl -X POST localhost:8000/api/v1/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@hospital.org","full_name":"Admin","password":"Str0ng-Passw0rd!"}'

# ---- Dataset (optional; see ml/data/README.md for the download) ----
python scripts/import_dataset.py ml/data/raw/diabetic_data.csv --limit 500
```

Checks, matching CI:

```bash
cd backend && ruff check . && black --check . && mypy app && pytest --cov=app
cd ../ml && ruff check . && pytest
cd ../frontend && npm run lint && npm run typecheck && npm run build && npm test
cd .. && for s in scripts/ci/check_*.py; do python "$s"; done
```

## Evidence

Verified end to end against a running server with a real database and migrations
applied (no mocks):

| Check | Result |
|---|---|
| `alembic upgrade head` on an empty database | 7 tables created |
| Register first account | `role: system_admin` |
| Register second account | `role: doctor` |
| Login with a wrong password | `401` |
| Admin lists patients | `X-Total-Count: 2` |
| **Doctor lists patients** | **`X-Total-Count: 1`** - only their assigned patient |
| **Doctor reads a patient outside scope** | **`404`** |
| Doctor calls `GET /users` | `403` |
| Search `q=MRN-000` as admin / as doctor | 2 results / 1 result |
| `POST` admission with discharge before admission | `422` |
| Readmission tracking | `{"total_admissions":2,"readmitted_total":1,"by_label":{"<30":1,"NO":1}}` |
| Audit trail | includes `('patient.read', 2, 'doctor', 'failure', 1)` |

The last row is the refused out-of-scope read being recorded, which is the entry
an investigation would need.

The generated OpenAPI schema is committed at `docs/03-api/openapi.json`, and
every endpoint is documented in `docs/03-api/README.md`.

## Metrics

| Metric | Value |
|---|---|
| API operations implemented | 33 (17 written this milestone; the rest are mentor placeholders for Milestones 2-4) |
| Database tables created | 7 |
| Alembic migrations | 1 (previously 0) |
| Backend tests | 225 passing |
| ML tests | 23 passing |
| Frontend tests | 12 passing |
| **Total tests** | **260 passing** |
| Backend coverage | 95% |
| Dataset rows after preprocessing | not recorded - see Known gaps |

## Known gaps

1. **Dataset not loaded against a real export.** The import pipeline, its
   validation and its cleaning are implemented and covered by 18 tests, but every
   fixture is synthetic. No raw dataset is present in this environment, so no row
   count after preprocessing can be reported. Running
   `scripts/import_dataset.py` against a downloaded export is the remaining step.

2. **Dataset choice is unresolved in the repository.** My design documents name
   the India Hospital Readmission Dataset as primary; the scaffold
   (`ml/configs/config.yaml`, `ml/data/README.md`, `ml/src/data/`) is wired for
   Diabetes 130-US. The importer ships profiles for both rather than betting on
   one, but `ml/configs/config.yaml` still targets Diabetes. Needs a decision.

3. **The India export has a `region` column with no counterpart** in the
   `patients` table. It is deliberately not imported, and not forced into `race`,
   which is a Diabetes-specific column. Adding a column would change a
   mentor-owned schema file.

4. **Bootstrap administrator is a timing window.** The first registration on an
   empty database claims `system_admin`. A new environment must be registered
   against immediately after migrations run. A seeded administrator would remove
   the window.

5. **Not implemented, and out of this milestone's criteria:** refresh tokens
   (FR-AUTH-03), password reset (FR-AUTH-04), account lockout (FR-AUTH-05 - needs
   a `failed_login_attempts` column the reference schema does not carry).

6. **Never run against PostgreSQL.** Docker is unavailable in this environment.
   Migrations were verified two ways: executed against SQLite (upgrade and
   downgrade), and rendered as PostgreSQL DDL offline with
   `alembic upgrade head --sql`, which matches `01_schema.sql`. A run against a
   real PostgreSQL instance is still outstanding.

7. **`backend/pyproject.toml` had a formatting-config bug** I fixed: `[tool.black]`
   used `exclude`, which replaces black's defaults rather than adding to them, so
   `black .` descended into the `.venv` that `INTERN_GUIDE.md` tells you to
   create. Changed to `extend-exclude`. This affects every intern following the
   guide and is worth raising.
