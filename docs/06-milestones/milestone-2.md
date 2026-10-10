# Milestone 2 Report - Week 3 & 4 - Risk Prediction & Readmission Forecasting

-   **Intern name:** Samarth A C
-   **Branch:** `intern/14-samarth-a-c`
-   **Submitted on:** 2026-09-15

---

## Scope for this milestone

-   Train patient risk prediction models.
-   Generate patient risk scores.
-   Build risk prediction dashboards.
-   Develop readmission forecasting workflows.
-   Generate forecasting reports.
-   Build clinical insights modules.

## Evaluation criteria

-   Patient risk prediction and readmission forecasting workflows implemented.
-   Risk scoring and forecasting models functional.
-   Clinical insights generated successfully.
-   AI prediction models integrated.

---

## What I built

As Backend Engineer for Milestone 2:

1. **Rebuilt Milestone 1 Backend Foundation:** Rebuilt and refactored the Milestone 1 backend integration from scratch to resolve critical database connectivity, schema inconsistencies, RBAC token validation, and Docker container networking issues.
2. **Model Serving & Pipeline Integration (`backend/app/services/model_service.py`):**
    - Implemented artifact loading with memory caching for `readmission_model.joblib` and `feature_contract.json`.
    - Wired in the ML feature pipeline (`build_serving_features`) to construct derived signals (e.g. prior visits, medication changes, ICD-9 diagnosis groupings) without training-serving skew.
    - Built a robust execution engine bypassing scikit-learn 1.6 `FrozenEstimator` MRO tag bugs to produce calibrated readmission probabilities.
3. **Risk Scoring & Persistence (`backend/app/api/v1/endpoints/risk.py`, `backend/app/services/risk_service.py`):**
    - Replaced hardcoded dummy probabilities in `POST /api/v1/risk/predict` with real model inference.
    - Implemented risk categorization (`low`, `medium`, `high`) based on calibrated decision thresholds.
    - Persisted prediction outputs into PostgreSQL table `risk_predictions`.
4. **Dynamic AI Model Metrics Endpoint (`backend/app/api/v1/endpoints/ml_models.py`):**
    - Connected `GET /api/v1/models/metrics` to dynamically load and serve evaluation metrics from `metrics.json`.
5. **Lead Integration Duties:**
    - Standardized the API contract between backend schemas (`RiskPredictionRead`, `ReadmissionForecast`) and frontend TypeScript interfaces (`frontend/src/types/index.ts`).
    - Coordinated feature contracts and artifact schemas with the AI/ML pipeline.

---

## How to run it

### 1. Prerequisites

-   Docker & Docker Compose
-   Python 3.11+

### 2. Start Docker Containers

-   docker compose up -d --build

### 3. Run Backend Unit Tests

-   docker compose exec backend pytest tests/

### 4. Interactive API Documentation

-   Open your browser and navigate to: http://localhost:8000/docs

### Evidence

1. Model Evaluation Metrics Endpoint (GET /api/v1/models/metrics)

    Status: 200 OK

-   {
    "accuracy": 0.6868124017716817,
    "precision": 0.14538444091630756,
    "recall": 0.5099443118536198,
    "f1": 0.22626191316625485,
    "roc_auc": 0.6518298564066656
    }

2. Live Patient Risk Scoring (POST /api/v1/risk/predict)

-   {
    "patient_id": 1,
    "time_in_hospital": 5,
    "num_medications": 14,
    "num_lab_procedures": 45,
    "number_diagnoses": 8,
    "number_inpatient": 0,
    "number_emergency": 0,
    "age_group": "[60-70)"
    }

        Response: 200 OK

-   {
    "patient_id": 1,
    "readmission_probability": 0.08948,
    "risk_category": "low",
    "model_name": "readmission_xgboost_v1",
    "model_version": "1.0.0",
    "created_at": "2026-09-15T00:21:00Z"
    }

3. Backend Test Suite Execution

-   35 passed in 1.45s

## Metrics

Due to class imbalance (~9% readmission prevalence), decision thresholds were tuned off the validation set precision-recall curve.

| Model                  |   Accuracy |  Precision |     Recall |   F1 Score |    ROC-AUC | Decision Threshold |
| :--------------------- | ---------: | ---------: | ---------: | ---------: | ---------: | -----------------: |
| Logistic Regression    |     60.70% |     12.68% |     57.36% |     0.2077 |     0.6280 |             0.0927 |
| Random Forest          |     66.35% |     14.10% |     53.94% |     0.2235 |     0.6459 |             0.1000 |
| **XGBoost (Promoted)** | **68.68%** | **14.54%** | **50.99%** | **0.2263** | **0.6518** |         **0.1117** |

Winner Selection Rationale:
**XGBoost** won and was promoted to serving (readmission_xgboost_v1) because:

-   It achieved the top ROC-AUC (0.6518) and F1 score (0.2263) across evaluation splits.
-   Isotonic calibration successfully aligned output probabilities with the real ~9% prevalence while maintaining ranking discrimination on complex non-linear feature interactions.

## Known gaps

1. Department-Level Aggregation (GET /risk/forecast): Aggregates hospital-wide baseline forecast; department breakdown queries will be completed in Milestone
2. MongoDB Model Registry: Persisting experiment runs into the model_runs collection is slated for Milestone 4.
3. Background Batch Inference: Batch inference queue for newly admitted patients overnight will be added via background workers.
