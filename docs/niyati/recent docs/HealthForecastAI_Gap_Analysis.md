# HealthForecast AI — Gap Analysis

**Document Version:** 1.0
**Companion Document:** `HealthForecastAI_Repository_Audit.md`
**Audit Date:** 2026-09-22 · Baseline: commit `f962704` on `intern/19-niyati-r`

---

## 1. Milestone Mapping

| Component | Current Status | Milestone | Notes |
|---|---|---|---|
| Repo scaffold, Docker Compose, CI/CD, branch/commit rules | Fully Complete | 1 | — |
| PostgreSQL schema + Alembic migration (7 tables) | Fully Complete | 1 | Drift-tested |
| JWT auth (register/login/me/roles) | Fully Complete | 1 | No `/refresh` |
| RBAC (4 roles, permission matrix, guards) | Fully Complete | 1 | 2 dead permissions (`AUDIT_LOG_READ`, `SYSTEM_CONFIGURE`) |
| User management (CRUD) | Fully Complete | 1 | — |
| Patient management (CRUD, doctor scope) | Fully Complete | 1 | `/anonymised` is a stub |
| Admission management (CRUD, readmission summary) | Fully Complete | 1 | — |
| Audit logging — write path | Fully Complete | 1 | — |
| Audit logging — read/export path | Missing | 1 (FR-AUD-04) | No endpoint; permission defined but unused |
| Frontend auth + dashboard shell | Fully Complete | 1 | One generic shell for all 4 roles, not 4 distinct dashboards |
| Frontend patient list/detail | Fully Complete | 1 | No create/edit UI |
| Frontend user management UI | In Progress | 1 | List-only, no create/edit |
| Dataset import (dual-profile CSV → Postgres) | Fully Complete | 1/2 | Backend-side only, not connected to `ml/` |
| ML data pipeline (load/clean/features) | Fully Complete (code) | 2 | Diabetes-130-US only; never executed |
| ML model training (XGBoost/RF/LogReg) | Fully Complete (code) | 2 | Zero trained artifacts exist |
| Model registry / versioning | Missing | 2 | No `model_metadata` table; MongoDB collection documented but unwired |
| Risk score API + persistence | Requires Refactoring | 2 | Endpoint exists, returns hardcoded 0.0 |
| Readmission prediction API | Missing | 2 | Only a hardcoded `/risk/forecast` stub exists; no `POST /predictions/readmission` |
| Risk/readmission dashboard UI | Missing | 2 | No route, no chart |
| Clinical Decision Support engine | Missing | 2/3 | Endpoints are hardcoded stubs; no rule engine |
| Treatment effectiveness module | Missing | 3 | Table exists (`treatment_outcomes`), zero logic reads/writes it |
| Healthcare analytics dashboards | Missing | 3 | Endpoints hardcoded; no charts |
| Research/anonymized analytics | Missing | 3 | `pseudonymise()` helper exists but is dead code |
| Synthea ingestion / `patient_journey_events` | Missing | 3 | Zero code anywhere in the repo |
| Reporting (PDF/Excel export) | Missing | 3 | No table, no service, no endpoint |
| Full RBAC/security/integration test suite | Missing | 4 | `tests/integration/`, `tests/e2e/` are empty |
| Cloud deployment (AWS/Azure) | Missing | 4 | Planning notes only; local Docker stack is complete |

---

## 2. Requirements Validation Against the Project Brief

