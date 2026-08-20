-- ============================================================================
-- HealthForecast AI - PostgreSQL reference schema
-- Milestone 1 deliverable. Keep this in sync with backend/app/models/.
-- Alembic owns the real migrations; this file documents the intended shape.
-- ============================================================================

CREATE TABLE IF NOT EXISTS users (
    id              SERIAL PRIMARY KEY,
    email           VARCHAR(255) NOT NULL UNIQUE,
    full_name       VARCHAR(255) NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    role            VARCHAR(32)  NOT NULL DEFAULT 'doctor',
    department      VARCHAR(128),
    is_active       BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT users_role_check
        CHECK (role IN ('doctor', 'hospital_admin', 'researcher', 'system_admin'))
);

CREATE INDEX IF NOT EXISTS idx_users_role ON users (role);

-- Patient records hold a de-identified medical record number only.
-- Names, addresses, phone numbers and dates of birth are out of scope.
CREATE TABLE IF NOT EXISTS patients (
    id                     SERIAL PRIMARY KEY,
    medical_record_number  VARCHAR(64) NOT NULL UNIQUE,
    age_group              VARCHAR(16),
    gender                 VARCHAR(16),
    race                   VARCHAR(64),
    primary_diagnosis      VARCHAR(255),
    assigned_doctor_id     INTEGER REFERENCES users (id) ON DELETE SET NULL,
    created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_patients_assigned_doctor ON patients (assigned_doctor_id);

CREATE TABLE IF NOT EXISTS admissions (
    id                     SERIAL PRIMARY KEY,
    patient_id             INTEGER NOT NULL REFERENCES patients (id) ON DELETE CASCADE,
    admission_date         DATE,
    discharge_date         DATE,
    time_in_hospital       INTEGER,
    admission_type         VARCHAR(64),
    discharge_disposition  VARCHAR(128),
    num_medications        INTEGER,
    num_lab_procedures     INTEGER,
    number_diagnoses       INTEGER,
    readmitted             VARCHAR(8),
    CONSTRAINT admissions_date_order_check
        CHECK (discharge_date IS NULL OR admission_date IS NULL OR discharge_date >= admission_date)
);

CREATE INDEX IF NOT EXISTS idx_admissions_patient ON admissions (patient_id);

CREATE TABLE IF NOT EXISTS risk_predictions (
    id                       SERIAL PRIMARY KEY,
    patient_id               INTEGER NOT NULL REFERENCES patients (id) ON DELETE CASCADE,
    admission_id             INTEGER REFERENCES admissions (id) ON DELETE SET NULL,
    readmission_probability  DOUBLE PRECISION NOT NULL,
    risk_category            VARCHAR(16) NOT NULL,
    model_name               VARCHAR(128) NOT NULL,
    model_version            VARCHAR(32)  NOT NULL,
    created_at               TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT risk_probability_range_check
        CHECK (readmission_probability >= 0 AND readmission_probability <= 1),
    CONSTRAINT risk_category_check
        CHECK (risk_category IN ('low', 'medium', 'high'))
);

CREATE INDEX IF NOT EXISTS idx_risk_patient_created ON risk_predictions (patient_id, created_at DESC);

CREATE TABLE IF NOT EXISTS treatment_outcomes (
    id                   SERIAL PRIMARY KEY,
    admission_id         INTEGER NOT NULL REFERENCES admissions (id) ON DELETE CASCADE,
    treatment_name       VARCHAR(255) NOT NULL,
    medication_change    BOOLEAN,
    recovery_score       DOUBLE PRECISION,
    length_of_stay_days  INTEGER,
    outcome              VARCHAR(64)
);

CREATE INDEX IF NOT EXISTS idx_treatment_admission ON treatment_outcomes (admission_id);

-- Append only. Every privileged action must land here.
CREATE TABLE IF NOT EXISTS audit_logs (
    id          SERIAL PRIMARY KEY,
    actor_id    INTEGER,
    actor_role  VARCHAR(32),
    action      VARCHAR(128) NOT NULL,
    resource    VARCHAR(128),
    outcome     VARCHAR(16) NOT NULL DEFAULT 'success',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_actor_created ON audit_logs (actor_id, created_at DESC);
