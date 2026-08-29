# Access matrix - the four roles

The brief names four roles. This document describes what each may do; the
enforced version lives in `backend/app/core/rbac.py`, and
`backend/tests/test_rbac.py` fails if the two disagree.

`GET /api/v1/auth/roles` returns the same matrix at runtime, read from the same
source, so documentation cannot drift away from enforcement.

## Roles

| Role | Identifier | Purpose |
|---|---|---|
| Doctor | `doctor` | Treats assigned patients |
| Hospital Administrator | `hospital_admin` | Runs hospital operations |
| Healthcare Researcher | `researcher` | Studies populations, never individuals |
| System Administrator | `system_admin` | Operates the platform |

These four identifiers are exact. Roles from other systems - `nurse`,
`data_scientist`, `admin` - are not part of this platform, and a token carrying
one is rejected with 403.

## What each role may do

| Capability | Doctor | Hospital Admin | Researcher | System Admin |
|---|:-:|:-:|:-:|:-:|
| Read assigned patients | yes | - | - | yes |
| Read all patients | - | yes | - | yes |
| Read anonymised cohort | - | - | yes | yes |
| Write patient records | yes | - | - | yes |
| Read medical history | yes | - | - | yes |
| Read individual risk report | yes | - | - | yes |
| Read aggregated risk report | - | yes | yes | yes |
| Read hospital analytics | - | yes | yes | yes |
| Export research dataset | - | - | yes | yes |
| Manage users | - | - | - | yes |
| Manage models | - | - | - | yes |
| Read audit log | - | - | - | yes |

Three restrictions are worth stating explicitly, because they are the ones most
easily loosened by accident:

**A doctor cannot read the whole hospital.** They hold
`patient:read_assigned`, not `patient:read_all`, and their queries are filtered
to `assigned_doctor_id = <their id>`.

**A researcher never sees an identified patient.** They hold neither
`patient:read_all` nor `patient:read_assigned`. De-identification happens on the
server before the response is built, not in the browser.

**A hospital administrator does not read medical histories.** They see counts,
rates and aggregates. Running the hospital does not require reading a
consultation note.

## How it is enforced

Two independent mechanisms, both required:

1. **Permission guards** decide whether a caller may reach an endpoint.
   `require_verified_permission(Permission.PATIENT_WRITE)` returns 403 otherwise.
2. **Row scoping** decides which records they get once inside.
   `patient_service.scope_query` applies the filter.

A guard alone is not enough: a doctor calling `/patients` passes the permission
check, and scoping is what stops the response containing the whole hospital.

A patient outside the caller's scope returns **404, not 403**, because a 403
would confirm the record exists.

## Adding a permission

1. Add the value to `Permission` in `backend/app/core/rbac.py`.
2. Grant it to the roles that need it in `PERMISSIONS`.
3. Add a test in `backend/tests/test_rbac.py` asserting which roles do *not*
   hold it.
4. Update the table above.

Never weaken an existing restriction to make a feature work. If a role needs
data it currently cannot see, that is a design conversation, not a one-line
change to the matrix.
