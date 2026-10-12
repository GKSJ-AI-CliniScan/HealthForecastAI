# Milestone 1 report - Week 1 & 2 - Project Initialization, Design Process & Core Setup

- **Intern name:** Niyati R
- **Branch:** `intern/19-niyati-r` (the report was first submitted from `intern/niyati-r`)
- **Submitted on:** 2026-08-31 (original submission). Reconciled with the current repository on 2026-10-12; those later corrections are marked as such.

> **Reconciliation note (2026-10-12).** This report was first written on
> 2026-08-31 and has been checked against the repository as it stands at commit
> `7b99155`. The original text is kept wherever it is still accurate. Three
> things changed: (1) figures that have grown since then are shown as *at
> submission* and *now*; (2) one internal contradiction in the original evidence
> section is corrected (see Evidence); (3) design deliverables that were not
> produced at the time are listed honestly, together with the documents that
> were added later. Work done *later* is labelled so it is not mistaken for
> Milestone 1 work.

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

### Where each criterion stands today

| Criterion | Status | Basis |
|---|---|---|
| Project initialization and architecture setup | Met | Scaffold, CI and layered backend (commits `d45959c`, `21cd637`); written architecture in [`docs/01-architecture`](../01-architecture/README.md) |
| Authentication, RBAC, patient management | Met | Commits `2646800`, `6857ce9`, `262df7d`; 579 backend tests pass today; see [`docs/04-rbac`](../04-rbac/README.md) |
| Healthcare dashboard functional | Met | Commit `f962704`; the interface has since been redesigned (section "Later work") |
| Dataset integration and preprocessing | Met, with a different dataset than the brief names | The importer supports both datasets; the models were trained on the India export, not Diabetes 130-US (see Known gaps 1 and 2) |
| Brief item: "Create UI wireframes" | **Not done at the time.** Current-state wireframes were drawn afterwards | [`docs/05-wireframes`](../05-wireframes/README.md), labelled as retrospective |
| Brief item: "Design system architecture and database schema" | Schema and migrations done; written diagrams were not produced at the time and were added later | [`docs/02-database`](../02-database/README.md), [`docs/01-architecture`](../01-architecture/README.md) |

---

## What I built

**Design documents** - `docs/niyati/`: SRS, System Design, Database Design, ML
Design, Implementation Plan, plus a pre-implementation repository audit. These
are planning documents. Several of their decisions were later overtaken by the
implementation (for example MongoDB, the XGBoost-first plan and the sixteen-table
schema); they are kept as history with a status note rather than rewritten.

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
reason instead of being dropped silently. `ml/src/data/preprocess.py` removes
expired and hospice discharge dispositions before any other step - those
patients cannot be readmitted, so training on them leaks the target.

**Frontend** - `frontend/src/`: login, dashboard shell with role-aware
navigation, patient list with search, patient detail with admission history, and
a user management view. The access token is stored in an httpOnly cookie set by a
Next route handler, so it never reaches client JavaScript.

### Later work (not part of Milestone 1)

| Date | Work | Where it is reported |
|---|---|---|
| 2026-09-23 | Model registry, prediction schema, ML pipeline, inference and clinical decision support | [Milestone 2](milestone-2.md) |
| 2026-09-27 | Treatment, analytics, research and reporting | [Milestone 3](milestone-3.md) |
| 2026-10-07 to 10-12 | Dataset pipeline, prediction-safety wording, interface redesign, Forecast H mark and sidebar, theme toggle, documentation | [Milestone 4](milestone-4.md) |

## How to run it

