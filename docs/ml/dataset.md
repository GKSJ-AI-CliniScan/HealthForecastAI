# Machine Learning Dataset — Diabetes 130-US Hospitals (1999–2008)

This document provides a comprehensive description of the clinical dataset utilized to train and evaluate the HealthForecast AI 30-day readmission prediction models.

---

## 1. Dataset Origin & Background

- **Dataset Title**: Diabetes 130-US Hospitals (1999–2008).
- **Domain**: Inpatient hospitalizations of diabetic patients across 130 medical centers in the United States over a 10-year span.
- **Total Inpatient Encounters**: 101,766 encounters.
- **Unique Patients**: 71,518 unique patients.
- **Primary Clinical Focus**: Identifying encounters at high risk of 30-day acute all-cause readmission following hospital discharge.

---

## 2. Inclusion & Exclusion Criteria

To ensure clinical relevance and representation:
- **Inclusion Criteria**:
  1. The encounter was an inpatient hospitalization.
  2. The patient was diagnosed with diabetes during the encounter (either primary, secondary, or additional diagnosis code).
  3. Laboratory tests were performed during the hospitalization.
  4. Medications were administered during the encounter.
  5. The length of stay was between 1 and 14 days.
- **Exclusion Criteria**:
  1. Patients who expired during hospitalization (discharge disposition code indicating death).
  2. Discharges to hospice care (non-readmission risk cohort).

---

## 3. Raw Feature Dimensions

The raw dataset comprises 50 demographic, clinical, administrative, and medication variables:

1. **Patient Identifiers**:
   - `encounter_id`, `patient_nbr` (excluded during training to prevent identity leakage).
2. **Demographics**:
   - `race`, `gender`, `age` (grouped into decade bins: `[0-10)`, `[10-20)`, ..., `[90-100)`).
3. **Admission & Discharge Details**:
   - `admission_type_id` (Emergency, Urgent, Elective, Newborn, Trauma).
   - `discharge_disposition_id` (Discharged to Home, Transfer to SNF, Rehab, Outpatient).
   - `admission_source_id` (Emergency Room, Physician Referral, Clinic Referral).
4. **Clinical Utilization & Length of Stay**:
   - `time_in_hospital` (1–14 days).
   - `num_lab_procedures` (1–132 count of lab tests performed).
   - `num_procedures` (0–6 non-lab clinical procedures).
   - `num_medications` (1–81 distinct medications administered).
   - `number_outpatient` (prior outpatient visits in preceding 12 months).
   - `number_emergency` (prior emergency visits in preceding 12 months).
   - `number_inpatient` (prior acute inpatient admissions in preceding 12 months).
   - `number_diagnoses` (number of ICD-9 diagnosis codes entered, 1–16).
5. **Diagnosis Codes**:
   - `diag_1`, `diag_2`, `diag_3` (primary, secondary, and tertiary ICD-9 codes).
6. **Laboratory Markers**:
   - `max_glu_serum` (glucose test results: None, Norm, >200, >300).
   - `A1Cresult` (glycated hemoglobin test: None, Norm, >7, >8).
7. **Diabetic Medications (24 Active Substances)**:
   - `metformin`, `repaglinide`, `nateglinide`, `chlorpropamide`, `glimepiride`, `glipizide`, `glyburide`, `tolbutamide`, `pioglitazone`, `rosiglitazone`, `acarbose`, `miglitol`, `troglitazone`, `tolazamide`, `insulin`, etc. (Tracked as `No`, `Steady`, `Up`, `Down`).
8. **Clinical Change Indicators**:
   - `change` (`Ch` indicating change in diabetic medication; `No` indicating no change).
   - `diabetesMed` (`Yes` indicating diabetes medication prescribed; `No` otherwise).

---

## 4. Target Variable Formulation

The raw target column is `readmitted`, categorized into:
- `NO`: Not readmitted (54,864 encounters, 53.9%).
- `>30`: Readmitted after 30 days (35,545 encounters, 34.9%).
- `<30`: Readmitted within 30 days of discharge (11,357 encounters, 11.2%).

For 30-day readmission prediction:
- **Binary Target ($y$)**:
  - $y = 1$ if `readmitted == '<30'` (11,357 encounters, **11.16% base prevalence**).
  - $y = 0$ if `readmitted in ('>30', 'NO')` (90,409 encounters, **88.84%**).
