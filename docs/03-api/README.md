# API reference

The live, always-accurate reference is the generated OpenAPI schema:

- Swagger UI: <http://localhost:8000/docs>
- ReDoc: <http://localhost:8000/redoc>
- Raw schema: <http://localhost:8000/api/v1/openapi.json>

33 operations across 8 routers. 23 are implemented; the 10 marked *(placeholder)*
are routed and authorised but return empty or zero values until their milestone.

## Authentication

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

## Healthcare analytics — Module 6

| Method | Path | Permission |
|---|---|---|
| GET | `/analytics/dashboard` | authenticated (scoped by role) |
| GET | `/analytics/summary` | `hospital_analytics:read` |
| GET | `/analytics/readmissions/by-age` | `hospital_analytics:read` |
| GET | `/analytics/readmissions/by-admission-type` | `hospital_analytics:read` |
| GET | `/analytics/length-of-stay` | `hospital_analytics:read` |
| GET | `/analytics/population-health` | `population_health:read` |

## Later milestones

| Method | Path | Permission | Milestone |
|---|---|---|---|
| POST | `/risk/predict` *(placeholder)* | `risk_report:read` | 2 |
| GET | `/risk/high-risk` *(placeholder)* | `risk_report:read` | 2 |
| GET | `/risk/forecast` *(placeholder)* | `readmission_forecast:read` | 2 |
| GET | `/treatment` *(placeholder)* | `treatment_report:read` | 3 |
| GET | `/treatment/recovery-trends` *(placeholder)* | `treatment_report:read` | 3 |
| GET | `/clinical-support/recommendations/{id}` *(placeholder)* | `care_recommendation:generate` | 3 |
| GET | `/clinical-support/discharge-plan/{id}` *(placeholder)* | `care_recommendation:generate` | 3 |
| GET | `/models` *(placeholder)* | `model:manage` | 4 |
| GET | `/models/active` *(placeholder)* | `model:manage` | 4 |
| GET | `/models/metrics` *(placeholder)* | `model:manage` | 4 |

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
- Error bodies use FastAPI's `{"detail": "..."}` shape. Never leak a stack
  trace, a SQL string or a patient identifier in an error message.

## Example: log in and read your caseload

```bash
TOKEN=$(curl -s -X POST http://localhost:8000/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"dr.reddy@healthforecast.org","password":"'"$SEED_PASSWORD"'"}' \
  | python -c 'import json,sys; print(json.load(sys.stdin)["access_token"])')

curl -s http://localhost:8000/api/v1/patients?limit=5 -H "Authorization: Bearer $TOKEN"
```
