# HealthForecastAI — Repository Analysis & Milestone 1 Gap Analysis

**Document Version:** 1.0
**Branch audited:** `intern/niyati-r`
**Date:** 2026-08-30
**Companion documents:** `HealthForecastAI_SRS.md`, `HealthForecastAI_System_Design.md`, `HealthForecastAI_Database_Design.md`, `HealthForecastAI_ML_Design.md`, `HealthForecastAI_Implementation_Plan.md`
**Reference priority used:** `INTERN_GUIDE.md` (1) → `docs/brief/HealthForecast-AI-project-brief.pdf` (2) → the five documents above (3–7)

All source documents listed above were accessible and read in full. No document was unavailable.

---

## 0. How to read this report

This is a **pre-implementation audit**, not a redesign. Every finding below is anchored to an actual file and line read directly from the repository (backend, frontend, ml, database, docs, scripts, .github) on branch `intern/niyati-r`. Nothing is inferred from filenames alone.

One important scope note surfaced during the audit: your own `HealthForecastAI_ML_Design.md` and `HealthForecastAI_Database_Design.md` propose two binding architectural changes relative to the mentor's scaffold and the original PDF brief:

1. **Dataset substitution** — your docs specify the *India Hospital Readmission Dataset (2015–2024)* as primary training data; the mentor's scaffold (`ml/data/README.md`, `ml/configs/config.yaml`, `INTERN_GUIDE.md`) is wired end-to-end for the **Diabetes 130-US Hospitals dataset** (UCI #296).
2. **MongoDB elimination** — your Database Design makes PostgreSQL the sole datastore; the mentor's scaffold ships a working MongoDB client (`backend/app/db/mongodb.py`) and a documented `database/mongodb/` collection schema, and `docker-compose.yml` provisions a MongoDB container.

**These are real conflicts, not just detail differences**, and per your own instruction ("Follow Internship Guide first, Original PDF second"), the mentor scaffold wins for Milestone 1 execution. This is flagged as **Risk R1** in §14 — recommend resolving it with your mentor before or during Milestone 1 coding, not after. The rest of this report evaluates the repository against the **mentor's scaffold and `INTERN_GUIDE.md`**, since that is what CI actually checks and what a reviewer actually clones and runs.

---

## 1. Repository Structure Analysis

| Folder | Purpose | Current Status | Milestone 1 Relevance | Notes |
|---|---|---|---|---|
| `backend/` | FastAPI service — models, schemas, services, repositories, API, core, alembic, tests | Scaffolded; models/schemas/core/deps complete, services/repositories/endpoints stubbed | **Critical** | See §3–6 |
| `frontend/` | Next.js + Tailwind dashboards | Scaffolded shell only — landing page + empty component/hook dirs | **Critical** | See §7 |
| `ml/` | Modelling pipeline (risk/readmission) | Data loading + partial preprocessing real; training/eval code (Milestone 2 scope) already present | Low for M1 (only "load dataset" required) | See §8 |
| `database/` | Postgres schema/migrations/seeds + MongoDB schema docs | `01_schema.sql` complete; `migrations/` and `seeds/` empty (`.gitkeep` only) | **Critical** | See §4 |
| `deployment/` | Docker, nginx, AWS, Azure configs | Present, not audited in depth (Milestone 4 scope) | None for M1 | Do not touch — §11 |
| `docs/` | Mentor docs (01–08) + your `docs/niyati/` + `docs/brief/` PDF + `docs/06-milestones/` reports | Mentor docs are skeleton "deliverable" READMEs; your 5 docs are complete; milestone report templates are blank | **Critical** (milestone-1.md must be filled in to submit) | See §9, §15 |
| `scripts/ci/` | CI check scripts (branch/structure/syntax/files/secrets/notebooks/docs/milestones) | Complete, mentor-owned | Indirect (gates every push) | **Do not modify** — §11 |
| `tests/` | Repo-level integration/e2e test dirs | Present, not populated yet (backend has its own `backend/tests/`) | Low for M1 | Not audited in depth (out of M1 CRUD-critical path) |
| `.github/` | CI workflows, issue templates, PR template | Complete, mentor-owned | Indirect (gates every push) | **Do not modify** — §11 |

---

## 2. TODO Analysis

