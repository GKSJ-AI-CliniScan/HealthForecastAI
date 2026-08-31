# API reference

The live, always-accurate reference is the generated OpenAPI schema:

- Swagger UI: <http://localhost:8000/docs>
- ReDoc: <http://localhost:8000/redoc>
- Raw schema: <http://localhost:8000/api/v1/openapi.json>

## Route map

| Prefix | Module | Owner milestone |
|--------|--------|-----------------|
| `/api/v1/auth` | Authentication | 1 |
| `/api/v1/users` | User management | 1 |
| `/api/v1/patients` | Patient data | 1 |
| `/api/v1/risk` | Risk prediction and readmission forecasting | 2 |
| `/api/v1/treatment` | Treatment effectiveness | 3 |
| `/api/v1/clinical-support` | Clinical decision support | 3 |
| `/api/v1/analytics` | Healthcare analytics | 3 |
| `/api/v1/models` | AI model management | 4 |

## Conventions

- Version everything under `/api/v1`. Never break a shipped contract.
- Every endpoint declares an authorisation dependency. An endpoint without one
  will fail review.
- Return the correct status code: `401` for no or bad token, `403` for a valid
  token without the permission, `404` for a resource the caller may see but that
  does not exist. Do not use `404` to hide an authorisation failure unless you
  document why.
- Error bodies use FastAPI's `{"detail": "..."}` shape. Never leak a stack trace,
  a SQL string or a patient identifier in an error message.

## Deliverable for milestone 1

Document each endpoint you implement here: method, path, required permission,
request body, response body and error cases. Export the OpenAPI schema and
commit it alongside this file.

---

# Milestone 1 endpoints

Exported schema: [`openapi.json`](./openapi.json).

## Authentication - `/api/v1/auth`

| Method | Path | Permission | Request | Response | Errors |
|---|---|---|---|---|---|
| POST | `/auth/register` | public | `{email, full_name, password, department?}` | `201 UserRead` | `409` email taken, `422` password under 8 chars |
| POST | `/auth/login` | public | `{email, password}` | `200 {access_token, token_type, role, permissions}` | `401` bad credentials, `403` account deactivated |
| GET | `/auth/me` | any authenticated | - | `200 {subject, role, permissions, profile}` | `401` no/expired token, `403` deactivated |
| GET | `/auth/roles` | public | - | `200 {role: [permission]}` | - |

`register` carries no role field. The server assigns it: the first account on an
empty database becomes `system_admin` so a fresh environment can be
bootstrapped, and every later account becomes `doctor`. A caller cannot request
a role, so registration is not an escalation path.

`login` returns the same `401` for an unknown address and a wrong password, so
the endpoint cannot be used to discover which addresses are registered.

## User management - `/api/v1/users`

Every route requires `user:manage`, held by `system_admin` alone.

| Method | Path | Request | Response | Errors |
|---|---|---|---|---|
| GET | `/users` | query: `limit`, `offset`, `role`, `is_active` | `200 [UserRead]` + `X-Total-Count` | `403` |
| POST | `/users` | `{email, full_name, password, role, department?}` | `201 UserRead` | `409` email taken |
| GET | `/users/{id}` | - | `200 UserRead` | `404` |
| PATCH | `/users/{id}` | any of `{full_name, department, role, is_active}` | `200 UserRead` | `400` empty body or unknown field, `404`, `409` last administrator, `422` invalid role |

`PATCH` is also how a role is assigned. Demoting or deactivating the last active
`system_admin` returns `409`: nobody could reach these endpoints afterwards.

Only `full_name`, `department`, `role` and `is_active` are updatable. A body
naming `email` or `hashed_password` is refused with `400`.

## Patients - `/api/v1/patients`

| Method | Path | Permission | Request | Response | Errors |
|---|---|---|---|---|---|
| GET | `/patients` | authenticated, not researcher | query: `limit`, `offset`, `q` | `200 [PatientRead]` + `X-Total-Count` | `401`, `403` researcher |
| POST | `/patients` | `patient:write` | `PatientCreate` | `201 PatientRead` | `403`, `409` duplicate MRN |
| GET | `/patients/anonymised` | `patient:read_anonymized` | - | `200 []` | `403` |
| GET | `/patients/{id}` | authenticated, not researcher | - | `200 PatientRead` | `403` researcher, `404` |
| PATCH | `/patients/{id}` | `patient:write` | any of `{age_group, gender, race, primary_diagnosis, assigned_doctor_id}` | `200 PatientRead` | `400`, `403`, `404` |

**Scope.** A doctor sees only their own patients: those with
`patients.assigned_doctor_id` set to them, union those granted through
`doctor_patient_map`. `hospital_admin` and `system_admin` read hospital wide.
Researchers are routed to `/patients/anonymised`.

**A patient outside the caller's scope returns `404`, not `403`.** This is the
documented exception the conventions above ask for: `403` would confirm the
record exists, which discloses another clinician's caseload to a doctor who is
not permitted to see it. Missing and out of scope are indistinguishable.

`q` searches medical record number and primary diagnosis inside the caller's
scope, so a search can never surface a patient the caller could not already list.

`patient:write` is held by `system_admin` only, per the access matrix.

## Admissions - `/api/v1/patients/{patient_id}/admissions`

An admission is exactly as reachable as its patient: an out of scope or missing
patient returns `404` from every route below.

| Method | Path | Permission | Response | Errors |
|---|---|---|---|---|
| GET | `/{patient_id}/admissions` | authenticated, not researcher | `200 [AdmissionRead]` + `X-Total-Count` | `403`, `404` |
| POST | `/{patient_id}/admissions` | `patient:write` | `201 AdmissionRead` | `403`, `404`, `422` bad dates or negative counts |
| GET | `/{patient_id}/admissions/readmissions` | authenticated, not researcher | `200 ReadmissionSummary` | `403`, `404` |
| GET | `/{patient_id}/admissions/{admission_id}` | authenticated, not researcher | `200 AdmissionRead` | `403`, `404` |
| PATCH | `/{patient_id}/admissions/{admission_id}` | `patient:write` | `200 AdmissionRead` | `400`, `403`, `404`, `422` |

`ReadmissionSummary` is `{patient_id, total_admissions, readmitted_total,
by_label}`. `by_label` keeps the source dataset's own values (`NO`, `<30`,
`>30`) so the readmission window survives for Milestone 2 forecasting.

A partial update is validated against the stored row as well as the request, so
moving only `discharge_date` earlier than the stored `admission_date` returns
`422` rather than failing later as a database integrity error.

## Not implemented in Milestone 1

`/risk`, `/treatment`, `/clinical-support`, `/analytics` and `/models` remain the
mentor's placeholders and are owned by Milestones 2-4. They are guarded and
return empty or zeroed payloads.

Deferred with reason: refresh tokens (`FR-AUTH-03`), password reset
(`FR-AUTH-04`) and account lockout (`FR-AUTH-05`, needs a
`failed_login_attempts` column the reference schema does not carry).
