# API reference

The live, always-accurate reference is the generated OpenAPI schema:

- Swagger UI: <http://localhost:8000/docs>
- ReDoc: <http://localhost:8000/redoc>
- Raw schema: <http://localhost:8000/api/v1/openapi.json>

43 operations across 9 routers, all implemented. Milestone 3 completed the four
`/treatment` analytics operations and the two `/clinical-support` operations that
were previously routed as placeholders.

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

## Treatment effectiveness — Milestone 3

| Method | Path | Permission | Notes |
|---|---|---|---|
| GET | `/treatment` | `treatment_report:read` **or** `:read_limited` | Flat per-regimen list. The original contract, unchanged |
| GET | `/treatment/summary` | same | The whole dashboard in one call: headline rates, protocol matrix, recovery trend |
| GET | `/treatment/medications` | same | Protocol efficacy against complication rate |
| GET | `/treatment/recovery-trends` | same | Mean recovery index per day of stay, split by specialty cohort |

All four accept `?disease_group=DIABETES\|CHF\|COPD\|PNEUMONIA`. A value outside
that set filters nothing rather than raising — the dropdown and the API must not
disagree about what "All" means.

Every figure is aggregated in SQL over `treatment_outcomes` joined to its
admission and patient. There are no reference baselines and no synthesised
series: with no outcome rows the endpoints return zeroes and an empty list, and
the dashboard renders its empty state.

The three metrics are proxies, defined in the
[`treatment_service`](../../backend/app/services/treatment_service.py) docstring
and worth reading before quoting any number:

- **Success** - the patient was not readmitted within 30 days.
- **Complication** - the episode ended somewhere other than home.
- **Recovery** - a composite `recovery_index` of 70 or above, derived from length
  of stay, diagnosis count, medication count and readmission. An ordering signal
  traceable to four admission fields, not a measured clinical scale.

Doctor is granted *limited* treatment access, which means the same aggregation
narrowed to their own caseload. The scoping is a `WHERE` clause
(`Patient.assigned_doctor_id`), never a post-fetch filter, so another clinician's
patients are not read out of the database. See
[`docs/04-rbac`](../04-rbac/README.md).

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

## Clinical decision support — Milestone 3

| Method | Path | Permission |
|---|---|---|
| GET | `/clinical-support/recommendations/{patient_id}` | `care_recommendation:generate` |
| GET | `/clinical-support/discharge-plan/{patient_id}` | `care_recommendation:generate` |

Both derive from the patient's stored risk prediction and admission history, in
[`cds_service`](../../backend/app/services/cds_service.py).

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
- Two response shapes are in use. Modules 1-3 return their Pydantic models
  directly, in `snake_case`. The Milestone 3 analytics endpoints
  (`/treatment/*`) return the `{success, data}` envelope with `camelCase` keys,
  because that is the contract the shipped frontend unwraps. The aliases live on
  the schema (`serialization_alias`), so the service layer stays `snake_case`
  end to end.

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

## Example: read the treatment dashboard payload

```bash
curl -s "http://localhost:8000/api/v1/treatment/summary?disease_group=CHF" \
  -H "Authorization: Bearer $TOKEN"
```

Returns `{success: true, data: {...}}` with `successRate`, `recoveryRate`,
`complicationsRate`, `outcomesRecorded`, `protocolsEvaluated`, `diseaseGroup`,
`medicationsData[]` and `recoveryProgressTrend[]`.

Called as the seeded doctor it reports only her own caseload; the same request
with a hospital administrator token reports the whole cohort. That difference is
the access matrix, not a query parameter, and it cannot be widened by the caller.
