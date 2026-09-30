# API reference

The live, always-accurate reference is the generated OpenAPI schema:

- Swagger UI: <http://localhost:8000/docs>
- ReDoc: <http://localhost:8000/redoc>
- Raw schema: <http://localhost:8000/api/v1/openapi.json>

Every operation is implemented. Milestone 3 added the treatment, performance,
trend, clinical-support and report endpoints below.

## Authentication — Module 1

| Method | Path | Permission | Notes |
|---|---|---|---|
| POST | `/auth/login` | public | Returns a JWT, the role, and the permission list |
| GET | `/auth/me` | authenticated | The caller's own record |
| GET | `/auth/permissions` | authenticated | Drives the frontend navigation |
| GET | `/auth/roles` | public | The role catalogue and what each grants |

## User management — Module 1

| Method | Path | Permission |
|---|---|---|
| GET | `/users` | `user:manage` |
| POST | `/users` | `user:manage` |
| GET | `/users/{id}` | `user:manage` |
| POST | `/users/{id}/deactivate` | `user:manage` |
| POST | `/users/{id}/activate` | `user:manage` |

## Patient data — Module 2

| Method | Path | Permission | Scope |
|---|---|---|---|
| GET | `/patients` | authenticated | Doctor: own caseload. Admins: hospital. Researcher: 403 |
| POST | `/patients` | `patient:write` | Doctor: forced onto own caseload |
| GET | `/patients/anonymised` | `patient:read_anonymized` | Pseudonymised, no identifiers |
| GET | `/patients/{id}` | authenticated | With admission history. Out of scope → 404 |
| PATCH | `/patients/{id}` | `patient:write` | Partial update |
| GET | `/patients/{id}/admissions` | authenticated | Most recent first |

## Risk prediction and forecasting — Module 3 (Milestone 2)

| Method | Path | Permission | Notes |
|---|---|---|---|
| POST | `/risk/predict` | `risk_report:read` | Real-time score; reports feature coverage |
| GET | `/risk/patients/{id}` | `risk_report:read` | Latest stored score, caseload-scoped |
| GET | `/risk/high-risk` | `risk_report:read` | Cohort by band, highest probability first |
| GET | `/risk/distribution` | `risk_report:read` | Patient counts per band |
| GET | `/risk/forecast` | `readmission_forecast:read` | Sums probabilities, not flags |
| GET | `/risk/calibration` | `readmission_forecast:read` | Predicted against observed, per band |
| GET | `/risk/drivers` | `risk_report:read` | Global feature weights |

`/risk/predict` returns `features_supplied` and `features_expected`. The model
was fitted on 50 columns; a request that supplies 8 gets a score built mostly
from imputed values, and the response says so rather than hiding it.

## Healthcare analytics — Module 6

| Method | Path | Permission |
|---|---|---|
| GET | `/analytics/dashboard` | authenticated (scoped by role) |
| GET | `/analytics/summary` | `hospital_analytics:read` |
| GET | `/analytics/readmissions/by-age` | `hospital_analytics:read` |
| GET | `/analytics/readmissions/by-admission-type` | `hospital_analytics:read` |
| GET | `/analytics/length-of-stay` | `hospital_analytics:read` |
| GET | `/analytics/population-health` | `population_health:read` |

## AI model management — Module 7 (Milestone 2)

| Method | Path | Permission | Notes |
|---|---|---|---|
| GET | `/models` | `model:manage` | The promoted artifact |
| GET | `/models/active` | `model:manage` | Version, threshold, test metrics |
| GET | `/models/metrics` | `model:manage` | Accuracy, precision, recall, F1, ROC-AUC |
| GET | `/models/drivers` | `model:manage` | Global feature importance |
| POST | `/models/reload` | `model:manage` | Pick up a retrained artifact without a restart |

## Treatment and analytics — Milestone 3

| Method | Path | Permission | Notes |
|---|---|---|---|
| GET | `/treatment` | `treatment_report:read` or `:read_limited` | Medication outcomes, adjusted odds ratios; a doctor sees their own caseload |
| GET | `/treatment/medications/{name}` | same | One medication in depth |
| GET | `/treatment/care-processes` | same | HbA1c testing and regimen change |
| GET | `/treatment/recovery` | same | Stable-recovery proxy by age and diagnosis |
| GET | `/treatment/recovery-trends` | same | Recovery across the encounter sequence |
| GET | `/analytics/performance?dimension=` | `hospital_analytics:read` | Observed against expected readmissions, by department or diagnosis |
| GET | `/analytics/performance-dimensions` | `hospital_analytics:read` | Available dimensions |
| GET | `/analytics/trends?buckets=` | `hospital_analytics:read` | p-chart with control limits and signals |
| GET | `/clinical-support/recommendations/{id}` | `care_recommendation:generate` | Rules that fired, each with rationale and evidence, plus the score explanation |
| GET | `/clinical-support/discharge-plan/{id}` | `care_recommendation:generate` | Actions grouped before, at and after discharge |
| GET | `/clinical-support/rules` | `care_recommendation:generate` | The rule set and thresholds, for clinical review |
| GET | `/reports/patients/{id}/outcome` | patient read | Patient outcome report; audited |
| GET | `/reports/hospital-performance` | `analytics:export` | Aggregate CSV; audited |
| GET | `/reports/research-dataset?k=` | `research_dataset:export` | k-anonymous (k >= 5, default 10), pseudonymised CSV; audited |

Out-of-scope patients return **404, not 403**, so a response never confirms that
a record exists. Small groups (fewer than 11) are suppressed in every aggregate.

## System

| Method | Path | Purpose |
|---|---|---|
| GET | `/health` | Liveness probe for Docker, CI and the load balancer |
| GET | `/` | Service banner |

## Conventions

- Version everything under `/api/v1`. Never break a shipped contract.
- Every endpoint declares an authorisation dependency. An endpoint without one
  will fail review.
- Status codes:
  - `401` — no token, a malformed token, or an expired one
  - `403` — a valid token whose role lacks the permission
  - `404` — a resource the caller may see that does not exist, **and** a
    resource outside their scope. Distinguishing the two would confirm the
    record exists.
  - `409` — a uniqueness conflict (duplicate email, duplicate MRN)
  - `422` — schema validation failure
  - `503` — a risk endpoint was called with no trained model loaded
- Error bodies use FastAPI's `{"detail": "..."}` shape. Never leak a stack
  trace, a SQL string or a patient identifier in an error message.

## Example: log in and read your caseload

```bash
TOKEN=$(curl -s -X POST http://localhost:8000/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"dr.reddy@healthforecast.org","password":"'"$SEED_PASSWORD"'"}' \
  | python -c 'import json,sys; print(json.load(sys.stdin)["access_token"])')

curl -s "http://localhost:8000/api/v1/patients?limit=5" -H "Authorization: Bearer $TOKEN"
```

## Example: score an encounter

```bash
curl -s -X POST http://localhost:8000/api/v1/risk/predict \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"patient_id":1,"time_in_hospital":12,"num_medications":28,
       "number_inpatient":4,"number_emergency":3,"number_diagnoses":9,
       "age_group":"70-80","admission_type":"Emergency",
       "discharge_disposition":"Discharged/transferred to SNF"}'
```