| Requirement Area | Status | Detail |
|---|---|---|
| Functional — User Management Module | **Met** (M1 scope) | Doctor/Admin/Researcher/SysAdmin accounts, auth, RBAC all real |
| Functional — Patient Data Management | **Met** (M1 scope) | Records, history, admission tracking real; treatment tracking table exists but unused |
| Functional — Risk Prediction Module | **Not met** | No real inference anywhere |
| Functional — Treatment Effectiveness Module | **Not met** | No logic against `treatment_outcomes` |
| Functional — Clinical Decision Support Module | **Not met** | Hardcoded stub responses only |
| Functional — Healthcare Analytics Dashboard | **Not met** | Hardcoded stub responses only |
| Functional — AI Model Management Module | **Not met** | No registry, no versioning, no promotion workflow |
| User Roles (Doctor/Admin/Researcher/SysAdmin) | **Met** structurally | Backend RBAC fully correct; frontend does not differentiate role experiences beyond nav/copy |
| Dashboards (role-specific) | **Partially met** | One generic dashboard shell; brief calls for genuinely distinct Doctor/Admin views |
| Reports (PDF/Excel export) | **Not met** | No reporting module at all |
| AI Components (risk engine, CDS) | **Not met** | Present only as design/stub |
| Analytics (readmission, outcome, trend) | **Not met** | Present only as design/stub |
| Security (JWT, RBAC, audit, encryption) | **Mostly met** | JWT/RBAC/audit-write real; no PII/PHI column encryption implemented (`patients.full_name`-equivalent fields are plaintext); no refresh-token rotation |
| Scalability (horizontal scaling readiness) | **Not evaluated** | No load testing performed; stateless service design is in place structurally |
| Data Management (dataset ingestion/preprocessing) | **Partially met** | Diabetes-130-US path complete; India Hospital Readmission path exists in backend only, unconnected to ML training |

---

## 3. Milestone 1 Validation

| Item | Status |
|---|---|
| Authentication | **Complete** — real JWT issuance, bcrypt hashing, account-lockout via `is_active` deactivation (no failed-attempt lockout counter — FR-AUTH-05 not implemented) |
| Authorization / RBAC | **Complete** — full permission matrix, defense enforced at every route (meta-tested) |
| JWT | **Partial** — access tokens complete; no refresh-token issuance/rotation despite config placeholder existing |
| RBAC | **Complete** |
| User Management | **Complete** |
| Patient Management | **Complete** (except anonymisation) |
| Admission Management | **Complete** |
| Database Schema | **Complete**, but narrower than the Database Design doc (7 tables vs. 16 specified) — acceptable for M1 scope, must be extended for M2/M3 |
| Migrations | **Complete** — one squashed initial migration, drift-tested |
| Dashboard Foundation | **Complete** as a shell; not yet role-differentiated |
| Dataset Import | **Complete** for CSV→Postgres ingestion (both profiles); **not connected** to ML training |
| Data Preprocessing | **Complete** for Diabetes-130-US only |

**Verdict:** Milestone 1 is functionally done and well-tested. Remaining M1-adjacent fixes (refresh token, audit-log read endpoint, failed-login lockout, anonymisation wiring) are small and should be picked up opportunistically during Milestone 2, not blocking it.

---

## 4. Detailed Gap Analysis

For every gap: why missing, priority, dependencies, estimated effort (rough, solo-intern pace), recommended order.

### 4.1 Critical / Milestone-2-blocking

| Gap | Why missing | Priority | Dependencies | Est. effort | Order |
|---|---|---|---|---|---|
| **Dataset conflict (R1)** unresolved between `ml/` (Diabetes) and backend importer (dual-profile) | Two people/phases built ingestion and training independently; never reconciled | Critical | None — a decision, not code | 0.5 day (decision + doc update) | 1st |
| **ML pipeline reads from raw CSV, not PostgreSQL** | `ml/train.py` predates `dataset_import_service.py`; never rewired | Critical | Dataset conflict resolved first | 1-2 days | 2nd |
| **No trained model artifacts** | Pipeline never executed end-to-end against real data | Critical | Dataset + pipeline wiring above | 1 day (compute) + tuning | 3rd |
| **`model_metadata` table missing** | Database Design table never migrated | Critical | None | 0.5 day | Parallel with #3 |
| **`risk_predictions` write path missing** | `risk_service.py` never extended past `categorise_risk()` | Critical | Trained model artifact | 1 day | After #3 |
| **`POST /predictions/readmission` endpoint missing** | Never built — only a forecast-aggregate stub exists | Critical | Trained model | 1 day | After #3 |
| **No readmission-specific model** | Only one generic "readmission_model.joblib" trained per `train.py`; SRS wants both a risk model and a readmission model | High | Training pipeline generalization | 1 day | After #3 |

