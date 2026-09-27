"""Add admissions.department and constrain treatment_outcomes.outcome.

Milestone 3 Phase A (Analytics Foundation). `department` is specified in the
canonical Database Design doc's admissions table but was never migrated in
Milestone 1; it is required for department-level treatment/outcome analytics
(Project Brief: Hospital Administrator "Monitor department performance").
The treatment_outcomes.outcome CHECK constraint closes another Milestone 1
gap versus the Database Design doc's documented enum, and doubles as the
"422 invalid outcome" validation surface Milestone 3 needs at the API edge.

No new tables: Treatment Effectiveness, Patient Outcome and Research
Analytics are all computable via aggregation queries over the existing
patients/admissions/treatment_outcomes/risk_predictions tables - adding new
fact tables here would duplicate data already captured there.

Revision ID: 0003
Revises: 0002
Create Date: 2026-09-27
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0003"
down_revision: str | None = "0002"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Add admissions.department and the treatment outcome enum check."""
    with op.batch_alter_table("admissions") as batch_op:
        batch_op.add_column(sa.Column("department", sa.String(length=100), nullable=True))
        batch_op.create_index("idx_admissions_department", ["department"])

    with op.batch_alter_table("treatment_outcomes") as batch_op:
        batch_op.create_check_constraint(
            "treatment_outcomes_outcome_check",
            "outcome IS NULL OR outcome IN ('improved', 'unchanged', 'worsened', 'unknown')",
        )


def downgrade() -> None:
    """Drop the outcome check and the department column."""
    with op.batch_alter_table("treatment_outcomes") as batch_op:
        batch_op.drop_constraint("treatment_outcomes_outcome_check", type_="check")

    with op.batch_alter_table("admissions") as batch_op:
        batch_op.drop_index("idx_admissions_department")
        batch_op.drop_column("department")
