"""milestone 3 analytics layer

Revision ID: b7c41f9d2e05
Revises: 22f455bd8cb2
Create Date: 2026-09-27 09:40:12.481307

Adds the reporting side of Milestone 3 - indexes, the recovery/disposition
helpers and the treatment, outcome and trend views. It creates no tables: the
ORM in backend/app/models/ still owns those, so this revision cannot drift from
the schema Milestone 1 defined.

The statements are verbatim from
database/postgres/schema/02_milestone3_analytics.sql, which docker compose
applies to a fresh volume. This revision is the same objects for a database
that already has Milestone 1 applied. Change one file, change the other.
"""

from collections.abc import Sequence

from alembic import op

revision: str = 'b7c41f9d2e05'
down_revision: str | None = '22f455bd8cb2'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

# Every object is created idempotently (IF NOT EXISTS / CREATE OR REPLACE), so
# a database that was bootstrapped by the reference schema file can still run
# this revision without error.
_UPGRADE_SQL: tuple[str, ...] = (
    """
    CREATE INDEX IF NOT EXISTS idx_treatment_outcomes_treatment_name
        ON treatment_outcomes (treatment_name)
    """,
    """
    CREATE INDEX IF NOT EXISTS idx_admissions_readmitted
        ON admissions (readmitted)
    """,
    """
    CREATE INDEX IF NOT EXISTS idx_admissions_discharge_disposition
        ON admissions (discharge_disposition)
    """,
    """
    CREATE INDEX IF NOT EXISTS idx_admissions_admission_date
        ON admissions (admission_date)
    """,
    """
    CREATE INDEX IF NOT EXISTS idx_patients_primary_diagnosis
        ON patients (primary_diagnosis)
    """,
    """
    CREATE INDEX IF NOT EXISTS idx_risk_predictions_category_created
        ON risk_predictions (risk_category, created_at DESC)
    """,
    """
    CREATE OR REPLACE FUNCTION fn_recovery_index(
        p_length_of_stay   INTEGER,
        p_number_diagnoses INTEGER,
        p_num_medications  INTEGER,
        p_readmitted       TEXT
    ) RETURNS NUMERIC(5, 1)
    LANGUAGE sql
    IMMUTABLE
    AS $$
        SELECT ROUND(
            LEAST(
                100.0,
                GREATEST(
                    25.0,
                    96.0
                    - GREATEST(0, COALESCE(p_length_of_stay, 0) - 4) * 2.2
                    - GREATEST(0, COALESCE(p_number_diagnoses, 0) - 5) * 2.8
                    - GREATEST(0, COALESCE(p_num_medications, 0) - 12) * 0.6
                    - CASE WHEN p_readmitted = '<30' THEN 18.0 ELSE 0.0 END
                )
            ),
            1
        )::NUMERIC(5, 1);
    $$
    """,
    """
    COMMENT ON FUNCTION fn_recovery_index(INTEGER, INTEGER, INTEGER, TEXT) IS
        'SQL mirror of treatment_service.recovery_index(). Keep the two in step.'
    """,
    """
    CREATE OR REPLACE FUNCTION fn_is_routine_discharge(p_discharge_disposition TEXT)
    RETURNS BOOLEAN
    LANGUAGE sql
    IMMUTABLE
    AS $$
        SELECT COALESCE(p_discharge_disposition, '') IN (
            'Discharged to home',
            'Discharged/transferred to home with home health service',
            'Discharged/transferred to home under care of Home IV provider'
        );
    $$
    """,
    """
    COMMENT ON FUNCTION fn_is_routine_discharge(TEXT) IS
        'True when the episode resolved at home; the denominator of the complication rate.'
    """,
    """
    CREATE OR REPLACE FUNCTION fn_diagnosis_cohort(p_primary_diagnosis TEXT)
    RETURNS TEXT
    LANGUAGE sql
    IMMUTABLE
    AS $$
        SELECT CASE
            WHEN LOWER(COALESCE(p_primary_diagnosis, '')) LIKE ANY (
                ARRAY['%circulat%', '%cardio%', '%heart%']
            ) THEN 'cardiac'
            WHEN LOWER(COALESCE(p_primary_diagnosis, '')) LIKE ANY (
                ARRAY['%diabet%', '%metab%', '%genitourin%', '%renal%', '%kidney%']
            ) THEN 'renal'
            WHEN LOWER(COALESCE(p_primary_diagnosis, '')) LIKE ANY (
                ARRAY['%respirat%', '%pulmon%', '%copd%', '%pneumonia%', '%asthma%']
            ) THEN 'pulmonary'
            ELSE NULL
        END;
    $$
    """,
    """
    COMMENT ON FUNCTION fn_diagnosis_cohort(TEXT) IS
        'cardiac / renal / pulmonary cohort, or NULL when the diagnosis maps to neither.'
    """,
    """
    CREATE OR REPLACE FUNCTION fn_matches_disease_group(
        p_primary_diagnosis TEXT,
        p_disease_group     TEXT
    ) RETURNS BOOLEAN
    LANGUAGE sql
    IMMUTABLE
    AS $$
        SELECT CASE UPPER(COALESCE(p_disease_group, ''))
            WHEN 'DIABETES' THEN LOWER(COALESCE(p_primary_diagnosis, '')) LIKE ANY (
                ARRAY['%diabet%', '%metab%']
            )
            WHEN 'CHF' THEN LOWER(COALESCE(p_primary_diagnosis, '')) LIKE ANY (
                ARRAY['%circulat%', '%cardio%', '%heart failure%']
            )
            WHEN 'COPD' THEN LOWER(COALESCE(p_primary_diagnosis, '')) LIKE ANY (
                ARRAY['%respirat%', '%pulmon%', '%copd%']
            )
            WHEN 'PNEUMONIA' THEN LOWER(COALESCE(p_primary_diagnosis, '')) LIKE ANY (
                ARRAY['%pneumonia%', '%respirat%', '%pulmon%']
            )
            ELSE TRUE
        END;
    $$
    """,
    """
    COMMENT ON FUNCTION fn_matches_disease_group(TEXT, TEXT) IS
        'Disease-group predicate; TRUE for unknown or empty groups so "All" selects everything.'
    """,
    """
    CREATE OR REPLACE VIEW v_treatment_episode AS
    SELECT
        tor.id                                                   AS outcome_id,
        adm.id                                                   AS admission_id,
        pat.id                                                   AS patient_id,
        pat.medical_record_number,
        pat.age_group,
        pat.gender,
        pat.race,
        pat.primary_diagnosis,
        pat.assigned_doctor_id,
        adm.admission_date,
        adm.discharge_date,
        adm.admission_type,
        adm.discharge_disposition,
        COALESCE(tor.length_of_stay_days, adm.time_in_hospital)  AS length_of_stay_days,
        tor.treatment_name,
        tor.medication_change,
        tor.recovery_score,
        tor.outcome,
        (adm.readmitted = '<30')                                 AS readmitted_within_30_days,
        (NOT fn_is_routine_discharge(adm.discharge_disposition)) AS discharge_complication,
        (tor.recovery_score >= 70.0)                             AS recovered,
        fn_diagnosis_cohort(pat.primary_diagnosis)               AS specialty_cohort
    FROM treatment_outcomes tor
    JOIN admissions adm ON adm.id = tor.admission_id
    JOIN patients pat   ON pat.id = adm.patient_id
    """,
    """
    COMMENT ON VIEW v_treatment_episode IS
        'Episode grain for Milestone 3 reporting: treatment outcome joined to its admission and patient.'
    """,
    """
    CREATE OR REPLACE VIEW v_treatment_effectiveness AS
    SELECT
        treatment_name,
        COUNT(*)                                                 AS patients_treated,
        ROUND(COALESCE(AVG(recovery_score), 0)::NUMERIC, 1)      AS average_recovery_score,
        SUM(CASE WHEN readmitted_within_30_days THEN 1 ELSE 0 END)::INTEGER AS readmissions,
        ROUND(
            (
                SUM(CASE WHEN readmitted_within_30_days THEN 1 ELSE 0 END)::NUMERIC
                / NULLIF(COUNT(*), 0)
            ),
            4
        )                                                        AS readmission_rate
    FROM v_treatment_episode
    GROUP BY treatment_name
    """,
    """
    COMMENT ON VIEW v_treatment_effectiveness IS
        'One row per regimen: episodes treated, mean recovery index, 30-day readmission rate.'
    """,
    """
    CREATE OR REPLACE VIEW v_medication_outcome AS
    SELECT
        treatment_name                                           AS treatment,
        ROUND(
            100.0 * (
                COUNT(*) - SUM(CASE WHEN readmitted_within_30_days THEN 1 ELSE 0 END)
            )::NUMERIC / NULLIF(COUNT(*), 0),
            1
        )                                                        AS success_rate,
        ROUND(
            100.0 * SUM(CASE WHEN discharge_complication THEN 1 ELSE 0 END)::NUMERIC
            / NULLIF(COUNT(*), 0),
            1
        )                                                        AS side_effects_rate,
        COUNT(*)::INTEGER                                        AS patients_treated,
        ROUND(COALESCE(AVG(recovery_score), 0)::NUMERIC, 1)      AS average_recovery_score,
        ROUND(
            SUM(CASE WHEN readmitted_within_30_days THEN 1 ELSE 0 END)::NUMERIC
            / NULLIF(COUNT(*), 0),
            4
        )                                                        AS readmission_rate
    FROM v_treatment_episode
    GROUP BY treatment_name
    """,
    """
    COMMENT ON VIEW v_medication_outcome IS
        'Per-regimen efficacy vs complication rate. Rates are percentages, readmission_rate is a proportion.'
    """,
    """
    CREATE OR REPLACE VIEW v_treatment_summary AS
    SELECT
        COALESCE(ROUND(
            100.0 * (
                COUNT(*) - SUM(CASE WHEN readmitted_within_30_days THEN 1 ELSE 0 END)
            )::NUMERIC / NULLIF(COUNT(*), 0),
            1
        ), 0.0)                                                    AS success_rate,
        COALESCE(ROUND(
            100.0 * SUM(CASE WHEN recovered THEN 1 ELSE 0 END)::NUMERIC
            / NULLIF(COUNT(*), 0),
            1
        ), 0.0)                                                    AS recovery_rate,
        COALESCE(ROUND(
            100.0 * SUM(CASE WHEN discharge_complication THEN 1 ELSE 0 END)::NUMERIC
            / NULLIF(COUNT(*), 0),
            1
        ), 0.0)                                                    AS complications_rate,
        COUNT(*)::INTEGER                                        AS outcomes_recorded,
        COUNT(DISTINCT treatment_name)::INTEGER                  AS protocols_evaluated
    FROM v_treatment_episode
    """,
    """
    COMMENT ON VIEW v_treatment_summary IS
        'Unscoped headline rates. Scope a report by filtering v_treatment_episode instead.'
    """,
    """
    CREATE OR REPLACE VIEW v_recovery_trend AS
    SELECT
        specialty_cohort                                         AS cohort,
        CASE
            WHEN length_of_stay_days >= 7 THEN 7
            ELSE length_of_stay_days
        END                                                      AS day_of_stay,
        COUNT(*)::INTEGER                                        AS episodes,
        ROUND(COALESCE(AVG(recovery_score), 0)::NUMERIC, 1)      AS average_recovery_score
    FROM v_treatment_episode
    WHERE specialty_cohort IS NOT NULL
      AND length_of_stay_days IS NOT NULL
    GROUP BY
        specialty_cohort,
        CASE
            WHEN length_of_stay_days >= 7 THEN 7
            ELSE length_of_stay_days
        END
    """,
    """
    COMMENT ON VIEW v_recovery_trend IS
        'Recovery trajectory: mean recovery index per day of stay (7 folds in everything longer), by cohort.'
    """,
    """
    CREATE OR REPLACE VIEW v_patient_outcome AS
    WITH episodes AS (
        SELECT
            patient_id,
            COUNT(*)::INTEGER                                    AS outcomes_recorded,
            COUNT(DISTINCT treatment_name)::INTEGER              AS protocols_used,
            ROUND(COALESCE(AVG(recovery_score), 0)::NUMERIC, 1)  AS average_recovery_score,
            ROUND(AVG(length_of_stay_days)::NUMERIC, 1)          AS average_length_of_stay,
            SUM(CASE WHEN readmitted_within_30_days THEN 1 ELSE 0 END)::INTEGER AS readmissions_within_30_days,
            SUM(CASE WHEN discharge_complication THEN 1 ELSE 0 END)::INTEGER    AS complications,
            SUM(CASE WHEN recovered THEN 1 ELSE 0 END)::INTEGER  AS recovered_episodes,
            MAX(admission_date)                                  AS last_admission_date
        FROM v_treatment_episode
        GROUP BY patient_id
    ),
    latest_risk AS (
        SELECT DISTINCT ON (patient_id)
            patient_id,
            readmission_probability,
            risk_category,
            model_name,
            model_version,
            created_at AS predicted_at
        FROM risk_predictions
        ORDER BY patient_id, created_at DESC, id DESC
    )
    SELECT
        pat.id                                                   AS patient_id,
        pat.medical_record_number,
        pat.age_group,
        pat.gender,
        pat.primary_diagnosis,
        pat.assigned_doctor_id,
        fn_diagnosis_cohort(pat.primary_diagnosis)               AS specialty_cohort,
        COALESCE(eps.outcomes_recorded, 0)                       AS outcomes_recorded,
        COALESCE(eps.protocols_used, 0)                          AS protocols_used,
        eps.average_recovery_score,
        eps.average_length_of_stay,
        COALESCE(eps.readmissions_within_30_days, 0)             AS readmissions_within_30_days,
        COALESCE(eps.complications, 0)                           AS complications,
        COALESCE(eps.recovered_episodes, 0)                      AS recovered_episodes,
        ROUND(
            100.0 * (
                eps.outcomes_recorded - eps.readmissions_within_30_days
            )::NUMERIC / NULLIF(eps.outcomes_recorded, 0),
            1
        )                                                        AS treatment_success_rate,
        eps.last_admission_date,
        risk.readmission_probability,
        risk.risk_category,
        risk.model_name,
        risk.model_version,
        risk.predicted_at
    FROM patients pat
    LEFT JOIN episodes eps ON eps.patient_id = pat.id
    LEFT JOIN latest_risk risk ON risk.patient_id = pat.id
    """,
    """
    COMMENT ON VIEW v_patient_outcome IS
        'Patient outcome analytics report: episode history, outcome rates and latest stored risk band.'
    """,
    """
    CREATE OR REPLACE VIEW v_hospital_performance_monthly AS
    WITH admissions_month AS (
        SELECT
            DATE_TRUNC('month', adm.admission_date)::DATE        AS report_month,
            COUNT(*)::INTEGER                                    AS total_admissions,
            SUM(CASE WHEN adm.readmitted = '<30' THEN 1 ELSE 0 END)::INTEGER AS readmissions,
            ROUND(AVG(adm.time_in_hospital)::NUMERIC, 1)         AS average_length_of_stay
        FROM admissions adm
        WHERE adm.admission_date IS NOT NULL
        GROUP BY DATE_TRUNC('month', adm.admission_date)::DATE
    ),
    episodes_month AS (
        SELECT
            DATE_TRUNC('month', admission_date)::DATE            AS report_month,
            COUNT(*)::INTEGER                                    AS outcomes_recorded,
            SUM(CASE WHEN readmitted_within_30_days THEN 1 ELSE 0 END)::INTEGER AS readmissions,
            SUM(CASE WHEN discharge_complication THEN 1 ELSE 0 END)::INTEGER    AS complications,
            SUM(CASE WHEN recovered THEN 1 ELSE 0 END)::INTEGER  AS recovered
        FROM v_treatment_episode
        WHERE admission_date IS NOT NULL
        GROUP BY DATE_TRUNC('month', admission_date)::DATE
    ),
    risk_month AS (
        SELECT
            DATE_TRUNC('month', rp.created_at AT TIME ZONE 'UTC')::DATE AS report_month,
            SUM(CASE WHEN rp.risk_category = 'high' THEN 1 ELSE 0 END)::INTEGER AS high_risk_predictions,
            COUNT(*)::INTEGER                                    AS predictions_written
        FROM risk_predictions rp
        GROUP BY DATE_TRUNC('month', rp.created_at AT TIME ZONE 'UTC')::DATE
    ),
    months AS (
        SELECT report_month FROM admissions_month
        UNION
        SELECT report_month FROM episodes_month
        UNION
        SELECT report_month FROM risk_month
    )
    SELECT
        m.report_month,
        COALESCE(adm.total_admissions, 0)                        AS total_admissions,
        COALESCE(adm.readmissions, 0)                            AS readmissions,
        ROUND(
            100.0 * adm.readmissions::NUMERIC / NULLIF(adm.total_admissions, 0),
            1
        )                                                        AS readmission_rate,
        adm.average_length_of_stay,
        COALESCE(ep.outcomes_recorded, 0)                        AS outcomes_recorded,
        ROUND(
            100.0 * (ep.outcomes_recorded - ep.readmissions)::NUMERIC
            / NULLIF(ep.outcomes_recorded, 0),
            1
        )                                                        AS treatment_success_rate,
        ROUND(
            100.0 * ep.recovered::NUMERIC / NULLIF(ep.outcomes_recorded, 0),
            1
        )                                                        AS recovery_rate,
        ROUND(
            100.0 * ep.complications::NUMERIC / NULLIF(ep.outcomes_recorded, 0),
            1
        )                                                        AS complication_rate,
        COALESCE(risk.high_risk_predictions, 0)                  AS high_risk_predictions,
        COALESCE(risk.predictions_written, 0)                    AS predictions_written,
        ROUND(
            100.0 * adm.readmissions::NUMERIC / NULLIF(adm.total_admissions, 0)
            - LAG(100.0 * adm.readmissions::NUMERIC / NULLIF(adm.total_admissions, 0))
              OVER (ORDER BY m.report_month),
            1
        )                                                        AS readmission_rate_change,
        ROUND(
            100.0 * (ep.outcomes_recorded - ep.readmissions)::NUMERIC
            / NULLIF(ep.outcomes_recorded, 0)
            - LAG(100.0 * (ep.outcomes_recorded - ep.readmissions)::NUMERIC
                  / NULLIF(ep.outcomes_recorded, 0))
              OVER (ORDER BY m.report_month),
            1
        )                                                        AS treatment_success_rate_change
    FROM months m
    LEFT JOIN admissions_month adm   ON adm.report_month = m.report_month
    LEFT JOIN episodes_month ep      ON ep.report_month = m.report_month
    LEFT JOIN risk_month risk        ON risk.report_month = m.report_month
    """,
    """
    COMMENT ON VIEW v_hospital_performance_monthly IS
        'Monthly hospital KPIs with month-on-month deltas, for the performance dashboard and trend alerts.'
    """,
)

