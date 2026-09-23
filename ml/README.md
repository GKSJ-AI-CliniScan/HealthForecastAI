# HealthForecast AI - Machine Learning

Readmission risk modelling: data loading, preprocessing, feature engineering,
training, evaluation and inference.

## Layout

| Path                          | Responsibility |
|-------------------------------|----------------|
| `configs/config.yaml`         | Single source of truth for every experiment - both dataset profiles |
| `src/data/load_data.py`       | Raw CSV loading and target binarisation (risk + readmission) |
| `src/data/validate.py`        | Row-level schema/plausibility validation |
| `src/data/preprocess.py`      | Leakage-safe cleaning, dedup, column selection |
| `src/features/build_features.py` | Feature engineering + the `ColumnTransformer` pickled with the model |
| `src/models/train.py`         | Training entrypoint, split, model selection, imbalance handling |
| `src/models/predict.py`       | Batch and single-record inference |
| `src/evaluation/metrics.py`   | Accuracy, precision, recall, F1, ROC-AUC, risk banding |
| `notebooks/`                  | Exploration only - strip outputs before committing |
| `data/`                       | Never committed. See `data/README.md` |
| `artifacts/`                  | Never committed. Trained models and metrics |

## Run

```bash
cd ml
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements-dev.txt

# 1. download the dataset (see data/README.md - India Hospital Readmission is
#    primary; Diabetes 130-US is a working fallback if you don't have it yet)
# 2. train both the risk model and the 30-day readmission model
python -m src.models.train --config configs/config.yaml

# train just one flow, or against the fallback dataset:
python -m src.models.train --target risk
python -m src.models.train --dataset diabetes_130_us
```

Training writes one artefact and one metrics file per target -
`artifacts/risk_model.joblib` / `artifacts/risk_metrics.json` and
`artifacts/readmission_model.joblib` / `artifacts/readmission_metrics.json` -
and exits non-zero if either winning model misses the promotion thresholds in
`configs/config.yaml`. Each metrics file is shaped for direct mapping onto a
`model_metadata` row (`docs/niyati/HealthForecastAI_Milestone2_Design.md`
section 3.1): `metrics.{accuracy,precision,recall,f1,roc_auc}`, `best_model`,
`trained_at`.

## Checks that CI runs

```bash
ruff check .
black --check .
pytest
```

## Rules

- Change hyperparameters in `configs/config.yaml`, never inline in a script.
- Report all five metrics. The target is imbalanced (roughly 11% positives), so
  accuracy on its own hides a model that predicts "no readmission" every time.
- A false negative - a high-risk patient discharged without follow-up - is the
  expensive error here. Watch recall, not just ROC-AUC.
- `tests/test_metrics.py` pins the risk bands to the backend. If you change a
  threshold, change it in `configs/config.yaml`, `backend/app/core/config.py`
  and `.env.example` together.
