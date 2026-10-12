# API reference

This is the reference for every FastAPI operation registered by the backend at
the time of writing: **51 routes under `/api/v1`, plus `GET /` and
`GET /health`, 53 operations in all**. The count was taken from the registered
routers, and the committed schema [`openapi.json`](./openapi.json) was
regenerated from the same application object and contains the same 53
operations and 45 schemas (it previously held 33 operations, an export from
Milestone 1).

The live, always-accurate reference is the schema the running service
generates:

- Swagger UI: <http://localhost:8000/docs>
- ReDoc: <http://localhost:8000/redoc>
- Raw schema: <http://localhost:8000/api/v1/openapi.json>

The committed file is a snapshot. To refresh it without starting a server or
touching a database, build the schema from the application object (no
connection is opened and no file is written at import time):

```bash
cd backend
python - <<'PY'
import json
from app.main import app
open("../docs/03-api/openapi.json", "w", encoding="utf-8").write(
    json.dumps(app.openapi(), indent=2, ensure_ascii=False) + "\n"
)
PY
```

## Route map

| Prefix | Module | Routes | Written in |
|--------|--------|--------|-----------|
| `/api/v1/auth` | Authentication | 4 | Milestone 1 |
| `/api/v1/users` | User management | 4 | Milestone 1 |
| `/api/v1/patients` | Patient data, admissions, treatment outcomes | 5 + 7 | Milestones 1 and 3 |
| `/api/v1/risk` | Risk scoring and readmission forecasting | 6 | Milestone 2 |
| `/api/v1/clinical-support` | Clinical decision support (rule based) | 2 | Milestone 2 |
| `/api/v1/treatment` | Treatment effectiveness | 6 | Milestone 3 |
| `/api/v1/analytics` | Hospital analytics, population health, research cohort | 8 | Milestone 3 |
| `/api/v1/reports` | Report generation, storage and download | 6 | Milestone 3 |
| `/api/v1/models` | Model registry (read only) | 3 | Milestone 2 |
| `/health`, `/` | Liveness probe and banner | 2 | Scaffold |

## Conventions

- Everything is versioned under `/api/v1`.
- Status codes: `401` for a missing, invalid or expired token; `403` for a
  signed-in caller whose role lacks the permission; `404` for a missing
  resource, and also for a patient outside a doctor's scope (see below);
  `422` for a request body or parameter that fails validation, and for the
  re-identification guards on research endpoints; `503` when a prediction is
  requested but no verified model is available.
- Error bodies use FastAPI's `{"detail": "..."}` shape. Error messages carry no
  stack traces and no patient identifiers.
- The **Errors** column lists the codes the handler can raise, found by reading
  the handler and its helpers; it adds `401` and `403` for guarded routes and
  `422` for any route with inputs. It is a reading of the source, not a
  recorded test matrix.
- "Access" shows the permission the route declares and the roles that hold it
  today (see [`docs/04-rbac`](../04-rbac/README.md)). "Any signed-in role" means
  the route only requires a valid token, and the service then applies the role's
  scope rules: doctors are narrowed to their patients, researchers are refused
  on identifiable endpoints, and hospital administrators and system
  administrators read hospital wide.
- Pagination: `limit` and `offset` query parameters, with the total in an
  `X-Total-Count` response header on the list endpoints that document it.

## Clinical safety semantics of the prediction endpoints

Prediction outputs are **experimental model scores**, not diagnoses and not
calibrated probabilities. The models are logistic regressions trained with
class weighting, which ranks patients usefully but inflates the stated values
(`ml/configs/config.yaml` sets `calibration.method: none`). They have not been
clinically validated.

- `readmission_probability` (the name is historical) is a score in [0, 1]. For
  `prediction_type = "risk"` it scores the combined outcome "in-hospital death
  or 30-day readmission". For `"readmission"` it scores 30-day readmission after
  a live discharge. A score of 0.70 does not mean a 70% chance.
- `risk_category` (`low`, `medium`, `high`) is derived from fixed cut-offs: below
  0.40 is low, from 0.40 to below 0.70 is medium, and 0.70 and above is high
  (`RISK_THRESHOLD_MEDIUM` and `RISK_THRESHOLD_HIGH` in `backend/app/core/config.py`,
  applied by `categorise_risk`). These are not clinically validated thresholds.
