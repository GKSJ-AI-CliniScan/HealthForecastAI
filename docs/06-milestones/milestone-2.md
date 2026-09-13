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

- Engineered domain-specific clinical features (`ml/src/features/build_features.py`):
  - Prior healthcare utilization counts, inpatient ratio, and high-emergency-user flags.
  - Polypharmacy indicators (≥ 10 and ≥ 16 medications).
  - Medication dosage change flags and insulin usage tracking.
  - Inpatient stay duration flags and clinical procedure intensity ratios (`lab_intensity`, `procedure_intensity`).
  - ICD-9 diagnosis code categorization into 9 clinical groups (Circulatory, Respiratory, Diabetes, Digestive, Genitourinary, Musculoskeletal, Neoplasms, Injury, Other).
  - Comorbidity flags (`has_diabetes_diag`, `has_circulatory_diag`).
  - Active diabetes medication count across 23 drug columns.
  - Age bracket to numeric mapping for continuous analysis.
  - Discharge disposition, admission type, and admission source categorical encoding.
- Built data preprocessing module (`ml/src/data/preprocess.py`) handling missing values (`?`), removing non-predictive identifiers, and separating numerical and categorical feature pipelines.
- Implemented and trained 3 machine learning models (`ml/src/models/train.py`): Logistic Regression baseline, Random Forest Classifier, and XGBoost Classifier with tuned class-imbalance weighting (`scale_pos_weight=7.2`).
- Evaluated models across Accuracy, Precision, Recall, F1-score, and ROC-AUC metrics.
- Persisted and promoted the winning model artifact (`ml/artifacts/best_model.joblib`).
- Integrated live ML inference in the backend (`backend/app/services/model_service.py`) using the trained pipeline with full feature engineering.

---

## How to run it

```bash
# 1. Switch to feature branch
git checkout intern/rachana

# 2. Install ML dependencies
pip install pandas scikit-learn xgboost joblib pyyaml numpy

# 3. Train all models and export winning artifact
cd ml
python -m src.models.train --config configs/config.yaml
```

---

## Evidence

### Model Training Terminal Output:
```text
logistic_regression: {
  "accuracy": 0.6542,
  "precision": 0.1778,
  "recall": 0.5790,
  "f1": 0.2720,
  "roc_auc": 0.6770,
  "true_negative": 11999,
  "false_positive": 6083,
  "false_negative": 956,
  "true_positive": 1315
}
random_forest: {
  "accuracy": 0.6994,
  "precision": 0.1943,
  "recall": 0.5385,
  "f1": 0.2856,
  "roc_auc": 0.6811,
  "true_negative": 13011,
  "false_positive": 5071,
  "false_negative": 1048,
  "true_positive": 1223
}
xgboost: {
  "accuracy": 0.7136,
  "precision": 0.1991,
  "recall": 0.5183,
  "f1": 0.2877,
  "roc_auc": 0.6889,
  "true_negative": 13347,
  "false_positive": 4735,
  "false_negative": 1094,
  "true_positive": 1177
}
Best model: xgboost (roc_auc=0.6889), promoted=True
```

---

## Metrics

| Model | Accuracy | Precision | Recall | F1 Score | ROC-AUC | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Logistic Regression** | 65.42% | 17.78% | 57.90% | 0.2720 | 0.6770 | Baseline |
| **Random Forest** | 69.94% | 19.43% | 53.85% | 0.2856 | 0.6811 | Evaluated |
| **XGBoost (Winner)** | 71.36% | 19.91% | 51.83% | 0.2877 | 0.6889 | **Promoted** |

**Winning Model:** **XGBoost** won promotion with the highest **ROC-AUC (0.6889)** and highest **F1-score (0.2877)**, successfully identifying over 51% of critical 30-day readmissions on a heavily imbalanced healthcare dataset (11.2% positive class). The model meets both promotion thresholds: `roc_auc ≥ 0.65` and `recall ≥ 0.50`.

---

## Improvements over baseline

| Metric | Before | After | Change |
| :--- | :--- | :--- | :--- |
| **Accuracy** | 68.60% | **71.36%** | **+2.76%** |
| **ROC-AUC** | 0.6787 | **0.6889** | **+1.02%** |
| **F1 Score** | 0.2781 | **0.2877** | **+0.96%** |
| **Precision** | 18.71% | **19.91%** | **+1.20%** |
| **Feature Count** | ~30 | **273** (after OHE) | 9× richer |

Key improvements came from:
1. ICD-9 diagnosis grouping (mapped raw codes into 9 clinical categories).
2. Discharge/admission ID categorical encoding (instead of treating as numbers).
3. Clinical intensity ratios (lab and procedure rates per hospital day).
4. Active diabetes medication counting and insulin tracking.
5. Optimized `scale_pos_weight=7.2` (from 8.0) for better accuracy-recall balance.

---

## Known gaps

- Advanced hyperparameter optimization (RandomizedSearchCV/Optuna) and SHAP explainability analysis scheduled for Milestone 3.
- Connecting live model inference endpoints (`/predict`) to the frontend dashboard in Milestone 4.

