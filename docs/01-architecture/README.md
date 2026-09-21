# Architecture

Delivered in Milestone 1. This describes what is built, not what is planned.

## System shape

```
                        ┌────────────────────────────────┐
                        │  Next.js 15 frontend           │
                        │  App Router, Tailwind, Recharts│
                        │  role-aware navigation         │
                        └───────────────┬────────────────┘
                                        │ HTTPS · Bearer JWT
                        ┌───────────────▼────────────────┐
                        │  FastAPI backend               │
                        │  ┌──────────────────────────┐  │
                        │  │ api/deps.py              │  │
                        │  │  get_current_user        │  │
                        │  │  require_permission      │  │  ← every endpoint
                        │  └───────────┬──────────────┘  │
                        │  ┌───────────▼──────────────┐  │
                        │  │ services/                │  │
                        │  │  scoping + business logic│  │
                        │  └───────────┬──────────────┘  │
                        └──────────────┼─────────────────┘
                                       │
              ┌────────────────────────┴───────────────────┐
              │                                            │
   ┌──────────▼───────────┐                    ┌───────────▼──────────┐
   │  PostgreSQL 16       │                    │  MongoDB 7           │
   │   users              │                    │   clinical_notes     │
   │   patients           │                    │   model_runs         │
   │   admissions         │                    │   prediction_events  │
   │   risk_predictions   │                    │   (Milestone 2+)     │
   │   treatment_outcomes │                    └──────────────────────┘
   │   audit_logs         │
   └──────────▲───────────┘
              │ bulk load
   ┌──────────┴────────────────────────────┐
   │  ML pipeline (ml/)                    │
   │   load → clean → engineer → ETL       │  Milestone 1
   │   → train → evaluate → artifact       │  Milestone 2
   └───────────────────────────────────────┘
```

## Layer responsibilities

| Layer | Rule |
|-------|------|
| `api/v1/endpoints/` | Validate input, declare a permission, call a service, shape the response. No SQL. |
| `api/deps.py` | The only place a caller's identity is established. Loads the real user row. |
| `services/` | Business logic and scoping. Owns every query that touches patient data. |
| `models/` | SQLAlchemy ORM. One file per table. |
| `schemas/` | Pydantic. The API contract, separate from the storage shape. |

The separation matters for one specific reason: **scoping is applied in the
query, not after it**. `patient_service.scoped_query()` returns a `SELECT` that
is already narrowed to what the caller may see, so a row outside their scope is
never loaded into memory in the first place.

## Request path: a doctor opens a patient

1. `GET /api/v1/patients/42` with `Authorization: Bearer <jwt>`.
2. `get_current_user` decodes the JWT, loads the user row, and rejects the
   request if the account was deactivated since the token was issued.
3. `patient_service.get_patient()` builds `SELECT ... WHERE assigned_doctor_id = <caller>`.
4. Out of scope → zero rows → the endpoint returns **404, not 403**. A 403 would
   confirm the record exists, which is itself a disclosure.
5. In scope → the patient and their admission history are returned.

## Why two databases

PostgreSQL holds anything with referential integrity and constraints: a
readmission probability must be between 0 and 1, a discharge date cannot precede
an admission date, an audit entry must name its actor. Those are `CHECK`
constraints, and they belong in a relational engine.

MongoDB holds what has no stable shape: free-text clinical notes, model run
metadata whose hyperparameter set changes with every experiment, and prediction
events used for drift monitoring. Forcing those into columns would mean a
migration every time a model gains a parameter.

## Authentication

- Login returns a signed JWT carrying `sub` (user id), `role`, `iat` and `exp`.
- The frontend stores it in `sessionStorage` and sends it as a bearer token.
- The backend re-loads the user on every request rather than trusting the role
  claim, so deactivating an account revokes live sessions immediately.
- Both successful and failed logins are written to `audit_logs`.

**Known gap:** `sessionStorage` is readable by any script on the page, so an XSS
bug would expose the token. Moving to an httpOnly cookie set by the backend is
the Milestone 4 hardening task.

## What Milestone 1 does not include

Risk prediction, readmission forecasting, treatment effectiveness and clinical
decision support endpoints exist and are authorised, but return placeholder
data. They are marked `TODO(milestone-2)` and `TODO(milestone-3)`.
