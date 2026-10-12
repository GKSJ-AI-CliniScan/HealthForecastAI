# Role-based access control

HealthForecast AI has four roles, taken from the project brief. The
machine-readable definition is
[`backend/app/core/rbac.py`](../../backend/app/core/rbac.py), pinned by
[`backend/tests/test_rbac.py`](../../backend/tests/test_rbac.py) and
[`backend/tests/test_authorization.py`](../../backend/tests/test_authorization.py).

This document shows two things side by side, because they are not identical:

1. **What the brief and SRS require** (section 1).
2. **What the code implements** (section 2), with every difference flagged and
   the open decisions listed in section 6.

Where they differ, this document records the difference. It does not change a
requirement and it does not describe the code as something it is not.

## 1. Access matrix required by the brief

Source: project brief section 4, "Access Matrix"
([`docs/brief`](../brief/HealthForecast-AI-project-brief.pdf), pages 5 to 6), and
SRS section 9 ([`docs/niyati/HealthForecastAI_SRS.md`](../niyati/HealthForecastAI_SRS.md)),
which carries the same matrix.

| Feature | Doctor | Hospital Administrator | Healthcare Researcher | System Administrator |
|---|---|---|---|---|
| Patient records | Assigned patients only | View only | Anonymised only | Yes |
| Medical history | Assigned patients only | View only | Anonymised only | Yes |
| Risk prediction reports | Yes | Yes | Aggregated only | Yes |
| Readmission forecasts | Yes | Yes | Aggregated only | Yes |
| Treatment effectiveness reports | Yes | Yes | Yes | Yes |
| Hospital analytics dashboard | Limited | Full access | Aggregated only | Full access |
| Population health reports | No | Yes | Yes | Yes |
| Research dataset export | No | No | Yes | Yes |
| User management | No | No | No | Yes |
| Model management | No | No | No | Yes |

> **Correction.** An earlier version of this file said its matrix was "taken
> directly from the project brief" but differed from the brief in three cells:
> it showed Doctor treatment effectiveness as *Limited* (brief: Yes), Doctor
> hospital analytics as *No* (brief: Limited), and Hospital Administrator
> population health as *No* (brief: Yes). The table above restores the brief's
> values. `docs/brief/README.md` states that the brief wins where the repository
> disagrees with it.

Per-role responsibilities, restrictions and permissions are in the brief
(section 4, "Role-Based Access Control"). In short: doctors cannot access
patients outside their assigned scope, manage users or modify models; hospital
administrators cannot modify patient records or models; researchers cannot access
personally identifiable information or modify records; the system administrator
has no restrictions.

## 2. What is implemented

