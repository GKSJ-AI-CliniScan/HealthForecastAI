# Milestone 2 Report – Week 3 & 4 – Risk Prediction & Readmission Forecasting

- **Intern name:** Liya Babu
- **Branch:** `intern/22-liya-babu`
- **Submitted on:** September 15, 2026

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

### 1. Risk Prediction

- Implemented database-backed patient risk prediction workflows.
- Integrated the `risk_predictions` PostgreSQL table with the backend.
- Added patient readmission probability and risk category information.
- Supported three risk categories:
  - High
  - Medium
  - Low
- Implemented latest prediction selection for patient-level risk analysis.

### 2. High-Risk Patient Identification

- Updated the high-risk patient workflow to retrieve the latest risk prediction for each patient from PostgreSQL.
- Removed the previously hardcoded patient risk response.
- Added patient-level clinical information to the high-risk response, including admission-related information and medication details.
- Limited the high-risk response to the top 50 high-risk patients for dashboard display.

### 3. Readmission Forecasting

- Implemented a database-backed readmission forecasting workflow.
- Used the latest risk prediction for each patient instead of relying on hardcoded forecast values.
- Calculated:
  - Total patients
  - Average current readmission probability
  - Expected readmissions
  - High-risk patients
  - Medium-risk patients
  - Low-risk patients

### 4. Risk Distribution

The risk prediction data was integrated into the healthcare dashboard to display the distribution of patient risk categories.

The database currently contains:

- **Low risk:** 85,215
- **Medium risk:** 11,724
- **High risk:** 2,698
- **Total predictions:** 99,637

### 5. Clinical Risk Insights

- Integrated risk prediction results into the clinical dashboard.
- Added high-risk patient information for clinical review.
- Connected the dashboard to backend APIs and PostgreSQL data.
- Used patient-level latest predictions for forecasting and risk analysis.

---

## How to run it

### Start the Backend

```bash
uvicorn app.main:app --app-dir backend --reload --port 8001

API Documentation
Open the FastAPI Swagger UI:
http://localhost:8001/docs

Main Risk Prediction APIs
/api/v1/risk/high-risk
/api/v1/risk/forecast

---

## Evidence

Risk Prediction Database
The risk_predictions PostgreSQL table contains:
| Risk Category | Prediction Records |
|---|---:|
| Low | 85,215 |
| Medium | 11,724 |
| High | 2,698 |
| **Total** | **99,637** |

High-Risk Patient API
The /risk/high-risk endpoint was tested successfully and returned database-backed high-risk patient records.
The response includes information such as:
- Patient ID
- Readmission probability
- Risk category
- Inpatient visits
- Emergency visits
- Medication count
- HbA1c-related information

| Metric | Result |
|---|---:|
| Patients | 69,668 |
| Average current probability | 26.14% |
| Expected readmissions | 18,213.41 |
| High risk | 1,003 |
| Medium risk | 6,451 |
| Low risk | 62,214 |


---

## Metrics

The available project evidence supports the following operational risk and forecasting metrics:
- Total risk prediction records: 99,637
- Unique patients used for latest-prediction forecasting: 69,668
- High-risk prediction records: 2,698
- Medium-risk prediction records: 11,724
- Low-risk prediction records: 85,215
- Average current readmission probability: 26.14%
- Expected readmissions: 18,213.41
Model Evaluation Metrics
Accuracy, precision, recall, F1-score, and ROC-AUC values are not included here because verified model evaluation results for these five metrics are not available in the current project evidence.

---


## Known gaps

- Formal model evaluation metrics such as accuracy, precision, recall, F1-score, and ROC-AUC need to be documented when verified training/evaluation results are available.
- The current forecasting workflow uses the latest database prediction for each patient to calculate the forecast.

