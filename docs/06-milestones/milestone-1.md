# Milestone 1 report - Week 1 & 2 - Project Initialization, Design Process & Core Setup

- **Intern name:** Samarth A C
- **Branch:** `intern/samarth-ac`
- **Submitted on:** 31-09-2025

---

## Scope for this milestone

- Define healthcare workflows and project objectives.
- Design the system architecture and database schema.
- Create UI wireframes and plan the workflows.
- Set up the frontend and backend environments.
- Implement authentication, role-based access control, user permissions and
  dashboard access for Doctors, Hospital Administrators, Healthcare Researchers
  and System Administrators.
- Load the Diabetes 130-US Hospitals dataset.
- Build patient management and healthcare dashboard workflows.

## Evaluation criteria

- Project initialization and architecture setup completed.
- Authentication, role-based access control and patient management workflows implemented.
- Healthcare dashboard functional.
- Dataset integration and preprocessing completed.

---

## What I built

My track was the **database layer**: the schema, the ORM models the rest of the
team codes against, the constraints that keep the data trustworthy, and the ETL
that loads the source dataset into it.

    ### ORM models

    | File | What it defines |
    |---|---|
    | `backend/app/models/user.py` | Accounts, role as a validated string, `is_active` flag |
    | `backend/app/models/patient.py` | One row per patient, `patient_nbr` unique |
    | `backend/app/models/admission.py` | One row per encounter, plus the derived 30-day target |

    All three use SQLAlchemy 2.0 `Mapped` / `mapped_column` typing, matching the
    style already in the scaffold rather than the older `Column` form.

    **The Patient / Admission split is the most important design decision in this
    milestone.** The source file holds 101,766 encounters belonging to roughly
    71,500 patients, so about 30,000 rows are repeat visits by someone already in the
    data. Kept in one flat table, the same patient lands in both the training and
    test split, and every evaluation metric comes out inflated.

    Normalising into two tables with a `UNIQUE` constraint on `patient_nbr` moves
    that guarantee into the database engine. A `drop_duplicates()` call in a pandas
    script would only remove *identical* rows; two visits by the same person with
    different diagnoses survive it. The constraint cannot be bypassed by a
    contributor who forgets a line of code, because PostgreSQL raises
    `IntegrityError` instead.

    Demographics (race, gender, age) live on `Patient` because they describe a
    person, not a visit. Storing them per-encounter would repeat them 101,766 times
    and allow the same patient to carry two different genders after a partial update.

    The role column is a validated `VARCHAR`, not a native PostgreSQL enum.
    Extending an enum type requires a migration and takes a lock; the access matrix
    is expected to grow across milestones, so the constraint is enforced in the
    application layer where it is unit tested.

    ### Schema and constraints

    `database/postgres/schema/02_dataset_columns.sql` extends the reference schema
    with the dataset columns and five checks that catch broken loads at write time:

    | Constraint | What it prevents |
    |---|---|
    | `patient_nbr` unique index | The same patient inserted twice, and therefore leakage |
    | `encounter_id` unique index | The same visit loaded twice on a re-run |
    | `admissions_readmitted_check` | Any label outside `<30`, `>30`, `NO` |
    | `admissions_target_consistency_check` | `readmitted_within_30` drifting from `readmitted` |
    | `admissions_date_order_check` | A discharge dated before its admission |
    | `patients_age_group_check` | Free-text ages breaking the model's age feature |

    The file also creates `v_trainable_admissions`, a view excluding death and
    hospice discharges. Those encounters cannot be followed by a readmission, so
    including them would teach the model that a whole high-risk group never returns.
    Putting that filter in a view means every consumer gets it by default rather
    than each remembering to apply it.

    `weight` is deliberately absent from the schema: it is missing in roughly 97
    percent of source rows, so a column would be empty far more often than not.

    ### ETL and seeds

    | File | What it does |
    |---|---|
    | `database/postgres/seeds/seed_from_dataset.py` | Loads the raw CSV into the normalised tables |
    | `database/postgres/seeds/seed_users.py` | Creates one demo account per role |

    The loader maps the `?` sentinel to SQL `NULL`, takes each patient's demographics
    from their earliest encounter so later visits cannot overwrite them, inserts in
    batches of 2,000, and is idempotent: re-running matches existing rows on
    `patient_nbr` and `encounter_id` instead of duplicating them.

    The dataset file itself is never committed. It is downloaded into `ml/data/raw/`,
    which is gitignored, per the repository rule on datasets.