- `confidence_score` (readmission forecasts only) equals `max(score, 1 - score)`,
  the distance of the score from 0.5. It does not indicate whether the
  prediction is right. The web interface deliberately does not display it.
- `GET /risk/forecast` counts scored patients at or above a fixed 0.50 score. It
  does not forecast unscored patients and is not a hospital-wide projection.
- Care recommendations and discharge plans come from fixed rules applied to the
  latest stored prediction (`backend/app/services/cds_service.py`, no language
  model and no external call). They are unvalidated and need clinician review.
- Every prediction is stored in `risk_predictions` with the model name and
  version, so history is append only; there is no delete endpoint.

## Authentication - `/api/v1/auth`

| Method | Path | Access | Query / body | Success | Errors | Purpose |
|---|---|---|---|---|---|---|
| POST | `/auth/register` | public | body: `UserRegister` | 201 `UserRead` | 409, 422 | Register a new account. |
| POST | `/auth/login` | public | body: `UserLogin` | 200 `Token` | 401, 403, 422 | Authenticate a user and issue an access token. |
| GET | `/auth/me` | any signed-in role (scope rules in the service) | - | 200 application/json | 401 | Return the caller's identity, role, permissions and profile. |
| GET | `/auth/roles` | public | - | 200 application/json | - | Expose the role catalogue and the permissions attached to each role. |

`register` carries no role field. The server assigns it: the first account on an
empty database becomes `system_admin` so a fresh environment can be
bootstrapped, and every later account becomes `doctor`. A caller cannot request
a role, so registration is not an escalation path. A new environment must
therefore register its first account immediately after the schema is created.

`login` returns the same `401` for an unknown address and a wrong password, so
the endpoint cannot be used to discover which addresses are registered. The
access token expires after `ACCESS_TOKEN_EXPIRE_MINUTES` (30 by default). The
web interface never exposes the token to browser code: it posts to its own
`/api/session` route, which stores the token in an httpOnly cookie (see
[`docs/01-architecture`](../01-architecture/README.md)).

## User management - `/api/v1/users`

Every route requires `user:manage`, held by `system_admin` alone.

| Method | Path | Access | Query / body | Success | Errors | Purpose |
|---|---|---|---|---|---|---|
| GET | `/users` | `user:manage`: System Admin | query: `limit`, `offset`, `role`, `is_active` | 200 `[UserRead]` | 401, 403, 422 | Return a page of platform users. |
| POST | `/users` | `user:manage`: System Admin | body: `UserCreate` | 201 `UserRead` | 401, 403, 409, 422 | Create a new platform user with the role the administrator chose. |
| GET | `/users/{user_id}` | `user:manage`: System Admin | path: `user_id` | 200 `UserRead` | 401, 403, 404, 422 | Return a single user record. |
| PATCH | `/users/{user_id}` | `user:manage`: System Admin | path: `user_id`; body: `UserUpdate` | 200 `UserRead` | 400, 401, 403, 404, 409, 422 | Apply a partial update, including moving the user to a different role. |

`PATCH` is also how a role is assigned. Demoting or deactivating the last active
`system_admin` returns `409`: nobody could reach these endpoints afterwards. Only
`full_name`, `department`, `role` and `is_active` are updatable. A body naming
`email` or `hashed_password` is refused with `400`.

## Patients - `/api/v1/patients`

| Method | Path | Access | Query / body | Success | Errors | Purpose |
|---|---|---|---|---|---|---|
| GET | `/patients` | any signed-in role (scope rules in the service) | query: `limit`, `offset`, `q` | 200 `[PatientRead]` | 401, 403, 422 | Return the patients the caller is allowed to see. |
| POST | `/patients` | `patient:write`: System Admin | body: `PatientCreate` | 201 `PatientRead` | 401, 403, 409, 422 | Create a patient record. |
| GET | `/patients/anonymised` | `patient:read_anonymized`: System Admin, Researcher | query: `limit`, `offset`, `diagnosis`, `gender`, `age_band`, `date_from`, `date_to` | 200 `[PatientAnonymised]` | 401, 403, 422 | Return a page of a de-identified cohort: no MRN, no name, a pseudonymous id. |
| GET | `/patients/{patient_id}` | any signed-in role (scope rules in the service) | path: `patient_id` | 200 `PatientRead` | 401, 403, 404, 422 | Return a single patient record the caller is permitted to see. |
| PATCH | `/patients/{patient_id}` | `patient:write`: System Admin | path: `patient_id`; body: `PatientUpdate` | 200 `PatientRead` | 400, 401, 403, 404, 422 | Apply a partial update. Only the fields present in the body are changed. |

