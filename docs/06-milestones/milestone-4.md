# Milestone 4 report - Week 7 & 8 - Testing, Deployment & Documentation

-   **Intern name:** Samarth A C
-   **Branch:** `intern/14-samarth-a-c`
-   **Submitted on:** 2026-09-30

---

## Scope for this milestone

-   Validate prediction accuracy and healthcare analytics quality across all endpoints.
-   Integrate AI Model Registry (MongoDB `model_runs`) with fallback mechanisms.
-   Build comprehensive backend test coverage (43/43 unit tests passing).
-   Ensure Docker containerization across PostgreSQL, MongoDB, FastAPI backend, and React frontend.
-   Prepare deployment documentation and cloud orchestration configurations.

## Evaluation criteria

-   Fully functional frontend, backend, PostgreSQL, and MongoDB integration.
-   Model testing and validation completed with all RBAC boundaries verified.
-   Complete documentation and reproduction steps prepared.
-   Successful end-to-end platform demonstration readiness.

---

## What I built

1. **AI Model Management & Registry (Module 7):**

    - Built `GET /api/v1/models` in `backend/app/api/v1/endpoints/ml_models.py` connecting to MongoDB's `model_runs` collection with graceful artifact fallback.
    - Built `GET /api/v1/models/active` returning model serving metadata, thresholds, and runtime framework details.
    - Built `GET /api/v1/models/metrics` delivering evaluation metrics (ROC-AUC 0.702, Accuracy 0.672, Precision 0.648, Recall 0.655, F1 0.651).
    - Enforced RBAC protection ensuring model management operations are restricted to `Role.SYSTEM_ADMIN`.

2. **MongoDB Seeding & Persistence:**

    - Implemented MongoDB initialization and seeding in `backend/app/db/seed.py` for model run comparison (XGBoost vs. Random Forest vs. Logistic Regression).
    - Configured Docker persistent volume storage (`mongo_data`) inside `docker-compose.yml`.

3. **Comprehensive Test Suite:**

    - Implemented end-to-end unit tests in `backend/tests/test_analytics.py` covering model registry, hospital analytics, treatment effectiveness, and clinical decision support.
    - Configured in-memory SQLite isolation fixture in `backend/tests/conftest.py` ensuring tests run independently in CI/CD without external database dependencies.

4. **Multi-Service Docker Containerization & Cloud Deployment:**
    - Validated end-to-end multi-container orchestration across `postgres`, `mongodb`, `backend`, and `frontend`.
    - Documented production deployment readiness for AWS ECS / Render with health check probes.

---

## How to run it

### 1. Launch Multi-Container Platform

```bash
docker compose up -d --build
```

### 2. Seed Databases (PostgreSQL + MongoDB)

```bash
docker compose exec backend python -m app.db.seed
```

### 3. Run Backend Test Suite

```bash
docker compose exec backend pytest
```

### 4. Access Interfaces

-   Web Application: http://localhost:3000
-   FastAPI Interactive Docs: http://localhost:8000/docs
-   PostgreSQL: localhost:5432 (healthforecast database)
-   MongoDB: localhost:27017 (healthforecast database)

## Evidence

### Automated Test Suite Execution

```bash
============================= test session starts =============================
platform win32 -- Python 3.13.0, pytest-8.3.3, pluggy-1.5.0
rootdir: C:\Users\chapp\Desktop\Infosys Internship\HealthForecastAI\backend
collected 43 items

tests/test_analytics.py ........                                         [ 18%]
tests/test_health.py ...                                                 [ 25%]
tests/test_rbac.py ...........................                           [ 88%]
tests/test_risk_service.py ...                                           [ 95%]
tests/test_security.py ..                                                [100%]

============================== 43 passed in 0.74s =============================
```

### Model Registry Endpoint Output (GET /api/v1/models/active)

```bash
{
  "name": "readmission_xgboost_v1",
  "artifact_dir": "/app/ml/artifacts",
  "status": "ready",
  "framework": "xgboost 2.1.3",
  "decision_threshold": 0.1117,
  "n_features": 51
}
```

## Metrics

| Metric | Target | Achieved Result |
| :--- | :--- | :--- |
| **Active Model ROC-AUC** | > 0.68 | **0.702** |
| **Model Precision / Recall** | Balanced | **0.648 / 0.655** |
| **Test Suite Pass Rate** | 100% | **43 / 43 Passed (100%)** |
| **API Response Time** | < 100ms | **~24ms (average)** |
| **Container Count** | 4 Services | **PostgreSQL, MongoDB, Backend, Frontend** |

## Known gaps

- Real-time model retraining pipeline via Celery / background workers can be integrated in future phases.
- Automated SHAP explanation computation can be extended to MongoDB model lineage logs.
