# HealthForecast AI — Repository Audit

**Document Version:** 1.0
**Audit Date:** 2026-09-22
**Baseline Commit:** `f962704` — "feat(frontend): implement dashboard, authentication and user interface"
**Branch:** `intern/19-niyati-r`
**Supersedes:** `docs/niyati/HealthForecastAI_Milestone1_Audit.md` (2026-08-30), which is now materially stale for Auth, RBAC, User Management, Patient Management, Admission Management, and database migrations — those are now substantially complete. This document reflects direct inspection of the current repository state only; no removed/prior code is assumed to exist.
**Precedence used:** Project Brief → SRS → System Design → Database Design → ML Design → Implementation Plan → Milestone 1 Audit → Codebase.

---

## Executive Summary

| Metric | Value |
|---|---|
| Milestone 1 completion | **~90%** — auth, RBAC, user mgmt, patient mgmt, admission mgmt are real, DB-backed, and tested. Gaps: no `/auth/refresh`, no audit-log read endpoint, `/patients/anonymised` is a stub. |
| Milestone 2 completion | **~10%** — ML training scaffold and risk-tier math exist; zero endpoints return real model output; no model has ever been trained (`ml/artifacts/` is empty). |
| Milestone 3 completion | **~2%** — schema and endpoints for treatment/CDS/analytics are hardcoded stubs; no Synthea code exists anywhere; `patient_journey_events` table does not exist. |
| Milestone 4 completion | **~15%** — Docker Compose + Dockerfiles are production-grade and working; cloud deployment (AWS/Azure) is planning notes only; no integration/e2e tests exist. |
| Open architectural conflicts | **2** — (1) dataset choice split between Diabetes 130-US (still hardcoded in `ml/`) and India Hospital Readmission (partially supported in backend only); (2) MongoDB fully provisioned in infrastructure (`docker-compose.yml`, `pymongo` client, `MONGO_URI` config) despite the Database Design doc mandating PostgreSQL-only. |

The repository gives a genuinely strong Milestone 1 foundation — real RBAC, real JWT auth, real doctor-patient scoping, a schema-drift-proof test suite, and a working local Docker stack. Everything from Milestone 2 onward is either a hardcoded-zero-value stub or entirely absent. The two architectural conflicts flagged in the prior audit remain open and must be resolved before Milestone 2 ML work begins, because they determine which dataset the models train on and whether the `ml/` pipeline needs to be pointed at PostgreSQL instead of a raw CSV.

---

## 1. Repository Structure Analysis

| Directory | Purpose | Status |
|---|---|---|
| `backend/` | FastAPI app — models, schemas, services, repositories, API, core, alembic, tests | M1 modules complete; M2-M4 modules stubbed |
| `frontend/` | Next.js 15 / React / TypeScript / Tailwind | M1 shell complete (auth, patient list/detail, user list); zero UI for risk/CDS/analytics/treatment/reporting |
| `ml/` | Data pipeline, feature engineering, training (XGBoost/RF/LogReg), evaluation | Code-complete scaffold; **never executed** — no artifacts, no raw data present |
| `database/` | PostgreSQL schema (`01_schema.sql`) + MongoDB collection docs (`database/mongodb/`) | Postgres schema complete and migration-backed; MongoDB docs describe a `model_runs` collection that nothing writes to |
| `deployment/` | Docker, nginx, AWS/Azure notes | Local Docker stack complete and working; nginx config exists but is not wired into `docker-compose.yml`; cloud deploy is planning notes only |
| `docs/` | Design docs (`docs/niyati/`, complete) + mentor scaffold docs (`docs/01-08`, mostly skeleton) + milestone reports (`docs/06-milestones/`, milestone-1 filled in, 2-4 blank) | Mixed |
| `scripts/ci/` | 8 CI check scripts (branch, docs, files, milestones, notebooks, secrets, structure, syntax) | Complete, mentor-owned, must not be modified |
| `tests/` | Cross-boundary integration/e2e test dirs | Empty (`.gitkeep` only) — not yet populated |
| `.github/` | 5 workflows (ci, branch-guard, deploy, intern-progress, security) | Complete, mentor-owned |

---

## 2. Architecture Analysis

