# Render Backend Deployment Guide — HealthForecast AI

This guide explains how to deploy the HealthForecast AI FastAPI backend, Machine Learning inference engine, and API services to [Render](https://render.com).

---

## 1. Overview & Architecture

- **Application Type**: FastAPI ASGI Web Service running under Python 3.11 with Uvicorn.
- **Repository**: `HealthForecastAI`
- **Root Directory**: `backend/` (or repository root with `PYTHONPATH=.`)
- **Build Command**: `pip install -r backend/requirements.txt`
- **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT --workers 2`
- **Health Check Path**: `/health`

The backend connects to a serverless Neon PostgreSQL database via TLS/SSL (`sslmode=require`) and serves requests originating exclusively from the approved Vercel frontend origin.

---

## 2. Infrastructure as Code: `render.yaml` Blueprint

The repository provides a root `render.yaml` specification for zero-friction blueprint deployment:

```yaml
services:
  - type: web
    name: healthforecast-api
    env: python
    region: oregon
    plan: starter
    rootDir: backend
    buildCommand: "pip install --upgrade pip && pip install -r requirements.txt"
    startCommand: "uvicorn app.main:app --host 0.0.0.0 --port $PORT --workers 2"
    healthCheckPath: /health
    envVars:
      - key: PYTHON_VERSION
        value: 3.11.9
      - key: ENVIRONMENT
        value: production
      - key: DEBUG
        value: "false"
      - key: APP_NAME
        value: "HealthForecast AI"
      - key: LOG_LEVEL
        value: INFO
      - key: MODEL_ARTIFACT_DIR
        value: ml/models/artifacts
      - key: DATABASE_URL
        sync: false
      - key: JWT_SECRET_KEY
        generateValue: true
      - key: FRONTEND_URL
        sync: false
      - key: CORS_ORIGINS
        sync: false
```

---

## 3. Step-by-Step Manual Deployment on Render

### Step 1: Create Web Service
1. Log in to [Render Dashboard](https://dashboard.render.com).
2. Click **New +** > **Web Service**.
3. Connect your GitHub repository (`GKSJ-AI-CliniScan/HealthForecastAI`).
4. Select your working branch (`intern/23-nishakar-t` or `main`).

### Step 2: Configure Service Details
- **Name**: `healthforecast-api`
- **Region**: Choose a region close to your Neon PostgreSQL database (e.g., Oregon or Ohio).
- **Branch**: `intern/23-nishakar-t`
- **Root Directory**: `backend`
- **Runtime**: `Python 3`
- **Build Command**: `pip install --upgrade pip && pip install -r requirements.txt`
- **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT --workers 2`
- **Instance Type**: Starter (or Free tier)

### Step 3: Configure Environment Variables

Set the following environment variables in the Render dashboard (**Environment** tab):

| Variable Name | Required | Example / Description |
|---|---|---|
| `PYTHON_VERSION` | Yes | `3.11.9` |
| `ENVIRONMENT` | Yes | `production` |
| `DEBUG` | Yes | `false` |
| `APP_NAME` | Yes | `HealthForecast AI` |
| `LOG_LEVEL` | Yes | `INFO` |
| `DATABASE_URL` | Yes | `postgresql+psycopg://user:pass@ep-hostname.us-east-2.aws.neon.tech/neondb?sslmode=require` |
| `JWT_SECRET_KEY` | Yes | 64-char random hex string (`openssl rand -hex 32`) |
| `JWT_ALGORITHM` | Yes | `HS256` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Yes | `60` |
| `FRONTEND_URL` | Yes | `https://healthforecast-ai.vercel.app` |
| `CORS_ORIGINS` | Yes | `["https://healthforecast-ai.vercel.app"]` |
| `MODEL_ARTIFACT_DIR` | Yes | `ml/models/artifacts` |

> **Critical Note on `DATABASE_URL`**: Render provides connection strings with `postgresql://`. The application's `backend/app/core/config.py` automatically normalizes this to `postgresql+psycopg://` so SQLAlchemy 2.0 and `psycopg` (psycopg3) connect seamlessly to Neon with SSL.

### Step 4: Health Check Configuration
- In **Advanced Settings**, set **Health Check Path** to `/health`.
- Render will ping `/health` during deployment and only redirect live traffic once the endpoint responds with HTTP 200 `{"status": "healthy", ...}`.

---

## 4. Database Migration on Deploy

To ensure all database tables and constraints are initialized prior to launching traffic:
1. In the service settings, set the **Pre-Deploy Command** (or run as part of the build step):
   ```bash
   alembic upgrade head
   ```
2. Or run migrations from your local workstation pointing to the Neon connection string:
   ```bash
   DATABASE_URL="postgresql+psycopg://<user>:<password>@<neon-host>/neondb?sslmode=require" alembic upgrade head
   ```

---

## 5. Post-Deployment Verification

1. **Health Check**:
   ```bash
   curl -i https://<your-service>.onrender.com/health
   ```
   *Expected response:*
   ```json
   HTTP/2 200
   {"status":"healthy","service":"HealthForecast AI","environment":"production"}
   ```

2. **OpenAPI Documentation**:
   Navigate to `https://<your-service>.onrender.com/docs` in your browser. Verify interactive Swagger documentation loads and all endpoints are cataloged.

3. **CORS Verification**:
   Send an OPTIONS preflight request with the Vercel Origin:
   ```bash
   curl -i -X OPTIONS https://<your-service>.onrender.com/api/v1/patients/ \
     -H "Origin: https://healthforecast-ai.vercel.app" \
     -H "Access-Control-Request-Method: GET"
   ```
   *Expected response:* Contains `Access-Control-Allow-Origin: https://healthforecast-ai.vercel.app`.

---

## 6. Logs, Monitoring & Rollbacks

- **Live Logs**: View real-time application logs in the **Logs** tab of the Render dashboard.
- **Rollback**: In the **Events** tab, select a previous successful deployment and click **Rollback to this deploy**.
