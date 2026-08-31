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
