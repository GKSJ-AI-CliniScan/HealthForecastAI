# Milestone 2 report - Week 3 & 4 - Risk Prediction & Readmission Forecasting

- **Intern name:** Niyati R
- **Branch:** `intern/19-niyati-r`
- **Submitted on:** Not recorded. The work was committed on 2026-09-23 (commits `1b384fd`, `7a6ab70`, `d4a0ecc`) and revised on 2026-10-09 to 2026-10-12. This report was completed on 2026-10-12; the submission date is for the intern to set when the branch is sent to the mentor.

> **Important.** Everything described here is an **experimental model
> pipeline**. The scores are rankings from logistic regression models trained
> with class weighting on a public research dataset. They are **not calibrated
> probabilities**, they have **not been clinically validated**, and one stated
> target in the SRS is **not met** (see Metrics and Known gaps).

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

### Where each criterion stands

| Criterion | Status | Basis |
|---|---|---|
| Risk and readmission workflows implemented | Met | `POST /risk/predict`, `POST /risk/readmission`, `GET /risk/*`; stored history in `risk_predictions` |
| Models functional | Met, at modest accuracy | Two models trained and registered; metrics below; backend tests pass |
| Clinical insights generated | Met, rule based | `GET /clinical-support/*`; deterministic rules, unvalidated |
| AI models integrated | Met | Verified loading from the registry, feature builder, banding, audit logging |

| Scope item | Status |
|---|---|
| Train risk prediction models | Done (three candidates per target; one selected) |
| Generate patient risk scores | Done (on demand, stored, append only) |
| Risk prediction dashboards | Done: overview and patient detail pages (high-risk list, forecast card, risk history) |
| Readmission forecasting workflows | Done: per-admission forecast and an aggregate count |
| Forecasting reports | Partly: the `readmission_analytics` and `risk_distribution` report types (CSV, XLSX, PDF); there is no separate forecast document |
| Clinical insights module | Done, rule based |

---

## What I built

**Datasets and preparation.** The models use the **India Hospital Readmission
(2015 to 2024)** relational export (`patients.csv`, `admissions.csv`,
`diagnoses.csv`; 86,400 patients, 120,000 admissions after joining, none
orphaned). The files are not committed; their sha256 values and row counts are
recorded in the metrics files. Rows pass validation first, then preprocessing
removes in-hospital deaths and hospice discharges (`ml/src/data/preprocess.py`)
because those patients cannot be readmitted. The brief names the Diabetes
130-US dataset; its profile still works as a fallback, but no model was trained
on it for this report.

**Two models, one pipeline** (`ml/src/`):

