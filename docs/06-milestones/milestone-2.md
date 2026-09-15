# Milestone 2 report - Week 3 & 4 - Risk Prediction & Readmission Forecasting

---

**Intern name:** Amit Kumar Shaw

**Branch:** `intern/16-deepak-rajak`

**Submitted on:** 15-09-2026

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

Implemented the machine-learning pipeline using the **Diabetes 130-US Hospitals** dataset.

The preprocessing workflow includes:

- Loading the raw hospital admission dataset.
- Handling missing values represented by `?`.
- Removing constant columns such as `examide` and `citoglipton`.
- Removing non-readmittable discharge dispositions.
- Performing patient-level train, validation and test splitting.
- Removing leakage-prone features:
  - `discharge_disposition_id`
  - `time_in_hospital`
- Selecting the final 41 model input features.
- Separating numerical and categorical features.
- Applying imputation, scaling and one-hot encoding through a reusable preprocessing pipeline.

The final early-prediction model uses 41 raw input features.

### 2. Feature engineering

Implemented utilization and medication-related features for the data-processing and prediction workflow:

- `prior_visits_total`
- `prior_acute_visits`
- `any_prior_visit`
- `medication_change_flag`
- `diabetes_medication_flag`

The feature-engineering workflow was verified using:

```bash
python -m src.data.verify_pipeline

### 3. Model development

Several machine-learning approaches were evaluated during model development, including:

Logistic Regression
Random Forest
XGBoost
Neural Network

XGBoost was selected as the final model because it provided the strongest overall performance for the project requirements and provided a practical pipeline for deployment and patient-level risk scoring.

The final model is:

Model: XGBoost
Model name: xgboost_early_readmission
Version: v1
Scale positive weight: 3.0
Decision threshold: 0.30
Medium-risk threshold: 0.40
High-risk threshold: 0.70

### 4. Patient risk prediction

Implemented patient-level prediction functionality that generates:

30-day readmission probability.
Risk category.
Prediction decision.
Clinical insight.
Supporting risk factors.

The trained pipeline is saved as:

ml/artifacts/readmission_model.joblib

The model artifact contains the trained pipeline and required model metadata.

### 5. Model verification

The saved model artifact was successfully loaded using the project's load_model() function.

The artifact verification confirmed:

Features: 41
Threshold: 0.3
Model: xgboost_early_readmission v1

The prediction pipeline was also tested using real records from the dataset.

### 6. Prediction demonstration

The existing prediction demonstration script:

ml/src/models/demo_prediction.py

was used to verify patient-level risk prediction.

The demo successfully generated both low-risk and high-risk predictions.

Example results:

LOW-RISK EXAMPLE
30-Day Readmission Probability : 5.73%
Risk Category                  : LOW

HIGH-RISK EXAMPLE
30-Day Readmission Probability : 77.32%
Risk Category                  : HIGH

The high-risk example also generated supporting clinical observations related to:

Previous healthcare utilization.
Previous acute-care visits.
Diabetes medication usage.
Previous inpatient utilization.
Multiple diagnoses.

The demo completed successfully with:

Prediction demo completed successfully.
```

### How to run it

From the project root:

cd ml
### 1. Verify the data pipeline
python -m src.data.verify_pipeline

Expected final message:

PIPELINE VERIFICATION SUCCESSFUL
### 2. Train the model
python -m src.models.train --config configs/config.yaml

This generates the trained model artifact and evaluation metrics.

### 3. Verify the saved model artifact
python -c "import joblib; a=joblib.load('artifacts/readmission_model.joblib'); print(type(a)); print(a.keys()); print('Features:', len(a['feature_columns'])); print('Threshold:', a['decision_threshold']); print('Model:', a['model_name'], a['model_version'])"

Expected important values:

Features: 41
Threshold: 0.3
Model: xgboost_early_readmission v1
### 4. Run the prediction demonstration
python -m src.models.demo_prediction

The demonstration generates readmission probabilities, risk categories and clinical insights for example patients.

### Evidence
Pipeline verification

The pipeline verification script successfully confirmed:

Dataset rows: 101,766
Dataset columns: 50
Duplicate rows: 0
Target preserved during preprocessing.
Feature engineering completed successfully.
All five utilization/medication features were generated successfully.
Target conversion was verified:
<30 → 1
>30 and NO → 0

Final verification result:

PIPELINE VERIFICATION SUCCESSFUL
Model artifact verification

The saved model was successfully loaded using the project's model loader.

Verified:

Input features: 41
Decision threshold: 0.30
Model: xgboost_early_readmission v1
Prediction demo

The prediction demo successfully generated:

Low-risk example
Probability: 5.73%
Risk: LOW

and:

High-risk example
Probability: 77.32%
Risk: HIGH

The prediction system also generated clinical insights and supporting observations.

Screenshots of the verification and prediction-demo terminal output can be included as evidence.

No real patient-identifying information should be included in submitted screenshots.

## Metrics

The models were evaluated using the required classification metrics:

- Accuracy
- Precision
- Recall
- F1 Score
- ROC-AUC

Because the readmission target is imbalanced, model evaluation was not based on accuracy alone.

### Model comparison

| Model | Accuracy | Precision | Recall | F1 Score | ROC-AUC |
|---|---:|---:|---:|---:|---:|
| Logistic Regression | 66.68% | 17.54% | 55.11% | 26.65% | 66.45% |
| Random Forest | 85.97% | 30.71% | 22.80% | 26.17% | 69.75% |
| XGBoost | 66.70% | 18.74% | 61.54% | 28.73% | 69.23% |
| Neural Network | 63.67% | 17.76% | 64.23% | 27.83% | 69.00% |

### Model selection

XGBoost was selected as the final model because it provided a strong balance between recall and F1 score while providing a practical and deployable prediction pipeline for the project.

The Random Forest achieved the highest accuracy and ROC-AUC in this initial model comparison, but its recall was substantially lower than XGBoost. Since the project focuses on identifying patients at risk of 30-day readmission, recall was an important consideration during model selection.

### Final XGBoost early-readmission model

After model comparison, the final XGBoost model was retrained using the leakage-controlled early-prediction feature set.

Final test-set performance:

| Metric | Score |
|---|---:|
| Accuracy | 70.31% |
| Precision | 17.92% |
| Recall | 48.24% |
| F1 Score | 26.13% |
| ROC-AUC | 65.37% |

The final model configuration is:

```text
Model                  : XGBoost
Model name             : xgboost_early_readmission
Version                : v1
Input features         : 41
Scale positive weight  : 3.0
Decision threshold     : 0.30
Medium risk threshold  : 0.40
High risk threshold    : 0.70
```
### Known gaps

The final model currently achieves a test ROC-AUC of approximately 0.654, so further model improvement may be possible.
Test recall is approximately 0.482, slightly below the configured 0.50 promotion criterion.
The ML prediction pipeline has been successfully verified locally.
Full integration with the FastAPI backend and frontend still needs to be tested.
Batch risk scoring and dashboard integration remain part of the next integration stage.
The trained model artifact is generated locally and should not be committed unless the project repository explicitly requires model artifacts.
The current dataset loader produces a pandas mixed-type DtypeWarning for one column. This does not prevent training or prediction, but the data-loading implementation can be cleaned up later.