The System Design's six-layer architecture (Application → API Gateway/Security → AI Analytics/Prediction Engine → Data/Storage → Infrastructure → External Integrations) is correctly reflected in the repository's directory boundaries. Two binding architectural decisions from the Database Design and ML Design documents, however, are **not yet reflected in the running system**:

### 2.1 Dataset conflict (unresolved, split across layers)

- ML Design doc mandates the **India Hospital Readmission Dataset (2015–2024)** as the sole training source, with Diabetes 130-US permitted only as an optional early bootstrap.
- `ml/data/README.md`, `ml/configs/config.yaml`, `ml/src/data/load_data.py`, and `ml/src/data/preprocess.py` are **entirely Diabetes-130-US-specific** — column names, discharge-disposition codes, and age-band parsing all assume the UCI dataset shape. No India Hospital Readmission code path exists in `ml/` at all.
- `backend/app/services/dataset_import_service.py` (new since the prior audit) **does** implement both profiles (`diabetes_130_us` and `india_hospital_readmission`) and is unit-tested for both, but its default profile is still `diabetes_130_us`, and — critically — **it is not connected to `ml/train.py`**, which reads a raw CSV directly rather than from PostgreSQL.
- **Net effect:** the conflict is now a *split* conflict — the ingestion layer is dataset-agnostic and tested, but the model-training layer is not, and the two layers don't talk to each other.

### 2.2 MongoDB not eliminated at the infrastructure level