```bash
git clone https://github.com/GKSJ-AI-CliniScan/HealthForecastAI.git
cd HealthForecastAI
git checkout intern/19-niyati-r

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

Use an empty database for `alembic upgrade head`. Starting the database with the
Compose init script first conflicts with Alembic (see
[`docs/02-database`](../02-database/README.md#6-setting-up-a-database-and-the-sql-versus-alembic-conflict)).
The full runbook is [`docs/08-deployment`](../08-deployment/README.md).

Checks, matching CI:

```bash
cd backend && ruff check . && black --check . && mypy app && pytest --cov=app
cd ../ml && ruff check . && pytest
cd ../frontend && npm run lint && npm run typecheck && npm run build && npm test
cd .. && for s in scripts/ci/check_*.py; do python "$s"; done
```

## Evidence

> **Correction (2026-10-12).** The original text here said these checks were
> "verified end to end against a running server with a real database and
> migrations applied (no mocks)". Known gap 6 of the same report says the
> environment had no PostgreSQL and no Docker, so the "real database" was a
> **SQLite** database, with the migration also rendered as PostgreSQL DDL offline.
> The table below is that SQLite-backed check, as originally recorded. PostgreSQL
> has been used since (see "Since then").

| Check | Result (as recorded on 2026-08-31, SQLite) |
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

**Since then (verified 2026-10-12):**

| Check | Result |
|---|---|
| A development PostgreSQL database (read-only look) | 9 tables plus `alembic_version`, at revision `0005` |
| Full backend test suite at commit `7b99155` | 579 passed, 33 skipped (live end-to-end suite), 0 failed |
| Full ML suite | 148 passed |
| Frontend suite | 222 passed, TypeScript and ESLint exit 0 |
| Registered API operations | 53, all described in [`docs/03-api`](../03-api/README.md) |

The OpenAPI schema is committed at `docs/03-api/openapi.json` (regenerated on
2026-10-12; the Milestone 1 export held 33 operations) and every endpoint is
documented in `docs/03-api/README.md`.

**Design evidence added after the milestone:**
[architecture](../01-architecture/README.md) (component, request, authentication
and ML diagrams), [database](../02-database/README.md) (ER diagram, constraints,
migrations), [RBAC](../04-rbac/README.md) (required versus implemented matrix) and
[current-state wireframes](../05-wireframes/README.md) (retrospective, not the
original designs).

## Metrics

| Metric | At submission (2026-08-31) | Now (2026-10-12) |
|---|---|---|
| API operations | 33 (17 written this milestone; the rest were mentor placeholders) | 53 registered |
| Database tables | 7 | 9 |
| Alembic migrations | 1 | 5 (head `0005`) |
| Backend tests | 225 passing | 579 passed, 33 skipped |
| ML tests | 23 passing | 148 passed |
| Frontend tests | 12 passing | 222 passed |
| **Total** | **260 passing** | 949 passed, 33 skipped |
| Backend coverage | 95% (as reported then) | Not re-measured; no current figure |
| Dataset rows after preprocessing | Not recorded then | India export: 120,000 admissions joined for 86,400 patients; 7,413 further rows excluded from the readmission target (deaths), per the training metrics of 2026-10-09 |

## Known gaps

Each gap is shown with its original wording and its status now.

1. **Dataset not loaded against a real export.** *Original:* the import pipeline
   was implemented and covered by tests, but every fixture was synthetic.
   *Now:* resolved for the India export, which has been downloaded, used for
   training and partly loaded into a development PostgreSQL database
   (2,036 patients and 3,746 admissions). **The Diabetes 130-US export, which the
   brief names for this milestone, has no recorded load in the repository
   evidence.** Its import profile exists and is tested with synthetic data only.
2. **Dataset choice is unresolved in the repository.** *Original:* the design
   documents named India as primary while the scaffold targeted Diabetes.
   *Now:* the ML configuration and the trained models use the India export, and
   the documentation reflects that, but **no mentor ratification is recorded**, so
   the brief's requirement and the implementation still differ. Needs a decision.
3. **The India export has a `region` column with no counterpart** in the
   `patients` table. It is deliberately not imported. Unchanged. Several other
   India fields are also not imported; the list is in
   [`docs/02-database`](../02-database/README.md#5-dataset-mapping-and-provenance).
4. **Bootstrap administrator is a timing window.** The first registration on an
   empty database claims `system_admin`. A new environment must be registered
   against immediately after migrations run. Unchanged.
5. **Not implemented:** refresh tokens (FR-AUTH-03), password reset (FR-AUTH-04),
   account lockout (FR-AUTH-05). Unchanged. Also not implemented, and not
   promised for this milestone: an audit-log viewer (FR-AUD-04).
6. **Never run against PostgreSQL.** *Original:* Docker was unavailable.
   *Now:* PostgreSQL has been used in development and a database sits at
   revision `0005`. A new conflict has appeared: the Compose init script and
   Alembic cannot both initialise one database (see
   [`docs/02-database`](../02-database/README.md#6-setting-up-a-database-and-the-sql-versus-alembic-conflict)).
   A full `docker compose up` has still not been verified.
7. **`backend/pyproject.toml` formatting-config bug** fixed during this milestone:
   `[tool.black]` used `exclude`, which replaces black's defaults, so `black .`
   descended into the virtual environment. Changed to `extend-exclude`.
8. **Design deliverables missing at the time (added 2026-10-12).** The brief
   asks for UI wireframes and a designed architecture and schema. Original
   wireframes were never produced; the SVG wireframes added later show the
   implemented interface, not the original designs, and are labelled so. No
   mentor approval of any design is recorded.
