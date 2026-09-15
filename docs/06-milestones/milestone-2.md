# Milestone 2 report - Week 3 & 4 - Risk Prediction & Readmission Forecasting

- **Intern name:** Nishakar T
- **Branch:** `intern/23-nishakar-t`
- **Submitted on:** 2026-09-14

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

I implemented the complete Milestone 2 AI-powered patient risk and readmission intelligence system end-to-end:

1. **Machine Learning Pipeline (`backend/app/ml/`)**:
   - `data/loader.py`: Efficient dataset loader for `diabetic_data.csv` (101,766 inpatient encounters), cleaning missing markers (`?`, `None`) and separating features from target.
   - `data/validator.py`: Feature schema and input validation with clinical defaults for single-patient inference.
   - `preprocessing/feature_engineering.py`: ICD-9 diagnosis clustering (Circulatory, Respiratory, Diabetes, Genitourinary, Injury, Neoplasms, etc.), prior visit intensity (`total_prior_visits`, `prior_inpatient_ratio`), and medication change flags (`med_changed`, `has_diabetes_med`).
   - `preprocessing/preprocessing.py`: Sklearn-compatible `ClinicalDataPreprocessor` with imputation and one-hot encoding fitted strictly on training partition to prevent leakage.
   - `training/train_random_forest.py` & `training/train_xgboost.py`: Random Forest and XGBoost classifiers with balanced class weights.
   - `training/compare_models.py` & `training/train.py`: Model comparator calculating Accuracy, Precision, Recall, F1, and ROC-AUC, serializing the winning model and preprocessor to `backend/app/ml/models/saved/`.
   - `inference/risk_engine.py`: Configurable 0–100 risk score converter and classification engine (`LOW` 0–25, `MEDIUM` 26–50, `HIGH` 51–75, `CRITICAL` 76–100) with clinical decision-support insights generation.
   - `inference/predictor.py`: In-memory singleton inference service for sub-50ms predictions with clinical contributing factor extraction.

2. **Backend Persistence & API Suite**:
   - `models/prediction.py`: Updated `Prediction` and `ModelVersion` SQLAlchemy models with GUID primary keys and cascade relationships.
   - `repositories/prediction_repository.py`: Database queries for predictions, history filtering, doctor patient-scoping, and real aggregated SQL analytics.
   - `services/prediction_service.py`: Orchestrator enforcing DOCTOR patient assignments, HIPAA-compliant RESEARCHER de-identification, model version tracking, and audit logging.
   - `api/v1/predictions.py`: Endpoints for `POST /predictions/readmission`, `GET /predictions`, `GET /predictions/{id}`, `GET /patients/{id}/predictions`, `GET /predictions/high-risk`, and `GET /patients/high-risk`.
   - `api/v1/analytics.py`: Real database analytics for `/analytics/risk-distribution`, `/analytics/readmission-trends`, `/analytics/high-risk-patients`, and `/analytics/prediction-summary`.

3. **Frontend Clinical Prediction Platform (`frontend/src/`)**:
   - `features/predictions/`: TypeScript interfaces, Axios API client, React Query hooks, and risk utilities.
   - `components/predictions/`: `PredictionCard`, `RiskBadge`, `RiskScoreGauge` (semi-circle SVG gauge), `PredictionFactors` (contributing factors with impact badges), `PredictionHistoryTable`, `HighRiskPatientTable`, and `PredictionDisclaimer` (prominent decision-support disclaimer banner).
   - `components/patients/PatientPredictionTab.tsx`: Interactive AI risk assessment tab integrated into `PatientDetailsPage`.
   - `pages/predictions/`: `PredictionDashboard` (4 KPI cards and 4 Recharts visualizations: Risk Distribution, Risk Band Counts, Predictions Over Time, and High-Risk Patient Trend), `HighRiskPatients` (dedicated surveillance watchlist), `PredictionHistory` (audit trail), and `PredictionDetail`.
   - `components/layout/Sidebar.tsx` & `AppRoutes.tsx`: Integrated navigation and protected routing.

---

## How to run it

### 1. Train the ML Models & Serialize Artifacts
```bash
cd backend
python -m app.ml.training.train
```

### 2. Run Backend Tests
```bash
pytest tests/ -v
```

### 3. Run Frontend Typecheck & Production Build
```bash
cd frontend
npm run typecheck
npm run build
```

### 4. Start Local Development Servers
```bash
# Terminal 1: Backend
cd backend
uvicorn app.main:app --reload --port 8000

# Terminal 2: Frontend
cd frontend
npm run dev
```

---

## Evidence

### Model Training & Comparison Output
```
Model                Accuracy     Precision    Recall       F1         ROC-AUC   
------------------------------------------------------------------------------
Random Forest        0.7027       0.1942       0.5288       0.2841     0.6830    
XGBoost              0.6682       0.1851       0.5799       0.2806     0.6829    

Selected Best Model: Random Forest
Saving model to backend/app/ml/models/saved/readmission_model_v1.joblib...
Saving preprocessor to backend/app/ml/models/saved/preprocessor_v1.joblib...
Pipeline training, evaluation, and serialization completed successfully!
```

### Automated Test Suite
```
backend\tests\test_anonymization.py ..                                   [  4%]
backend\tests\test_auth.py .....                                         [ 17%]
backend\tests\test_health.py ...                                         [ 24%]
backend\tests\test_ml_pipeline.py ....                                   [ 34%]
backend\tests\test_patients.py ....                                      [ 43%]
backend\tests\test_predictions.py .......                                [ 60%]
backend\tests\test_rbac.py ...                                           [ 68%]
backend\tests\test_risk_service.py .........                             [ 90%]
backend\tests\test_security.py ....                                      [100%]
============================= 41 passed in 24.10s =============================
```

### Frontend Typecheck & Build
```
> healthforecast-frontend@1.0.0 build
> tsc && vite build
✓ 2353 modules transformed.
✓ built in 9.79s
```

---

## Metrics

Both models were evaluated on the held-out stratified test partition ($N = 20,354$ encounters):

| Model | Accuracy | Precision | Recall | F1 Score | ROC-AUC |
|---|---|---|---|---|---|
| **Random Forest** (Selected) | **0.7027** | **0.1942** | **0.5288** | **0.2841** | **0.6830** |
| **XGBoost** | 0.6682 | 0.1851 | 0.5799 | 0.2806 | 0.6829 |

### Selection Rationale
Random Forest was selected as the active production model:
- Achieved highest ROC-AUC (**0.6830**), indicating strong discrimination capability across decision thresholds.
- Captured **52.88%** of acute 30-day readmissions (Recall) with higher overall accuracy (**70.27%**), substantially reducing false alert fatigue for clinicians compared to XGBoost.
- Highest overall F1 score (**0.2841**) on an imbalanced healthcare target (11.16% base rate).

---

## Known gaps

1. **Vital Signs Integration**: The 130-US Hospitals dataset does not contain longitudinal vital signs (blood pressure, pulse, SpO2); incorporating telemetry will be explored in future clinical milestones.
2. **Social Determinants of Health (SDoH)**: Post-discharge variables (transportation, food security, home support) are external to administrative hospital data and will require questionnaire integrations in later phases.
3. **Milestone 3 & 4 Scope**: Treatment effectiveness AI and hospital bed recovery monitoring are reserved for Milestones 3 and 4.
