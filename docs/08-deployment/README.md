# Deployment Runbook — HealthForecast AI

This runbook documents the production deployment architecture, configuration, and verification procedures for the HealthForecast AI platform.

Detailed provider guides are located in:
- [Vercel Frontend Guide](../deployment/vercel.md)
- [Render Backend Guide](../deployment/render.md)
- [Neon PostgreSQL Guide](../deployment/neon.md)
- [Production Readiness Checklist](../deployment/production-checklist.md)

---

## 1. Production Architecture Overview

The platform uses a dedicated 3-tier cloud deployment:
1. **Frontend**: [Vercel](https://vercel.com) (React 18 + Vite SPA deployed on global Edge CDN).
2. **Backend**: [Render](https://render.com) (FastAPI ASGI Web Service with Python 3.11, Uvicorn workers, and embedded ML inference engine).
3. **Database**: [Neon](https://neon.tech) (Serverless PostgreSQL 16 with enforced TLS/SSL and connection pooling).

---

## 2. Deliverable Details for Milestone 4

1. **Target Live URLs**:
   - Frontend: `https://healthforecast-ai.vercel.app`
   - Backend API: `https://healthforecast-api.onrender.com/api/v1`
   - Backend Health Check: `https://healthforecast-api.onrender.com/health`
   - API Documentation: `https://healthforecast-api.onrender.com/docs`
2. **Provider & Services**:
   - Vercel (Edge SPA Hosting, automated preview branch builds, SSL/TLS).
   - Render Web Services (FastAPI containerized/native Python runtime with zero-downtime deploys).
   - Neon PostgreSQL (Serverless Postgres with compute auto-scaling and PgBouncer connection pooling).
3. **Deploy Steps**:
   - Step 1: Provision Neon database and execute `alembic upgrade head`.
   - Step 2: Provision Render Web Service with `render.yaml` or Render dashboard, injecting `DATABASE_URL` with SSL.
   - Step 3: Deploy Frontend to Vercel with root directory `frontend` and `VITE_API_BASE_URL` pointing to Render.
4. **Environment Variables**:
   - Configured via Vercel and Render dashboards following [`.env.example`](../../.env.example).
5. **Rollback**:
   - Instant rollback in Vercel to previous deployment hash.
   - One-click rollback in Render to previous green build.
6. **Evidence**:
   - 52 passing backend tests, clean Ruff/Black checks, clean Vite production build, passing CI secret scan.

---

## 3. Pre-Deploy Checklist

- [x] `DEBUG=false` configured for production
- [x] `JWT_SECRET_KEY` generated with cryptographically secure random bytes
- [x] Database strictly requires TLS/SSL (`sslmode=require`)
- [x] CORS whitelists only the production frontend origin (`FRONTEND_URL`)
- [x] `GET /health` returns HTTP 200 `{"status": "healthy", ...}`
- [x] No secrets or credentials committed to repository (verified via `scripts/ci/check_secrets.py`)

