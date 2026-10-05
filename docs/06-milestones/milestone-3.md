# Milestone 3 report - Week 5 & 6 - Treatment Effectiveness Analysis & Healthcare Analytics



- **Intern name:*Liya Babu*
- **Branch:** `intern/22-liya-babu`
- **Submitted on:*October 4,2026*

---

## Scope for this milestone

- Implement treatment evaluation workflows.
- Generate recovery and treatment effectiveness reports.
- Develop medication outcome analysis modules.
- Build healthcare performance dashboards.
- Generate patient outcome analytics reports.
- Develop healthcare trend monitoring tools.

## Evaluation criteria

- Treatment effectiveness analysis and healthcare analytics dashboard implemented.
- Patient outcome reports functional.
- Hospital performance analytics generated successfully.
- Trend monitoring workflows integrated.

---

## What I built

### 1. Patient Outcome Analytics

Implemented PostgreSQL-backed patient outcome analytics using admission and clinical outcome data.

The outcome analytics calculate:

- Total patients
- Readmission rate
- Average recovery days
- Complication rate
- Mortality rate

The analytics service retrieves the required data from PostgreSQL instead of using hardcoded dashboard values.

### 2. Treatment Effectiveness Analysis

Implemented treatment effectiveness analysis using the `treatment_outcomes` table.

The treatment analytics calculate:

- Treatment name
- Patient count
- Treatment success rate
- Readmission rate
- Average recovery days

The current database contains three treatment groups:

- Standard Diabetes Care
- Medication Management
- Intensive Medication Management

### 3. Hospital Performance Analytics

Implemented hospital and department-level performance analytics using the PostgreSQL `hospital_performance_metrics` table.

The dashboard provides:

- Overall hospital readmission rate
- Average length of stay
- Bed occupancy rate
- Department admission counts
- Department readmission rates
- Department average length of stay
- Department performance scores

Five departments are currently represented in the hospital performance data.

### 4. Healthcare Trend Monitoring

Implemented PostgreSQL-backed healthcare trend monitoring.

Historical trend snapshots are retrieved from the `hospital_trend_snapshots` table and displayed in the dashboard.

The trend data includes:

- Readmission rate
- Average recovery days
- Bed occupancy rate
- Snapshot date

Seven historical trend snapshots were verified through the API.

### 5. Analytics Reporting

Implemented an analytics report-generation workflow that combines:

- Patient outcome metrics
- Department performance
- Treatment effectiveness metrics

The report-generation API returns a report identifier, summary metrics, department breakdown, treatment metrics, and a report download URL.

### 6. Healthcare Analytics Dashboard Integration

Connected the clinical analytics dashboard to the backend APIs.

The dashboard retrieves analytics data from PostgreSQL through the FastAPI backend rather than using browser local storage for persistent trend history.

The trend section displays the historical PostgreSQL hospital analytics snapshots.

### Main files involved

- `backend/app/api/v1/endpoints/analytics.py`
  - Added analytics API endpoints for outcomes, hospital performance, trends, departments, treatment effectiveness, and report generation.

- `backend/app/services/analytics_service.py`
  - Implemented PostgreSQL-backed analytics calculations and reporting logic.

- `backend/app/schemas/analytics.py`
  - Added schemas for outcome metrics, department performance, hospital performance, treatment effectiveness, and report generation.

- `static/dashboards/clinical_precision_narrative/index.html`
  - Integrated the healthcare analytics and trend monitoring data into the dashboard.

---

## How to run it

### Start the Backend

```bash
uvicorn app.main:app --app-dir backend --reload --port 8001
```

### API Documentation

Open the FastAPI Swagger UI:

```text
http://localhost:8001/docs
```

### Main M3 Analytics APIs

```text
/api/v1/analytics/outcomes
/api/v1/analytics/hospital-performance?facility_id=default
/api/v1/analytics/departments
/api/v1/analytics/treatments/effectiveness
/api/v1/analytics/trends?facility_id=default
/api/v1/analytics/reports/generate
```


## Evidence


Patient Outcome Analytics
The /analytics/outcomes endpoint was tested successfully.

| Metric | Result |
|---|---:|
| Total patients | 69,668 |
| Readmission rate | 11.23% |
| Average recovery days | 4.4 |
| Complication rate | 3.03% |
| Mortality rate | 1.41% |

Hospital Performance Analytics
The /analytics/hospital-performance?facility_id=default endpoint was tested successfully.

| Metric | Result |
|---|---:|
| Facility | HealthForecast Central Hospital |
| Reporting period | September 2026 |
| Overall readmission rate | 10.9% |
| Average length of stay | 4.05 days |
| Bed occupancy rate | 81.05% |
| Departments | 5 |

Treatment Effectiveness
The /analytics/treatments/effectiveness endpoint was tested successfully.

| Treatment | Patients | Success rate | Readmission rate | Avg. recovery |
|---|---:|---:|---:|---:|
| Standard Diabetes Care | 10,977 | 63.35% | 8.20% | 2.56 days |
| Medication Management | 37,393 | 54.80% | 10.41% | 3.52 days |
| Intensive Medication Management | 51,267 | 50.50% | 12.49% | 5.44 days |

Healthcare Trend Monitoring
The /analytics/trends?facility_id=default endpoint was tested successfully.
The API returned 7 historical PostgreSQL trend snapshots containing readmission rate, average recovery days, and bed occupancy rate.
The dashboard displays these historical snapshots as the healthcare trend history.
Report Generation
The /analytics/reports/generate endpoint was tested successfully.
The generated report included:
- Patient outcome summary
- Department performance breakdown
- Treatment effectiveness metrics
- Report identifier
- Report generation date
- Report download URL


## Metrics


The following verified M3 analytics metrics were obtained from the PostgreSQL-backed healthcare analytics workflows:

| Metric | Result |
|---|---:|
| Total patients analyzed | 69,668 |
| Readmission rate | 11.23% |
| Average recovery time | 4.4 days |
| Complication rate | 3.03% |
| Mortality rate | 1.41% |
| Hospital readmission rate | 10.9% |
| Hospital average LOS | 4.05 days |
| Bed occupancy rate | 81.05% |
| Historical trend snapshots | 7 |
| Treatment groups analyzed | 3 |
| Analytics endpoints delivered | 7 |

Treatment Effectiveness Measurement Accuracy
A formal accuracy measurement for treatment effectiveness was not calculated because the available project data does not contain a verified ground-truth benchmark for treatment effectiveness prediction.
The implemented workflow instead calculates treatment outcome metrics from the available PostgreSQL treatment and admission records.
Dashboard Load Time
Dashboard load time was not formally benchmarked during this milestone. Functional API and dashboard integration were verified.



## Known gaps

 
- Formal treatment effectiveness measurement accuracy was not calculated because a verified   ground-truth benchmark was not available.
- Dashboard loading time and performance were not formally benchmarked.
- The current treatment effectiveness analysis is based on the available PostgreSQL treatment outcome records.
- Additional treatment and medication outcome features can be added in a future iteration.
- Further performance testing and optimization can be performed during Milestone 4.
- Deployment and production-level validation are planned for the testing and deployment milestone. 


