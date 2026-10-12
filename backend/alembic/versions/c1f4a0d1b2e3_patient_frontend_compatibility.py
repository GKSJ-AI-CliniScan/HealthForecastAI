"""add frontend patient workflow fields

Revision ID: c1f4a0d1b2e3
Revises: b7c41f9d2e05
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa

revision: str = "c1f4a0d1b2e3"
down_revision: str | None = "b7c41f9d2e05"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("patients", sa.Column("clinical_notes", sa.JSON(), nullable=True))
    op.add_column("patients", sa.Column("treatment_history", sa.JSON(), nullable=True))
    op.add_column("patients", sa.Column("recovery_progress", sa.JSON(), nullable=True))
    op.add_column("patients", sa.Column("treatment_status", sa.String(length=32), nullable=True))
    op.add_column("patients", sa.Column("risk_level", sa.String(length=16), nullable=True))
    op.add_column("patients", sa.Column("readmission_probability", sa.Float(), nullable=True))
    op.add_column("patients", sa.Column("discharge_date", sa.String(length=32), nullable=True))


def downgrade() -> None:
    op.drop_column("patients", "discharge_date")
    op.drop_column("patients", "readmission_probability")
    op.drop_column("patients", "risk_level")
    op.drop_column("patients", "treatment_status")
    op.drop_column("patients", "recovery_progress")
    op.drop_column("patients", "treatment_history")
    op.drop_column("patients", "clinical_notes")
