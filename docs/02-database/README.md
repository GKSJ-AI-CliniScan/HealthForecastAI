# Database design

Delivered in Milestone 1. The reference schema is
[`database/postgres/schema/01_schema.sql`](../../database/postgres/schema/01_schema.sql),
the ORM models are in [`backend/app/models/`](../../backend/app/models/), and the
versioned migration is
[`backend/alembic/versions/`](../../backend/alembic/versions/).

## Entity relationships

```
                    ┌──────────────────┐
                    │      users       │
                    │──────────────────│
                    │ id           PK  │
                    │ email     UNIQUE │
                    │ hashed_password  │
                    │ role      CHECK  │──────┐
                    │ is_active        │      │ assigned_doctor_id
                    └──────────────────┘      │ (SET NULL on delete)
                                              │
                    ┌──────────────────┐      │
                    │     patients     │◀─────┘
                    │──────────────────│
                    │ id           PK  │
                    │ medical_record_  │
                    │   number  UNIQUE │
                    │ age_group        │
                    │ gender / race    │
                    │ primary_diagnosis│
                    └────────┬─────────┘
                             │ 1
                             │
                             │ N        (CASCADE on delete)
                    ┌────────▼─────────┐
                    │    admissions    │
                    │──────────────────│
                    │ id           PK  │
                    │ patient_id   FK  │
                    │ time_in_hospital │
                    │ admission_type   │
                    │ discharge_       │
                    │   disposition    │
                    │ readmitted       │  '<30' | '>30' | 'NO'
                    └───┬──────────┬───┘
                        │ 1        │ 1
                        │ N        │ N
      ┌─────────────────▼──┐   ┌───▼──────────────────┐
      │ risk_predictions   │   │ treatment_outcomes   │
      │────────────────────│   │──────────────────────│
      │ id             PK  │   │ id               PK  │
      │ patient_id     FK  │   │ admission_id     FK  │
      │ admission_id   FK  │   │ treatment_name       │
      │ readmission_       │   │ recovery_score       │
      │   probability CHECK│   │ length_of_stay_days  │
      │ risk_category CHECK│   │ outcome              │
      │ model_name/version │   └──────────────────────┘
      └────────────────────┘

      ┌──────────────────────┐
      │      audit_logs      │   append only, no FK to users so a
      │──────────────────────│   deactivated actor's trail survives
      │ id               PK  │
      │ actor_id / role      │
      │ action               │
      │ resource             │
      │ outcome              │
      └──────────────────────┘
```

## Constraints that carry meaning

| Constraint | Why it exists |
|-----------|---------------|
| `users_role_check` | Only the four roles from the brief. A typo in a role string would silently grant nothing, or worse, everything. |
| `risk_probability_range_check` | A probability outside `[0, 1]` is a bug in the model wrapper. Fail at the write, not at the dashboard. |
| `risk_category_check` | `low` / `medium` / `high` only, matching `risk_service.categorise_risk()`. |
| `admissions_date_order_check` | A discharge cannot precede an admission. |
| `patients.medical_record_number UNIQUE` | The ETL is idempotent because of this - re-running it does not duplicate patients. |

## Indexes

| Index | Query it serves |
|-------|-----------------|
| `idx_patients_assigned_doctor` | The doctor caseload scope, on every patient list request. |
| `idx_admissions_patient` | Admission history on the patient detail page. |
| `idx_risk_patient_created (patient_id, created_at DESC)` | "Latest prediction for this patient" (Milestone 2). |
| `idx_audit_actor_created (actor_id, created_at DESC)` | "What did this user do?" during a security review. |

## Mapping the dataset onto the schema

The Diabetes 130-US Hospitals CSV is one wide row per encounter. The ETL splits
it across two tables:

| CSV column | Table.column | Transformation |
|-----------|--------------|----------------|
| `patient_nbr` | `patients.medical_record_number` | Prefixed `MRN-`. Already a surrogate key in the source. |
| `age` | `patients.age_group` | `"[70-80)"` → `"70-80"` |
| `diag_1` | `patients.primary_diagnosis` | ICD-9 code → clinical group (Circulatory, Diabetes, …) |
| `admission_type_id` | `admissions.admission_type` | Integer id → description via `ml/src/data/mappings.py` |
| `discharge_disposition_id` | `admissions.discharge_disposition` | Integer id → description |
| `readmitted` | `admissions.readmitted` | Stored raw; `<30` is the positive class |

## Two decisions that change the numbers

**Encounters that cannot be readmitted are dropped.** Discharge dispositions
11, 13, 14, 19, 20 and 21 mean the patient died or entered hospice. They can
never be readmitted, so keeping them teaches the model "disposition 11 implies
no readmission" — true, and useless. This removes about 2,900 rows.

**Only the first encounter per patient is kept.** Repeat encounters from one
patient are not independent observations; leaving them in lets information about
a patient land in both the training and test split and inflates every metric.
This takes 101,766 rows down to 69,990.

The resulting 30-day readmission rate is **8.98%**, consistent with the
published analyses of this dataset.

## Migrations

The reference `.sql` file documents the intended shape and is applied
automatically by `docker compose up` on a fresh volume. Alembic owns the real
migration history.

```bash
cd backend
alembic upgrade head                                    # apply
alembic revision --autogenerate -m "add something"      # create
alembic downgrade -1                                    # roll back one
```

Generate a new revision against an **empty** database, otherwise autogenerate
produces a diff against whatever is already there rather than a clean create.
