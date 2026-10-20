# Milestone 2 report - Week 3 & 4 - Risk Prediction & Readmission Forecasting

- **Intern name:** Raniya Raseen M M
- **Branch:** `intern/18-raniya-raseen-m-m`
- **Submitted on:** 2026-10-20

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

Two parts: the machine-learning pipeline in `ml/` (my earlier work, deployed on Render) and the risk features of the platform backend.

**ML pipeline and deployed API (`ml/src`)**

- **Training:** `models/train_model.py` splits the feature-engineered data 80/20 (stratified, `random_state=42`) and trains a Random Forest (100 trees, `class_weight="balanced"`). It prints accuracy, precision, recall, F1 and ROC-AUC.
- **Risk scores:** `models/generate_risk_scores.py` uses 5-fold cross-validated probabilities, so each patient's score comes from a model that did not see that patient, then bands patients Low (bottom 50%), Medium (next 30%) and High (top 20%).
- **Final model and API:** `models/save_model.py` trains a smaller Random Forest (30 trees, depth 10) and `app.py` serves it as a FastAPI service, deployed at https://healthforecastai.onrender.com (docs at `/docs`). `POST /predict-risk` returns a score and a Low/Medium/High category.

**Platform backend (`backend/app`)**

- **Risk scoring** (`services/model_service.py`, `endpoints/risk.py`): `POST /risk/predict` scores one admission. The platform ships a transparent baseline (a logistic score over the same admission features: length of stay, medications, lab procedures, diagnoses, prior inpatient and emergency visits, age). If `risk_model.pkl` and `feature_columns.pkl` from `ml/src/models/save_model.py` are placed in `MODEL_ARTIFACT_DIR`, the trained Random Forest is used instead.
- **High risk cohort:** `GET /risk/high-risk` lists patients above the high threshold (0.70), riskiest first. A doctor sees only their own patients.
- **Readmission forecasting:** `GET /risk/forecast?horizon_days=` and `/risk/forecast/departments` give expected readmissions and rate for the visible cohort and per department.
- **Clinical insights** (`services/cds_service.py`, `endpoints/clinical_support.py`): `GET /clinical-support/recommendations/{id}` turns the top risk drivers into care advice and a follow-up date. `GET /clinical-support/discharge-plan/{id}` gives discharge readiness and mitigation steps.
- **Model information** (`endpoints/ml_models.py`): active model, and the five evaluation metrics of the offline Random Forest (system administrator only).
- **Dashboard:** high risk list and forecast panels in `frontend/src/components/dashboard/Dashboard.tsx`.

## How to run it

The dataset is not committed (see `ml/data/README.md`). Download `diabetic_data.csv` into `ml/data/processed/`, then:

```bash
pip install -r ml/requirements.txt
cd ml/data/processed
python ../../src/features/preprocess.py
python ../../src/features/feature_engineering.py
python ../../src/models/train_model.py      # prints the metrics below
cd ../../src/models
python save_model.py                         # writes risk_model.pkl (not committed)
```

Platform backend:

```bash
git clone https://github.com/GKSJ-AI-CliniScan/HealthForecastAI
cd HealthForecastAI
git checkout intern/18-raniya-raseen-m-m
cd backend
pip install -r requirements.txt -r requirements-dev.txt
uvicorn app.main:app --reload     # open http://localhost:8000/docs
```


## Evidence

Terminal output of `train_model.py` on the held-out 20% of the data (20,049 patients):

```
Training set size: (80195, 101)
Test set size: (20049, 101)

--- Model Performance ---
Accuracy: 0.6341
Precision: 0.6120
Recall: 0.5734
F1-score: 0.5921
ROC-AUC: 0.6821
```

The ML API is live at https://healthforecastai.onrender.com/docs.

Running the platform's risk services directly on the 120 seeded synthetic patients gave: 15 high, 52 medium and 53 low risk patients; a 30-day forecast of 56 expected readmissions (rate 0.466) and 112 over 60 days; doctor 1 has 8 high risk patients. A high risk admission (12 days, 35 medications, 3 prior inpatient visits) scores 0.93 and a low risk one scores 0.09.

## Metrics

Random Forest (100 trees, balanced class weights), 20,049 held-out patients, class 1 ("readmitted") positive:

| Metric | Value |
|---|---|
| Accuracy | 0.634 |
| Precision | 0.612 |
| Recall | 0.573 |
| F1 | 0.592 |
| ROC-AUC | 0.682 |

I trained one model type only, so there is no model comparison. The model ranks patients better than chance (ROC-AUC 0.68) but is wrong for about 4 in 10 patients, so it supports prioritising follow-up and must not make clinical decisions on its own. Platform tests for this milestone: 11 (`test_risk_api.py`, `test_risk_service.py`). Endpoints: 9.

## Known gaps

- **Target definition.** My label is 1 if a patient was readmitted at any time (`<30` or `>30`), not within 30 days as in the brief. About 46% are positive, not roughly 11%, so these metrics are not comparable with 30-day results.
- **The served model is not the evaluated model.** The metrics are for the 100-tree model. The deployed API serves a smaller 30-tree model trained on all rows with no held-out score. The platform backend serves the logistic baseline unless the model files are installed, and the baseline has not been validated against real outcomes. Its weights were set by hand.
- **Possible data leakage.** The same patient can appear several times and I split by row, not by patient, so the scores may be slightly optimistic.
- **Forecast is not a time series.** The forecast scales each patient's risk by horizon length; it is not a trained forecasting model.
- **Fixed thresholds.** The cut-offs (0.48 and 0.62 in the ML API, 0.40 and 0.70 in the platform) are hard-coded and not calibrated against clinical outcomes.
- **Model files are not in the repository.** The repository rules do not allow model files, so `risk_model.pkl` and `feature_columns.pkl` are rebuilt with `save_model.py`. The live Render API needs these files, so it is deployed separately from this branch.
- **Clinical advice is rule based** and generic. A clinician must review it.
- **Not run before submission:** the backend tests and `npm run build` were not run on my machine. The CI result is the evidence.
