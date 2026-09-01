<<<<<<< HEAD
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
=======
# 🧠 HealthForecast AI — Machine Learning & Dataset Pipeline (Milestone 1)

This module handles the ingestion, cleaning, and preprocessing of the **Diabetes 130-US Hospitals Dataset** (1999–2008) from the UCI Machine Learning Repository, representing **101,766 encounters** across 130 US hospitals.

---

## 📊 Dataset Overview

* **Source:** UCI Machine Learning Repository (Diabetes 130-US Hospitals)
* **Total Encounters:** 101,766
* **Unique Patients:** 71,518
* **Raw Attributes:** 50
* **Target Variable:** `readmitted` (`<30` days = 1, `>30`/`NO` = 0)

---

## 🧹 Preprocessing & Feature Engineering Steps

1. **Missing Data Handling:**
   * Handled high-missing attributes (`weight`, `payer_code`, `medical_specialty`).
   * Filtered invalid or missing diagnostic identifiers.
2. **ICD-9 Diagnostic Grouping:**
   * Mapped raw ICD-9 codes into standardized clinical categories:
     * `Circulatory (390-459, 785)`: Heart failure, CAD, hypertension.
     * `Respiratory (460-519, 786)`: COPD, asthma, pneumonia.
     * `Digestive (520-579, 787)`: Pancreatitis, GI bleeding.
     * `Diabetes Mellitus (250.xx)`: Type 1 & 2 diabetes, DKA, hyperosmolarity.
     * `Genitourinary (580-629, 788)`: Acute & chronic kidney diseases.
     * `Neoplasms (140-239)`: Malignancies and tumors.
     * `Musculoskeletal & Injury`.
3. **Medication Dosage Encoding:**
   * Categorized 11+ diabetic medications (`metformin`, `insulin`, `glipizide`, etc.) as:
     * `0`: No
     * `1`: Steady
     * `2`: Up (Increased dosage)
     * `3`: Down (Decreased dosage)
4. **Target Binarization:**
   * Binary classification for high-risk 30-day early hospital readmission (`1` vs `0`).

---

## 🚀 Running the Preprocessing Pipeline

Run with Python 3:

```bash
python ml/preprocess.py
```

### Generated Artifacts:
* `ml/diabetes_cleaned_sample.json`: Preprocessed feature records ready for ingestion and model training.
* `ml/dataset_summary.json`: Detailed cohort statistics and schema metadata.
>>>>>>> d6aaceb (6th commit)