**Scope.** A doctor sees only their own patients: those with
`patients.assigned_doctor_id` set to them, together with those granted through
`doctor_patient_map`. `hospital_admin` and `system_admin` read hospital wide.
Researchers are refused (`403`) on the identifiable endpoints and routed to
`/patients/anonymised`.

**A patient outside the caller's scope returns `404`, not `403`.** `403` would
confirm that the record exists, which would disclose another clinician's
caseload. Missing and out of scope are indistinguishable. `q` searches medical
record number and primary diagnosis inside the caller's scope only.

`/patients/anonymised` returns de-identified rows: a salted pseudonymous id and a
generalised age band, with no medical record number. If the filtered cohort is
smaller than `RESEARCH_MIN_COHORT_SIZE` (10 by default) the request is refused
with `422`, so a narrow filter cannot isolate an individual.

## Admissions and treatment outcomes - `/api/v1/patients/{patient_id}/admissions`

An admission is exactly as reachable as its patient: an out-of-scope or missing
patient returns `404` from every route below. `patient:write` is held by
`system_admin` only.

| Method | Path | Access | Query / body | Success | Errors | Purpose |
|---|---|---|---|---|---|---|
| GET | `/patients/{patient_id}/admissions` | any signed-in role (scope rules in the service) | path: `patient_id`; query: `limit`, `offset` | 200 `[AdmissionRead]` | 401, 403, 404, 422 | Return the patient's admissions, most recent first. |
| POST | `/patients/{patient_id}/admissions` | `patient:write`: System Admin | path: `patient_id`; body: `AdmissionCreate` | 201 `AdmissionRead` | 401, 403, 404, 422 | Record a new admission for a patient. |
| GET | `/patients/{patient_id}/admissions/readmissions` | any signed-in role (scope rules in the service) | path: `patient_id` | 200 `ReadmissionSummary` | 401, 403, 404, 422 | Return how many of the patient's admissions ended in a readmission. |
| GET | `/patients/{patient_id}/admissions/{admission_id}` | any signed-in role (scope rules in the service) | path: `patient_id`, `admission_id` | 200 `AdmissionRead` | 401, 403, 404, 422 | Return a single admission belonging to this patient. |
| PATCH | `/patients/{patient_id}/admissions/{admission_id}` | `patient:write`: System Admin | path: `patient_id`, `admission_id`; body: `AdmissionUpdate` | 200 `AdmissionRead` | 400, 401, 403, 404, 422 | Apply a partial update. Only the fields present in the body are changed. |
| GET | `/patients/{patient_id}/admissions/{admission_id}/treatments` | any signed-in role (scope rules in the service) | path: `patient_id`, `admission_id` | 200 `[TreatmentOutcomeRead]` | 401, 403, 404, 422 | Return every treatment outcome recorded for one admission. |
| POST | `/patients/{patient_id}/admissions/{admission_id}/treatments` | `patient:write`: System Admin | path: `patient_id`, `admission_id`; body: `TreatmentOutcomeCreate` | 201 `TreatmentOutcomeRead` | 401, 403, 404, 422 | Record a treatment/medication outcome for an admission the caller may see. |

`ReadmissionSummary` is `{patient_id, total_admissions, readmitted_total,
by_label}`. `by_label` keeps the source dataset's own values (`NO`, `<30`,
`>30`). A partial update is validated against the stored row as well as the
request, so moving only `discharge_date` earlier than the stored
`admission_date` returns `422` rather than failing later as a database error.

## Risk and readmission forecasting - `/api/v1/risk`

