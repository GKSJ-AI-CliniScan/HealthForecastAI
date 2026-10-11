"""Add admissions.source_admission_id for exact, idempotent dataset imports.

The relational India Hospital Readmission export identifies every admission
with its own admission_id. Storing it lets a re-import recognise an admission
exactly, instead of matching on dates/type/disposition (which breaks as soon
as an imported row is edited in the app).

Nullable and additive: admissions created in the app, rows from the
single-file importer and admissions imported before this revision keep NULL.
The importer adopts a legacy row (fills its NULL source id) when it matches
an incoming admission on the full natural key, so no existing row is deleted
or duplicated. The unique index allows many NULLs on both SQLite and
PostgreSQL.

Revision ID: 0005
Revises: 0004
Create Date: 2026-10-09
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0005"
down_revision: str | None = "0004"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    with op.batch_alter_table("admissions") as batch_op:
        batch_op.add_column(sa.Column("source_admission_id", sa.String(length=64), nullable=True))
        batch_op.create_index(
            "uq_admissions_source_admission_id", ["source_admission_id"], unique=True
        )


def downgrade() -> None:
    with op.batch_alter_table("admissions") as batch_op:
        batch_op.drop_index("uq_admissions_source_admission_id")
        batch_op.drop_column("source_admission_id")
