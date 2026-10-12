# Milestone 4 report - Week 7 & 8 - Testing, Deployment & Documentation

- **Submitted on:** 2026-09-30
- **Status:** Complete

---

## Scope for this milestone

- Validate prediction accuracy and healthcare analytics quality.
- Optimize healthcare workflows and dashboard responsiveness.
- Deploy the platform using Docker and a cloud environment.
- Prepare the final project documentation and presentation.
- Demonstrate the complete HealthForecast AI platform.

## Evaluation criteria

- Fully deployed frontend and backend.
- Model testing and validation completed.
- Documentation and presentation prepared.
- Successful end-to-end platform demonstration completed.

---

## What I built

### 1. Validation & Test Coverage (`docs/07-testing/`)
- Comprehensive validation report (`docs/07-testing/validation-report.md`) verifying calibration, lift by band, and security controls.
- Held-out evaluation reproducible via `ml/src/evaluation/validate.py` (ROC-AUC 0.633, high band 24.7% observed vs 24.6% predicted).
- End-to-end reconciliation testing (`backend/tests/test_reconciliation.py`) verifying that reports, calibration bands, and CSV exports agree on cohort totals.
- 12 comprehensive end-to-end integration checks (`tests/e2e/test_platform.py`) covering all four role workflows, account lockout, and audit trails.
- CI migration validation on PostgreSQL with zero schema drift (`alembic check`).

### 2. Security & Production Hardening
- **Authentication Lockout:** Progressive lockout after 5 failed sign-in attempts within 15 minutes tracked in the audit log.
- **Configuration Security:** Strict startup checks refusing default secrets or wildcard CORS in production environments (`backend/app/core/config.py`).
- **HTTP Security Headers:** Added `no-store`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, and strict referrer policy (`backend/app/main.py`).
- **Audit Log Inspection:** Added paginated, filterable audit log viewer (`GET /api/v1/audit`) restricted to System Administrators.

### 3. Workflow Optimization & Performance
- Load testing under 20 concurrent users achieved 27.7 req/s with p50 latency of 434 ms (reduced from baseline 1,032 ms) and zero request failures.
- Composite database indexes applied to optimize the "latest prediction per patient" join query.
- Implemented short-duration caching for resource-heavy clinical reports.

### 4. Containerization & Deployment Orchestration
- **Development Compose (`docker-compose.yml`):**
  - Multi-service orchestration for PostgreSQL, MongoDB, migration runner, FastAPI backend, and Next.js frontend.
  - Proper build-argument propagation for `NEXT_PUBLIC_API_BASE_URL` and health checks.
- **Production Compose (`deployment/docker-compose.prod.yml`):**
  - Hardened Nginx reverse proxy on port 80/443, unpublished database ports, and mandatory environment secrets.
- **Automated CI/CD Workflow (`.github/workflows/deploy.yml`):**
  - Verification, multi-arch image builds, and automated deployment over SSH.
- **Oracle Database Interoperability:**
  - Automated Oracle seed generator (`scripts/generate_oracle_seed.py`), DDL schema (`scripts/setup_oracle_db.sql`), and verification script (`scripts/verify_oracle_db.sql`).

### 5. Frontend & Interactive Dashboards
- Interactive Model Performance & Live Retraining Dashboard (`frontend/src/app/(app)/model-training/page.tsx`).
- Production-optimized Next.js 15 build with 15 statically generated routes and zero TypeScript errors.

---

## How to run it

### Docker Compose
```bash
cp .env.example .env
docker compose up -d --build
```

### Manual / Local Run
```bash
# 1. Train ML models
cd ml
python -m src.models.train
python -m src.models.score

# 2. Database migration and backend API
cd ../backend
alembic upgrade head
python -m app.db.init_db
uvicorn app.main:app --reload

# 3. Frontend Web Application
cd ../frontend
npm install
npm run dev
```

### Verification & Testing
```bash
# Backend test suite (306 tests)
cd backend && pytest

# ML test suite (58 tests)
cd ml && pytest

# Frontend typecheck & lint
cd frontend && npm run typecheck && npm run lint
```

---

## Evidence

- Complete stack builds and runs cleanly via Docker Compose.
- Backend health check (`GET http://localhost:8000/health`) returns `{"status":"ok"}`.
- Model comparison endpoint (`GET /api/v1/models/compare`) serves active model performance metrics.
- 306 backend unit and integration tests passing (100% pass rate).
- Zero TypeScript or lint errors across frontend codebases.

---

## Metrics

| Measure | Value |
|---|---|
| Held-out ROC-AUC | 0.633 (95% CI 0.618–0.650) |
| High-risk band | 4.9% of cohort, 24.7% readmitted (2.6x baseline) |
| Recall / Precision at threshold | 0.501 / 0.142 |
| Single prediction latency | < 45 ms (without explanation) / ~130–190 ms (with explanation) |
| Throughput (20 concurrent users) | 27.7 req/s, 0 errors, p50 434 ms |
| Backend test suite | 306 passed tests |
| Frontend compilation | 15 static routes compiled cleanly |

---

## Known gaps and operational considerations
- **Cloud Deployment:** Complete Docker and CI release workflows are provided; live deployment requires production host credentials.
- **Clinical Validation:** Clinical decision rules serve as decision support recommendations and require human physician review.
- **Session Security:** Token storage in `sessionStorage` provides SPA convenience; migration to httpOnly cookies is recommended for high-security environments.
