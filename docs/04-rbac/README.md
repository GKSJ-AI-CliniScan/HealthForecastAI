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
