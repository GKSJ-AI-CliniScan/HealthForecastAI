# HealthForecast AI: Machine Learning Model Evaluation Report

**Milestone**: Milestone 2 — Patient Risk Prediction & Readmission Forecasting  
**Generated Date**: 2026-09-14  
**Status**: Production Validated  
**Active Artifact**: `backend/app/ml/models/saved/readmission_model_v1.joblib`  
**Preprocessor Artifact**: `backend/app/ml/models/saved/preprocessor_v1.joblib`  

---

## 1. Executive Summary & Clinical Context
Hospital readmissions within 30 days of discharge represent a critical quality and financial indicator for healthcare systems globally (e.g., CMS Hospital Readmissions Reduction Program). In diabetic inpatient populations, acute metabolic imbalances, multi-system comorbidities, and complex medication regimens compound readmission risk.

This report evaluates candidate machine learning architectures for predicting **30-day all-cause hospital readmission** using the Diabetes 130-US Hospitals dataset. The selected model serves as an educational and clinical decision-support capability to identify high-risk patients prior to discharge.

> **Important Healthcare Disclaimer**:
> *AI-generated predictions are decision-support information and must be reviewed by qualified healthcare professionals. The system does not provide autonomous clinical diagnoses or prescribe specific medical interventions.*

---

## 2. Dataset Description
- **Dataset**: Diabetes 130-US Hospitals (1999–2008).
- **Total Inpatient Records**: 101,766 encounters.
- **Total Unique Patients**: 71,518 distinct patients.
- **Raw Features**: 50 clinical, demographic, admission, and pharmaceutical variables.
- **Missing Value Handling**: Standardized missing symbols (`?`, `Unknown`, `None`). High-null features such as `weight` (>96% missing) and administrative `payer_code` were excluded to prevent noise.

---

## 3. Target Variable Formulation
The raw outcome column `readmitted` contains three distinct categories:
1. `NO`: No hospital readmission recorded (54,864 encounters, 53.9%).
2. `>30`: Readmitted more than 30 days after discharge (35,545 encounters, 34.9%).
3. `<30`: Readmitted within 30 days of discharge (11,357 encounters, 11.2%).

### Target Definition:
- **Positive Class ($y=1$)**: `readmitted == '<30'` (30-day acute readmission, 11,357 encounters, 11.16% base rate).
- **Negative Class ($y=0$)**: `readmitted in ('>30', 'NO')` (No readmission within 30 days, 90,409 encounters, 88.84%).

---

## 4. Feature Selection & Feature Engineering

### Excluded Identifiers (Data Leakage Prevention)
`encounter_id` and `patient_nbr` were dropped prior to model training to prevent identity memorization and data leakage.

### Features Engineered:
1. **Total Prior Healthcare Utilization (`total_prior_visits`)**: Sum of historical emergency, inpatient, and outpatient encounters (`number_emergency + number_inpatient + number_outpatient`).
2. **Prior Inpatient Utilization Ratio (`prior_inpatient_ratio`)**: Fraction of historical care episodes involving acute hospitalization (`number_inpatient / (total_prior_visits + 1)`).
3. **Primary Diagnosis ICD-9 Mapping (`diag_1_category`)**: Grouped into broad clinical categories:
   - Circulatory (ICD 390–459, 785)
   - Respiratory (ICD 460–519, 786)
   - Digestive (ICD 520–579, 787)
   - Diabetes (ICD 250)
   - Injury (ICD 800–999)
   - Musculoskeletal (ICD 710–739)
   - Genitourinary (ICD 580–629, 788)
   - Neoplasms (ICD 140–239)
   - Other / Supplementary
4. **Active Medication Regimen Modification (`med_changed`)**: Binary indicator of dosage or regimen change during the hospitalization (`change == 'Ch'`).
5. **Diabetes Medication Prescribed (`has_diabetes_med`)**: Binary indicator for active diabetic prescription (`diabetesMed == 'Yes'`).

### Preprocessing Architecture (`ClinicalDataPreprocessor`)
- **Numerical Features**: Imputed with median and scaled using `StandardScaler`.
- **Categorical Features**: Missing values imputed with `"Unknown"` and encoded via `OneHotEncoder(handle_unknown='ignore')`.
- All transformers were fitted **strictly on the training partition** (81,412 rows) and applied identically during test evaluation and production inference.

---

## 5. Model Training & Validation Methodology
- **Validation Split**: 80% Training ($N = 81,412$), 20% Holdout Test ($N = 20,354$).
- **Stratification**: Preserved 11.16% positive prevalence across splits.
- **Class Imbalance Management**: Balanced class weights applied (`class_weight='balanced'` in Random Forest; `scale_pos_weight = ~7.96` in XGBoost) to optimize clinical sensitivity over majority-class collapse.

---

## 6. Experimental Results & Model Comparison

Both candidate architectures were trained and evaluated on the identical holdout test set:

| Model | Accuracy | Precision | Recall | F1 Score | ROC-AUC |
|---|---|---|---|---|---|
| **Random Forest** | **0.7027** | **0.1942** | **0.5288** | **0.2841** | **0.6830** |
| **XGBoost** | 0.6682 | 0.1851 | 0.5799 | 0.2806 | 0.6829 |

### Detailed Metric Analysis:
1. **ROC-AUC**:
   - Random Forest achieved an ROC-AUC of **0.6830**, demonstrating consistent rank-order discrimination between readmitted and non-readmitted inpatients across decision thresholds.
   - XGBoost achieved an ROC-AUC of **0.6829**.
2. **Clinical Sensitivity (Recall)**:
   - Random Forest achieved a recall of **52.88%**, capturing over half of all acute 30-day readmissions while maintaining a higher overall accuracy (**70.27%** vs 66.82%).
3. **F1 Score**:
   - Random Forest achieved an F1 Score of **0.2841**, reflecting superior harmonic balance between positive predictive value and sensitivity on imbalanced healthcare data.

---

## 7. Selected Production Model
- **Selected Architecture**: **Random Forest Classifier** (`readmission_model_v1.joblib`).
- **Rationale**:
  - Highest ROC-AUC (**0.6830**).
  - Superior overall accuracy (**70.27%**) reducing false alarms for clinicians.
  - Balanced clinical recall (**52.88%**) in a challenging, highly heterogeneous multi-hospital cohort.
  - Robust against feature outliers and non-linear interactions.

---

## 8. Risk Calibration & Decision Support Engine
The model's calibrated positive probability $P(\text{readmission} < 30 \text{ days}) \in [0.0, 1.0]$ is converted into an actionable 0–100 clinical score:

$$\text{Risk Score} = \text{round}(P \times 100)$$

### Configurable Risk Bands:
- **0–25 (LOW)**: Routine discharge planning and standard primary care follow-up.
- **26–50 (MEDIUM)**: Patient shows moderate predicted risk; recommend post-discharge care coordination.
- **51–75 (HIGH)**: Elevated readmission likelihood; multidisciplinary medication review and scheduled 7-day outpatient consultation.
- **76–100 (CRITICAL)**: Acute high risk; comprehensive transitional care protocol and 48–72 hour follow-up outreach.

---

## 9. Model Limitations & Clinical Considerations
1. **Administrative Data Scope**: Features reflect electronic health records and billing codes available at discharge. Vital signs and post-discharge social determinants (e.g., transportation, medication affordability) are not captured in the 130-US Hospitals dataset.
2. **Prevalence Skew**: The positive readmission class represents 11.2% of encounters, creating an intrinsic trade-off between precision and recall.
3. **Clinical Decision Support Only**: Predictions must augment, never replace, direct clinical examination and physician judgment.
