| `src/data/mappings.py`        | ICD-9 grouping and the dataset id lookups |
| `src/data/etl.py`             | Loads the cleaned dataset into PostgreSQL |
| `src/models/train.py`         | Training entrypoint and model selection |
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

# 1. download the dataset
curl -L -o data/raw/diabetic_data.csv https://archive.ics.uci.edu/static/public/296/data.csv

# 2. load it into PostgreSQL (Milestone 1)
python -m src.data.etl --truncate

# 3. train (Milestone 2)
python -m src.models.train --config configs/config.yaml
```

The ETL prints a report of what it did:

```json
{"raw_rows": 101766, "after_cleaning": {"rows": 69990, "positive_rate": 0.0898},
 "patients_written": 69990, "admissions_written": 69990}
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
