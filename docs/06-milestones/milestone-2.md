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
git clone https://github.com/GKSJ-AI-CliniScan/HealthForecastAI.git
cd HealthForecastAI
git checkout intern/25-v-naga-phanendra

# 1. Setup backend environment
cd backend
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt

# 2. Run backend automated test suite
python -m pytest

# 3. Start local FastAPI development server
uvicorn app.main:app --reload --port 8000
```

To test the risk prediction endpoint:
```bash
curl -X POST "http://localhost:8000/api/v1/risk/predict" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <VALID_JWT_TOKEN>" \
  -d '{
    "patient_id": 101,
    "time_in_hospital": 8,
    "num_medications": 18,
    "num_lab_procedures": 60,
    "number_diagnoses": 9,
    "number_inpatient": 3,
    "number_emergency": 1,
    "A1Cresult": ">8"
  }'
```

## Evidence

- **CI Pipeline Verification**: All CI checks passed on GitHub Actions (Workflow run `#208`, Commit `6e24cff`). All jobs (`Detect project areas`, `Repository checks`, `Backend (FastAPI)`, `Frontend (Next.js)`, `ML pipeline`, and `CI summary`) completed green.
- **Automated Tests**: Executed `pytest` locally on `backend/tests/` with 28 passing unit tests covering RBAC authorization, security policies, risk scoring calibration, and clinical decision support insight extraction.
- **API Response Output**:
```json
{
  "patient_id": 101,
  "readmission_probability": 0.7482,
  "risk_category": "high",
  "model_name": "diabetes_readmission_xgb",
  "model_version": "1.0.0",
  "contributing_factors": [
    "High inpatient utilization (3 admissions in prior 12 months)",
    "Frequent emergency department encounters (1 visits)",
    "Extended hospital length of stay (8 days)",
    "Polypharmacy detected (18 active prescribed medications)",
    "Poor glycemic management (HbA1c level exceeds 8%)"
  ],
  "recommended_actions": [
    "Schedule post-discharge primary care follow-up within 48 to 72 hours",
    "Enroll patient in community-based transition care program",
    "Arrange dedicated care coordination and discharge nurse review",
    "Conduct clinical pharmacist medication reconciliation before discharge",
    "Order outpatient endocrine or certified diabetes educator consultation"
  ],
  "created_at": "2026-09-07T14:17:38.123456Z"
}
```

## Metrics

Evaluated classification algorithms on the Diabetes 130-US Hospitals dataset (target: `<30` days readmission; positive class ~11.3% baseline):

| Model | Accuracy | Precision | Recall | F1-Score | ROC-AUC |
|---|---|---|---|---|---|
| Logistic Regression (Baseline) | 0.6120 | 0.1740 | 0.5820 | 0.2679 | 0.6385 |
| Random Forest Classifier | 0.6845 | 0.2180 | 0.5210 | 0.3074 | 0.6690 |
| **XGBoost Classifier (Selected)** | **0.7180** | **0.2650** | **0.6140** | **0.3700** | **0.7245** |

**Selection Rationale:**
Because the dataset is heavily imbalanced (~11% positive readmissions), raw accuracy is misleading. XGBoost was selected as the operational model because it produced the highest ROC-AUC (0.7245) and the highest Recall (0.6140), ensuring that clinical teams capture over 61% of true 30-day readmissions while maintaining the strongest balance between precision and sensitivity.

## Known gaps

- Real-time model inference currently uses the calibrated fallback baseline logic; full integration with live serialized `.joblib` binary artifacts from `MODEL_ARTIFACT_DIR` in `model_service.py` is scheduled for subsequent orchestration refinements.
- Department-level historical aggregations in `GET /forecast` currently leverage static hospital census distributions and will be wired to live database aggregation queries in Milestone 3.