Repo-wide grep across `backend/`, `frontend/`, `ml/` found **31 TODO markers total**, plus 3 hard `HTTP 501` stub responses and 6 empty service files (docstring-only, no `pass`/`NotImplementedError` needed since there's no function body at all). Zero `FIXME`, `NotImplementedError`, or bare `pass`-stub function bodies exist anywhere in these three directories. **Frontend has zero TODO markers** — its incompleteness is structural (missing route folders, `.gitkeep`-only component dirs), not commented.

### Critical (blocks Milestone 1: auth, RBAC data layer, user/patient CRUD)

| File | Line | TODO / Stub | Priority |
|---|---|---|---|
| `backend/app/api/v1/endpoints/auth.py` | 20 | `TODO(milestone-1): look the user up in PostgreSQL, verify the bcrypt hash...` | Critical |
| `backend/app/api/v1/endpoints/auth.py` | 23-26 | `HTTPException(501, "Login is not implemented yet")` | Critical |
| `backend/app/services/auth_service.py` | 4 | `TODO: implement during the milestone that owns this module.` (entire file is a docstring, zero code) | Critical |
| `backend/app/api/v1/endpoints/users.py` | 18 | `TODO(milestone-1): read from PostgreSQL with pagination and filtering.` | Critical |
| `backend/app/api/v1/endpoints/users.py` | 27 | `TODO(milestone-1): hash the password, persist the row, write an audit log entry.` | Critical |
| `backend/app/api/v1/endpoints/users.py` | 29-32 | `HTTPException(501, "User creation is not implemented yet")` | Critical |
| `backend/app/api/v1/endpoints/patients.py` | 22 | `TODO(milestone-1): implement the scoping in app/services/patient_service.py.` | Critical |
| `backend/app/api/v1/endpoints/patients.py` | 39 | `TODO(milestone-1): persist to PostgreSQL and emit an audit log entry.` | Critical |
| `backend/app/api/v1/endpoints/patients.py` | 41-44 | `HTTPException(501, "Patient creation is not implemented yet")` | Critical |
| `backend/app/services/patient_service.py` | 4 | `TODO: implement during the milestone that owns this module.` (empty file) | Critical |

### Important (Milestone-1-adjacent)

| File | Line | TODO | Priority |
|---|---|---|---|
| `ml/src/data/preprocess.py` | 24 | `TODO(milestone-1): add domain specific cleaning - collapse rare diagnosis codes, bucket age ranges, and remove expired-patient discharge dispositions which cannot be readmitted and would otherwise leak into the target.` | Important — directly implements the leakage rule your own `HealthForecastAI_Database_Design.md` §Notes and the mentor's `docs/02-database/README.md` both call out |
| `backend/app/api/v1/endpoints/patients.py` | 53 | `TODO(milestone-3): pseudonymise the MRN...` | Optional (correctly deferred) |

### Optional / later-milestone (correctly out of scope — do not implement now)

- `TODO(milestone-2)` × 5 — `ml/src/features/build_features.py:49`, `backend/app/api/v1/endpoints/risk.py:25,44,56`, `backend/app/api/v1/endpoints/ml_models.py:37`
- `TODO(milestone-3)` × 9 — `analytics.py:18,29,40`, `clinical_support.py:18,31`, `treatment.py:18,29`, `patients.py:53`
- `TODO(milestone-4)` × 1 — `ml_models.py:18`
- Generic `TODO:` in empty service stubs (no milestone tag, scope inferred from filename): `analytics_service.py:4`, `cds_service.py:4`, `model_service.py:4`, `treatment_service.py:4` — all Milestone 2/3/4 scope

### Placeholder implementations / stub responses (full inventory)

| File:Line | Kind |
|---|---|
| `auth.py:23-26` | `501` — `login` |
| `users.py:14-20` | hardcoded `[]` — `list_users` |
| `users.py:29-32` | `501` — `create_user` |
| `patients.py:12-29` | hardcoded `[]` — `list_patients` (only blocks researchers with 403; no real scoping) |
| `patients.py:41-44` | `501` — `create_patient` |
| `patients.py:47-55` | hardcoded `[]` — `list_anonymised_patients` (M3 scope) |
| `risk.py`, `treatment.py`, `analytics.py`, `clinical_support.py`, `ml_models.py` | all return `[]` / zeroed objects — correctly out of M1 scope |
| `backend/app/repositories/` | only generic `BaseRepository`; no `UserRepository`/`PatientRepository` subclass exists anywhere |
| `backend/alembic/versions/` | contains only `.gitkeep` — **zero migration files** despite 6 fully-defined ORM models |

---

## 3. Backend Audit

| Component | Status | Required for Milestone 1 | Notes |
|---|---|---|---|
| `app/models/` (user, patient, admission, audit_log, prediction, treatment) | **Complete** | Yes (user/patient/admission/audit_log) | Real SQLAlchemy ORM, matches `01_schema.sql` tables 1:1; no `relationship()` declarations anywhere (manual joins only) |
| `app/schemas/` (user, patient, token, prediction, analytics) | **Complete** | Yes (user/patient/token) | Pure Pydantic, nothing to stub; `Token` schema has no `refresh_token` field |
| `app/services/auth_service.py`, `patient_service.py` | **Placeholder-stub** (docstring only) | Yes — **this is the core Milestone 1 gap** | Zero code; routers have nowhere to delegate to |
| `app/services/analytics_service.py`, `cds_service.py`, `model_service.py`, `treatment_service.py` | **Placeholder-stub** | No (M2/M3/M4 scope) | Correctly out of scope |
| `app/services/risk_service.py` | **Complete** | No (M2 scope, but implemented + tested already) | Real `categorise_risk()`, 8 passing tests |
| `app/repositories/base.py` | **Complete** (generic only) | Yes, as a base | Real generic CRUD, but nothing subclasses it |
| `app/repositories/` — `UserRepository`, `PatientRepository` | **Missing** | Yes | Does not exist; endpoints have no DB access path even if services were filled in |
| `app/api/v1/endpoints/auth.py` | **Partial** | Yes | `/me` and `/roles` work (real JWT decode); `/login` is `501`; **no `/register`, no `/refresh` endpoint at all** |
| `app/api/v1/endpoints/users.py` | **Placeholder-stub** | Yes | List returns `[]`, create is `501` |
| `app/api/v1/endpoints/patients.py` | **Placeholder-stub** | Yes | List returns `[]` (no scoping logic), create is `501` |
| `app/api/v1/endpoints/risk.py`, `treatment.py`, `analytics.py`, `clinical_support.py`, `ml_models.py` | **Placeholder-stub** | No | Correctly deferred to M2–M4 |
| `app/api/v1/router.py` | **Complete** | Yes | All 8 routers correctly wired |
| `app/api/deps.py` | **Complete** | Yes | `CurrentUser`, `get_current_user`, `require_permission`, `require_role` — real JWT decode + 401/403, no stubs |
| `app/core/security.py` | **Complete** | Yes | bcrypt hash/verify, JWT create/decode all real; **no refresh-token issuance function exists** (only `"type": "access"` is ever set) |
| `app/core/rbac.py` | **Complete** | Yes | `Role` enum, `Permission` enum (18 perms), full 4-role matrix, `has_permission`/`permissions_for` — backed by passing `test_rbac.py` |
| `app/core/config.py`, `logging_config.py` | **Complete** | Yes | Settings + logging both real |
| `app/db/session.py`, `base.py` | **Complete** | Yes | Real engine/sessionmaker/`get_db()` |
| `app/db/mongodb.py` | **Complete** (but zero callers) | No for M1 — see §0 conflict note | Real `MongoClient` singleton; no endpoint/service calls it anywhere in the repo |
| `alembic/env.py` | **Complete** | Yes | Correctly imports `app.models`, sets `target_metadata = Base.metadata` |
| `alembic/versions/` | **Missing** | Yes — **hard blocker** | Only `.gitkeep`; zero revision files ever generated |
| `backend/tests/` | **Complete** (for what exists) | Yes | `test_rbac.py`, `test_security.py`, `test_health.py`, `test_risk_service.py` all real and passing; **no `test_auth.py`/`test_patients.py`/`test_users.py`** integration tests exist because those endpoints are still `501` |
| `main.py`, `requirements*.txt` | **Complete** | Yes | FastAPI app, CORS, lifespan, `/health` all real; deps fully pinned |

**Important nuance:** `docker-compose.yml:16` mounts `database/postgres/schema/` straight into Postgres's `docker-entrypoint-initdb.d`, so in the current dev setup **the raw SQL file creates your tables today, not Alembic.** This masks the missing-migrations gap during `docker compose up` but means Alembic and the live schema will silently drift the moment either one changes without the other.

---

## 4. Database Audit

| Postgres table (`01_schema.sql`) | SQLAlchemy model | Alembic migration | Seed data | Notes |
|---|---|---|---|---|
| `users` | Yes (`models/user.py:12`) | **No** | **No** | Model missing `role` CHECK constraint and `idx_users_role` index |
| `patients` | Yes (`models/patient.py:11`) | No | No | `assigned_doctor_id` is a plain `Integer`, **no `ForeignKey()`** — schema has `REFERENCES users(id) ON DELETE SET NULL`, model doesn't |
| `admissions` | Yes (`models/admission.py:11`) | No | No | FK has no `ondelete="CASCADE"`; missing date-order CHECK constraint |
| `audit_logs` | Yes (`models/audit_log.py:11`) | No | No | Composite index `idx_audit_actor_created (actor_id, created_at DESC)` in schema not reproduced in model (single-column index only) |
| `risk_predictions` (M2) | Yes | No | No | Out of M1 scope, flagged for completeness |
| `treatment_outcomes` (M3) | Yes | No | No | Out of M1 scope, flagged for completeness |

**Would `alembic upgrade head` reproduce `01_schema.sql` today? No — there is nothing to run.** `env.py` is correctly wired to `Base.metadata`, but zero migration files have ever been generated, so `alembic upgrade head` against a truly empty database creates nothing. If a migration were autogenerated right now, it would still **not** be column-for-column identical to `01_schema.sql` (missing CHECK constraints, missing composite/role indexes, missing `ondelete=` cascade rules, and no `relationship()` mappings anywhere in the ORM).

**MongoDB:** schema-documented only (`database/mongodb/schemas/collections.md`), a working client factory exists (`backend/app/db/mongodb.py`), but **zero call sites** anywhere in `backend/app/api` or `backend/app/services`. Effectively dead code for Milestone 1 — consistent with `clinical_notes`/`model_runs`/`prediction_events` being later-milestone features, *unless* you and your mentor resolve the MongoDB-elimination conflict from §0 in favor of your own Database Design, in which case this file should arguably be left alone rather than wired up.

**Migration gaps:** no migrations exist at all (hard blocker for a clean-clone reviewer who doesn't use `docker compose up`). **Missing indexes:** `idx_users_role`, composite `idx_audit_actor_created`. **Missing constraints:** `users_role_check`, `admissions_date_order_check`, FK on `patients.assigned_doctor_id`. **Missing relationships:** no `relationship()` declared anywhere — every join must be hand-written in the service layer once it exists.

---

## 5. Authentication Audit

| Component | Status | Notes |
|---|---|---|
| User model | **Complete** | `email, full_name, hashed_password, role, department, is_active, created_at` |
| Role model | **Complete** | `Role` StrEnum in `core/rbac.py:10-16`, not a DB table — matches the 4-role brief exactly |
| JWT service (`core/security.py`) | **Complete** for access tokens | `create_access_token`/`decode_token` real, with `iat`/`exp`/`type` claims; **no refresh-token creation function exists** |
| Password hashing | **Complete** | passlib bcrypt, `hash_password`/`verify_password` both real and unit-tested |
| Auth APIs | **Partial — critical gap** | `/me`, `/roles` work; `/login` is `501`; **no `/register`, no `/refresh`** endpoint exists in `auth.py` at all |
| Authorization middleware (`api/deps.py`) | **Complete** | `get_current_user`, `require_permission`, `require_role` — real, tested |
| RBAC (`core/rbac.py`) | **Complete** | 18-permission matrix across 4 roles, pinned by `backend/tests/test_rbac.py` |

**Security weaknesses / placeholder logic found:**
- `login` cannot actually authenticate anyone — JWT issuance code is finished but never invoked by any endpoint.
- No account-lockout logic exists yet (SRS `FR-AUTH-05`) — not present anywhere in `core/security.py` or `users.py`.
- `AuditLog` model exists (§3/§4) but **nothing ever writes to it** — every "emit an audit log entry" TODO is unaddressed, meaning FR-AUD-01/02 (SRS) are currently unimplementable even once login works, until an insert path is added.
- `test_system_admin_can_list_users` in `test_rbac.py` currently passes *only because* `list_users` returns `[]` with `200` — the test is not proof that user listing actually works.

---

## 6. Patient Management Audit

| Component | Status | Notes |
|---|---|---|
| Patient model | **Complete** | Matches schema; FK gap noted in §4 |
| Patient schema | **Complete** | Base/Create/Read/Anonymised all defined |
| Patient repository | **Missing** | No `PatientRepository` exists — only generic `BaseRepository` |
| Patient service | **Placeholder-stub** | `patient_service.py` is a docstring, zero code |
| Patient APIs | **Placeholder-stub** | `list_patients` unconditionally `[]`; `create_patient` is `501`; `list_anonymised_patients` (M3) is `[]` |
| Search APIs | **Missing** | No search endpoint exists anywhere under `patients.py` |
| Admission management | **Model only** | `Admission` ORM model complete; no service/repository/endpoint layer for admissions exists at all — not even a stub route |

**CRUD completeness:** 0% functional — every write path is `501`, every read path is a hardcoded empty list. **Validation coverage:** Pydantic schemas define the shape but nothing exercises them since create endpoints never run. **Doctor-scoped visibility (FR-USR-03/FR-PAT-04, the single most RBAC-sensitive requirement in the brief):** not implemented anywhere — `list_patients` currently 403-blocks researchers only, with no doctor-to-assigned-patient filtering logic at all (that logic doesn't exist because `patient_service.py` is empty).

---

## 7. Frontend Audit

Milestone 1 is **0% built** on the frontend. `frontend/src/app/` contains exactly `layout.tsx`, `page.tsx`, `globals.css` — no other routes exist. `components/ui/`, `components/layout/`, `components/charts/`, `hooks/` each contain only a `.gitkeep`.

| Frontend Module | Status | Required for Milestone 1 |
|---|---|---|
| Login / register pages | **Missing** — no `app/login`, `app/register` directory exists at all | Yes |
| Auth context / protected-route / role guard | **Missing** — no file named `auth`, `context`, `provider`, `middleware.ts`, or `guard` anywhere; `hooks/` is empty | Yes |
| `types/index.ts` — `Role`, `User`, `Patient` interfaces | **Partial** (types defined, unconsumed) | Yes, as a starting contract |
| Token/session handling | **Placeholder** | `lib/api.ts:16` states the rule in a comment (`// Never store the access token in localStorage — use an httpOnly cookie.`) but implements nothing |
| Patient list/detail/create/search pages | **Missing** — no `app/patients*` route exists | Yes |
| Dashboard shell / role-specific views | **Missing** — no `app/dashboard*` route; `components/layout/` empty | Yes |
| Landing page (`app/page.tsx`) | **Placeholder-stub** | N/A — explicitly says `"Replace this placeholder with the dashboard you build for your milestone."` (line 12) |
| API client (`lib/api.ts`) | **Complete infrastructure, zero callers** | Yes as foundation | Generic `apiFetch<T>()` wrapper, correctly points at `/api/v1`, bearer-token support, `ApiError` class — genuinely working code, but nothing in the repo calls it yet |
| Shared UI primitives (buttons/cards/tables/forms) | **Missing** | Yes | `components/ui/` is empty |

This is the largest true gap in the repository relative to the mentor's stated Milestone 1 scope ("dashboard access for Doctors, Hospital Administrators, Healthcare Researchers, and System Administrators" — `docs/06-milestones/milestone-1.md:24-25`). Unlike the backend, there are no TODO markers guiding what to build — the scaffold signals incompleteness structurally rather than textually.

---

## 8. ML Audit

**Milestone 1 only requires loading the dataset** (per `INTERN_GUIDE.md` and `docs/06-milestones/milestone-1.md`) — full model training is Milestone 2. Do not implement risk/readmission model training now even though the scaffold for it already exists.

| ML Component | Status | Required for Milestone 1 |
|---|---|---|
| `ml/data/README.md` — dataset download instructions | **Complete** | Yes | Documents UCI Diabetes 130-US dataset (#296), curl/unzip recipe (Linux/macOS shell — needs Git Bash/WSL adaptation note for Windows contributors), 101,766 rows / 50 features, target column `readmitted` |
| `ml/src/data/load_data.py` — `load_raw()`, `binarise_target()` | **Complete** | Yes | Real, working, handles `"?"` NA token, raises a clear error pointing back to the README if the file is missing |
| `ml/src/data/preprocess.py` | **Partial** | Yes — open work | `drop_unused_columns`/`split_feature_types` work; `basic_clean` still needs the domain cleaning named in the `TODO(milestone-1)` at line 24 (rare diagnosis codes, age bucketing, drop expired-patient rows to prevent target leakage — this is the same leakage rule your Database Design doc calls out) |
| `ml/src/features/build_features.py` | **Complete for M1 / Partial for M2** | Partially (only what M1 needs) | `build_preprocessor` + `add_utilisation_features` work; its one TODO is explicitly tagged `milestone-2` |
| `ml/configs/config.yaml` | **Complete** (already filled with real hyperparameters) | No — this is M2-shaped content already present | Not something M1 needs to touch |
| `ml/src/models/train.py`, `predict.py`, `ml/src/evaluation/metrics.py` | **Complete** (M2 scope, already implemented ahead of schedule) | No | Flagged for awareness only, not reviewed for correctness per M1 scope |
| `ml/notebooks/` | **Missing** (only a hygiene-rules README) | No — not required, EDA is good practice but not a stated M1 deliverable | Zero `.ipynb` files exist yet |
| `ml/tests/` | **Complete** for what's covered | Partial | `test_config.py`, `test_metrics.py` both real |

Dataset-substitution note repeated from §0: this scaffold is wired for the **Diabetes 130-US dataset**, while your own ML Design document specifies the **India Hospital Readmission Dataset** as primary. Resolve before Phase-1 dataset-load work in Milestone 1, since it changes what `ml/data/README.md` and `load_data.py` should point at.

---

## 9. SRS Traceability Analysis

Only Milestone-1-relevant requirement groups shown (FR-AUTH, FR-USR, FR-PAT, plus the M1-relevant NFRs). Later-milestone FRs (RISK/READM/CDS/ANL/RPT) are out of scope per §0 instruction and omitted here — they map to the already-correctly-deferred stub endpoints in §3.

| Requirement ID | Requirement | Repository Status |
|---|---|---|
| FR-AUTH-01 | Login issues JWT | **Missing** — `/login` is `501`; JWT issuance code exists but is unwired |
| FR-AUTH-02 | RBAC enforced on every endpoint | **Partial** — `require_permission`/`require_role` exist and are used on protected routes, but the routes they guard mostly return stub data |
| FR-AUTH-03 | Token refresh without re-login | **Missing** — no `/refresh` endpoint, no refresh-token issuance function |
| FR-AUTH-04 | Secure password reset | **Missing** — no reset-token flow anywhere |
| FR-AUTH-05 | Account lockout after failed logins | **Missing** — no lockout counter/logic found |
| FR-USR-01 | Admin creates/updates/deactivates users | **Missing** — `create_user` is `501`; no update/deactivate endpoint exists |
| FR-USR-02 | Exactly one role per user | **Partial** — model has a single `role` column (structurally enforces this), but no validation logic runs since create is stubbed |
| FR-USR-03 | Doctor scoped to assigned patients only | **Missing** — no `doctor_patient_map`-equivalent scoping table/model/logic exists anywhere; this is the single most safety-critical RBAC requirement in the brief and is currently unimplemented |
| FR-USR-04 | Admin views/manages all users | **Missing** — `list_users` returns `[]` |
| FR-PAT-01 | Store patient demographic/medical history | **Partial** — model + schema exist; create endpoint is `501` |
| FR-PAT-02 | Track admission/discharge history | **Partial** — `Admission` model exists; no service/endpoint layer at all |
| FR-PAT-03 | Track medications/treatments per patient | **Missing** — no medication/treatment model exists yet (out of M1 core scope per brief, but flagged since your own Database Design specifies `medications`/`treatments` tables) |
| FR-PAT-04 | Role-scoped patient record access | **Missing** — same gap as FR-USR-03 |
| NFR-Security (JWT-required, hashed passwords, TLS) | — | **Partial** — hashing/JWT primitives complete; TLS is a deployment-layer concern (M4) |
| NFR-Auditability (100% of auth/access events logged) | — | **Missing** — `AuditLog` model exists, nothing writes to it |

---

## 10. Milestone 1 Gap Analysis

| Milestone 1 Requirement (per PDF §5/§6 + `milestone-1.md`) | Current Status | Gap | Priority |
|---|---|---|---|
| Project initialization & architecture setup | **Done** | None — repo structure, Docker Compose, CI all in place | — |
| Database schema (users, roles, patients, admissions, audit_logs) designed | **Done** (`01_schema.sql`) | Migrations not generated from it/models | Critical |
| Authentication implemented | **Not started functionally** | `/login`, `/register`, `/refresh` all missing/stubbed; `auth_service.py` empty | Critical |
| RBAC implemented | **Guard layer done, data layer missing** | Permission/role matrix real; nothing to actually authorize against yet | Critical |
| Doctor-scoped patient access | **Not started** | No scope-mapping model or filter logic exists | Critical |
| User management workflows | **Not started** | List/create both stubbed; no update/deactivate | Critical |
| Patient management workflows | **Not started** | List/create both stubbed; no search; no admission endpoints | Critical |
| Healthcare dashboard functional | **Not started** | Frontend has no dashboard route at all | Critical |
| Dataset integration & preprocessing | **In progress** | Loader done; domain cleaning TODO open; dataset-choice conflict (§0) unresolved | Important |

### Completed
- Repository/Docker/CI scaffolding, DB schema design (`01_schema.sql`), all SQLAlchemy models, all Pydantic schemas, JWT + bcrypt primitives, RBAC permission matrix + guard dependencies, dataset loader (`load_data.py`), `ml/configs/config.yaml`.

### Partially Complete
- Alembic (wired but empty), ML preprocessing (loader done, domain cleaning open), frontend API client (built, unused), `auth.py`/`users.py`/`patients.py` (routes exist, bodies stubbed).

### Not Started
- Actual login/register/refresh, user CRUD, patient CRUD, doctor-patient scoping, audit-log writes, any frontend page beyond the static landing page, database migrations, seed data.

---

## 11. File Modification Plan

### Files to modify

| File | Reason |
|---|---|
| `backend/app/services/auth_service.py` | Implement login/register logic — currently empty |
| `backend/app/services/patient_service.py` | Implement patient CRUD + doctor-scope filtering — currently empty |
| `backend/app/api/v1/endpoints/auth.py` | Wire `/login` to real service call; add `/register`, `/refresh` |
| `backend/app/api/v1/endpoints/users.py` | Wire `list_users`/`create_user` to a real repository |
| `backend/app/api/v1/endpoints/patients.py` | Wire `list_patients`/`create_patient` to real repository + scope filter |
| `backend/app/core/security.py` | Add a refresh-token issuance function (`type: "refresh"` claim) |
| `backend/app/models/patient.py` | Add real `ForeignKey()` on `assigned_doctor_id` |
| `backend/app/models/admission.py` | Add `ondelete="CASCADE"` on `patient_id` FK |
| `backend/app/models/user.py` | Add `role` CHECK/index parity with `01_schema.sql` |
| `ml/src/data/preprocess.py` | Implement the `TODO(milestone-1)` domain cleaning (diagnosis collapsing, age bucketing, expired-patient leakage removal) |
| `ml/data/README.md` | Update once the dataset-choice conflict (§0) is resolved with your mentor |
| `docs/06-milestones/milestone-1.md` | Fill in per `INTERN_GUIDE.md` submission process — required for grading |
| `docs/01-architecture/README.md`, `docs/02-database/README.md`, `docs/03-api/README.md` | Each explicitly lists a "Deliverable for milestone 1" you're expected to add content to |

### Files to create

| File | Purpose |
|---|---|
| `backend/app/repositories/user_repository.py` | Concrete `UserRepository(BaseRepository)` for real DB queries |
| `backend/app/repositories/patient_repository.py` | Concrete `PatientRepository(BaseRepository)` incl. doctor-scope query |
| `backend/alembic/versions/0001_initial_schema.py` (name per Alembic autogenerate) | First real migration capturing users/patients/admissions/audit_logs (and risk_predictions/treatment_outcomes tables, since the models already exist) |
| A `doctor_patient_map`-equivalent model + migration | FR-USR-03/FR-PAT-04 — currently has no home in the model layer at all; your own Database Design already specifies this table |
| `frontend/src/app/login/page.tsx`, `frontend/src/app/register/page.tsx` | Auth pages |
| `frontend/src/hooks/useAuth.ts` (or `lib/auth-context.tsx`) | Session/role state + protected-route logic |
| `frontend/src/app/dashboard/page.tsx` + role-specific subviews | Dashboard shell required by the milestone brief |
| `frontend/src/app/patients/page.tsx`, `frontend/src/app/patients/[id]/page.tsx` | Patient list/detail pages |
| `frontend/src/components/ui/*` (Button, Card, Table, Form primitives) | Currently empty directory, needed by every page above |
| `database/postgres/seeds/dev_seed.sql` (or a Python seed script) | Referenced by the Implementation Plan §11 as required for fast dev iteration; currently only `.gitkeep` |
| `backend/tests/test_auth.py`, `test_users.py`, `test_patients.py` | Integration tests for the newly-implemented endpoints (happy path + 401/403 per `docs/07-testing/README.md`) |

### Files to leave untouched (mentor-owned / shared infrastructure)

| File | Reason |
|---|---|
| `.github/workflows/*.yml` (ci.yml, branch-guard.yml, security.yml, deploy.yml, intern-progress.yml) | CI/CD — `INTERN_GUIDE.md` explicitly forbids weakening checks; changes here affect grading infrastructure |
| `.github/ISSUE_TEMPLATE/*`, `.github/PULL_REQUEST_TEMPLATE.md` | Shared process templates |
| `scripts/ci/*.py` (all 8 check scripts) | Mentor-owned CI logic — "if a check is wrong, open a CI issue, don't edit the script" |
| `docker-compose.yml` | Shared infra definition — modify only if the MongoDB-elimination decision (§0) is explicitly approved by your mentor |
| `database/postgres/schema/01_schema.sql` | Reference schema — treat as source of truth to match, not to casually edit; any change should flow from an approved design decision |
| `deployment/**` | Milestone 4 scope entirely |
| `docs/brief/HealthForecast-AI-project-brief.pdf` | Original spec — read-only by definition |
| `docs/06-milestones/milestone-2.md`, `-3.md`, `-4.md` | Not yours to fill in yet |
| `INTERN_GUIDE.md`, `LICENSE`, `.editorconfig`, `.gitattributes`, `.gitignore` | Repo-wide shared configuration |
| `backend/app/models/prediction.py`, `treatment.py` and their schemas | Already correctly built ahead of schedule for M2/M3 — don't touch during M1 |
| `ml/src/models/*.py`, `ml/src/evaluation/*.py`, `ml/configs/config.yaml` | M2-scoped, already implemented — leave alone until Milestone 2 |

---

## 12. Implementation Roadmap

```text
1. Resolve the dataset & MongoDB scope conflict with your mentor (§0)     — unblocks ml/ and db/ decisions cleanly
2. Generate the first Alembic migration from existing models              — unblocks every DB-backed feature below
3. Add the doctor_patient_map model + migration                           — FR-USR-03/FR-PAT-04 depend on it
4. Fix model-level FK/constraint/index gaps (§4)                          — cheap now, expensive after data exists
5. Implement UserRepository, PatientRepository                            — services need a real data-access layer
6. Implement auth_service.py (login, register) + refresh-token issuance   — everything downstream needs a working session
7. Wire auth.py endpoints to the service; add /register, /refresh         — first end-to-end testable slice
8. Implement patient_service.py incl. doctor-scope filtering              — the safety-critical RBAC requirement
9. Wire patients.py + users.py endpoints to their services/repositories   — completes backend CRUD for M1
10. Add audit-log write path (login, patient access, admin actions)       — required by FR-AUD-01/02 and NFR-Auditability
11. Backend integration tests (auth/users/patients: happy path + 401/403) — per docs/07-testing/README.md convention
12. Frontend: auth pages + auth context/protected routes                  — nothing else in the frontend can be role-gated without this
13. Frontend: dashboard shell + role-specific nav                         — the milestone's explicit "dashboard functional" criterion
14. Frontend: patient list/detail/search pages wired to the API client    — completes the "patient management workflows" criterion
15. ML: finish preprocess.py domain-cleaning TODO + re-point dataset per step 1's resolution — satisfies "dataset integration and preprocessing completed"
16. Fill in docs/06-milestones/milestone-1.md + the mentor doc deliverables (01-architecture, 02-database, 03-api) — required to submit
```

**Justification for ordering:** database migrations (2) and the scope-mapping model (3) are load-bearing for every backend feature that follows — building services against a schema that doesn't exist in a real migration is rework waiting to happen. Auth (6–7) must precede patient management (8–9) because every patient endpoint is guarded by `require_permission`/`require_role`, which need a real logged-in user to test against. Frontend auth (12) must precede dashboard/patient UI (13–14) for the same reason. Docs (16) are last because they should describe what was actually built, not what was planned.

---

## 13. Milestone 1 Task Board

```markdown
## Scope Resolution
- [ ] Confirm with mentor: Diabetes 130-US dataset (scaffold) vs. India Hospital Readmission Dataset (your ML Design)
- [ ] Confirm with mentor: MongoDB kept (scaffold) vs. PostgreSQL-only (your Database Design)

## Database
- [ ] Generate initial Alembic migration from existing models (users, patients, admissions, audit_logs, risk_predictions, treatment_outcomes)
- [ ] Add `doctor_patient_map` model + migration
- [ ] Add missing FK on `patients.assigned_doctor_id`
- [ ] Add missing `ondelete=` cascade rules on `admissions`, `treatment_outcomes`
- [ ] Add missing `role` CHECK constraint + index on `users`
- [ ] Add composite `idx_audit_actor_created` index on `audit_logs`
- [ ] Add a dev seed script/data file for `database/postgres/seeds/`

## Authentication
- [ ] Implement `auth_service.py`: `authenticate_user()`, `register_user()`
- [ ] Wire `POST /auth/login` to the service (remove the 501)
- [ ] Add `POST /auth/register`
- [ ] Add refresh-token issuance in `core/security.py` (`type: "refresh"` claim)
- [ ] Add `POST /auth/refresh`
- [ ] Write `test_auth.py`: happy path, wrong password (401), inactive user

## RBAC
- [ ] Implement doctor-to-patient scope filter in `patient_service.py`, backed by `doctor_patient_map`
- [ ] Verify `test_rbac.py` still passes once real data-layer logic replaces the `[]`/`501` stubs
- [ ] Add a negative test: doctor requesting a non-assigned patient gets 403

## User Management
- [ ] Implement `UserRepository`
- [ ] Wire `GET /users`, `POST /users` to real DB queries
- [ ] Add audit-log write on user creation
- [ ] Write `test_users.py`

## Patient Management
- [ ] Implement `PatientRepository`
- [ ] Wire `GET /patients`, `POST /patients` to real DB queries + scope filter
- [ ] Add patient search (by name/MRN/condition, scoped to role)
- [ ] Add admission endpoints (currently no service/endpoint layer exists at all)
- [ ] Add audit-log write on patient record access
- [ ] Write `test_patients.py`

## Frontend
- [ ] Build `login`/`register` pages wired to `lib/api.ts`
- [ ] Build auth context / session storage (httpOnly-cookie-based per the existing code comment) + protected-route wrapper
- [ ] Build dashboard shell with role-aware navigation
- [ ] Build role-specific dashboard landing views (Doctor / Hospital Admin / Researcher / System Admin)
- [ ] Build patient list, detail, create, and search pages
- [ ] Build shared UI primitives (`components/ui`: Button, Card, Table, Input, etc.)

## ML / Dataset
- [ ] Resolve dataset choice (see Scope Resolution)
- [ ] Implement `preprocess.py` domain cleaning: rare-diagnosis collapsing, age bucketing, expired-patient leakage removal
- [ ] Document row/column counts after preprocessing (needed for the milestone report's Metrics section)

## Documentation / Submission
- [ ] Fill in `docs/06-milestones/milestone-1.md` (all 5 headings, delete the `_Not started_` line)
- [ ] Add content to `docs/01-architecture/README.md` "Deliverable for milestone 1" (component diagram, DFD, Postgres/Mongo reasoning)
- [ ] Add content to `docs/02-database/README.md` "Deliverable for milestone 1" (ER diagram, index rationale, dataset column mapping, scope-query example)
- [ ] Add content to `docs/03-api/README.md` (document every implemented endpoint; export OpenAPI schema)
- [ ] Run all `scripts/ci/check_*.py` locally before pushing
```

---

## 14. Risk Analysis

| Risk | Type | Impact | Mitigation |
|---|---|---|---|
| **R1 — Dataset & MongoDB scope conflict** (§0) between your own design docs and the mentor scaffold | Architectural | High — building against the wrong dataset or ripping out working Mongo code wastes real time | Raise explicitly with mentor before Milestone 1 coding starts; document the resolution in `docs/06-milestones/milestone-1.md` "Known gaps" if it's still open at submission |
| Doctor-scope (`doctor_patient_map`) has no model/migration/logic anywhere yet | Repository | High — this is the SRS's single most safety-critical RBAC rule (FR-USR-03) and currently has zero implementation surface, not even a stub | Build it early (Roadmap step 3), before general patient CRUD, so scoping isn't bolted on afterward |
| Alembic migrations vs. Docker's raw-SQL init-mount silently diverge | Repository | Medium — `docker compose up` currently hides the fact that Alembic is empty; a reviewer running migrations manually gets an empty DB | Generate and commit the initial migration now, and treat `01_schema.sql` as the schema to *match*, not a substitute for migrations |
| Weakening a CI check or lowering a threshold to get a green build | Merge/CI | High — explicitly forbidden by `INTERN_GUIDE.md` and fails review | Never edit `scripts/ci/*.py`; if a check seems wrong, open the CI-issue template instead |
| Opening a PR into `main` | Merge | High — will be auto-failed by Branch Guard | Push only to `intern/niyati-r`; never open a PR per `INTERN_GUIDE.md` §1/§9 |
| `test_rbac.py` currently passes partly *because* endpoints are stubbed (`[]` returns 200) | Dependency | Medium — false confidence; tests may start failing in new ways once real logic lands | Re-run the full test suite after each backend change in Roadmap steps 6–10, not just at the end |
| Frontend has zero existing guidance (no TODOs) unlike backend | Repository | Medium — easy to build something structurally inconsistent with the mentor's intended module boundaries | Follow the directory purposes stated in `INTERN_GUIDE.md` §4 table (`components/ui`, `components/layout`, etc.) exactly |
| Committing `.env`, the downloaded dataset CSV, or model artifacts | Repository/CI | High — fails `check_secrets.py`/`check_files.py`, and dataset files can leak real patient-adjacent data | Keep `.env` gitignored; keep `ml/data/raw/` and `ml/artifacts/` gitignored (already configured) |
| 8-week timeline slippage into Milestone 2 | Milestone | Medium | Treat §12 roadmap as the critical path; defer any polish not listed in §13's checklist |

---

## 15. Final Verdict

```text
Repository Readiness:      82%   (scaffold, CI, schema design, docs, RBAC/security primitives all solid)
Milestone 1 Completion:    ~20%  (models/schemas/guards done; almost no working end-to-end feature yet)
Scaffold Completeness:     90%   (backend/db scaffolded thoroughly; frontend scaffolded only structurally)
```

**Why 82% / ~20% / 90% and not higher or lower:** the repository gives you a genuinely strong foundation — correct RBAC design, correct schema design, working JWT/hashing primitives, a working dataset loader, and CI that will catch real mistakes. What's missing is almost entirely the "wire it together" layer: empty services, empty repositories, zero migrations, and a frontend that hasn't started. None of the gaps found require redesigning anything — every one of them is "implement what the TODO or the missing file already tells you to build."

### Recommended next action

**Open these files first, in this order:**
1. `docs/06-milestones/milestone-1.md` — read the evaluation criteria you're graded against one more time.
2. `backend/app/models/user.py`, `patient.py`, `admission.py`, `audit_log.py` — confirm you understand the existing schema before writing against it.
3. `backend/app/core/rbac.py` and `backend/tests/test_rbac.py` — this is the contract every endpoint you write must satisfy.
4. `backend/app/api/v1/endpoints/auth.py` and `backend/app/services/auth_service.py` — your first implementation target.

**Exact coding sequence:** follow §12 Implementation Roadmap steps 1–16 in order. Do not start frontend work (steps 12–14) before backend auth (steps 6–7) is real and testable — the frontend has nothing to call otherwise.

**Exact Milestone 1 execution plan:** work the checklist in §13 top to bottom, committing at each checked item per `INTERN_GUIDE.md` §8 commit conventions (`feat(auth): ...`, `feat(patients): ...`), pushing daily, and confirming CI is green in the Actions tab after each push. Resolve R1 (§14) with your mentor before or during step 1 of the roadmap — it's the one decision in this whole audit that isn't yours to make alone.

---

*End of HealthForecastAI_Milestone1_Audit.md*
