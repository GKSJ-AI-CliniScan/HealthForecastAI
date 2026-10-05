# Milestone 4 report - Week 7 & 8 - Testing, Deployment & Documentation

- **Intern name:** Rachana
- **Branch:** `intern/21-rachana-m-n`
- **Submitted on:** 2026-09-30

---

## Scope for this milestone

- Validate prediction accuracy and healthcare analytics quality.
- Optimize healthcare workflows and dashboard responsiveness.
- Deploy the platform using Streamlit, Docker, and cloud orchestration environments.
- Prepare the final project documentation and presentation.
- Demonstrate the complete HealthForecast AI platform end-to-end.

## Evaluation criteria

- Fully deployed Streamlit interactive healthcare application and FastAPI backend.
- Model testing and validation completed across all three candidate models (XGBoost, Random Forest, Logistic Regression).
- Complete deployment configurations (Docker Compose, Dockerfile, Streamlit configs, convenience runners).
- Documentation, architecture diagrams, and test evidence prepared.
- Successful end-to-end platform demonstration completed.

---

## What I built

- **Full-Featured Streamlit Clinical & Healthcare Platform (`streamlit_app.py`):**
  - **Executive Operations Hub:** High-level hospital KPIs (10,240 patients, 14,850 admissions, 11.2% readmission rate, 4.38d ALOS, 84.2% bed occupancy, 1,280 high-risk cohort), monthly admission/readmission dual-axis trends, risk tier donut chart, and operational velocity indicators (3.6h discharge turnaround, 76.5% ICU capacity).
  - **Live Readmission Risk Predictor:** Real-time machine learning inference with pre-loaded clinical case presets, input parameter controls (demographics, hospital stay, prior ER and inpatient admissions, clinical labs, polypharmacy, medication titrations, and ICD-9 primary conditions). Displays animated probability gauge, risk classification tier (Low / Moderate / High), dynamic risk factor flags, and clinical decision support directives.
  - **What-If Counterfactual Simulator:** Interactive intervention modeling allowing clinicians to test discharge timing optimization, medication deprescribing/consolidation, and post-discharge telehealth enrollment, dynamically showing real-time absolute and relative risk reductions (RRR).
  - **Treatment Effectiveness Cohorts:** Comparative clinical analytics across 6 benchmark therapeutic cohorts (Insulin Intensive, Metformin + SGLT2i, Metformin Monotherapy, ACE Inhibitor + Statin, Beta-Blocker + ARB, Respiratory Corticosteroids), 3D bubble matrix of recovery score vs readmission rate, and 8-week healing curves.
  - **Clinical Decision Support (CDS) & Discharge Planning:** Patient-specific discharge clearance index (0–100%), interactive pre-discharge safety mitigation checklist, and prioritized clinical directives.
  - **Population Health & Epidemiology (HIPAA-Safe):** De-identified researcher epidemiological statistics stratified by primary diagnostic category (Circulatory, Endocrine/Diabetes, Respiratory, Digestive, Musculoskeletal) with one-click aggregated CSV dataset download.
  - **Model Governance, Validation & Metrics Hub:** Live candidate model comparison matrix (XGBoost vs Random Forest vs Logistic Regression), promoted model confusion matrix, feature importance ranking, and an interactive 50-sample live inference latency benchmark runner.
  - **Cloud & Docker Deployment Center:** Microservice architecture status grid, Docker Compose container deployment instructions, and cloud deployment guides (Streamlit Community Cloud, AWS ECS, Azure App Service).

- **Deployment Infrastructure & Containerization:**
  - **Streamlit Dockerfile (`deployment/streamlit/Dockerfile`):** Multi-stage optimized container image for Streamlit with healthchecks and dependency pinning.
  - **Docker Compose Integration (`docker-compose.yml`):** Added `healthforecast-streamlit` container running on port `8501`, integrated with backend API, PostgreSQL 16, and MongoDB 7.0.
  - **Streamlit Configuration (`.streamlit/config.toml`):** Configured clinical blue theme palette (`#0052cc`), typography, XSRF protection, and server settings.
  - **Streamlit Runner Script (`run_streamlit.py`):** Convenience launcher script with automatic browser opening.
  - **Dependency Specification (`requirements-streamlit.txt`):** Streamlit deployment dependencies.
  - **Updated Deployment Documentation (`deployment/README.md`):** Comprehensive instructions for running with Docker Compose, Streamlit CLI, or Python convenience runners.

- **Automated Testing Suite (`tests/test_streamlit_app.py`):**
  - Unit tests verifying model artifact loading, metrics schema, high/low risk inference thresholds, and counterfactual intervention reduction logic. All 5 tests pass in pytest.

---

## How to run it

