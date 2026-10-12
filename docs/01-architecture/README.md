# Architecture

HealthForecast AI is a three-tier web application with a separate offline
machine-learning pipeline. This document describes what the repository
contains today. Planned or abandoned designs are called out as such, and the
original design documents in [`docs/niyati/`](../niyati/) are kept unchanged as
history.

> **Status of the models.** Predictions come from experimental logistic
> regression models trained on a public research dataset. They have not been
> clinically validated, and their scores are rankings, not calibrated
> probabilities. Every diagram below that shows a prediction should be read
> with that in mind.

## 1. Components

```mermaid
flowchart LR
    subgraph Browser
        UI["Browser UI<br/>(React, Tailwind, Recharts)"]
    end

    subgraph Frontend["Next.js 15 server (port 3000)"]
        PAGES["App Router pages<br/>(server components)"]
        BFF["Route handlers /api/*<br/>(session, risk, reports, export)"]
    end

    subgraph Backend["FastAPI service (port 8000)"]
        API["Routers /api/v1/*"]
        DEPS["Auth and RBAC guards<br/>(JWT, require_permission,<br/>patient scope)"]
        SVC["Services<br/>(auth, patients, risk, CDS,<br/>treatment, analytics, reports)"]
        REPO["Repositories + SQLAlchemy models"]
        ML["Model loader + feature builder<br/>(sha256 check, predict_proba)"]
    end

    subgraph Data
        PG[("PostgreSQL 16<br/>9 tables")]
        FILES[("Report files<br/>backend/storage/reports")]
        ART[("ml/artifacts<br/>model.joblib + metrics.json")]
        MONGO[("MongoDB 7<br/>provisioned, unused")]
    end

    subgraph Offline["Offline ML pipeline (ml/)"]
        TRAIN["preprocess, features,<br/>train, evaluate"]
        REG["scripts/register_model.py"]
    end

    UI -->|"HTML / RSC, cookie"| PAGES
    UI -->|"fetch, cookie"| BFF
    PAGES -->|"Bearer token (server-side)"| API
    BFF -->|"Bearer token (server-side)"| API
    API --> DEPS --> SVC --> REPO --> PG
    SVC --> ML --> ART
    SVC --> FILES
    TRAIN --> ART
    REG --> PG
    REG -. "reads" .-> ART
    Backend -. "never used" .-> MONGO
```

| Layer | Technology | Source |
|---|---|---|
| Frontend | Next.js 15.5 (App Router), React 19, TypeScript, Tailwind CSS 3, Recharts 3 | `frontend/package.json` |
| Backend | Python 3.11, FastAPI, SQLAlchemy 2, Alembic, Pydantic 2, JWT (`python-jose`), bcrypt, `openpyxl` and `fpdf2` for reports | `backend/requirements.txt` |
| Database | PostgreSQL 16 | `docker-compose.yml` |
| ML | scikit-learn, XGBoost, pandas, NumPy, joblib. TensorFlow is listed in `ml/requirements.txt` but no code uses it | `ml/requirements.txt`, `ml/src/` |
| Delivery | Docker, Docker Compose, GitHub Actions | `docker-compose.yml`, `.github/workflows/` |

The frontend never holds data of its own. Every page is a server component that
fetches from the backend with the signed-in user's token, so access decisions
are always made by the backend.

## 2. Roles and the experience each gets

Four roles share one application. The navigation is built from the permission
list the backend returns (`/auth/me`), then sorted into three groups:
**Records** (Overview, Patients), **Insights** (Analytics, Treatment, Research,
Reports) and **Administration** (Users). A group is hidden when it would be
empty. This is presentation only; every route is authorised again by the
server (see [`docs/04-rbac`](../04-rbac/README.md)).

| Role | Reaches |
|---|---|
| System Administrator | All areas, including Users |
| Doctor | Overview, Patients (own patients), Treatment (own patients) |
| Hospital Administrator | Overview, Patients (read only), Analytics, Treatment, Reports |
| Researcher | Overview, Patients (anonymised cohort), Analytics, Treatment, Research, Reports |

## 3. Request path: a risk prediction

```mermaid
sequenceDiagram
    autonumber
    actor D as Doctor (browser)
    participant N as Next.js route handler /api/risk/predict
    participant A as FastAPI /api/v1/risk/predict
    participant G as Guards (deps.py)
    participant S as RiskService
    participant M as Model loader
    participant P as PostgreSQL

    D->>N: POST patient_id (httpOnly session cookie)
    N->>N: read token from cookie (never exposed to the page)
    N->>A: POST with Bearer token
    A->>G: require_permission(risk_report:read)
    G->>P: load user, check active, read role
    G-->>A: allowed (or 401 / 403)
    A->>S: score_patient(user, patient_id)
    S->>P: scope check, load patient, admissions (404 if out of scope)
    S->>M: load production model for "risk"
    M->>P: model_metadata (status = production)
    M->>M: verify sha256 of model.joblib, then load once
    S->>S: build feature row, predict_proba
    S->>S: categorise_risk (cut-offs 0.40 / 0.70)
    S->>P: insert risk_predictions + audit_logs
    S-->>A: RiskPredictionRead
    A-->>N: 200 (experimental model score, band, model version)
    N-->>D: result
    Note over D: UI shows the score with its experimental-model caption
```

If no verified model is registered, the endpoint answers `503`; if the patient
lacks required data, `422` lists the missing fields.

## 4. Authentication and session

