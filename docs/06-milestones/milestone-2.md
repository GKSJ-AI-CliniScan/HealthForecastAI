# Milestone 2 report - Week 3 & 4 - Risk Prediction & Readmission Forecasting

> **How to use this file**
> 1. Fill in every section below. Keep all five headings, even if an answer is short.
> 2. Delete the `_Not started_` line once you begin - that line is what tells CI
>    the report is still a blank template.
> 3. Commit it on your own branch. Do not open a pull request to `main`.

_Not started_

- **Intern name:** Mujahad Ahmed
- **Branch:** `intern/07-mujahad-ahmed`
- **Submitted on:** 16sept2026

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

Wired `/predict`, `/high-risk`, and `/forecast` to a real trained model instead of
placeholders (`risk_service.py`, `model_service.py`, `risk.py`). `model_service.py`
loads and caches the trained pipeline and its metrics from `MODEL_ARTIFACT_DIR`.
`risk_service.score_admission()` looks up the patient's demographics by
`patient_id` and combines them with the admission's clinical fields to build the
feature row the model expects.

I also found and fixed a real design gap: the ML config (`config.yaml`) was set up
to train on ~45 raw dataset columns, but `RiskPredictionRequest` only carries the
~9 fields the API/DB can actually supply. A `ColumnTransformer` fit on the full
column set throws `KeyError` on any real request. I narrowed `config.yaml`'s
`drop_columns` so training matches what's actually available at inference time.

Generated my own Alembic migration (`alembic revision --autogenerate`) since none
existed on this branch — `patients`, `admissions`, `users`, `risk_predictions`, etc.
now exist as real tables.

## How to run it

```bash
git clone <repo-url>
git checkout intern/07-mujahad-ahmed

# Database
cd backend
cp .env.example .env   # set SECRET_KEY and MODEL_ARTIFACT_DIR=../ml/artifacts
alembic upgrade head
uvicorn app.main:app --reload

# Model (separate terminal)
cd ml
python -m venv venv
venv\Scripts\activate
pip install -r requirements-dev.txt
# download dataset - see data/README.md (note: the URL in that file has a typo,
# missing two hyphens - see "Known gaps" below)
python -m src.models.train --config configs/config.yaml
```

## Evidence

Training output (see Metrics below). Example request:

`POST /api/v1/risk/predict` with a valid `patient_id` and admission fields
returns a `RiskPredictionRead` with `readmission_probability`, `risk_category`,
and persists the result to `risk_predictions`.

## Metrics

Trained on Diabetes 130-US Hospitals, three models per `config.yaml`:

| Model | Accuracy | Precision | Recall | F1 | ROC-AUC |
|---|---|---|---|---|---|
| Logistic Regression | 0.679 | 0.174 | 0.494 | 0.258 | 0.639 |
| Random Forest | 0.689 | 0.176 | 0.477 | 0.258 | 0.638 |
| XGBoost | 0.887 | 0.528 | 0.012 | 0.024 | 0.633 |

Best model: **logistic regression** (highest ROC-AUC). **Not promoted** — misses
the 0.65 ROC-AUC threshold (0.639) and 0.50 recall threshold (0.494), close but
under. XGBoost's headline accuracy (0.887) is the misleading-accuracy trap the
guide warns about — its recall (0.012) means it almost never catches a true
readmission.

## Known gaps

- Model does not clear the promotion threshold (ROC-AUC 0.639 vs 0.65 required).
  Likely cause: I had to drop ~30 raw feature columns (diagnoses codes,
  admission_type_id, discharge_disposition_id, all medication columns) from
  training to match what the API/DB schema can supply at inference time — several
  of those are known strong readmission predictors. Next step: reintroduce
  `admission_type`/`discharge_disposition` using `IDS_mapping.csv`, since both
  already exist as string fields on the `Admission` model.
- `ml/data/README.md`'s download URL has a typo (missing hyphens in
  `130-us`/`1999-2008`) that causes a silent 9-byte failed download — flagging
  for the mentor to fix upstream.
- No frontend UI built yet for any milestone.
- `/forecast`'s "per department" requirement from the brief isn't implementable —
  `Admission` has no department column.
- `model_version` on saved predictions is hardcoded to `"unversioned"` — real
  versioning is Milestone 4's model registry.