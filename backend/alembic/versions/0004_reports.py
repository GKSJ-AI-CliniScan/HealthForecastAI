"""Add the reports table.

Milestone 3 Phase D (Reporting & Export). The Database Design doc (section
5.13) specifies `reports` as the metadata record for a generated export; no
such table existed. Integer primary key and users.id foreign key follow this
schema's existing conventions rather than the doc's UUIDs. `format` also
admits csv, which the Phase D scope requires alongside pdf/xlsx.
`file_size_bytes` lets downloads be verified against what was written.

Revision ID: 0004
Revises: 0003
Create Date: 2026-09-27
"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "0004"
down_revision: str | None = "0003"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "reports",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("report_type", sa.String(length=50), nullable=False),
        sa.Column("format", sa.String(length=10), nullable=False),
        sa.Column(
            "generated_by",
            sa.Integer(),
            sa.ForeignKey("users.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column(
            "filters",
            sa.JSON().with_variant(postgresql.JSONB(), "postgresql"),
            nullable=True,
        ),
        sa.Column("file_path", sa.String(length=500), nullable=False, unique=True),
        sa.Column("file_size_bytes", sa.Integer(), nullable=False),
        sa.Column(
            "generated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.CheckConstraint(
            "report_type IN ('treatment_effectiveness', 'patient_outcomes', "
            "'department_performance', 'population_health', 'risk_distribution', "
            "'readmission_analytics', 'research_cohort')",
            name="reports_type_check",
        ),
        sa.CheckConstraint("format IN ('csv', 'xlsx', 'pdf')", name="reports_format_check"),
        sa.CheckConstraint("file_size_bytes >= 0", name="reports_file_size_check"),
    )
    op.create_index(
        "idx_reports_generated_by",
        "reports",
        ["generated_by", sa.text("generated_at DESC")],
    )


def downgrade() -> None:
    op.drop_index("idx_reports_generated_by", table_name="reports")
    op.drop_table("reports")