Literal paths (`predict`, `readmission`, `high-risk`, `forecast`) are declared
before the `/{patient_id}` routes so they are never shadowed. `predict` and
`readmission` score on demand with the production model named in
`model_metadata`; the feature row is assembled from PostgreSQL by the server,
so the caller supplies only identifiers. A patient or admission with
insufficient data is refused with `422`, and a missing or unverified model
returns `503`.

| Method | Path | Access | Query / body | Success | Errors | Purpose |
|---|---|---|---|---|---|---|
| POST | `/risk/predict` | `risk_report:read`: System Admin, Doctor | body: `RiskPredictionRequest` | 200 `RiskPredictionRead` | 401, 403, 404, 422, 503 | Score a patient's general risk and persist the result. |
| POST | `/risk/readmission` | `readmission_forecast:read`: System Admin, Doctor, Hospital Admin | body: `ReadmissionPredictionRequest` | 200 `RiskPredictionRead` | 401, 403, 404, 422, 503 | Forecast whether an admission will be followed by a 30-day readmission. |
| GET | `/risk/high-risk` | `risk_report:read`: System Admin, Doctor | - | 200 `[RiskPredictionRead]` | 401, 403 | Return each visible patient's latest prediction, filtered to High risk. |
| GET | `/risk/forecast` | `readmission_forecast:read`: System Admin, Doctor, Hospital Admin | - | 200 `ReadmissionForecast` | 401, 403 | Return an aggregated 30-day readmission forecast, scoped to the caller. |
| GET | `/risk/{patient_id}` | `readmission_forecast:read` or `risk_report:read`: System Admin, Doctor, Hospital Admin | path: `patient_id`; query: `type` | 200 `RiskPredictionRead` | 401, 403, 404, 422 | Return a patient's most recent risk score (default) or readmission forecast. |
| GET | `/risk/{patient_id}/history` | `readmission_forecast:read` or `risk_report:read`: System Admin, Doctor, Hospital Admin | path: `patient_id`; query: `type` | 200 `[RiskPredictionRead]` | 401, 403, 404, 422 | Return a patient's risk-score (default) or readmission-forecast history. |

The `type` query parameter on the read routes selects `risk` (default) or
`readmission`. The per-patient reads accept either `risk_report:read` or
`readmission_forecast:read`, so a hospital administrator can read back what
they created.

## Clinical decision support - `/api/v1/clinical-support`

| Method | Path | Access | Query / body | Success | Errors | Purpose |
|---|---|---|---|---|---|---|
| GET | `/clinical-support/recommendations/{patient_id}` | `care_recommendation:generate`: System Admin, Doctor | path: `patient_id` | 200 `CareRecommendationsRead` | 401, 403, 404, 422 | Return deterministic, rule-based care and follow-up recommendations. |
| GET | `/clinical-support/discharge-plan/{patient_id}` | `care_recommendation:generate`: System Admin, Doctor | path: `patient_id` | 200 `DischargePlanRead` | 401, 403, 404, 422 | Return a discharge readiness assessment and risk mitigation steps. |

Both routes read the patient's latest stored prediction (and most recent
admission) and map it to a fixed rule library. A patient with no stored
prediction returns `404` asking the caller to score the patient first; no
recommendation is invented without a score.

## Treatment effectiveness - `/api/v1/treatment`

Doctors hold only `treatment_report:read_limited`: their figures cover their own
patients. Roles with the full `treatment_report:read` see hospital-wide figures.

