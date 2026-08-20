# HealthForecast AI - Machine Learning

Readmission risk modelling: data loading, preprocessing, feature engineering,
training, evaluation and inference.

## Layout

| Path                          | Responsibility |
|-------------------------------|----------------|
| `configs/config.yaml`         | Single source of truth for every experiment |
| `src/data/load_data.py`       | Raw CSV loading and target binarisation |
| `src/data/preprocess.py`      | Cleaning and column selection |
| `src/features/build_features.py` | The `ColumnTransformer` pickled with the model |
| `src/models/train.py`         | Training entrypoint and model selection |
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

# 1. download the dataset (see data/README.md)
# 2. train
python -m src.models.train --config configs/config.yaml
```

Training writes `artifacts/readmission_model.joblib` and `artifacts/metrics.json`,
and exits non-zero if the winning model misses the promotion thresholds in
`configs/config.yaml`.

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
