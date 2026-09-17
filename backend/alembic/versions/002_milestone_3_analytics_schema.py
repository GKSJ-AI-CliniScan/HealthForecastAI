"""Milestone 3 schema migration: treatment extension, medications, and patient outcomes.

Revision ID: 002_milestone_3_analytics_schema
Revises: 001_initial_schema
Create Date: 2026-09-17
"""

from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from app.db.base import GUID

# revision identifiers, used by Alembic.
revision: str = "002_milestone_3_analytics_schema"
down_revision: Union[str, None] = "001_initial_schema"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Extend treatments table with outcome and effectiveness_score
    op.add_column("treatments", sa.Column("outcome", sa.String(length=32), nullable=True))
    op.add_column("treatments", sa.Column("effectiveness_score", sa.Float(), nullable=True))
    op.create_index("ix_treatments_outcome", "treatments", ["outcome"])
    op.create_index("ix_treatments_treatment_type", "treatments", ["treatment_type"])
    op.create_index("ix_treatments_status", "treatments", ["status"])

    # 2. Add indexes to admissions for analytics queries
    op.create_index("ix_admissions_admission_date", "admissions", ["admission_date"])
    op.create_index("ix_admissions_department", "admissions", ["department"])

    # 3. Create medications table
    op.create_table(
        "medications",
        sa.Column("id", GUID(), primary_key=True, nullable=False),
        sa.Column("patient_id", GUID(), sa.ForeignKey("patients.id", ondelete="CASCADE"), nullable=False),
        sa.Column("medication_name", sa.String(length=255), nullable=False),
        sa.Column("dosage", sa.String(length=128), nullable=True),
        sa.Column("frequency", sa.String(length=128), nullable=True),
        sa.Column("start_date", sa.Date(), nullable=False),
        sa.Column("end_date", sa.Date(), nullable=True),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="ACTIVE"),
        sa.Column("effectiveness_score", sa.Float(), nullable=True),
        sa.Column("outcome", sa.String(length=32), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_medications_id", "medications", ["id"])
    op.create_index("ix_medications_patient_id", "medications", ["patient_id"])
    op.create_index("ix_medications_medication_name", "medications", ["medication_name"])
    op.create_index("ix_medications_status", "medications", ["status"])
    op.create_index("ix_medications_outcome", "medications", ["outcome"])

    # 4. Create patient_outcomes table
    op.create_table(
        "patient_outcomes",
        sa.Column("id", GUID(), primary_key=True, nullable=False),
        sa.Column("patient_id", GUID(), sa.ForeignKey("patients.id", ondelete="CASCADE"), nullable=False),
        sa.Column("admission_id", GUID(), sa.ForeignKey("admissions.id", ondelete="SET NULL"), nullable=True),
        sa.Column("outcome_status", sa.String(length=64), nullable=False),
        sa.Column("outcome_score", sa.Float(), nullable=True),
        sa.Column("recorded_date", sa.Date(), nullable=False),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_patient_outcomes_id", "patient_outcomes", ["id"])
    op.create_index("ix_patient_outcomes_patient_id", "patient_outcomes", ["patient_id"])
    op.create_index("ix_patient_outcomes_admission_id", "patient_outcomes", ["admission_id"])
    op.create_index("ix_patient_outcomes_outcome_status", "patient_outcomes", ["outcome_status"])
    op.create_index("ix_patient_outcomes_recorded_date", "patient_outcomes", ["recorded_date"])


def downgrade() -> None:
    op.drop_table("patient_outcomes")
    op.drop_table("medications")
    op.drop_index("ix_admissions_department", table_name="admissions")
    op.drop_index("ix_admissions_admission_date", table_name="admissions")
    op.drop_index("ix_treatments_status", table_name="treatments")
    op.drop_index("ix_treatments_treatment_type", table_name="treatments")
    op.drop_index("ix_treatments_outcome", table_name="treatments")
    op.drop_column("treatments", "effectiveness_score")
    op.drop_column("treatments", "outcome")