| Method | Path | Access | Query / body | Success | Errors | Purpose |
|---|---|---|---|---|---|---|
| GET | `/treatment` | `treatment_report:read` or `treatment_report:read_limited`: all four roles | query: `treatment_name`, `department` | 200 `[TreatmentRateSummary]` | 401, 403, 422 | Return sample size, average recovery score and success rate (share of outcomes recorded as "improved") per treatment. |
| GET | `/treatment/outcomes` | `treatment_report:read` or `treatment_report:read_limited`: all four roles | query: `treatment_name`, `department` | 200 `[TreatmentOutcomeDistribution]` | 401, 403, 422 | Cross-tabulate recorded outcomes against treatment (FR-ANL-02). Every outcome value is present in each breakdown; NULL outcomes are counted as "unrecorded". |
| GET | `/treatment/departments` | `treatment_report:read` or `treatment_report:read_limited`: all four roles | - | 200 `[DepartmentEffectiveness]` | 401, 403 | Recovery, success and readmission rates grouped by admission department. Admissions without a department are reported as "unassigned". |
| GET | `/treatment/recovery-trends` | `treatment_report:read` or `treatment_report:read_limited`: all four roles | query: `treatment_name`, `weeks` | 200 `[RecoveryTrendPoint]` | 401, 403, 422 | Weekly average recovery score by discharge week, most recent ``weeks`` with data. |
| GET | `/treatment/readmission-reduction` | `treatment_report:read` or `treatment_report:read_limited`: all four roles | query: `treatment_name*` | 200 `ReadmissionReduction` | 401, 403, 404, 422 | Compare one treatment's readmission rate against the baseline over the same scope (hospital-wide, or the doctor's own patients). |
| GET | `/treatment/compare` | `treatment_report:read` or `treatment_report:read_limited`: all four roles | query: `diagnosis*` | 200 `[TreatmentComparison]` | 401, 403, 422 | Compare recovery/success/readmission figures across treatments for one diagnosis. |

## Healthcare analytics and research - `/api/v1/analytics`

Hospital figures are narrowed by the same patient-scope rule as patient
queries. The research routes apply the minimum-cohort guard (`422` below the
threshold) and generalise values before returning them. `research-export`
returns an anonymised CSV and is recorded in the audit log together with its
filters.

| Method | Path | Access | Query / body | Success | Errors | Purpose |
|---|---|---|---|---|---|---|
| GET | `/analytics/summary` | `hospital_analytics:read`: System Admin, Hospital Admin, Researcher | - | 200 `HospitalAnalyticsSummary` | 401, 403 | Headline KPIs: patients, admissions, readmission rate, average length of stay and the distribution of each patient's latest risk category. |
| GET | `/analytics/readmissions` | `hospital_analytics:read`: System Admin, Hospital Admin, Researcher | query: `months` | 200 `[ReadmissionTrendPoint]` | 401, 403, 422 | Monthly readmission rate by admission month, most recent ``months`` with data. |
| GET | `/analytics/discharge-outcomes` | `hospital_analytics:read`: System Admin, Hospital Admin, Researcher | - | 200 `DischargeOutcomeDistribution` | 401, 403 | Admission counts grouped by discharge disposition. |
| GET | `/analytics/departments` | `hospital_analytics:read`: System Admin, Hospital Admin, Researcher | query: `sort_by`, `order`, `date_from`, `date_to` | 200 `[DepartmentAnalytics]` | 401, 403, 422 | Per-department patients, admissions, average stay and readmission rate, optionally limited to an admission-date window. Admissions with no department are reported as "unassigned". |
| GET | `/analytics/trends` | `hospital_analytics:read`: System Admin, Hospital Admin, Researcher | query: `metric*`, `months` | 200 `[TrendPoint]` | 401, 403, 422 | One monthly {period, total, breakdown} series. |
| GET | `/analytics/population-health` | `population_health:read`: System Admin, Hospital Admin, Researcher | - | 200 `PopulationHealthSummary` | 401, 403 | Aggregated population statistics - never a row-level record. |
| GET | `/analytics/research-cohort` | `population_health:read`: System Admin, Hospital Admin, Researcher | query: `diagnosis`, `gender`, `age_band`, `date_from`, `date_to` | 200 `CohortStatistics` | 401, 403, 422 | Size and demographic/diagnosis breakdown of a filtered cohort, using the same generalised values the anonymised export exposes. |
| GET | `/analytics/research-export` | `research_dataset:export`: System Admin, Researcher | query: `diagnosis`, `gender`, `age_band`, `date_from`, `date_to` | 200 text/csv | 401, 403, 422 | Anonymised cohort as a CSV attachment: pseudonymous id, generalised age band, gender and primary diagnosis only. The export is audit-logged. |

## Reports - `/api/v1/reports`

