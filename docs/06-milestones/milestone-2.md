# Milestone 2 report - Week 3 & 4 - Risk Prediction & Readmission Forecasting

> **How to use this file**
> 1. Fill in every section below. Keep all five headings, even if an answer is short.
> 2. Delete the `_Not started_` line once you begin - that line is what tells CI
>    the report is still a blank template.
> 3. Commit it on your own branch. Do not open a pull request to `main`.

- **Intern name:** Parimala M
- **Branch:** `intern/24-parimala-m`
- **Submitted on:** 2026-09-11

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

**ML pipeline** (`ml/`) — switched the modelling pipeline from the original India-dataset
prototype to the Diabetes 130-US Hospitals dataset named in the project brief, to align
with the teammate whose model code this branch integrates with:
- `ml/src/data/load_data.py`, `preprocess.py`, `ml/src/features/build_features.py` -
  cleaning, discharge-outcome filtering, and feature engineering for the US-130 dataset.
- `ml/src/models/train.py` - trains logistic regression, random forest, and XGBoost;
  selects the best model on a held-out validation set; calibrates it (sigmoid) on a
  separate calibration set; evaluates once on an untouched test set.
- `ml/src/evaluation/calibration.py`, `metrics.py` - added `calibrate_model` and
  `find_best_threshold` (best-F1 threshold subject to a recall floor).
- `ml/scripts/analyze_thresholds.py` - added to inspect the calibrated model's actual
  predicted-probability distribution on the test set, used to set risk-category bands
  (see Known gaps / Metrics).
- Removed `ml/scripts/verify_preprocess.py` - it verified the old India-dataset
  pipeline (`load_raw_tables`, `merge_admission_features`) which no longer exists.

**Backend** (`backend/`):
- `app/services/model_service.py` - loads the calibrated model artifact, builds the
  model input row from the API payload, returns a probability.
- `app/services/risk_service.py` - `categorise_risk`, `score_and_save`
  (predict + persist to `risk_predictions`), `_latest_predictions` (shared
  latest-per-patient query), `get_high_risk_patients` (role-scoped: doctors see
  only their assigned patients, hospital_admin/system_admin see hospital-wide),
  `get_readmission_forecast` (aggregates latest scores into a horizon-scaled rate).
- `app/api/v1/endpoints/risk.py` - wired `POST /risk/predict`, `GET /risk/high-risk`,
  `GET /risk/forecast` to the service layer above.
- `app/schemas/prediction.py` - tightened input validation: `time_in_hospital`
  constrained to 1-14 days (the real dataset's range, not the original 1-365), and
  `age_group` constrained to a `Literal` of the dataset's actual ten-year buckets
  (e.g. `"[70-80)"`), replacing an unvalidated free-text field.
- `app/core/config.py` - `RISK_THRESHOLD_MEDIUM`/`RISK_THRESHOLD_HIGH` changed from
  arbitrary defaults (0.40/0.70) to values derived from the calibrated model's real
  test-set score distribution (see Metrics).
- `backend/tests/test_risk_service.py` - updated to assert against the *configured*
  thresholds rather than hardcoded values, so the test verifies banding behaviour
  independent of the specific threshold numbers chosen.


## How to run it

```bash
git clone <repo-url>
git checkout intern/24-parimala-m

# ML - train and calibrate the model (requires diabetic_data.csv in ml/data/raw/,
# see ml/data/README.md for the download link - not committed to git)
cd ml
pip install -r requirements.txt
python -m src.models.train --config configs/config.yaml

# Backend
cd ../backend
pip install -r requirements-dev.txt
uvicorn app.main:app --reload
# Swagger UI: http://127.0.0.1:8000/docs


## Evidence

- `POST /risk/predict` returns a calibrated probability, risk category, model name/
  version, and persists to `risk_predictions` (see Swagger screenshot,
  `docs/05-wireframes/predict-response.png`).
- `GET /risk/forecast?horizon_days=30` vs `?horizon_days=60` - `predicted_rate` and
  `predicted_readmissions` scale linearly with horizon, confirmed manually.
- `GET /risk/high-risk` returns `[]` when no patient exceeds the threshold, and
  returns the correct patient once one is scored above it.
- Role scoping on `/risk/high-risk` confirmed manually: `doctor1@healthforecast.ai`
  returns only that doctor's assigned patients; `admin2@healthforecast.ai`
  (hospital_admin) returns the full hospital list.

_Add actual screenshot files here and reference them, e.g.
`![predict response](../05-wireframes/predict-response.png)`._

## Metrics

All models evaluated on the held-out validation set; XGBoost selected and promoted.

| Model | Accuracy | Precision | Recall | F1 | ROC-AUC |
|---|---|---|---|---|---|
| Logistic Regression | 0.667 | 0.174 | 0.513 | 0.260 | 0.645 |
| Random Forest | 0.672 | 0.177 | 0.515 | 0.263 | 0.650 |
| XGBoost (selected) | 0.668 | 0.180 | 0.541 | 0.271 | 0.659 |

**Calibrated XGBoost, final test set (untouched until this point):**
Accuracy 0.677, Precision 0.186, Recall 0.544, F1 0.277, **ROC-AUC 0.669**
(promotion thresholds: ROC-AUC ≥ 0.65, recall ≥ 0.50 - both cleared).

Accuracy is not a meaningful headline metric here: the test set's base readmission
rate is 11.4%, so a model that always predicts "not readmitted" would score ~89%
accuracy while catching zero true positives. ROC-AUC and recall are the metrics
that matter for this problem.

**Risk category thresholds** were derived empirically rather than fixed arbitrarily,
because the calibrated model's probabilities are tightly clustered (99th percentile
of all test patients is only 0.399; 90th percentile among patients who were actually
readmitted is 0.262). Fixed defaults of medium=0.40/high=0.70 would have left the
`"high"` category permanently empty. Final thresholds, from the test-set percentile
analysis (`ml/scripts/analyze_thresholds.py`):
- `RISK_THRESHOLD_MEDIUM = 0.12` (≈ 75th percentile of all patients)
- `RISK_THRESHOLD_HIGH = 0.21` (≈ 95th percentile of all patients)

## Known gaps

- **Analytics dashboards (`analytics/*`) and Clinical Decision Support
  (`clinical_support.py`)** are explicitly out of scope for this milestone -
  both are marked `TODO(milestone-3)` in the existing codebase.
- **Forecasting is a linear scaling of the model's 30-day probability**, not a true
  time-series forecast - the model was only ever trained to predict readmission
  within a 30-day window, so horizons other than 30 days are an approximation.
  Documented in `get_readmission_forecast`'s docstring.
- **Only 8 of the features the model was trained on are exposed via the API**
  (`time_in_hospital`, `num_medications`, `num_lab_procedures`, `number_diagnoses`,
  `number_inpatient`, `number_emergency`, `age_group`, plus a derived
  `prior_visits_total`). The remainder (race, admission type, diagnosis codes,
  specific medication flags, A1C results, etc.) are imputed at prediction time.
  This bounds how far any single input can move the predicted probability.
- **Frontend auth token is stored in `sessionStorage`**, not an httpOnly cookie -
  the backend does not currently set one. Acceptable for this milestone's demo but
  not production-appropriate; flagged in `auth-context.tsx`.
- **The "clinical insights" scope line** is interpreted narrowly here as
  human-readable risk-factor explanations (not yet implemented - planned as a small
  rule-based addition to `/risk/predict`'s response), rather than the full Clinical
  Decision Support module (care recommendations, discharge planning), which belongs
  to a later milestone.