| Model | Target | Training rows |
|---|---|---|
| `risk` | In-hospital death **or** 30-day readmission (the broadest adverse-outcome signal in the export). `discharge_type` is part of the label, so it is not a feature. | 84,000 |
| `readmission` | 30-day readmission after a live discharge (the export's own flag); in-hospital deaths are excluded (7,413 rows) so the model cannot learn that death means "no readmission". | 78,811 |

**Features.** Eight for `risk`; nine for `readmission` (which adds
`discharge_type`): age, gender, diagnosis, length of stay, admission type,
number of diagnoses and two engineered history features
(`prior_admission_count`, `days_since_last_discharge`). The backend's
`feature_builder.py` imports the same column contract so training and serving
cannot drift.

**Method.** A **temporal split** (train 2015 to January 2022, validation 2022,
test from late December 2022 to 2024), class weighting for the imbalance, and
three candidates per target: logistic regression, random forest and XGBoost.
The winner is chosen by validation ROC-AUC. A run is promoted only if it clears
the gate in `ml/configs/config.yaml` (ROC-AUC at least 0.65 and recall at least
0.50). Every run is saved write-once under `ml/artifacts/runs/<target>/<version>/`
with its sha256, so a failed run never overwrites a promoted model.
Calibration is available in code (`ml/src/models/calibrate.py`) but is switched
off (`calibration.method: none`).

**Registry and serving** (`backend/`): `scripts/register_model.py` checks the
run's provenance, target, sha256 and compatibility before registering it as the
production model; `ModelLoader` verifies the sha256 again before loading;
`RiskService` and `ReadmissionService` build the feature row from PostgreSQL,
call `predict_proba`, band the score at **0.40 and 0.70** (low, medium, high;
`categorise_risk`) and store it with the model name and version and an audit
record. `GET /models` and related routes expose the registry to system
administrators.

**Clinical insights.** `cds_service.py` maps the latest stored prediction (and
the most recent admission) to a fixed recommendation library, with no language
model and no external call. Output is labelled as unvalidated and needing
clinician review.

**Dashboards.** The overview shows, for roles that may, an aggregate forecast
and a high-risk patient list. The patient page shows the risk score and the
30-day forecast on a band scale, recommendations, discharge readiness and a
risk-history chart with the 0.40 and 0.70 zones. All of it carries the
experimental-status notice and score captions. Prediction-safety changes
(2026-10-10 to 10-12) removed "% probability" and "Confidence" wording, relabelled
chart series as experimental scores and added the captions; they are in commits
`d9f4b2c` and `ba7f690`.

**Tests.** `test_risk_endpoints.py`, `test_ml_services.py`,
`test_model_metadata.py`, `test_register_model.py`,
`test_risk_predictions_schema.py`, `test_cds_endpoints.py`, the ML suite
(`test_train_pipeline.py`, `test_artifacts.py`, `test_metrics.py`,
`test_calibrate.py` and others) and the frontend tests for the dashboard and
patient page.

## How to run it

```bash
git clone https://github.com/GKSJ-AI-CliniScan/HealthForecastAI.git
cd HealthForecastAI
git checkout intern/19-niyati-r

# Data (not committed): follow ml/data/README.md, then:
cd ml
python -m venv .venv && source .venv/bin/activate     # Windows: .venv\Scripts\activate
pip install -r requirements-dev.txt
python -m src.models.train --config configs/config.yaml   # trains risk and readmission

# Backend: schema and registration
cd ../backend
pip install -r requirements-dev.txt
alembic upgrade head
cd ..
python scripts/register_model.py risk
python scripts/register_model.py readmission

# Serve
cd backend && uvicorn app.main:app --reload             # http://localhost:8000/docs
cd frontend && npm install && npm run dev                # http://localhost:3000
```

Training takes a real dataset; the ML tests (`cd ml && pytest`) run on synthetic
fixtures and need no data. See [`docs/08-deployment`](../08-deployment/README.md)
for environment variables and
[`docs/03-api`](../03-api/README.md#risk-and-readmission-forecasting---apiv1risk)
for the endpoints.

## Evidence

| Evidence | Where | Status |
|---|---|---|
| Training run, 2026-10-09 | `ml/artifacts/risk_metrics.json`, `readmission_metrics.json` (not committed; local files) | Executed; values below are read from them |
| Registry state | A development database holds four `model_metadata` rows: `risk` and `readmission` each with one **production** version (trained 2026-10-09) and one **retired** version (trained 2026-10-08) | Read-only check, 2026-10-12 |
| 174 stored predictions in that database (risk: 27 high, 67 medium, 10 low; readmission: 11 high, 49 medium, 10 low) | `risk_predictions` | Read-only counts; these show the pipeline ran, not that the predictions are accurate |
| Test results at commit `7b99155` | Backend 579 passed, 33 skipped; ML 148 passed; frontend 222 passed | Executed 2026-10-12 |
| Endpoint contract | [`docs/03-api`](../03-api/README.md), `docs/03-api/openapi.json` | Generated from the application |
| Screens | [`docs/05-wireframes`](../05-wireframes/README.md) (wireframes of the finished screens; no browser screenshots are committed) | Retrospective |
| Pipeline diagrams | [`docs/01-architecture`](../01-architecture/README.md) | |

No patient data appears in this report.

## Metrics

All five required metrics, for **every model trained**. Decision threshold for
these figures is a fixed 0.5. "Validation" is the 2022 validation split;
"Test" is the held-out test split, reported only for the selected model.

### Risk model (death or 30-day readmission)

| Model | Split | Accuracy | Precision | Recall | F1 | ROC-AUC |
|---|---|---|---|---|---|---|
| Logistic regression (**selected**) | Validation | 0.629 | 0.262 | 0.575 | 0.360 | 0.649 |
| Random forest | Validation | 0.688 | 0.282 | 0.467 | 0.351 | 0.644 |
| XGBoost | Validation | 0.682 | 0.275 | 0.460 | 0.345 | 0.630 |
| Logistic regression (**selected**) | **Test** | **0.637** | **0.269** | **0.592** | **0.370** | **0.656** |

Test confusion matrix (24,000 rows): 12,748 true negatives, 6,942 false
positives, 1,759 false negatives, 2,551 true positives. Positives were 18% of
training rows.

### 30-day readmission model

| Model | Split | Accuracy | Precision | Recall | F1 | ROC-AUC |
|---|---|---|---|---|---|---|
| Logistic regression (**selected**) | Validation | 0.680 | 0.235 | 0.651 | 0.346 | 0.726 |
| Random forest | Validation | 0.721 | 0.248 | 0.564 | 0.344 | 0.717 |
| XGBoost | Validation | 0.719 | 0.244 | 0.557 | 0.339 | 0.707 |
| Logistic regression (**selected**) | **Test** | **0.687** | **0.237** | **0.669** | **0.350** | **0.741** |

Test confusion matrix (22,517 rows): 13,586 true negatives, 6,102 false
positives, 935 false negatives, 1,894 true positives. Positives were 12.6% of
training rows.

**Which model won and why.** Logistic regression won for both targets on
validation ROC-AUC (the configured primary metric), narrowly ahead of random
forest and XGBoost. The Database and ML design documents had planned XGBoost
as primary; that plan was not borne out by the data. Accuracy alone is not a
useful measure here because most encounters are negatives.

**Reading the numbers.**
- Precision is low (about 24 to 27%): most flagged patients are not
  later readmitted. Recall is moderate (about 59 to 67%).
- Both figures pass the code's promotion gate (ROC-AUC 0.65, recall 0.50), but
  the risk model clears the AUC gate narrowly (0.656).

## Known gaps

1. **The SRS target is not met.** The SRS asks for a readmission ROC-AUC of at
   least 0.75; the test result is **0.741**. The SRS also asks for an F1 of at
   least 0.70 for the high-risk tier; that figure was **not measured** (the F1
   above is for the overall positive class and is 0.35 to 0.37). These are SRS
   success criteria, which are a draft for mentor review and not brief
   requirements; the mentor has not accepted or waived them.
2. **Scores are not probabilities.** Class weighting inflates stated values and
   calibration is off. A score of 0.70 does not mean a 70% chance. The
   interface and the API say so wherever a score appears.
3. **No clinical validation.** The models were trained and tested on a public
   research dataset. They have not been evaluated on hospital data, reviewed
   clinically, or approved for patient care. Whether any of the dataset is
   synthetic is not established in the repository.
4. **Evaluation caveats.** The split is temporal, but the same patients can appear
   in both training and test periods (an offline check outside the repository
   counted 11,888 such patients in the readmission test set; that figure has not
   been re-verified here), which can flatter the test score. The 0.40 and
   0.70 band cut-offs are fixed conventions, not validated thresholds, and the
   0.50 decision threshold is fixed rather than tuned.
5. **An earlier training run looked better and was retired.** The registry holds a
   retired `risk` version (trained 2026-10-08) with ROC-AUC 0.819 and a retired
   `readmission` version with 0.724. The current `risk` model excludes
   `discharge_type` because it is part of the outcome definition; that is the
   likely reason for the lower figure, but the earlier configuration is not
   documented in the repository, so this is an inference.
6. **Outcome feedback is not implemented.** Actual readmission outcomes are not
   recorded against predictions (`actual_readmitted` is never written), so the
   models cannot be monitored for drift or retrained from feedback. No drift
   monitoring exists.
7. **TensorFlow** is listed in `ml/requirements.txt` but no code uses it.
8. **Forecast reporting is limited.** There is no dedicated forecast report;
   the aggregate forecast counts scored patients at or above a fixed 0.50 and is
   not a hospital-wide projection.
9. **Open decisions for the mentor:** whether the India export (not Diabetes
   130-US) is the accepted dataset; whether the SRS targets should be kept,
   waived or restated; and whether MongoDB stays in the architecture (it is
   unused).
