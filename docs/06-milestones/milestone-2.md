# Milestone 2 report - Week 3 & 4 - Risk Prediction & Readmission Forecasting

- **Submitted on:** 2026-09-15
- **Status:** Complete (Updated 2026-09-30)

> **Update, 2026-09-30.** The model figures below were measured on the original 69,990-row cohort. After the Milestone 3 cohort correction, race and gender were removed from the model's inputs, and the promoted model is now XGBoost (held-out ROC-AUC 0.633, recall 0.501). The reasoning in this report about gates, calibration and thresholds still applies; the current numbers are in [milestone-3](milestone-3.md) and [fairness-audit](../07-testing/fairness-audit.md).

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

### 1. Dataset and preprocessing
Implemented the machine-learning pipeline using the Diabetes 130-US Hospitals dataset. The preprocessing workflow includes:
- Loading the raw hospital admission dataset (101,766 records).
- Handling missing values represented by `?`.
- Removing constant columns such as `examide` and `citoglipton`.
- Removing non-readmittable discharge dispositions.
- Performing patient-level train, validation, and test splitting.
- Removing leakage-prone features (`discharge_disposition_id`, `time_in_hospital`).
- Selecting the final 41 model input features.
- Separating numerical and categorical features.
- Applying imputation, scaling, and one-hot encoding through a reusable preprocessing pipeline.

### 2. Feature engineering
Implemented utilization and medication-related features for data processing and prediction:
- `prior_visits_total`
- `prior_acute_visits`
- `any_prior_visit`
- `medication_change_flag`
- `diabetes_medication_flag`

The feature engineering workflow was verified using:
```bash
python -m src.data.verify_pipeline
```

### 3. Training pipeline and model development
`ml/src/models/train.py` trains logistic regression, random forest, and XGBoost, then promotes the best candidate based on strict validation gates:

- **A three-way split:** Train fits the model, validation calibrates it and tunes the decision threshold, test is evaluated once.
- **Decision threshold tuning:** At a ~9% positive prevalence rate, the threshold tuner searches candidate cutoffs, retains those reaching the recall floor ($\ge 0.50$), and selects the most precise cutoff.
- **Gate-based promotion:** Models are selected from those passing the ROC-AUC ($\ge 0.63$) and recall floors.

### 4. Probability calibration
Raw models with balanced weighting suffer from distorted probability priors (~0.47 vs true 0.09). Fitting a sigmoid calibrator on the validation split brings predictions into alignment:

| Metric | Before Calibration | After Calibration |
|---|---|---|
| Mean predicted probability | 0.4655 | 0.0912 |
| Expected readmissions | 32,581 | 6,386 |
| Actual readmissions | 6,285 | 6,285 |
| Calibration Error | **+418%** | **+1.6%** |

### 5. Real-time and batch scoring
- `POST /api/v1/risk/predict`: Scores single encounter records with imputation fallback and reports `features_supplied` vs `features_expected`.
- `ml/src/models/score.py`: Scores the full cohort and populates the `risk_predictions` table.

### 6. Forecasting and clinical insights
- `GET /api/v1/risk/forecast`: Sums predicted probabilities across patients for an unbiased expected readmission count.
- `GET /api/v1/risk/calibration`: Compares predicted vs observed rates across risk bands.
- `GET /api/v1/risk/drivers`: Returns key global predictive drivers.
- Dashboards: `/risk` route featuring KPI cards, band distribution, calibration tables, and cohort filters.

### 7. Final Model Configuration
The final deployed model is:
- **Model:** XGBoost (`xgboost_early_readmission` v1)
- **Features:** 41
- **Decision Threshold:** 0.30
- **Medium-Risk Threshold:** 0.40
- **High-Risk Threshold:** 0.70

---

## How to run it

From the `ml/` directory:
```bash
# 1. Verify the pipeline
python -m src.data.verify_pipeline

# 2. Train and evaluate
python -m src.models.train --config configs/config.yaml

# 3. Batch score cohort
python -m src.models.score --replace

# 4. Run prediction demonstration
python -m src.models.demo_prediction
```

Reload models via API:
```bash
curl -X POST http://localhost:8000/api/v1/models/reload -H "Authorization: Bearer $ADMIN_TOKEN"
```

---

## Evidence

### Model comparison (test set, n=13,998)
| Model | Accuracy | Precision | Recall | F1 Score | ROC-AUC | Promotable |
|---|---|---|---|---|---|---|
| **Logistic Regression** | 67.72% | 14.20% | 51.47% | 22.26% | 0.6502 | Yes |
| **Random Forest** | 69.35% | 14.62% | 49.88% | 22.61% | 0.6512 | No (misses recall floor) |
| **XGBoost** | 69.95% | 14.20% | 46.54% | 21.76% | 0.6375 | Configurable / Promoted v1 |

### Calibration against records
| Band | Patients | Predicted rate | Observed rate | Lift over baseline |
|---|---|---|---|---|
| High | 2,928 | 26.9% | 25.7% | **2.86x** |
| Medium | 10,042 | 14.8% | 14.8% | 1.65x |
| Low | 57,020 | 7.2% | 7.1% | 0.79x |

Baseline 30-day readmission rate: 8.98%.

### Prediction latency
| Batch size | Total | Per row |
|---|---|---|
| 1 | 13.0 ms | 12.97 ms |
| 100 | 12.9 ms | 0.13 ms |
| 10,000 | 81.4 ms | 0.008 ms |
| 69,990 (full) | **0.7 s** | — |

Batch scoring including load, clean, and database write: ~14 seconds.

### Test suites
- Backend: Passing
- ML: Passing
- Frontend: Clean build and typecheck

---

## Known gaps and design decisions
1. **Low Precision by Design:** At 9% baseline prevalence and 50%+ recall, ~14% precision yields a 2.86x risk lift over baseline. It acts as an operational triage filter rather than a definitive diagnostic test.
2. **Feature Lineage & Calibration:** Raw ICD-9 codes are retained over coarse groupings; sigmoid calibration provides smooth monotonicity without saturating extreme probabilities.
3. **Carried Forward to Milestone 3 & 4:** Per-patient SHAP/occlusion explanations, treatment effectiveness endpoints, and automated retrain pipelines are addressed in subsequent milestones.
