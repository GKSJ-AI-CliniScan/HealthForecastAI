# Production Readiness & Go-Live Checklist — HealthForecast AI

This checklist must be verified prior to promoting any release of HealthForecast AI to production.

---

## 1. Environment & Configuration Security

- [ ] **Debug Mode Disabled**:
  - `DEBUG=false` confirmed in Render environment variables.
  - FastAPI `/docs` and `/redoc` configured appropriately for production access.
- [ ] **Secret Management**:
  - `JWT_SECRET_KEY` generated with cryptographically secure random bytes (`openssl rand -hex 32`).
  - No secret keys, passwords, or tokens hardcoded in Git repository (verified by `scripts/ci/check_secrets.py`).
  - `.env` files added to `.gitignore` and omitted from version control.
- [ ] **Database Connection Security**:
  - Connection string uses `?sslmode=require` targeting Neon PostgreSQL.
  - Connection pooling enabled via Neon PgBouncer endpoints.
  - Least privilege database role utilized.

---

## 2. Network & Cross-Origin Resource Sharing (CORS)

- [ ] **Strict CORS Origin Whitelisting**:
  - `FRONTEND_URL` points strictly to the production Vercel domain (e.g. `https://healthforecast-ai.vercel.app`).
  - Wildcard (`*`) origin rejected in `backend/app/main.py` when `ENVIRONMENT=production`.
  - Credentials (`allow_credentials=True`) allowed only for approved origins.
- [ ] **HTTPS Enforced**:
  - All Vercel traffic routed over TLS 1.3 / HTTPS.
  - All Render backend communication routed over HTTPS.
  - Secure HTTP headers configured in `frontend/vercel.json` (`X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`).

---

## 3. Database & Migrations

- [ ] **Schema Migration Execution**:
  - `alembic upgrade head` executed cleanly with no pending revisions.
  - Foreign key constraints, unique constraints, and indexes validated.
- [ ] **Data Integrity**:
  - Initial system roles (Admin, Doctor, Hospital Admin, Researcher) verified.
  - Synthetic seed data verified for non-production environments.

---

## 4. Machine Learning & Inference Quality

- [ ] **Artifact Availability**:
  - Trained model pipeline artifact present at `ml/models/artifacts/best_model.joblib`.
  - Preprocessor artifact loaded into memory during FastAPI startup.
- [ ] **Inference Latency**:
  - Average prediction latency under 50ms per encounter.
  - Output probability strictly bounded within `[0.0, 1.0]`.
  - Risk tier mapped accurately:
    - **Low Risk**: 0–30%
    - **Medium Risk**: 31–70%
    - **High Risk**: 71–100%
- [ ] **Clinical Safety Disclaimers**:
  - UI displays clinical decision support disclaimer ("AI recommendations provide decision support and must be validated by licensed medical practitioners").

---

## 5. Security & Regulatory Compliance

- [ ] **Role-Based Access Control (RBAC)**:
  - DOCTOR: restricted to assigned patients and clinical risk views.
  - HOSPITAL_ADMIN: operational statistics, department throughput, readmission rates.
  - RESEARCHER: anonymized cohorts only; PII de-identified into salted SHA-256 pseudonyms (`ANON-PAT-XXXXXX`).
  - SYSTEM_ADMIN: user management and system audits.
- [ ] **Audit Trail**:
  - All patient read, export, and risk recalculation events logged with timestamps and user IDs.

---

## 6. Testing & Quality Assurance

- [ ] **Automated Backend Tests**:
  - `pytest backend/tests/ -v` passes 100% (52/52 tests passing).
- [ ] **Frontend Validation**:
  - `npm run typecheck` produces 0 TypeScript errors.
  - `npm run build` succeeds without bundle warnings or broken imports.
- [ ] **Code Hygiene**:
  - `ruff check backend/` produces 0 lint errors.
  - `black --check backend/` reports formatting compliance.

---

## 7. Post-Deployment Smoke Test Runbook

1. `GET /health` on Render backend returns HTTP 200 `{"status": "healthy", ...}`.
2. Vercel frontend loads at root URL without console exceptions.
3. Authenticate with sample credentials: verify JWT access token issued.
4. Access Patients directory: verify pagination and filter functionality.
5. Trigger risk prediction on test patient: verify risk gauge and feature breakdown render.
6. Switch to Researcher role: verify patient names, SSNs, and addresses are replaced with de-identified hashes.
