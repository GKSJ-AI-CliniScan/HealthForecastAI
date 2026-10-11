# Role-based access control

Four roles, taken directly from the project brief. The machine-readable version
lives in [`backend/app/core/rbac.py`](../../backend/app/core/rbac.py) and is
pinned by [`backend/tests/test_rbac.py`](../../backend/tests/test_rbac.py).

## Access matrix

| Feature | Doctor | Hospital Administrator | Healthcare Researcher | System Administrator |
|---|---|---|---|---|
| Patient records | Assigned patients only | View only | Anonymised only | Yes |
| Medical history | Assigned patients only | View only | Anonymised only | Yes |
| Risk prediction reports | Yes | Yes | Aggregated only | Yes |
| Readmission forecasts | Yes | Yes | Aggregated only | Yes |
| Treatment effectiveness reports | Limited | Yes | Yes | Yes |
| Hospital analytics dashboard | No | Full access | Aggregated only | Full access |
| Population health reports | No | No | Yes | Yes |
| Research dataset export | No | No | Yes | Yes |
| User management | No | No | No | Yes |
| Model management | No | No | No | Yes |

## Responsibilities

**Doctor** - monitor patient health risks, review readmission predictions,
evaluate treatment effectiveness, support discharge planning.
Cannot access patients outside their assigned scope, manage users, or modify models.

**Hospital Administrator** - hospital performance monitoring, resource
utilisation oversight, patient outcome management, operational analytics.
Cannot modify patient medical records or alter AI prediction models.

**Healthcare Researcher** - healthcare analytics research, clinical outcome
analysis, population health studies, treatment effectiveness evaluation.
Cannot access personally identifiable information, modify records, or approve
clinical decisions.

**System Administrator** - platform administration, user management, security
monitoring, system governance. No restrictions.

## Implementing a new endpoint

```python
from app.api.deps import CurrentUser, require_permission
from app.core.rbac import Permission

@router.get("/example")
def example(user: CurrentUser = Depends(require_permission(Permission.RISK_REPORT_READ))):
    ...
```

## Rules

1. Every endpoint declares a permission. No exceptions.
2. Authorise on the server. A hidden menu item in the frontend is not security.
3. Widening a role's permissions is a design decision - raise it with your mentor
   before you do it.
4. `backend/tests/test_rbac.py` encodes the restrictions above. If your change
   makes it fail, the change is wrong, not the test.

## How this project implements it

| Rule | Implementation |
|---|---|
| Four roles | `doctor`, `hospital_admin`, `researcher`, `system_admin` (`app/core/rbac.py`) |
| Permission check | `require_permission(Permission.X)` on every protected endpoint; 401 without a token, 403 without the permission |
| Doctor sees assigned patients only | `patient_service.get_visible_patients` and `risk_service` filter on `assigned_doctor_id` |
| Researcher sees anonymised data only | `GET /patients/anonymised` returns a pseudo ID (`RSCH-0001`), demographics and latest risk category; no patient ID, MRN or doctor |
| User and model management | System administrator only (`MODEL_MANAGE` permission for `/models`) |
| Frontend | The sidebar hides pages the role cannot use. This is convenience only; the server enforces access |
| Audit | Logins and user changes are written to `audit_logs` |
| Deleting a user | Soft delete (`is_active = false`) so the audit trail stays valid |

Evidence: `evidence/role_based.png` and `backend/tests/test_rbac.py`.
[Confirm the "Limited" doctor access to treatment reports matches what your app does, and state it here in one sentence.]