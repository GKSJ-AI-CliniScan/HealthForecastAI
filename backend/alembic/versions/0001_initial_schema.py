"""Initial schema: users, patients, doctor_patient_map, admissions, predictions, outcomes, audit.

Creates the full relational schema documented in
database/postgres/schema/01_schema.sql, plus the doctor_patient_map table that
scopes a doctor to the patients they are permitted to see.

Revision ID: 0001
Revises:
Create Date: 2026-08-30
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0001"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Create every table, constraint and index from scratch."""
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("full_name", sa.String(length=255), nullable=False),
        sa.Column("hashed_password", sa.String(length=255), nullable=False),
        sa.Column("role", sa.String(length=32), server_default="doctor", nullable=False),
        sa.Column("department", sa.String(length=128), nullable=True),
        sa.Column("is_active", sa.Boolean(), server_default=sa.true(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.CheckConstraint(
            "role IN ('doctor', 'hospital_admin', 'researcher', 'system_admin')",
            name="users_role_check",
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=True)
    op.create_index("idx_users_role", "users", ["role"], unique=False)

    op.create_table(
        "patients",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("medical_record_number", sa.String(length=64), nullable=False),
        sa.Column("age_group", sa.String(length=16), nullable=True),
        sa.Column("gender", sa.String(length=16), nullable=True),
        sa.Column("race", sa.String(length=64), nullable=True),
        sa.Column("primary_diagnosis", sa.String(length=255), nullable=True),
        sa.Column("assigned_doctor_id", sa.Integer(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["assigned_doctor_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_patients_medical_record_number", "patients", ["medical_record_number"], unique=True
    )
    op.create_index(
        "idx_patients_assigned_doctor", "patients", ["assigned_doctor_id"], unique=False
    )

    op.create_table(
        "doctor_patient_map",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("doctor_id", sa.Integer(), nullable=False),
        sa.Column("patient_id", sa.Integer(), nullable=False),
        sa.Column(
            "assigned_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column("assigned_by", sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(["doctor_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["patient_id"], ["patients.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["assigned_by"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("doctor_id", "patient_id", name="uq_doctor_patient"),
    )
    op.create_index("idx_dpm_doctor", "doctor_patient_map", ["doctor_id"], unique=False)
    op.create_index("idx_dpm_patient", "doctor_patient_map", ["patient_id"], unique=False)

    op.create_table(
        "admissions",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("patient_id", sa.Integer(), nullable=False),
        sa.Column("admission_date", sa.Date(), nullable=True),
        sa.Column("discharge_date", sa.Date(), nullable=True),
        sa.Column("time_in_hospital", sa.Integer(), nullable=True),
        sa.Column("admission_type", sa.String(length=64), nullable=True),
        sa.Column("discharge_disposition", sa.String(length=128), nullable=True),
        sa.Column("num_medications", sa.Integer(), nullable=True),
        sa.Column("num_lab_procedures", sa.Integer(), nullable=True),
        sa.Column("number_diagnoses", sa.Integer(), nullable=True),
        sa.Column("readmitted", sa.String(length=8), nullable=True),
        sa.CheckConstraint(
            "discharge_date IS NULL OR admission_date IS NULL "
            "OR discharge_date >= admission_date",
            name="admissions_date_order_check",
        ),
        sa.ForeignKeyConstraint(["patient_id"], ["patients.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("idx_admissions_patient", "admissions", ["patient_id"], unique=False)

    op.create_table(
        "risk_predictions",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("patient_id", sa.Integer(), nullable=False),
        sa.Column("admission_id", sa.Integer(), nullable=True),
        sa.Column("readmission_probability", sa.Float(), nullable=False),
        sa.Column("risk_category", sa.String(length=16), nullable=False),
        sa.Column("model_name", sa.String(length=128), nullable=False),
        sa.Column("model_version", sa.String(length=32), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.CheckConstraint(
            "readmission_probability >= 0 AND readmission_probability <= 1",
            name="risk_probability_range_check",
        ),
        sa.CheckConstraint(
            "risk_category IN ('low', 'medium', 'high')",
            name="risk_category_check",
        ),
        sa.ForeignKeyConstraint(["admission_id"], ["admissions.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["patient_id"], ["patients.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "idx_risk_patient_created",
        "risk_predictions",
        ["patient_id", sa.text("created_at DESC")],
        unique=False,
    )

    op.create_table(
        "treatment_outcomes",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("admission_id", sa.Integer(), nullable=False),
        sa.Column("treatment_name", sa.String(length=255), nullable=False),
        sa.Column("medication_change", sa.Boolean(), nullable=True),
        sa.Column("recovery_score", sa.Float(), nullable=True),
        sa.Column("length_of_stay_days", sa.Integer(), nullable=True),
        sa.Column("outcome", sa.String(length=64), nullable=True),
        sa.ForeignKeyConstraint(["admission_id"], ["admissions.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("idx_treatment_admission", "treatment_outcomes", ["admission_id"], unique=False)

    # actor_id carries no foreign key on purpose: an audit row must outlive the
    # account that produced it.
    op.create_table(
        "audit_logs",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("actor_id", sa.Integer(), nullable=True),
        sa.Column("actor_role", sa.String(length=32), nullable=True),
        sa.Column("action", sa.String(length=128), nullable=False),
        sa.Column("resource", sa.String(length=128), nullable=True),
        sa.Column("outcome", sa.String(length=16), server_default="success", nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "idx_audit_actor_created",
        "audit_logs",
        ["actor_id", sa.text("created_at DESC")],
        unique=False,
    )


def downgrade() -> None:
    """Drop everything in reverse dependency order."""
    op.drop_index("idx_audit_actor_created", table_name="audit_logs")
    op.drop_table("audit_logs")

    op.drop_index("idx_treatment_admission", table_name="treatment_outcomes")
    op.drop_table("treatment_outcomes")

    op.drop_index("idx_risk_patient_created", table_name="risk_predictions")
    op.drop_table("risk_predictions")

    op.drop_index("idx_admissions_patient", table_name="admissions")
    op.drop_table("admissions")

    op.drop_index("idx_dpm_patient", table_name="doctor_patient_map")
    op.drop_index("idx_dpm_doctor", table_name="doctor_patient_map")
    op.drop_table("doctor_patient_map")

    op.drop_index("idx_patients_assigned_doctor", table_name="patients")
    op.drop_index("ix_patients_medical_record_number", table_name="patients")
    op.drop_table("patients")

    op.drop_index("idx_users_role", table_name="users")
    op.drop_index("ix_users_email", table_name="users")
    op.drop_table("users")