### 4.2 Important / Milestone-2 core

| Gap | Why missing | Priority | Dependencies | Est. effort | Order |
|---|---|---|---|---|---|
| CDS recommendation engine (rule-based) | Endpoints are hardcoded stubs; `care_recommendations` table doesn't exist | High | Risk/readmission predictions must exist first | 2 days | After predictions live |
| Risk/readmission dashboard UI (Doctor + Admin) | Frontend has zero chart infra wired despite `recharts` being installed | High | Prediction APIs must return real data | 2-3 days | After APIs |
| High-risk patient list endpoint (`GET /risk/high-risk`) | Currently `[]` — needs a real query against `risk_predictions` | Medium | `risk_predictions` populated | 0.5 day | With #predictions |
| Model promotion/versioning workflow | No `model_metadata`, no staged→production flow | Medium | `model_metadata` table | 1 day | After table exists |

### 4.3 Milestone-3 scope

| Gap | Why missing | Priority | Dependencies | Est. effort | Order |
|---|---|---|---|---|---|
| Treatment effectiveness logic | `treatment_service.py` is an empty stub | High | Milestone 2 predictions (for cohort correlation) | 2 days | Start of M3 |
| Healthcare analytics aggregation | `analytics_service.py` empty; no materialized views | High | Sufficient `risk_predictions`/`admissions` data present | 2 days | Parallel with treatment |
| Researcher anonymized view | `pseudonymise()` dead code; `/patients/anonymised` stub | Medium | None — can be done independently | 1 day | Early M3 (low risk, unblocks Researcher role) |
| Reporting module (PDF/Excel export) | No table, no service | Medium | Analytics aggregation must exist first | 2 days | After analytics |
| Synthea ingestion / `patient_journey_events` | Zero code anywhere; **genuinely large scope for a solo 2-week milestone** | Low (recommend descoping) | New JSONB table, FHIR-shape mapping ETL | 3-5 days if attempted | See §5 recommendation below |

### 4.4 Milestone-4 scope (noted, not designed in this deliverable set per phase boundaries)

| Gap | Priority | Notes |
|---|---|---|
| Integration/E2E test suite | High | `tests/integration/`, `tests/e2e/` are empty; at minimum one RBAC-proving flow per role is required per `tests/README.md` |
| Refresh-token rotation | Medium | Currently sessions hard-expire at 30 min with no renewal |
| Failed-login account lockout (FR-AUTH-05) | Medium | Not implemented |
| PII/PHI column encryption | Medium | `patients` demographic fields are plaintext at rest |
| Cloud deployment | High | AWS/Azure are planning-notes only |
| MongoDB removal or genuine adoption | Medium | Currently dead weight blocking backend container startup in Compose |

---

## 5. Recommendation on the Two Open Architectural Conflicts

Per this project's own document-precedence rule (Project Brief → SRS → System Design → Database Design → ML Design → Implementation Plan), the **Database Design and ML Design documents are binding** over the original project brief's reference architecture and over the mentor scaffold's Diabetes-130-US defaults. This gap analysis and the Milestone 2/3 designs that follow therefore assume:

1. **Dataset:** India Hospital Readmission Dataset (2015–2024) is the target primary dataset for production training; Diabetes 130-US remains supported (it already is, in the backend importer) as a fallback/bootstrap dataset for early development and CI smoke-testing, since real Kaggle credentials/download may not be available in every dev environment.
2. **Database:** PostgreSQL is the sole operational store. The `mongodb` service should be removed from `docker-compose.yml` and `backend/app/db/mongodb.py`/`pymongo` should be deleted, OR the decision should be formally reversed by the mentor — this is a decision to make explicitly, not leave ambiguous, before Milestone 2 database migrations are written (they need to know whether `model_metadata`/`patient_journey_events` are Postgres tables or Mongo collections).

**This is flagged as the highest-priority action item before any Milestone 2 code is written** — see Implementation Roadmap §1.

---

*End of HealthForecastAI_Gap_Analysis.md*
