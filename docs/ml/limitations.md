# Machine Learning Limitations & Clinical Safety — HealthForecast AI

This document establishes clinical boundaries, dataset constraints, ethical considerations, and safety disclaimers for the predictive models in HealthForecast AI.

---

## 1. Clinical Decision Support Disclaimer

> **MANDATORY CLINICAL SAFETY NOTICE**:
> HealthForecast AI is a **Clinical Decision Support System (CDSS)** intended exclusively to assist licensed healthcare professionals in risk stratification and post-discharge planning. 
> 
> - The software **does not** provide autonomous medical diagnoses.
> - The software **does not** dictate clinical treatment plans or prescribe medications.
> - Predictions must always be synthesized with real-time bedside clinical assessment, vital signs, and professional medical judgment.
> - Under no circumstances should predictions be used to deny care, refuse hospital admission, or prematurely discharge patients.

---

## 2. Dataset Scope & Boundary Conditions

1. **Cohort Demographics**:
   - The model was trained and evaluated on inpatient encounters of adult diabetic patients across 130 US hospitals (1999–2008).
   - Performance may degrade if applied directly to pediatric cohorts (<18 years old) or inpatient cohorts without glycemic dysregulation without domain adaptation.
2. **Administrative vs. Real-Time Physiological Data**:
   - The feature space relies on structured electronic health records, diagnostic billing codes (ICD-9), and inpatient medication administrations.
   - Continuous telemetry, real-time waveform vitals (e.g., continuous blood pressure, ECG), and free-text nursing clinical notes are not included in the model input space.
3. **Unmeasured Social Determinants of Health (SDOH)**:
   - Patient readmission in the real world is frequently influenced by post-discharge environmental factors, such as:
     - Medication affordability and insurance co-pay hurdles.
     - Access to outpatient transportation.
     - Food insecurity and living condition stability.
     - Health literacy and informal caregiver support.
   - Because these variables are unrecorded in the historical dataset, clinicians must evaluate SDOH factors during discharge coordination.

---

## 3. Statistical Imbalance & Metric Trade-Offs

- **Class Prevalence**: Acute 30-day readmissions constitute 11.16% of encounters.
- **Precision-Recall Dynamic**:
  - Prioritizing high recall (52.88%) to catch readmissions inevitably produces false positives (precision = 19.42%).
  - In a clinical screening tool, moderate false positives are acceptable because the resulting action (e.g., a follow-up phone call or medication review) is harmless and beneficial to patient care.
  - However, clinicians should be informed that a "High Risk" alert indicates heightened vulnerability, not a guaranteed readmission.

---

## 4. Model Drift & Retraining Guidelines

1. **Temporal & Demographic Drift**:
   - Hospital protocols, pharmaceutical formulations, and diagnostic coding (e.g., ICD-9 to ICD-10/11) change over time.
2. **Monitoring Protocol**:
   - Hospital systems deploying HealthForecast AI should record monthly actual readmission outcomes against predicted risk scores.
   - If the observed Brier score or calibration curve deviates by more than 15% from baseline, the model pipeline must be retrained and validated on recent institutional encounter data.
