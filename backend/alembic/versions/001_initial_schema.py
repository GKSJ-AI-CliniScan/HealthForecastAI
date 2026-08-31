"""Initial schema migration for HealthForecast AI Milestone 1.

Revision ID: 001_initial_schema
Revises:
Create Date: 2026-08-31
"""

from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from app.db.base import GUID

# revision identifiers, used by Alembic.
revision: str = "001_initial_schema"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. roles table
    op.create_table(
        "roles",
        sa.Column("id", GUID(), primary_key=True, nullable=False),
        sa.Column("name", sa.String(length=64), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_roles_id", "roles", ["id"])
    op.create_index("ix_roles_name", "roles", ["name"], unique=True)

    # 2. users table
    op.create_table(
        "users",
        sa.Column("id", GUID(), primary_key=True, nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("username", sa.String(length=64), nullable=False),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column("first_name", sa.String(length=128), nullable=False),
        sa.Column("last_name", sa.String(length=128), nullable=False),
        sa.Column("role_id", GUID(), sa.ForeignKey("roles.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_users_id", "users", ["id"])
    op.create_index("ix_users_email", "users", ["email"], unique=True)
    op.create_index("ix_users_username", "users", ["username"], unique=True)
    op.create_index("ix_users_role_id", "users", ["role_id"])

    # 3. patients table
    op.create_table(
        "patients",
        sa.Column("id", GUID(), primary_key=True, nullable=False),
        sa.Column("patient_identifier", sa.String(length=64), nullable=False),
        sa.Column("first_name", sa.String(length=128), nullable=False),
        sa.Column("last_name", sa.String(length=128), nullable=False),
        sa.Column("date_of_birth", sa.Date(), nullable=True),
        sa.Column("gender", sa.String(length=32), nullable=True),
        sa.Column("phone", sa.String(length=32), nullable=True),
        sa.Column("email", sa.String(length=255), nullable=True),
        sa.Column("address", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_patients_id", "patients", ["id"])
    op.create_index("ix_patients_patient_identifier", "patients", ["patient_identifier"], unique=True)

    # 4. doctor_patient_assignments table
    op.create_table(
        "doctor_patient_assignments",
        sa.Column("id", GUID(), primary_key=True, nullable=False),
        sa.Column("doctor_id", GUID(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("patient_id", GUID(), sa.ForeignKey("patients.id", ondelete="CASCADE"), nullable=False),
        sa.Column("assigned_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("doctor_id", "patient_id", name="uq_doctor_patient_assignment"),
    )
    op.create_index("ix_doctor_patient_assignments_id", "doctor_patient_assignments", ["id"])
    op.create_index("ix_doctor_patient_assignments_doctor_id", "doctor_patient_assignments", ["doctor_id"])
    op.create_index("ix_doctor_patient_assignments_patient_id", "doctor_patient_assignments", ["patient_id"])

    # 5. medical_histories table
    op.create_table(
        "medical_histories",
        sa.Column("id", GUID(), primary_key=True, nullable=False),
        sa.Column("patient_id", GUID(), sa.ForeignKey("patients.id", ondelete="CASCADE"), nullable=False),
        sa.Column("diagnosis", sa.Text(), nullable=True),
        sa.Column("chronic_conditions", sa.Text(), nullable=True),
        sa.Column("allergies", sa.Text(), nullable=True),
        sa.Column("medical_notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_medical_histories_id", "medical_histories", ["id"])
    op.create_index("ix_medical_histories_patient_id", "medical_histories", ["patient_id"])

    # 6. admissions table
    op.create_table(
        "admissions",
        sa.Column("id", GUID(), primary_key=True, nullable=False),
        sa.Column("patient_id", GUID(), sa.ForeignKey("patients.id", ondelete="CASCADE"), nullable=False),
        sa.Column("admission_date", sa.Date(), nullable=False),
        sa.Column("discharge_date", sa.Date(), nullable=True),
        sa.Column("admission_type", sa.String(length=64), nullable=True),
        sa.Column("department", sa.String(length=128), nullable=True),
        sa.Column("primary_diagnosis", sa.String(length=255), nullable=True),
        sa.Column("length_of_stay", sa.Integer(), nullable=True),
        sa.Column("discharge_disposition", sa.String(length=128), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_admissions_id", "admissions", ["id"])
    op.create_index("ix_admissions_patient_id", "admissions", ["patient_id"])

    # 7. treatments table
    op.create_table(
        "treatments",
        sa.Column("id", GUID(), primary_key=True, nullable=False),
        sa.Column("patient_id", GUID(), sa.ForeignKey("patients.id", ondelete="CASCADE"), nullable=False),
        sa.Column("treatment_name", sa.String(length=255), nullable=False),
        sa.Column("treatment_type", sa.String(length=128), nullable=True),
        sa.Column("start_date", sa.Date(), nullable=False),
        sa.Column("end_date", sa.Date(), nullable=True),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="ACTIVE"),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_treatments_id", "treatments", ["id"])
    op.create_index("ix_treatments_patient_id", "treatments", ["patient_id"])

    # 8. audit_logs table
    op.create_table(
        "audit_logs",
        sa.Column("id", GUID(), primary_key=True, nullable=False),
        sa.Column("user_id", GUID(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("action", sa.String(length=128), nullable=False),
        sa.Column("resource", sa.String(length=128), nullable=True),
        sa.Column("resource_id", sa.String(length=128), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_audit_logs_id", "audit_logs", ["id"])
    op.create_index("ix_audit_logs_user_id", "audit_logs", ["user_id"])
    op.create_index("ix_audit_logs_action", "audit_logs", ["action"])
    op.create_index("ix_audit_logs_created_at", "audit_logs", ["created_at"])


def downgrade() -> None:
    op.drop_table("audit_logs")
    op.drop_table("treatments")
    op.drop_table("admissions")
    op.drop_table("medical_histories")
    op.drop_table("doctor_patient_assignments")
    op.drop_table("patients")
    op.drop_table("users")
    op.drop_table("roles")