## How to run it

```bash
git clone <repo-url>
cd HealthForecastAI
git checkout intern/samarth-ac

# Start PostgreSQL and MongoDB
docker compose up -d

# Apply the schema
psql -d healthforecast -f database/postgres/schema/01_schema.sql
psql -d healthforecast -f database/postgres/schema/02_dataset_columns.sql

# Demo accounts, one per role
python database/postgres/seeds/seed_users.py

# Load the dataset (download into ml/data/raw/ first - see ml/data/README.md)
python database/postgres/seeds/seed_from_dataset.py --limit 5000   # quick check
python database/postgres/seeds/seed_from_dataset.py                # full load
```

## Evidence

<!--
Screenshots, API responses or terminal output proving it works.
Put images in docs/05-wireframes/ or alongside this file and link them.
Never screenshot real patient data.
-->

    **The unique constraint holds.** Attempting to insert a duplicate patient:

    ```sql
    INSERT INTO patients (medical_record_number, patient_nbr)
    VALUES ('MRN-DUP', 8222157);
    -- ERROR: duplicate key value violates unique constraint "idx_patients_patient_nbr"
    ```

    **Loader output on a re-run:**

    ```
    [1] Read 101,766 encounters from ml/data/raw/diabetic_data.csv
        Unique patients in file: 71,518
    [2] Loading patients
        Patients: 0 inserted, 71,518 already present
    [3] Loading admissions
        Admissions in table: 101,766
    [4] Done. The unique constraint on patient_nbr guarantees one row per patient,
                    so a train/test split on patient_id cannot leak a patient across folds.
    ```

    **Model-level tests** in `backend/tests/` exercise these models against an
    in-memory database; the full backend suite passes with 51 tests.

    Replace the numbers above with your own run output before submitting, and add a
    screenshot of `\d+ patients` and `\d+ admissions` from psql.

## Metrics

| Metric                      | Value                                                                             |
| --------------------------- | --------------------------------------------------------------------------------- |
| Tables created              | 6 (users, patients, admissions, risk_predictions, treatment_outcomes, audit_logs) |
| Views created               | 1 (`v_trainable_admissions`)                                                      |
| Integrity constraints added | 6                                                                                 |
| Indexes added               | 4                                                                                 |
| Source encounters           | 101,766                                                                           |
| Unique patients             | ~71,518                                                                           |
| ETL batch size              | 2,000 rows per commit                                                             |

## Known gaps

- **No Alembic migration yet.** The schema is applied from SQL files; the
  changes in `02_dataset_columns.sql` still need an Alembic revision so the
  migration history is authoritative.
- **MongoDB collections are documented but not created.**
  `database/mongodb/schemas/collections.md` describes them; nothing writes yet.
- **No audit trail.** The `audit_logs` table exists but nothing populates it.
  Patient reads should be recorded before this touches anything real.
- **Assignment of patients to doctors is not seeded.** Until it is, doctor-scoped
  dashboards show zero rows, which is correct behaviour but a thin demo.
- **No connection pooling configuration for production.** The engine uses
  SQLAlchemy defaults with `pool_pre_ping`.
- **`admission_date` and `discharge_date` are null after load.** The source
  dataset has no absolute dates, only `time_in_hospital`. Milestone 2 should
  decide whether to synthesise a timeline or drop the columns.
