"""milestone 3 treatment and outcome data

Adds what treatment effectiveness and outcome analytics need that the first
schema did not carry: per-admission diabetes care indicators and prior
utilisation, the source encounter id (the only ordering the dataset has), the
dose change on each treatment row, and per-patient risk drivers.

Also adds the server-side defaults the first migration left out. The ORM sets
created_at, is_active, role and outcome in Python, so anything writing through
the ORM worked; anything writing raw SQL - the ETL, the batch scorer - hit a
NOT NULL violation on a database built from migrations. Only the hand-written
reference SQL had them.

Also adds the CHECK constraints that docs/02-database has always described.
They existed in the hand-written reference SQL but not in the ORM models, so a
database built through Alembic did not enforce them. Alembic does not detect
CHECK constraints when autogenerating, which is why they are written out here.

Revision ID: 0032e1b3059c
Revises: 22f455bd8cb2
Create Date: 2026-09-30 06:02:53.779212
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0032e1b3059c"
down_revision: str | None = "22f455bd8cb2"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # --- admissions: the columns treatment analysis adjusts and stratifies on ---
    op.add_column("admissions", sa.Column("source_encounter_id", sa.BigInteger(), nullable=True))
    op.add_column("admissions", sa.Column("admission_source", sa.String(length=128), nullable=True))
    op.add_column("admissions", sa.Column("department", sa.String(length=128), nullable=True))
    op.add_column("admissions", sa.Column("number_inpatient", sa.Integer(), nullable=True))
    op.add_column("admissions", sa.Column("number_emergency", sa.Integer(), nullable=True))
    op.add_column("admissions", sa.Column("number_outpatient", sa.Integer(), nullable=True))
    op.add_column("admissions", sa.Column("a1c_result", sa.String(length=16), nullable=True))
    op.add_column("admissions", sa.Column("max_glu_serum", sa.String(length=16), nullable=True))
    op.add_column("admissions", sa.Column("diabetes_med", sa.Boolean(), nullable=True))
    op.add_column("admissions", sa.Column("medication_changed", sa.Boolean(), nullable=True))
    op.create_index(
        op.f("ix_admissions_source_encounter_id"),
        "admissions",
        ["source_encounter_id"],
        unique=True,
    )

    # --- risk_predictions: why this patient scored what they did ---
    op.add_column("risk_predictions", sa.Column("drivers", sa.JSON(), nullable=True))

    # --- treatment_outcomes: one row per admission and drug ---
    op.add_column("treatment_outcomes", sa.Column("dose_change", sa.String(length=16), nullable=True))
    op.create_index(
        op.f("ix_treatment_outcomes_treatment_name"),
        "treatment_outcomes",
        ["treatment_name"],
        unique=False,
    )

    # --- constraints the reference schema always promised ---
    op.create_check_constraint(
        "users_role_check",
        "users",
        "role IN ('doctor', 'hospital_admin', 'researcher', 'system_admin')",
    )
    op.create_check_constraint(
        "admissions_date_order_check",
        "admissions",
        "discharge_date IS NULL OR admission_date IS NULL OR discharge_date >= admission_date",
    )
    op.create_check_constraint(
        "risk_probability_range_check",
        "risk_predictions",
        "readmission_probability >= 0 AND readmission_probability <= 1",
    )
    op.create_check_constraint(
        "risk_category_check",
        "risk_predictions",
        "risk_category IN ('low', 'medium', 'high')",
    )
    op.create_check_constraint(
        "treatment_dose_change_check",
        "treatment_outcomes",
        "dose_change IS NULL OR dose_change IN ('Steady', 'Up', 'Down')",
    )

    # --- server defaults: raw SQL inserts must not depend on the ORM ---
    op.alter_column("patients", "created_at", server_default=sa.text("now()"))
    op.alter_column("users", "created_at", server_default=sa.text("now()"))
    op.alter_column("users", "is_active", server_default=sa.true())
    op.alter_column("users", "role", server_default="doctor")
    op.alter_column("risk_predictions", "created_at", server_default=sa.text("now()"))
    op.alter_column("audit_logs", "created_at", server_default=sa.text("now()"))
    op.alter_column("audit_logs", "outcome", server_default="success")


def downgrade() -> None:
    op.alter_column("audit_logs", "outcome", server_default=None)
    op.alter_column("audit_logs", "created_at", server_default=None)
    op.alter_column("risk_predictions", "created_at", server_default=None)
    op.alter_column("users", "role", server_default=None)
    op.alter_column("users", "is_active", server_default=None)
    op.alter_column("users", "created_at", server_default=None)
    op.alter_column("patients", "created_at", server_default=None)

    op.drop_constraint("treatment_dose_change_check", "treatment_outcomes", type_="check")
    op.drop_constraint("risk_category_check", "risk_predictions", type_="check")
    op.drop_constraint("risk_probability_range_check", "risk_predictions", type_="check")
    op.drop_constraint("admissions_date_order_check", "admissions", type_="check")
    op.drop_constraint("users_role_check", "users", type_="check")

    op.drop_index(op.f("ix_treatment_outcomes_treatment_name"), table_name="treatment_outcomes")
    op.drop_column("treatment_outcomes", "dose_change")
    op.drop_column("risk_predictions", "drivers")

    op.drop_index(op.f("ix_admissions_source_encounter_id"), table_name="admissions")
    op.drop_column("admissions", "medication_changed")
    op.drop_column("admissions", "diabetes_med")
    op.drop_column("admissions", "max_glu_serum")
    op.drop_column("admissions", "a1c_result")
    op.drop_column("admissions", "number_outpatient")
    op.drop_column("admissions", "number_emergency")
    op.drop_column("admissions", "number_inpatient")
    op.drop_column("admissions", "department")
    op.drop_column("admissions", "admission_source")
    op.drop_column("admissions", "source_encounter_id")
