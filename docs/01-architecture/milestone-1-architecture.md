# System architecture - Milestone 1

HealthForecast AI predicts hospital readmission risk from historical admission
data. This document describes what exists after Milestone 1 and where the
prediction path will attach in Milestone 2.

## Layers

```
Browser (Next.js 15 / React 19 / Tailwind)
  |
  |  fetch with Bearer token, JSON over HTTP
  v
FastAPI  (backend/app)
  |
  +-- api/deps.py ............ authentication + permission guards
  +-- api/v1/endpoints/ ...... HTTP surface, thin
  +-- services/ .............. business rules, row scoping
  +-- models/ ................ SQLAlchemy ORM
  |
  v
PostgreSQL 16                        MongoDB 7 (planned)
  users / patients / admissions      unstructured clinical notes
  |
  ^
  |  ETL: database/postgres/seeds/seed_from_dataset.py
  |
Diabetes 130-US Hospitals dataset (ml/data/raw, never committed)
  |
  v
ML pipeline (ml/src)
  load_data -> preprocess -> build_features -> model-ready table
```

## Request path for a guarded endpoint

Taking `GET /api/v1/patients` as the example:

1. The browser sends the JWT in the `Authorization` header.
2. `get_current_user` decodes it and resolves the role. An unrecognised role is
   rejected with 403 rather than defaulted.
3. `get_verified_user` reloads the account and rejects it if the user has been
   deleted, disabled, or had their role changed since the token was issued.
4. `require_any_verified_permission` checks the role against the access matrix.
5. `patient_service.scope_query` filters the rows: a doctor sees only their own
   assignments, an administrator sees the hospital.
6. The response is serialised through a Pydantic schema, so nothing leaks a
   column that the schema does not declare.

Steps 4 and 5 are separate on purpose. A permission decides whether you may call
an endpoint at all; scoping decides which rows you get once you are inside.
Without the second, any doctor with a valid token could read the whole hospital.

## Why authentication has two layers

A JWT is valid until it expires, so anything decided purely from its claims is
decided from a snapshot taken up to thirty minutes ago. Disabling a compromised
account would have no effect until then.

`get_current_user` (claims only, no database) stays available for cheap
service-level routes. `get_verified_user` adds the database check and is used by
every endpoint that returns patient data. The cost is one indexed lookup per
request, which is the right trade for that class of data.

## Data model

```
users 1 ---- * patients 1 ---- * admissions
        assigned                one row per
        _doctor_id              encounter
```

The patient/admission split is the load-bearing decision. The source data holds
101,766 encounters from roughly 71,500 patients. In a single flat table the same
person appears in both the training and the test split, and every metric comes
out inflated. A `UNIQUE` constraint on `patient_nbr` makes that impossible at the
engine level rather than relying on a preprocessing step being remembered.

See `docs/02-database/` for the full schema.

## Where Milestone 2 attaches

The processed table produced by `ml/src/data/build_dataset.py` is the input to
model training. The trained artifact loads behind
`backend/app/services/risk_service.py`, and `POST /api/v1/risk/predict` becomes
the new endpoint. The frontend already has the layout to display a risk tier
next to each patient.

Nothing in the Milestone 1 request path needs to change to add it, which was the
point of separating endpoints from services.

## Deliberate omissions

These are known and scheduled, not overlooked:

- No audit logging. The `audit_logs` table exists; nothing writes to it.
- No rate limiting on login.
- Token held in browser memory, not an httpOnly cookie.
- MongoDB documented but unused.
- No prediction endpoint - that is Milestone 2.
