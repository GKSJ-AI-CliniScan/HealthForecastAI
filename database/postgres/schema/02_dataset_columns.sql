-- ============================================================================
-- HealthForecast AI - Milestone 1 schema extension
--
-- Adds the columns needed to load the Diabetes 130-US Hospitals dataset into
-- the normalised patients/admissions shape, and the constraints that keep the
-- data usable for model training.
--
-- Apply after 01_schema.sql:
--     psql -d healthforecast -f database/postgres/schema/02_dataset_columns.sql
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Patients: the dataset's own identifier.
--
-- The source file holds 101,766 encounters from roughly 71,500 patients. A
-- UNIQUE constraint here makes it impossible to insert one patient twice, so a
-- train/test split on patient_id keeps every encounter for a person in the same
-- fold. Enforcing this in the database rather than in a pandas call means a
-- future contributor cannot bypass it by forgetting a line of code.
-- ----------------------------------------------------------------------------
ALTER TABLE patients
    ADD COLUMN IF NOT EXISTS patient_nbr BIGINT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_patients_patient_nbr
    ON patients (patient_nbr)
    WHERE patient_nbr IS NOT NULL;

-- The 'weight' column of the source dataset is deliberately absent: it is
-- missing in roughly 97 percent of rows, so storing it would add a column that
-- is empty far more often than not.

-- Age is stored as the dataset's own bucket string, not a number, so that the
-- values loaded here match exactly what the model was trained on.
ALTER TABLE patients
    DROP CONSTRAINT IF EXISTS patients_age_group_check;
ALTER TABLE patients
    ADD CONSTRAINT patients_age_group_check
    CHECK (age_group IS NULL OR age_group ~ '^\[[0-9]{1,3}-[0-9]{1,3}\)$');

-- ----------------------------------------------------------------------------
-- Admissions: encounter-level clinical detail and the prediction target.
-- ----------------------------------------------------------------------------
ALTER TABLE admissions
    ADD COLUMN IF NOT EXISTS encounter_id             INTEGER,
    ADD COLUMN IF NOT EXISTS discharge_disposition_id INTEGER,
    ADD COLUMN IF NOT EXISTS admission_source         VARCHAR(128),
    ADD COLUMN IF NOT EXISTS medical_specialty        VARCHAR(128),
    ADD COLUMN IF NOT EXISTS num_procedures           INTEGER,
    ADD COLUMN IF NOT EXISTS number_outpatient        INTEGER,
    ADD COLUMN IF NOT EXISTS number_emergency         INTEGER,
    ADD COLUMN IF NOT EXISTS number_inpatient         INTEGER,
    ADD COLUMN IF NOT EXISTS diag_1                   VARCHAR(16),
    ADD COLUMN IF NOT EXISTS diag_2                   VARCHAR(16),
    ADD COLUMN IF NOT EXISTS diag_3                   VARCHAR(16),
    ADD COLUMN IF NOT EXISTS readmitted_within_30     BOOLEAN;

CREATE UNIQUE INDEX IF NOT EXISTS idx_admissions_encounter_id
    ON admissions (encounter_id)
    WHERE encounter_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_admissions_readmitted_30
    ON admissions (readmitted_within_30);

-- The source label has three values. Anything else indicates a broken load.
ALTER TABLE admissions
    DROP CONSTRAINT IF EXISTS admissions_readmitted_check;
ALTER TABLE admissions
    ADD CONSTRAINT admissions_readmitted_check
    CHECK (readmitted IS NULL OR readmitted IN ('<30', '>30', 'NO'));

-- readmitted_within_30 must agree with the label it is derived from, so the two
-- columns cannot drift apart through a partial update.
ALTER TABLE admissions
    DROP CONSTRAINT IF EXISTS admissions_target_consistency_check;
ALTER TABLE admissions
    ADD CONSTRAINT admissions_target_consistency_check
    CHECK (
        readmitted IS NULL
        OR readmitted_within_30 IS NULL
        OR readmitted_within_30 = (readmitted = '<30')
    );

-- A stay cannot end before it starts.
ALTER TABLE admissions
    DROP CONSTRAINT IF EXISTS admissions_date_order_check;
ALTER TABLE admissions
    ADD CONSTRAINT admissions_date_order_check
    CHECK (
        admission_date IS NULL
        OR discharge_date IS NULL
        OR discharge_date >= admission_date
    );

-- ----------------------------------------------------------------------------
-- Reporting view: encounters that are valid training examples.
--
-- Patients discharged to hospice or recorded as deceased cannot be readmitted,
-- so including them would teach the model that a high-risk group never returns.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_trainable_admissions AS
SELECT
    a.id,
    a.patient_id,
    a.encounter_id,
    a.time_in_hospital,
    a.num_medications,
    a.num_lab_procedures,
    a.number_diagnoses,
    a.number_outpatient + a.number_emergency + a.number_inpatient AS total_prior_visits,
    a.diag_1,
    a.readmitted,
    a.readmitted_within_30,
    p.age_group,
    p.gender,
    p.race
FROM admissions a
JOIN patients p ON p.id = a.patient_id
WHERE a.discharge_disposition_id IS NULL
   OR a.discharge_disposition_id NOT IN (11, 13, 14, 19, 20, 21);

COMMENT ON VIEW v_trainable_admissions IS
    'Encounters eligible for readmission modelling: death and hospice discharges excluded.';
