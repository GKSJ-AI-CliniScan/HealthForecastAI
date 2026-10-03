# Machine Learning Preprocessing & Feature Engineering — HealthForecast AI

This document details the data preparation, cleaning, feature transformation, and encoding pipeline implemented in `ClinicalDataPreprocessor`.

---

## 1. Missing Data Handling & Cleaning

1. **Missing Symbol Normalization**:
   - The raw dataset uses `?`, `None`, and `Unknown` to denote missing values. These are converted to `np.nan` across all columns.
2. **Column Pruning & Dropping**:
   - `weight`: Excluded (>96% missing data; imputation would introduce substantial statistical bias).
   - `payer_code`: Excluded (>40% missing; purely administrative without clinical bearing).
   - `encounter_id`, `patient_nbr`: Dropped to prevent identity leakage and spurious correlation.
3. **Outlier Filtering**:
   - Length of stay restricted to clinical range 1–14 days.

---

## 2. Feature Engineering

Five domain-specific healthcare features are engineered from raw variables:

1. **Total Prior Healthcare Encounters (`total_prior_visits`)**:
   - Combines outpatient, emergency, and inpatient utilization in the preceding year:
     $$\text{total\_prior\_visits} = \text{number\_emergency} + \text{number\_inpatient} + \text{number\_outpatient}$$
2. **Prior Inpatient Utilization Ratio (`prior_inpatient_ratio`)**:
   - Captures the severity of prior care by calculating the proportion of visits requiring inpatient bed admission:
     $$\text{prior\_inpatient\_ratio} = \frac{\text{number\_inpatient}}{\text{total\_prior\_visits} + 1}$$
3. **ICD-9 Diagnosis Clinical Category Mapping (`diag_1_category`)**:
   - Maps over 700 raw primary diagnosis codes into 9 clinically interpretable organ system classes:
     - **Circulatory**: ICD 390–459, 785
     - **Respiratory**: ICD 460–519, 786
     - **Digestive**: ICD 520–579, 787
     - **Diabetes**: ICD 250.xx
     - **Injury & Poisoning**: ICD 800–999
     - **Musculoskeletal**: ICD 710–739
     - **Genitourinary**: ICD 580–629, 788
     - **Neoplasms**: ICD 140–239
     - **Other / External**: All other codes
4. **Active Medication Regimen Change (`med_changed`)**:
   - Binary indicator: $1$ if `change == 'Ch'` (dosage or active compound altered during stay), $0$ otherwise.
5. **Diabetes Medication Prescribed (`has_diabetes_med`)**:
   - Binary indicator: $1$ if `diabetesMed == 'Yes'`, $0$ otherwise.

---

## 3. Transformation & Encoding Architecture

The data pipeline employs `sklearn.compose.ColumnTransformer`:

- **Numerical Pipeline**:
  - Imputation: `SimpleImputer(strategy='median')`
  - Scaling: `StandardScaler()`
  - Applied to: `time_in_hospital`, `num_lab_procedures`, `num_procedures`, `num_medications`, `number_diagnoses`, `total_prior_visits`, `prior_inpatient_ratio`.
- **Categorical Pipeline**:
  - Imputation: `SimpleImputer(strategy='constant', fill_value='Unknown')`
  - One-Hot Encoding: `OneHotEncoder(handle_unknown='ignore', sparse_output=False)`
  - Applied to: `race`, `gender`, `age`, `admission_type_id`, `discharge_disposition_id`, `admission_source_id`, `diag_1_category`, `max_glu_serum`, `A1Cresult`, and the 24 diabetes medications.

---

## 4. Train-Test Isolation & Leakage Prevention

- All transformers (medians, means, standard deviations, and one-hot category dictionaries) are **fitted strictly on the training partition ($N=81,412$)**.
- The fitted pipeline is serialized to `preprocessor_v1.joblib` and applied symmetrically to holdout test data and live production inference requests.