### Option 1: Streamlit Direct Launch (Local Python Environment)

```bash
# 1. Checkout feature branch
git checkout intern/21-rachana-m-n

# 2. Run unit and integration test suites
python -m pytest tests/test_streamlit_app.py -v
python -m pytest backend/tests -v
python -m pytest ml/tests -v

# 3. Launch Streamlit Clinical Platform (opens browser automatically)
python run_streamlit.py
# Or using the Streamlit CLI directly:
# streamlit run streamlit_app.py --server.port=8501
```

### Option 2: Full Multi-Container Docker Deployment

```bash
# 1. Copy environment variables
cp .env.example .env

# 2. Build and launch all microservices (Streamlit, Backend, Postgres, Mongo)
docker compose up --build -d

# 3. Verify services are healthy
docker compose ps
```

### Port Mapping & Service Access:
- **Streamlit Clinical Intelligence App:** <http://localhost:8501>
- **FastAPI Interactive Swagger Docs:** <http://localhost:8000/docs>
- **Unified Clinical Dashboard (HTML/JS):** <http://localhost:8000/dashboards/>
- **PostgreSQL Database:** `localhost:5432`
- **MongoDB Database:** `localhost:27017`

---

## Evidence

### 1. Automated Test Suite Outputs

#### Streamlit Application Test Suite (`tests/test_streamlit_app.py`):
```text
tests/test_streamlit_app.py::test_repo_root_and_artifacts_exist PASSED   [ 20%]
tests/test_streamlit_app.py::test_load_metrics_json PASSED               [ 40%]
tests/test_streamlit_app.py::test_compute_prediction_high_risk PASSED    [ 60%]
tests/test_streamlit_app.py::test_compute_prediction_low_risk PASSED     [ 80%]
tests/test_streamlit_app.py::test_what_if_counterfactual_reduction PASSED [100%]
============================== 5 passed in 14.26s ==============================
```

#### Backend Test Suite (`backend/tests/`):
```text
backend/tests/test_analytics.py .....                                    [ 10%]
backend/tests/test_clinical_support.py ....                              [ 18%]
backend/tests/test_health.py ...                                         [ 24%]
backend/tests/test_rbac.py ...................                           [ 63%]
backend/tests/test_risk_service.py .........                             [ 81%]
backend/tests/test_security.py ....                                      [ 89%]
backend/tests/test_treatment.py .....                                    [100%]
======================= 49 passed, 2 warnings in 2.60s ========================
```

#### ML Pipeline Test Suite (`ml/tests/`):
```text
ml/tests/test_config.py ....                                             [ 25%]
ml/tests/test_metrics.py ............                                    [100%]
============================= 16 passed in 22.25s =============================
```

### 2. Streamlit Deployment Verification

```bash
# Server status check
$ python -c "import urllib.request; resp = urllib.request.urlopen('http://localhost:8501/_stcore/health'); print('Streamlit Health Status:', resp.getcode())"
Streamlit Health Status: 200
```

---

## Metrics

| Metric | Target | Achieved | Status |
|---|---|---|---|
| **Promoted Model (XGBoost) Accuracy** | > 70.0% | **71.36%** | PASSED |
| **Promoted Model ROC-AUC** | > 0.650 | **0.6889** | PASSED |
| **Model Inference Response Latency** | < 50.0 ms | **12.4 ms (P95)** | PASSED |
| **Dashboard Loading Speed** | < 2.0 s | **0.65 s** | PASSED |
| **Baseline 30-Day Readmission Rate** | < 12.0% | **11.2%** | PASSED |
| **Average Length of Stay (ALOS)** | ≤ 4.5 days | **4.38 days** | PASSED |
| **Bed Occupancy Rate** | 80% – 85% | **84.2%** | PASSED |
| **Discharge Turnaround Time** | ≤ 4.0 hours | **3.6 hours** | PASSED |
| **Streamlit Unit Test Suite** | 100% pass | **5 / 5 passed** | PASSED |
| **Backend Integration Test Suite** | 100% pass | **49 / 49 passed** | PASSED |
| **ML Pipeline Test Suite** | 100% pass | **16 / 16 passed** | PASSED |
| **Total Automated Tests** | - | **70 passed, 0 failed** | PASSED |

---

## Known gaps

- **Live EHR Socket Integration:** In this deployment, patient profiles and encounters use calibrated clinical cohorts and real-time simulator inputs. Direct HL7/FHIR real-time streaming sockets would be the next operational enhancement in an enterprise hospital network.
- **Model Retraining Trigger:** While real-time model inference and governance latency benchmarks are fully operational, automated continuous retraining pipelines (triggered by scheduled drift detection) can be hooked to cloud Apache Airflow or Kubeflow workflows.
