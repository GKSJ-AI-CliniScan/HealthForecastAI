# Architecture

## System shape

```
                        +------------------------+
                        |  Next.js frontend      |
                        |  role-aware dashboards |
                        +-----------+------------+
                                    | HTTPS / JWT
                        +-----------v------------+
                        |  FastAPI backend       |
                        |  RBAC guard on every   |
                        |  endpoint              |
                        +--+------------------+--+
                           |                  |
              +------------v----+      +------v-----------+
              |  PostgreSQL     |      |  MongoDB         |
              |  users          |      |  clinical notes  |
              |  patients       |      |  model runs      |
              |  admissions     |      |  prediction      |
              |  predictions    |      |  events          |
              |  treatments     |      +------------------+
              |  audit logs     |
              +-----------------+
                           ^
                           |  batch scoring
              +------------+-----------------+
              |  ML pipeline (ml/)           |
              |  preprocess -> train ->      |
              |  evaluate -> artifact        |
              +------------------------------+
```

## Request path for a risk prediction

1. The doctor's dashboard calls `POST /api/v1/risk/predict` with a bearer token.
2. `require_permission(Permission.RISK_REPORT_READ)` authorises the caller.
3. The service loads the promoted model artifact and scores the admission.
4. The probability is banded into low / medium / high by `risk_service.py`.
5. The result is written to `risk_predictions` and logged to `audit_logs`.

## Deliverable for milestone 1

Replace the ASCII sketch above with a proper diagram, and add:

- A component diagram naming every service and its responsibility.
- A data flow diagram from raw dataset to dashboard.
- Your reasoning for the PostgreSQL / MongoDB split.
- Where authentication, authorisation and audit logging sit in the path.