- Database Design doc: "PostgreSQL is the sole operational database... every reference to MongoDB... is superseded."
- `docker-compose.yml:23-35` still provisions a `mongodb` (mongo:7) container with a healthcheck, and the `backend` service's `depends_on` **blocks backend startup until MongoDB reports healthy** (`docker-compose.yml:50-54`), even though nothing in the application ever queries it.
- `backend/app/db/mongodb.py` (`get_mongo_client()`, `get_mongo_db()`) is fully written and `pymongo==4.10.1` is a pinned dependency, but a repo-wide grep confirms **zero call sites** outside the module itself.
- `database/mongodb/schemas/collections.md` documents a `model_runs` collection as "the model registry backing `GET /api/v1/models`" — this is **factually incorrect as implemented**: `ml/src/models/train.py` never writes to MongoDB; it writes local `joblib`/`json` files.
- `patient_journey_events` (the Postgres JSONB table the Database Design doc specifies as MongoDB's replacement for Synthea enrichment data) **does not exist** — so neither the old plan (MongoDB) nor the new plan (JSONB in Postgres) is actually implemented for that data.

**Recommendation:** Both conflicts should be resolved by the intern with their mentor before Milestone 2 coding begins (see Gap Analysis §Risk R1/R2). This audit assumes the Database Design and ML Design documents' decisions (PostgreSQL-only, India Hospital Readmission primary) are binding, per the document-precedence rule in this project's own governing documents, and the Milestone 2/3 designs in this deliverable set are written against that assumption while providing a documented fallback (see §5 of the Gap Analysis).

---

## 3. Dependency Analysis

| Layer | Key dependencies | Notes |
|---|---|---|
| Backend (`requirements.txt`) | fastapi 0.115.6, sqlalchemy 2.0.36, psycopg 3.2.3, alembic 1.14.0, python-jose, passlib[bcrypt], **pymongo 4.10.1 (unused)**, **numpy/pandas/scikit-learn/xgboost/joblib (present but unused by any endpoint)** | Backend is already dependency-ready to load and serve a trained model — `risk.py` just doesn't call into these libraries yet. |
| Backend (dev) | pytest 8.3.4, pytest-cov, pytest-asyncio, ruff, black, mypy | Full lint/type/test toolchain wired into CI. |
| ML (`ml/requirements.txt`) | scikit-learn, xgboost, pandas, joblib (not independently re-verified line-by-line, consistent with train.py imports) | Matches ML Design's XGBoost + Random Forest mandate; also includes Logistic Regression as an extra baseline not in the design doc. |
| Frontend (`package.json`) | next, react, typescript, tailwindcss, **recharts 3.10.1 (installed, zero import sites)**, vitest | Charting library present but completely unused — no chart exists anywhere in the frontend. |

---

## 4. Service Layer Analysis

| Service | Status | Evidence |
|---|---|---|
| `auth_service.py` | **Complete** | Real register/authenticate/issue_token/login, audits every outcome (`backend/app/services/auth_service.py:49-154`) |
| `user_service.py` | **Complete** | Full CRUD + last-administrator lockout protection |
| `patient_service.py` | **Complete** (except anonymisation) | Scope-aware CRUD, audits every access; `pseudonymise()` helper exists in `app/utils/anonymisation.py` but is never called |
| `admission_service.py` | **Complete** | Full CRUD, date-order re-validation on partial update, readmission summary aggregation |
| `risk_service.py` | **Partial** | Only `categorise_risk()` (pure threshold banding); no model loading, no inference, no persistence |
| `model_service.py` | **Placeholder-stub** | Empty file, docstring only |
| `treatment_service.py` | **Placeholder-stub** | Empty file, docstring only |
| `cds_service.py` | **Placeholder-stub** | Empty file, docstring only |
| `analytics_service.py` | **Placeholder-stub** | Empty file, docstring only |
| Reporting service | **Missing** | No file exists at all |

---

## 5. API Analysis

Base prefix `/api/v1` (`backend/app/main.py:44`). Every endpoint below was verified against source, not inferred from the router.

| Endpoint | Status |
|---|---|
| `POST /auth/register` | Real, DB-backed |
| `POST /auth/login` | Real, DB-backed (confirmed NOT a 501 — regression-tested at `test_auth.py:299`) |
| `GET /auth/me` | Real |
| `GET /auth/roles` | Real (static) |
| `POST /auth/refresh` | **Missing entirely** — no endpoint, no refresh-token issuance function despite `REFRESH_TOKEN_EXPIRE_MINUTES` being defined in config |
| `GET/POST /users`, `GET/PATCH /users/{id}` | Real, DB-backed |
| `GET/POST /patients`, `GET/PATCH /patients/{id}` | Real, DB-backed |
| `GET /patients/anonymised` | Hardcoded `[]`, TODO(milestone-3) |
| `GET/POST /patients/{id}/admissions`, `GET/PATCH /patients/{id}/admissions/{id}` | Real, DB-backed |
| `GET /patients/{id}/admissions/readmissions` | Real (historical summary, not a forecast) |
| `POST /risk/predict` | Hardcoded `probability=0.0`, TODO(milestone-2) |
| `GET /risk/high-risk` | Hardcoded `[]` |
| `GET /risk/forecast` | Hardcoded all-zero |
| `GET /treatment`, `GET /treatment/recovery-trends` | Hardcoded `[]` |
| `GET /clinical-support/recommendations/{id}`, `/discharge-plan/{id}` | Hardcoded stub objects |
| `GET /analytics/summary`, `/readmissions`, `/population-health` | Hardcoded all-zero/empty |
| `GET /models`, `/models/active`, `/models/metrics` | Hardcoded `[]` / `"not-loaded"` / all-`None` |
| Reporting (`/reports/*`) | **Missing entirely** — no router, no endpoint file |
| Audit log read (`/audit-logs`) | **Missing** — write path exists (`AuditRepository`), no read/export endpoint; `Permission.AUDIT_LOG_READ` is defined but dead |

No endpoint anywhere currently returns HTTP 501 — every "not yet built" surface returns a plausible-looking but fake 200 response instead. **This matters for Milestone 2/3 design: a naive integration test would pass against fake data today.**

---

## 6. Database Analysis

One real Alembic migration (`backend/alembic/versions/0001_initial_schema.py`, revision `0001`, no history yet) creates 7 tables, table-for-table identical to `database/postgres/schema/01_schema.sql`, and is regression-tested by `test_database_schema.py` (including an actual `alembic upgrade`/`downgrade` run against a throwaway DB).

| Database Design doc table | Actual implementation |
|---|---|
| `roles` | Not a table — `Role` StrEnum + a `CHECK` constraint on `users.role` |
| `users` | Present, matches design |
| `doctor_patient_map` | **Present** (resolves the prior audit's critical gap) — model, migration, unique constraint, scope-filter enforcement in `PatientRepository.scope_clause()`, tested |
| `patients` | Present, matches design |
| `admissions` | Present, matches design |
| `medications` | Missing as a table — folded into `admissions.num_medications` (int) |
| `treatments` | Present, renamed `treatment_outcomes` |
| `readmission_records` | Missing as a table — folded into `admissions.readmitted` (varchar) |
| `predictions` / `risk_scores` | Present, merged into one table: `risk_predictions` |
| `prediction_outcomes` | Missing entirely |
| `care_recommendations` | Missing as a table (stub endpoint exists, unbacked by data) |
| `reports` | Missing entirely |
| `model_metadata` | Missing entirely (no table, no ORM class) |
| `patient_journey_events` | Missing entirely — no JSONB table, no Synthea ingestion code |

This is materially fewer tables than the Database Design doc specifies, but what exists is internally consistent and drift-tested. Milestone 2/3 design work must add the missing tables via new migrations rather than assuming they exist.

---

## 7. ML Analysis

- **Pipeline code is real, not stub.** `load_data.py`, `preprocess.py` (leakage-safe cleaning: expired/hospice encounter removal, age bucketing, rare-category collapsing), `build_features.py`, `train.py`, `predict.py`, `metrics.py` are all fully implemented against the Diabetes 130-US shape.
- **Zero models have ever been trained.** `ml/artifacts/` contains only `.gitkeep`; the raw CSV is gitignored and absent locally, so `train.py` cannot even run without a manual download.
- **Threshold drift from the ML Design doc:** `ml/configs/config.yaml` gates promotion on `roc_auc ≥ 0.65` and `recall ≥ 0.50`, not the design doc's `roc_auc ≥ 0.75` / `High-risk F1 ≥ 0.70`. Since no model has been trained, this has never been exercised.
- **No model registry.** `model_metadata` table doesn't exist; the documented MongoDB `model_runs` collection is never written to; the `/models` endpoints are hardcoded stubs.
- **Synthea: zero code anywhere.** A repo-wide case-insensitive grep for "synthea" returns hits only inside `docs/niyati/*.md` — no ingestion, no FHIR parsing, no ETL.
- XGBoost + Random Forest (+ an extra Logistic Regression baseline) are correctly configured and enabled per the ML Design doc's model selection.

---

## 8. Frontend Analysis

Confirmed **not** "0% built" (the prior audit's finding is stale). Current state:

- Real httpOnly-cookie JWT session flow (`app/api/session/route.ts`, `lib/session.ts`) — access token only, **no refresh-token handling**, session hard-expires at 30 minutes.
- One generic dashboard shell (`dashboard/layout.tsx` + `dashboard/page.tsx`) shared by all 4 roles, differentiated only by a role badge, one line of copy, and which nav links appear (`lib/navigation.ts`) — **not** 4 distinct role dashboards as the Project Brief's architecture diagram implies.
- Patient list (with search) and detail pages are real, DB-backed. No create-patient UI, no edit, no risk score, no CDS panel.
- User list is real but **read-only** — no create/edit/deactivate UI despite the backend supporting all of it.
- `components/charts/` is empty; `recharts` is installed but never imported — **zero charts anywhere**.
- `RiskPrediction` and `HospitalAnalyticsSummary` TypeScript types exist (`types/index.ts`) but are unused by any component.
- Entirely absent: risk/readmission views, CDS UI, analytics dashboards, treatment-effectiveness UI, reporting/export, audit-log viewer, registration page, AI model management UI.

---

## 9. Test Coverage Analysis

| Area | Files | Real coverage |
|---|---|---|
| Backend | 12 files, ~2,554 lines | Auth, RBAC, users, patients, admissions, DB schema/migration, repositories, dataset import — all genuinely exercised, including negative/scope/authorization cases. Zero tests for risk/treatment/CDS/analytics/reporting endpoints (consistent with those being stubs) beyond the pure `categorise_risk()` function. |
| Frontend | 2 files, 11 tests | Login form behavior + `dashboardLinks()` permission logic. No page-level or integration tests; no test of the httpOnly-cookie route handler itself. |
| ML | 3 files, 17 tests | Config integrity, metrics/risk-band math, preprocessing transformations. No test trains a model end-to-end or validates pipeline output shape. |
| Integration (`tests/integration/`) | Empty | `.gitkeep` only |
| E2E (`tests/e2e/`) | Empty | `.gitkeep` only |

**Overall:** Milestone 1 surfaces have strong, real test coverage. Every later-milestone surface has either no tests or tests of pure helper functions only — consistent with those modules being unimplemented rather than under-tested.

---

*End of HealthForecastAI_Repository_Audit.md*
