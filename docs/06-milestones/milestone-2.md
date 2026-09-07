# Milestone 2 report - Week 3 & 4 - Risk Prediction & Readmission Forecasting

- **Intern name:** V. Naga Phanendra
- **Branch:** `intern/25-v-naga-phanendra`
- **Submitted on:** 2026-09-07

---

## Scope for this milestone

- Train patient risk prediction models.
- Generate patient risk scores.
- Build risk prediction dashboards.
- Develop readmission forecasting workflows.
- Generate forecasting reports.
- Build clinical insights modules.

## Evaluation criteria

- Patient risk prediction and readmission forecasting workflows implemented.
- Risk scoring and forecasting models functional.
- Clinical insights generated successfully.
- AI prediction models integrated.

---

## What I built

Implemented the end-to-end readmission prediction engine, clinical decision support (CDS) insight generator, and backend API integration for Member 2 (Readmission & Clinical Backend):

- `backend/app/services/cds_service.py`: Developed rule-based clinical insights engine that extracts primary contributing factors (prior utilization, hospital stay length, polypharmacy, poor glycemic control via HbA1c) and generates evidence-based intervention recommendations.
- `backend/app/services/risk_service.py`: Implemented calibrated readmission scoring (`compute_readmission_probability`) based on inpatient/emergency encounters, length of stay, and diagnostic complexity, mapping onto platform risk bands (`low`, `medium`, `high`) using project thresholds.
- `backend/app/schemas/prediction.py`: Extended `RiskPredictionRequest` and `RiskPredictionRead` Pydantic schemas to validate clinical encounter features and serialize risk categories, probability, and clinical insight arrays.
- `backend/app/api/v1/endpoints/risk.py`: Built fully functional, RBAC-guarded FastAPI endpoints:
  - `POST /api/v1/risk/predict`: Computes real-time probability, risk band, and clinical insights for an encounter.
  - `GET /api/v1/risk/high-risk`: Queries and evaluates the high-risk patient cohort.
  - `GET /api/v1/risk/forecast`: Generates horizon-based hospital readmission projections and volume rates.
- `backend/tests/test_risk_service.py`: Added automated test suites validating probability boundary conditions, risk banding transitions, and clinical insights generation.

## How to run it

From a clean clone:

```bash
git clone [https://github.com/GKSJ-AI-CliniScan/HealthForecastAI.git](https://github.com/GKSJ-AI-CliniScan/HealthForecastAI.git)
cd HealthForecastAI
git checkout intern/25-v-naga-phanendra

# 1. Setup backend environment
cd backend
python -m venv .venv
.\.venv\Scripts\activate  # On Linux/macOS: source .venv/bin/activate
pip install -r requirements.txt

# 2. Run backend automated test suite
python -m pytest

# 3. Start local FastAPI development server
uvicorn app.main:app --reload --port 8000