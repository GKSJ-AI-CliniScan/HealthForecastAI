# Milestone 1 report - Week 1 & 2 - Project Initialization, Design Process & Core Setup

- **Intern name:** Kanak Prabhakar
- **Branch:** `intern/kanak-prabakar`
- **Submitted on:** 29 August 2026

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

My track for this milestone was the **backend API layer**: authentication,
role-based access control, and the patient management endpoints the dashboard
reads from. I also carried the dataset preprocessing pipeline over from my
earlier data work.

Everything was built into the existing scaffold rather than beside it. No new
top-level package was added, and no scaffold module was replaced with a parallel
implementation.

### Authentication and access control

| File | What it does |
|---|---|
| `backend/app/api/deps.py` | Two identity layers (below) plus the permission guards |
| `backend/app/api/v1/endpoints/auth.py` | `POST /login`, `POST /register`, `GET /me`, `GET /roles` |
| `backend/app/services/auth_service.py` | Credential checking, account creation, enable/disable |
| `backend/app/schemas/user.py` | Login/create schemas with field validators |

The dependency layer has two levels, and the split is deliberate:

- `get_current_user` resolves the caller from the JWT alone. It needs no
  database, and it is what the service-level routes use.
- `get_verified_user` additionally reloads the account and rejects it if the
  user has been deleted, disabled, or had their role changed.

The second layer exists because a JWT stays valid until it expires. Without the
reload, disabling a compromised account would have no effect for up to thirty
minutes. Every patient-data endpoint uses the verified layer; the cheap layer
remains available so the existing scaffold contract is unchanged.

The permission is checked from the token claims *before* the account is
reloaded. Ordering it this way means a caller who was never allowed at an
endpoint is rejected without a database round trip, and it keeps the test suite
runnable without a PostgreSQL server - which CI does not provide.

An unrecognised role in a token is rejected with 403. It is not defaulted to a
clinical role, because a corrupted or tampered role value silently resolving to
`doctor` would be a privilege escalation path rather than a fallback.

Registration is guarded by `USER_MANAGE`, so only a system administrator can
create accounts. In a hospital system, accounts are provisioned, not self-served.

Input validation lives in the Pydantic schemas: emails are lowercased and
trimmed so lookups are case-insensitive, passwords must mix letters and digits,
and the role field is checked against the four roles in the access matrix.

### Patient management

| File | What it does |
|---|---|
| `backend/app/api/v1/endpoints/patients.py` | List, detail, create, anonymised cohort, dashboard stats |
| `backend/app/services/patient_service.py` | Row scoping, anonymisation, metric calculation |
| `backend/app/schemas/patient.py` | Request/response models with dataset-aligned validation |

Permission guards decide whether a caller reaches an endpoint. Row scoping
decides what they see once inside, which is the part that stops a doctor reading
another ward's patients with a perfectly valid token. A doctor's queries are
filtered to their own assignments; administrators and researchers read across
the hospital.

A patient outside the caller's scope returns **404, not 403**. A 403 would
confirm that the record exists, which is itself a small disclosure.

Dashboard metrics are scoped the same way, and the response carries a `scope`
field (`assigned` or `hospital`) so the UI can label the numbers honestly
instead of implying a doctor is seeing hospital-wide figures.

### Dataset preprocessing

| File | What it does |
|---|---|
| `ml/src/data/load_data.py` | Loads the raw CSV and the three-table `IDS_mapping.csv` |
| `ml/src/data/preprocess.py` | Cleaning steps, each one separately testable |
| `ml/src/features/build_features.py` | Prior-visit and medication-change features |
| `ml/src/data/build_dataset.py` | One-command pipeline that also writes the evidence log |

Four decisions here matter more than the code:

1. **Missing values are `?`, not blanks.** A naive `isnull()` reports this
   dataset as clean when it is not.
2. **Death and hospice discharges are removed** (dispositions 11, 13, 14, 19,
   20, 21). Those patients cannot be readmitted, so leaving them in teaches the
   model that a high-risk group never returns.
3. **One encounter per patient.** The file holds 101,766 encounters from roughly
   71,500 patients. Treating encounters as independent lets the same person land
   in both the training and test split.
4. **The target is binary.** `<30` is positive; `>30` and `NO` are both
   negative, because the brief asks for readmission within thirty days.

`weight` is dropped rather than imputed: it is missing in roughly 97 percent of
rows. `medical_specialty` and `race` keep an explicit `Missing` category instead,
because for those columns the absence is informative.

## How to run it

The repository targets **Python 3.11**. A newer interpreter fails during install:
`psycopg-binary==3.2.3` publishes no wheel for Python 3.14, which is the default
on recent Ubuntu releases. The quickest way to get 3.11 without touching the
system Python is `uv`:

```bash
git clone <repo-url>
cd HealthForecastAI
git checkout intern/kanak-prabakar

# --- Backend ---
cd backend
uv venv --python 3.11 .venv          # or python3.11 -m venv .venv
source .venv/bin/activate
uv pip install -r requirements.txt -r requirements-dev.txt

# Tests need no database - they run against in-memory SQLite
pytest tests/ -v

# Run the API (needs PostgreSQL from docker compose up -d)
uvicorn app.main:app --reload --port 8000
# Interactive docs: http://localhost:8000/docs

# --- Demo accounts, one per role ---
python ../database/postgres/seeds/seed_users.py

# --- Dataset pipeline ---
# Download diabetic_data.csv and IDS_mapping.csv into ml/data/raw/ first.
# The dataset is never committed - see ml/data/README.md.
cd ../ml
python -m src.data.build_dataset
pytest tests/test_preprocess.py -v
```

## Evidence

All output below is from a local run on 29 August 2026, Python 3.11.16.

**Backend test suite - 51 passing**

```
$ pytest tests/ -v
platform linux -- Python 3.11.16, pytest-8.3.4, pluggy-1.6.0
rootdir: /home/kanak/Downloads/HealthForecastAI/backend
configfile: pyproject.toml
collected 51 items

tests/test_auth_api.py ..............                          [ 27%]
tests/test_health.py ...                                       [ 33%]
tests/test_patients_api.py ............                        [ 56%]
tests/test_rbac.py .........                                   [ 74%]
tests/test_risk_service.py .........                           [ 92%]
tests/test_security.py ....                                    [100%]

============================ 51 passed in 17.32s ============================
```

The suite covers the access matrix, the auth flow, row scoping and the dashboard
metrics. Tests worth naming individually:

| Test | What it proves |
|---|---|
| `test_disabled_account_cannot_use_an_existing_token` | Revocation takes effect immediately, not at token expiry |
| `test_token_with_an_unknown_role_is_rejected` | An invalid role fails closed instead of defaulting |
| `test_out_of_scope_patient_returns_404_not_403` | Scope violations do not confirm a record exists |
| `test_researcher_reads_the_anonymised_cohort` | De-identification happens server side, before transmission |
| `test_dashboard_stats_are_scoped_to_the_caller` | A doctor's metrics cover their caseload, not the hospital |
| `test_stats_do_not_divide_by_zero_without_data` | An empty database renders a dashboard, not a 500 |

**Preprocessing tests - 11 passing**

```
$ cd ../ml && pytest tests/test_preprocess.py -v
platform linux -- Python 3.11.16, pytest-8.3.4, pluggy-1.6.0
rootdir: /home/kanak/Downloads/HealthForecastAI/ml
collected 11 items

tests/test_preprocess.py ...........                           [100%]

============================ 11 passed in 0.22s =============================
```

Each cleaning decision has its own test, built on a small synthetic frame, so the
suite runs in CI without the dataset present.

**Lint and formatting**

```
$ ruff check app tests
All checks passed!

$ black --check app tests
All done! 57 files would be left unchanged.
```

**Dataset pipeline evidence**

`python -m src.data.build_dataset`, run from `ml/`, writes a run log to
`docs/06-milestones/evidence/milestone-1-run.txt` containing the row counts at
each stage, the missing-value profile, and the class balance of the target. That
file is generated, not hand-written, so the numbers cannot drift from the code.

## Metrics

| Metric | Value |
|---|---|
| API endpoints implemented | 9 (`/auth` x4, `/patients` x5) |
| Roles enforced | 4 (doctor, hospital_admin, researcher, system_admin) |
| Permissions in the access matrix | 19 |
| Backend tests passing | 51 |
| Preprocessing tests passing | 11 |
| Lint errors | 0 |
| Formatting errors | 0 |
| Dataset rows before cleaning | 101,766 encounters, ~71,500 unique patients |
| Dataset rows after cleaning | Recorded in the generated run log |

Row counts after preprocessing are deliberately not typed here. They come from
the generated evidence file, so a change to the pipeline updates them rather
than leaving a stale number in a report.

## Known gaps

- **No frontend or database work in this report.** Those are Kiruthika's and
  Samarth's tracks. My branch covers the backend and the ML pipeline only.
- **Python 3.11 is required, and this is not enforced anywhere.** The install
  fails confusingly on 3.14 because `psycopg-binary` has no wheel for it. A
  `requires-python` pin or a note in the README would save the next person the
  hour it cost me.
- **Test coverage percentage is not measured.** The suite covers the security
  boundaries deliberately, but `pytest-cov` is not wired into CI yet.
- **The token is a bearer JWT held in browser memory.** Milestone 2 should move
  it to an httpOnly cookie issued by the backend.
- **No audit logging.** `app/models/audit_log.py` exists in the scaffold but
  nothing writes to it. Every patient read should be recorded before this
  handles anything resembling real data.
- **No rate limiting on `/auth/login`.** Currently an unlimited number of
  password attempts is possible.
- **`/patients` pagination is offset-based**, which will degrade on the full
  100k-row table. Keyset pagination is the fix.
- **The prediction endpoint does not exist yet.** That is Milestone 2, and it is
  what the preprocessing pipeline was built to feed.