Reports arrange the same figures the dashboards use (`AnalyticsService` and
`TreatmentService`), render them as CSV, XLSX or PDF, store the file under
`REPORT_STORAGE_DIR` and record its metadata in the `reports` table. A caller
sees their own reports; a system administrator sees all. The data permission
for the report type is re-checked on every download, and a report whose file has
been purged returns `410`. Report types: `treatment_effectiveness`,
`patient_outcomes`, `department_performance`, `population_health`,
`risk_distribution`, `readmission_analytics`, `research_cohort`.

| Method | Path | Access | Query / body | Success | Errors | Purpose |
|---|---|---|---|---|---|---|
| POST | `/reports/generate` | `analytics:export`: System Admin, Hospital Admin, Researcher | body: `ReportGenerateRequest` | 201 `ReportRead` | 401, 403, 422 | Generate a report in CSV, Excel (.xlsx) or PDF format and store it. |
| GET | `/reports` | `analytics:export`: System Admin, Hospital Admin, Researcher | query: `report_type`, `limit`, `offset` | 200 `[ReportRead]` | 401, 403, 422 | The caller's reports, newest first (every user's for a system administrator). |
| POST | `/reports/purge` | `system:configure`: System Admin | query: `older_than_days` | 200 `ReportPurgeResult` | 401, 403, 422 | Remove every report, row and file, generated before the retention cutoff. |
| GET | `/reports/{report_id}` | `analytics:export`: System Admin, Hospital Admin, Researcher | path: `report_id` | 200 `ReportRead` | 401, 403, 404, 422 | Metadata for one of the caller's reports. |
| GET | `/reports/{report_id}/download` | `analytics:export`: System Admin, Hospital Admin, Researcher | path: `report_id` | 200 text/csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/pdf | 401, 403, 404, 410, 422 | Stream the stored file as an attachment. |
| DELETE | `/reports/{report_id}` | `analytics:export`: System Admin, Hospital Admin, Researcher | path: `report_id` | 204 | 401, 403, 404, 422 | Delete one of the caller's reports (any report, for a system administrator). |

## Model registry - `/api/v1/models`

Read-only views of the `model_metadata` table, for `system_admin` only. Models
are trained from the command line (`ml/`) and registered with
`scripts/register_model.py`; there is no training or promotion endpoint.

| Method | Path | Access | Query / body | Success | Errors | Purpose |
|---|---|---|---|---|---|---|
| GET | `/models` | `model:manage`: System Admin | - | 200 `[ModelMetadataRead]` | 401, 403 | Return every registered model version, newest first. |
| GET | `/models/active` | `model:manage`: System Admin | - | 200 `[ModelMetadataRead]` | 401, 403 | Return the production version of each tracked model family, if registered. |
| GET | `/models/metrics` | `model:manage`: System Admin | - | 200 application/json | 401, 403 | Return accuracy/precision/recall/F1/ROC-AUC for each active model family. |

## System

| Method | Path | Access | Purpose |
|---|---|---|---|
| GET | `/health` | public | Liveness probe: `{status, service, environment}`. Used by the Docker health check and CI. |
| GET | `/` | public | Service banner pointing at `/docs`. |

## Not implemented

- Refresh tokens (`FR-AUTH-03`), password reset (`FR-AUTH-04`) and account
  lockout (`FR-AUTH-05`; it needs a `failed_login_attempts` column the schema
  does not carry). `REFRESH_TOKEN_EXPIRE_MINUTES` exists in the configuration
  but nothing issues a refresh token.
- An audit-log query or export endpoint (`FR-AUD-04`). Audit rows are written
  (authentication, patient reads, predictions, exports and administrative
  changes) but no route reads them; the `audit_log:read` permission is defined
  and unused.
- Recording actual readmission outcomes against predictions (`FR-READM-04`). The
  `actual_readmitted` and `outcome_recorded_at` columns exist and nothing writes
  them.
- A logout route on the API. Signing out clears the web interface's session
  cookie; the token itself simply expires.
- Model training, promotion or deployment endpoints.

## Verification status

| Claim | Status |
|---|---|
| 53 operations are registered and appear in `openapi.json` | Verified by static route inspection and by generating the schema |
| Access and status-code columns | Read from the source; the automated tests cover the main role and scope cases (see [`docs/07-testing`](../07-testing/README.md)) |
| Response examples | None are included: the schema in `openapi.json` is the contract, and real records are never shown in documentation |