```mermaid
sequenceDiagram
    autonumber
    actor U as User
    participant L as Login page
    participant S as Next.js /api/session
    participant A as FastAPI /api/v1/auth/login
    participant P as PostgreSQL

    U->>L: email and password
    L->>S: POST (same origin)
    S->>A: POST credentials
    A->>P: find user, verify bcrypt hash, check active
    A->>P: audit_logs (success or failure)
    A-->>S: access token, role, permissions
    S-->>L: Set-Cookie hfai_session (httpOnly, SameSite=Lax, Secure in production, 30 min)
    L->>U: redirect to /dashboard
    Note over L,S: The token is never returned to browser code
    U->>S: later: DELETE /api/session
    S-->>U: cookie cleared (the token itself simply expires)
```

- Passwords are hashed with bcrypt; an unknown email and a wrong password give
  the same `401`.
- Every backend request re-reads the account, so a deactivated user or a
  changed role takes effect on the next request.
- There are no refresh tokens, password reset or lockout (documented in
  [`docs/03-api`](../03-api/README.md#not-implemented)).
- A page calls `requireUser()`, which asks `/auth/me`; no valid session
  redirects to `/login`. There is no Next.js middleware.

## 5. Machine-learning pipeline

```mermaid
flowchart TD
    RAW["Raw dataset files<br/>(never committed)<br/>ml/data/raw"] --> VAL["Validate rows<br/>ml/src/data/validate.py"]
    VAL --> PRE["Preprocess<br/>remove expired and hospice encounters<br/>ml/src/data/preprocess.py"]
    PRE --> FE["Feature engineering<br/>prior_admission_count,<br/>days_since_last_discharge<br/>ml/src/features"]
    FE --> SPLIT["Temporal split<br/>train 2015 to 2022-01,<br/>validation 2022,<br/>test 2022-12 to 2024"]
    SPLIT --> TRAIN["Train 3 candidates<br/>logistic regression, random forest, XGBoost<br/>class weighting"]
    TRAIN --> SEL["Pick best by validation ROC-AUC"]
    SEL --> EVAL["Test metrics<br/>accuracy, precision, recall, F1, ROC-AUC"]
    EVAL --> GATE{"ROC-AUC at least 0.65<br/>and recall at least 0.50?"}
    GATE -- yes --> RUNS["Write-once run folder<br/>runs/target/version/model.joblib + metrics.json<br/>(+ sha256)"]
    GATE -- no --> KEEP["Run kept, not promoted"]
    RUNS --> PROMO["Promote: copy to shared target_model.joblib"]
    PROMO --> REGISTER["scripts/register_model.py<br/>checks provenance, sha256, compatibility"]
    REGISTER --> META[("model_metadata<br/>status = production")]
    META --> LOAD["Backend ModelLoader<br/>verifies sha256 before unpickling"]
    LOAD --> SERVE["POST /risk/predict and /risk/readmission"]
```

Two models are trained by the same code: `risk` (outcome: in-hospital death or
30-day readmission) and `readmission` (30-day readmission after a live
discharge). The decision threshold used for the reported metrics is a fixed
0.5. Calibration is switched off (`calibration.method: none`), and class
weighting inflates the stated values, which is why scores must not be read as
probabilities. Model files are never committed and are not present in the
Docker images. Results and limitations are in
[`docs/06-milestones/milestone-2.md`](../06-milestones/milestone-2.md).

## 6. Reporting, research and audit

- **Reports.** `ReportService` takes figures from the same `AnalyticsService`
  and `TreatmentService` methods the dashboards use, renders CSV, XLSX or PDF,
  writes the file to `REPORT_STORAGE_DIR` (default `backend/storage/reports`,
  not committed) and records metadata in `reports`. Files older than
  `REPORT_RETENTION_DAYS` (default 30) are removed by the purge route.
- **Research.** The anonymised cohort and export routes use salted
  pseudonymous ids, generalised age bands and a minimum cohort size (default
  10), and are audit-logged with their filters.
- **Audit logging.** `audit_logs` is append only and records authentication
  attempts, patient reads and listings, predictions, research exports,
  analytics reads and administrative changes. Nothing reads it back yet: there
  is no audit viewer or export (documented gap, SRS `FR-AUD-04`).

## 7. Deployment topology

```mermaid
flowchart LR
    subgraph Compose["docker compose (local)"]
        FE["frontend :3000"] --> BE["backend :8000"]
        BE --> PG[("postgres :5432")]
        BE -. "waits for health only" .-> MG[("mongodb :27017")]
    end
    NGINX["deployment/nginx/nginx.conf<br/>(template, not in compose)"] -. "not wired" .-> FE
```

What exists: `docker-compose.yml` (PostgreSQL, MongoDB, backend, frontend with
health checks on the data services), two Dockerfiles, and an nginx
configuration template that is not part of the compose file. What has not
been verified or does not exist: a full `docker compose up` from a clean state
with sign-in and a prediction, a cloud deployment, TLS, and a production
secret store. See [`docs/08-deployment`](../08-deployment/README.md) for the
runbook and the open risks.

## 8. Design decisions and open questions

| Topic | Position | Status |
|---|---|---|
| Operational database | PostgreSQL only in practice | The brief also lists MongoDB; the project's Database Design excludes it; no recorded decision |
| Dataset | The models were trained on the India Hospital Readmission export | The brief names Diabetes 130-US; no recorded ratification |
| Models | Logistic regression won on validation ROC-AUC against random forest and XGBoost | The ML Design planned XGBoost as primary; this is a result, not a plan |
| Browser never holds the token | httpOnly cookie plus server-side proxy | Implemented and tested |
| Authorisation | Server side only; frontend hides links for convenience | Implemented |
| Clinical decision support | Fixed rules on the stored score; no language model | Implemented |
| Original wireframes | Not produced at Milestone 1 | Current-state wireframes added later, see [`docs/05-wireframes`](../05-wireframes/README.md) |