Legend: **=** matches the brief, **narrower** or **different** means the code
grants less (or something else) than the brief states. Evidence is the
permission sets in `rbac.py` and the route guards (see
[`docs/03-api`](../03-api/README.md) for every route's declared permission).

| Feature | Doctor | Hospital Administrator | Healthcare Researcher | System Administrator |
|---|---|---|---|---|
| Patient records | = Own patients (assigned doctor or `doctor_patient_map`); others return `404` | = Hospital-wide, read only (no `patient:write`) | = `403` on identifiable routes; anonymised cohort only | = Read all and write |
| Medical history (admissions, treatment outcomes) | = Own patients | = Hospital-wide, read only. No separate permission is enforced (see 3) | = Refused on admission routes; cohort statistics only | = Yes |
| Risk prediction reports | = Score patients, read history, list high-risk (own patients) | **Narrower.** May read stored predictions per patient and forecasts, but cannot score (`/risk/predict`) or list high-risk patients (`/risk/high-risk`) | **Different.** No `/risk` route; risk distribution appears only inside `/analytics` figures | = Yes |
| Readmission forecasts | = Create and read; aggregate scoped to own patients | = Create and read; hospital-wide aggregate | **Different.** No `/risk` route (`403`); trends appear only inside `/analytics` | = Yes |
| Treatment effectiveness | **Narrower.** `treatment_report:read_limited`: figures cover own patients only | = Hospital-wide | = Yes (aggregated by treatment, no patient rows) | = Yes |
| Hospital analytics dashboard | **Narrower.** None: `/analytics/*` returns `403`. The brief says "Limited" and the code notes the term is undefined | = Full | = Same endpoints as the administrator; all are aggregate figures | = Full |
| Population health reports | = `403` | = Yes | = Yes | = Yes |
| Research dataset export | = `403` | = `403` | = Yes | = Yes |
| User management | = `403` | = `403` | = `403` | = Yes |
| Model management | = `403` | = `403` | = `403` | = Yes (read-only registry) |

Permissions the matrix does not mention, and who holds them:

| Capability | Permission | Holders |
|---|---|---|
| Care recommendations and discharge plan | `care_recommendation:generate` | Doctor, System Administrator |
| Generate, list, download and delete reports | `analytics:export` | Hospital Administrator, Researcher, System Administrator |
| Purge expired reports | `system:configure` | System Administrator |
| Create or edit patients, admissions, treatment outcomes | `patient:write` | System Administrator |

Brief and SRS items that the implementation does not provide:

- A doctor generating "patient outcome reports" (brief, doctor permissions; SRS
  `FR-RPT-03`). Doctors hold no `analytics:export`, so the reports area is not
  offered to them.
- A system administrator accessing audit logs and monitoring platform activity
  (brief, system administrator permissions; SRS `FR-AUD-04`). Audit rows are
  written but no route or page reads them.

## 3. How access is enforced

Two layers run on the server for every request
([`backend/app/api/deps.py`](../../backend/app/api/deps.py)):

1. **Which kinds of resource a role may touch.** `require_permission(...)` maps a
   route to a permission and allows the request only if the caller's role holds
   it. Routes that only need a signed-in user depend on
   `get_current_active_user`, and their service then applies the role's rules.
2. **Which rows.** `patient_scope_for(user)` returns the doctor's id for a doctor
   and `None` for the other roles. `PatientRepository.scope_clause` turns that
   into one `EXISTS` predicate: the patient's `assigned_doctor_id` equals the
   doctor, or a `doctor_patient_map` row links them. The id always comes from the
   authenticated caller, never from a request parameter, so a doctor cannot ask
   for another doctor's list. Risk, analytics, treatment, report and decision
   support services reuse the same function.

Every request re-reads the account: `get_current_active_user` loads the user
row, rejects a deleted account with `401` and a deactivated one with `403`, and
takes the role from the database rather than the token, so a demotion applies on
the next request instead of at token expiry.

The web interface builds its navigation from the permission list the backend
returns for the signed-in user. That is a convenience; a link that is hidden is
not protected, and a link that is shown still leads to a route the server
authorises again.

Out-of-scope behaviour:

- A doctor requesting a patient (or an admission, prediction or recommendation
  for a patient) outside their scope receives `404`, identical to a missing
  record, so the response does not reveal another clinician's caseload.
- A role lacking the permission receives `403`.

Note on the "every endpoint declares a permission" rule. Nine routes depend only
on `get_current_active_user` (patient list and read, admission and treatment-outcome
reads, `/auth/me`) and rely on the service's role rules; three `/auth` routes are
public by design. Five named permissions are defined but not enforced by name in
any route: `patient:read_assigned`, `patient:read_all`, `medical_history:read`,
`risk_report:read_aggregated` and `audit_log:read`. The first two drive the web
navigation; the last has no route.

## 4. Researcher anonymisation and minimum cohort

- A researcher is refused on every identifiable patient route (`403`) and uses
  `/patients/anonymised`, `/analytics/research-cohort` and
  `/analytics/research-export`.
- Anonymised rows carry a salted pseudonymous id (`ANONYMISATION_SALT`), a
  generalised age band, and no medical record number. A production environment
  refuses to start with the placeholder salt.
- A filtered cohort smaller than `RESEARCH_MIN_COHORT_SIZE` (10, never below 1)
  is refused with `422`, so filters cannot isolate an individual.
- Spreadsheet formulas in exported text are neutralised, and each export is
  recorded in the audit log with its filters.
- The researcher's web pages show cohort rows without identifiers and state the
  privacy scope.

## 5. Tests that pin this behaviour

| Behaviour | Test file |
|---|---|
| Every role has a permission set; system administrator holds all; named restrictions hold (for example a doctor cannot manage users or models; a hospital administrator cannot write patients; a researcher cannot read identifiable records) | `backend/tests/test_rbac.py` |
| Endpoint matrix by role: user management, identifiable list versus anonymised cohort, and others | `backend/tests/test_authorization.py` |
| Doctor scope on patients, admissions, treatment, analytics | `test_patients.py`, `test_admissions.py`, `test_treatment.py`, `test_analytics.py` |
| Pseudonymisation, minimum cohort, anonymised endpoints, audit of exports | `test_research_export.py` |
| Navigation shown per role | `frontend/src/lib/navigation.test.ts`, `frontend/src/app/dashboard/layout.test.tsx` |
| Live end-to-end role checks | `backend/tests/e2e/test_api_regression.py` (skipped unless a running backend and role credentials are provided) |

The tests do not pin the contested cells in section 6 (hospital administrator
risk reports, doctor analytics), so those behaviours are documented from the
code, not from a test.

## 6. Known gaps and open decisions

| Item | Brief | Code | Status |
|---|---|---|---|
| Doctor, hospital analytics ("Limited") | Limited | None (`403`) | Open. What "Limited" means is undefined; the code comments say so. The analytics services already narrow figures for a doctor, so a limited permission could be added later without service changes. |
| Doctor, treatment effectiveness | Yes | Limited to own patients | Implemented narrower than the brief; deliberate, covered by `test_treatment.py`. Needs a mentor decision on which reading stands. |
| Hospital administrator, risk prediction reports | Yes | Per-patient reads only; cannot score or list high-risk | Open. Confirm whether the brief means scoring and high-risk lists. |
| Researcher, risk and forecast reports ("Aggregated only") | Aggregated only | No `/risk` access; aggregates only through `/analytics` | Open; reasonable reading, not confirmed. |
| Doctor generating reports | Yes (outcome reports) | Not offered | Gap |
| System administrator audit access | Yes | No route or page | Gap |
| Authentication hardening (refresh tokens, reset, lockout) | SRS only | Not implemented | Documented in [`docs/03-api`](../03-api/README.md) |

## 7. Adding an endpoint

```python
from app.api.deps import CurrentUser, require_permission
from app.core.rbac import Permission

@router.get("/example")
def example(user: CurrentUser = Depends(require_permission(Permission.RISK_REPORT_READ))):
    ...
```

Rules:

1. Declare a permission, or depend on `get_current_active_user` and apply the
   role's scope in the service.
2. Authorise on the server. A hidden menu item is not security.
3. Widening a role's permissions is a design decision; raise it with the mentor.
4. `backend/tests/test_rbac.py` encodes the restrictions. If a change makes it
   fail, the change is wrong, not the test.
