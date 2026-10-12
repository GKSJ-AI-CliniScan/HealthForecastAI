"""Add clinical_insights column to risk_predictions table

Revision ID: d8e9a2b3c4f5
Revises: c1f4a0d1b2e3
Create Date: 2026-10-10

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd8e9a2b3c4f5'
down_revision: Union[str, None] = 'c1f4a0d1b2e3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add clinical_insights JSONB column to risk_predictions table
    op.add_column('risk_predictions', sa.Column('clinical_insights', sa.JSON(), nullable=True))
    
    # Create index on created_at for faster queries
    op.execute("""
        CREATE INDEX IF NOT EXISTS idx_risk_patient_clinical ON risk_predictions (patient_id, created_at DESC)
        WHERE clinical_insights IS NOT NULL
    """)


def downgrade() -> None:
    # Drop the index first
    op.execute("DROP INDEX IF EXISTS idx_risk_patient_clinical")
    
    # Drop the column
    op.drop_column('risk_predictions', 'clinical_insights')
