# Deployment Architecture: HealthForecast AI

HealthForecast AI uses a modern, serverless cloud architecture:

- **Frontend**: [Vercel](https://vercel.com) (React 18 + TypeScript + Vite SPA)
- **Backend API & ML Engine**: [Render](https://render.com) (FastAPI + Uvicorn)
- **Database**: [Neon](https://neon.tech) (Serverless PostgreSQL with SSL)

---

## 1. Production Architecture Overview

```
                      USER / BROWSER
                            │
                            ▼
                   ┌─────────────────┐
                   │     VERCEL      │
                   │  React + TS SPA │
                   └────────┬────────┘
                            │
                            │ HTTPS REST API
                            ▼
                   ┌─────────────────┐
                   │     RENDER      │
                   │  FastAPI + ML   │
                   └────────┬────────┘
                            │
                            │ SSL Connection
                            ▼
                   ┌─────────────────┐
                   │      NEON       │
                   │   PostgreSQL    │
                   └─────────────────┘
```

---

## 2. Local Containerized Development (Docker Compose)

For local development and testing:

```bash
cp .env.example .env
docker compose up --build
```

| Service | Local URL | Description |
|---|---|---|
| **Frontend** | `http://localhost:3000` | React web application |
| **Backend** | `http://localhost:8000` | FastAPI REST services |
| **Swagger Docs** | `http://localhost:8000/docs` | Interactive OpenAPI documentation |
| **Health Check** | `http://localhost:8000/health` | Service liveness probe |
| **PostgreSQL** | `localhost:5432` | Local development database |

---

## 3. Deployment Guides

Detailed, step-by-step guides are located in `docs/deployment/`:
* [Vercel Deployment Guide](../docs/deployment/vercel.md)
* [Render Deployment Guide](../docs/deployment/render.md)
* [Neon PostgreSQL Guide](../docs/deployment/neon.md)
* [Production Checklist](../docs/deployment/production-checklist.md)
