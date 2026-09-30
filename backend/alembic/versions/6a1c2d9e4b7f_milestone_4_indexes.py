"""milestone 4 indexes

The dashboards read the latest prediction per patient and the audit log is read
newest-first; neither had an index that fits.

Revision ID: 6a1c2d9e4b7f
Revises: 0032e1b3059c
Create Date: 2026-09-30 15:00:00.000000
"""

from collections.abc import Sequence

from alembic import op

revision: str = "6a1c2d9e4b7f"
down_revision: str | None = "0032e1b3059c"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_index(
        "ix_risk_predictions_patient_latest", "risk_predictions", ["patient_id", "id"]
    )
    op.create_index("ix_audit_logs_created_at", "audit_logs", ["created_at"])


def downgrade() -> None:
    op.drop_index("ix_audit_logs_created_at", table_name="audit_logs")
    op.drop_index("ix_risk_predictions_patient_latest", table_name="risk_predictions")
