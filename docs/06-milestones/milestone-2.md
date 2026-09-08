# Milestone 2 report - Week 3 & 4 - Risk Prediction & Readmission Forecasting

- **Intern name:** Rachana
- **Branch:** `intern/rachana`
- **Submitted on:** 2026-09-03

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

- Engineered domain-specific clinical features (`ml/src/features/build_features.py`): prior healthcare utilization counts, polypharmacy indicator (>= 10 medications), medication dosage change flags, and inpatient stay duration flags.
- Built data preprocessing module (`ml/src/data/preprocess.py`) handling missing values (`?`), removing non-predictive identifiers, and separating numerical and categorical feature pipelines.
- Implemented and trained 3 machine learning models (`ml/src/models/train.py`): Logistic Regression baseline, Random Forest Classifier, and XGBoost Classifier with class-imbalance weighting (`scale_pos_weight=8.0`).
- Evaluated models across Accuracy, Precision, Recall, F1-score, and ROC-AUC metrics.
- Persisted and promoted the winning model artifact (`ml/artifacts/best_model.joblib`).

---

## How to run it

```bash
# 1. Switch to feature branch
git checkout intern/rachana

# 2. Install ML dependencies
pip install pandas scikit-learn xgboost joblib pyyaml

# 3. Train all models and export winning artifact
cd ml
python -m src.models.train --config configs/config.yaml
```

---

## Evidence

### Model Training Terminal Output:
```text
logistic_regression: {
  "accuracy": 0.6560,
  "precision": 0.1728,
  "recall": 0.5500,
  "f1": 0.2630,
  "roc_auc": 0.6541,
  "true_negative": 12103,
  "false_positive": 5979,
  "false_negative": 1022,
  "true_positive": 1249
}
random_forest: {
  "accuracy": 0.7036,
  "precision": 0.1891,
  "recall": 0.5037,
  "f1": 0.2750,
  "roc_auc": 0.6682,
  "true_negative": 13176,
  "false_positive": 4906,
  "false_negative": 1127,
  "true_positive": 1144
}
xgboost: {
  "accuracy": 0.6860,
  "precision": 0.1871,
  "recall": 0.5421,
  "f1": 0.2781,
  "roc_auc": 0.6787,
  "true_negative": 12732,
  "false_positive": 5350,
  "false_negative": 1040,
  "true_positive": 1231
}
Best model: xgboost (roc_auc=0.6787), promoted=True
```

---

## Metrics

| Model | Accuracy | Precision | Recall | F1 Score | ROC-AUC | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Logistic Regression** | 65.60% | 17.28% | 55.00% | 0.2630 | 0.6541 | Baseline |
| **Random Forest** | 70.36% | 18.91% | 50.37% | 0.2750 | 0.6682 | Evaluated |
| **XGBoost (Winner)** | 68.60% | 18.71% | 54.21% | 0.2781 | 0.6787 | **Promoted** |

**Winning Model:** **XGBoost** won promotion with the highest **ROC-AUC (0.6787)** and highest **F1-score (0.2781)**, successfully identifying over 54% of critical 30-day readmissions on an imbalanced healthcare dataset.

---

## Known gaps

- Advanced hyperparameter optimization and SHAP explainability analysis scheduled for Milestone 3.
- Connecting live model inference endpoints (`/predict`) to the frontend dashboard in Milestone 4.