# Reverse dependency order: views read the functions, so the functions go last.
_DOWNGRADE_SQL: tuple[str, ...] = (
    """DROP VIEW IF EXISTS v_hospital_performance_monthly""",
    """DROP VIEW IF EXISTS v_patient_outcome""",
    """DROP VIEW IF EXISTS v_recovery_trend""",
    """DROP VIEW IF EXISTS v_treatment_summary""",
    """DROP VIEW IF EXISTS v_medication_outcome""",
    """DROP VIEW IF EXISTS v_treatment_effectiveness""",
    """DROP VIEW IF EXISTS v_treatment_episode""",
    """DROP FUNCTION IF EXISTS fn_matches_disease_group(TEXT, TEXT)""",
    """DROP FUNCTION IF EXISTS fn_diagnosis_cohort(TEXT)""",
    """DROP FUNCTION IF EXISTS fn_is_routine_discharge(TEXT)""",
    """DROP FUNCTION IF EXISTS fn_recovery_index(INTEGER, INTEGER, INTEGER, TEXT)""",
    """DROP INDEX IF EXISTS idx_risk_predictions_category_created""",
    """DROP INDEX IF EXISTS idx_patients_primary_diagnosis""",
    """DROP INDEX IF EXISTS idx_admissions_admission_date""",
    """DROP INDEX IF EXISTS idx_admissions_discharge_disposition""",
    """DROP INDEX IF EXISTS idx_admissions_readmitted""",
    """DROP INDEX IF EXISTS idx_treatment_outcomes_treatment_name""",
)


def upgrade() -> None:
    for statement in _UPGRADE_SQL:
        op.execute(statement)


def downgrade() -> None:
    for statement in _DOWNGRADE_SQL:
        op.execute(statement)
