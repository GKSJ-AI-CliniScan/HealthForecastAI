"""Add model_metadata registry and extend risk_predictions for M2 scoring.

Adds the model registry table (model_metadata) that Milestone 2's training
pipeline registers every trained artefact into, and extends risk_predictions
with the columns needed to serve both risk-scoring and readmission-forecasting
predictions from the same table: prediction_type ('risk' | 'readmission'),
confidence_score, readmission_window ('30_day' | '90_day'), and the outcome
columns (actual_readmitted, outcome_recorded_at) used for FR-READM-04 feedback
logging. No existing column, table, row shape or primary key type changes.

Revision ID: 0002
Revises: 0001
Create Date: 2026-09-23
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0002"
down_revision: str | None = "0001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Create model_metadata and extend risk_predictions."""
    op.create_table(
        "model_metadata",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("model_name", sa.String(length=100), nullable=False),
        sa.Column("version", sa.String(length=50), nullable=False),
        sa.Column("algorithm", sa.String(length=50), nullable=False),
        sa.Column("accuracy", sa.Float(), nullable=True),
        sa.Column("precision_score", sa.Float(), nullable=True),
        sa.Column("recall", sa.Float(), nullable=True),
        sa.Column("f1_score", sa.Float(), nullable=True),
        sa.Column("roc_auc", sa.Float(), nullable=True),
        sa.Column("artifact_path", sa.String(length=500), nullable=False),
        sa.Column("status", sa.String(length=20), server_default="staged", nullable=False),
        sa.Column("trained_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("promoted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("promoted_by", sa.Integer(), nullable=True),
        sa.CheckConstraint(
            "algorithm IN ('xgboost', 'random_forest', 'logistic_regression')",
            name="model_metadata_algorithm_check",
        ),
        sa.CheckConstraint(
            "status IN ('staged', 'production', 'retired', 'rejected')",
            name="model_metadata_status_check",
        ),
        sa.CheckConstraint(
            "accuracy IS NULL OR (accuracy >= 0 AND accuracy <= 1)",
            name="model_metadata_accuracy_range_check",
        ),
        sa.CheckConstraint(
            "precision_score IS NULL OR (precision_score >= 0 AND precision_score <= 1)",
            name="model_metadata_precision_range_check",
        ),
        sa.CheckConstraint(
            "recall IS NULL OR (recall >= 0 AND recall <= 1)",
            name="model_metadata_recall_range_check",
        ),
        sa.CheckConstraint(
            "f1_score IS NULL OR (f1_score >= 0 AND f1_score <= 1)",
            name="model_metadata_f1_range_check",
        ),
        sa.CheckConstraint(
            "roc_auc IS NULL OR (roc_auc >= 0 AND roc_auc <= 1)",
            name="model_metadata_roc_auc_range_check",
        ),
        sa.ForeignKeyConstraint(["promoted_by"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("model_name", "version", name="uq_model_metadata_name_version"),
    )
    op.create_index(
        "idx_model_metadata_status", "model_metadata", ["model_name", "status"], unique=False
    )

    # The existing idx_risk_patient_created index orders by an expression
    # (created_at DESC), which Alembic's SQLite batch-copy cannot reflect back
    # onto the rebuilt table. Drop it before the batch and recreate it - along
    # with the new type index - afterwards via a plain CREATE INDEX, which
    # both SQLite and PostgreSQL support directly without batch mode.
    op.drop_index("idx_risk_patient_created", table_name="risk_predictions")

    # batch mode: SQLite (used by the test suite) cannot ALTER TABLE ... ADD
    # CONSTRAINT directly, so every change to the existing risk_predictions
    # table is expressed as one batch that both dialects can run.
    with op.batch_alter_table("risk_predictions") as batch_op:
        batch_op.add_column(
            sa.Column(
                "prediction_type", sa.String(length=20), server_default="risk", nullable=False
            )
        )
        batch_op.add_column(sa.Column("confidence_score", sa.Float(), nullable=True))
        batch_op.add_column(sa.Column("readmission_window", sa.String(length=10), nullable=True))
        batch_op.add_column(sa.Column("actual_readmitted", sa.Boolean(), nullable=True))
        batch_op.add_column(
            sa.Column("outcome_recorded_at", sa.DateTime(timezone=True), nullable=True)
        )
        batch_op.create_check_constraint(
            "risk_predictions_type_check", "prediction_type IN ('risk', 'readmission')"
        )
        batch_op.create_check_constraint(
            "risk_predictions_confidence_range_check",
            "confidence_score IS NULL OR (confidence_score >= 0 AND confidence_score <= 1)",
        )
        batch_op.create_check_constraint(
            "risk_predictions_window_check",
            "readmission_window IS NULL OR readmission_window IN ('30_day', '90_day')",
        )
        batch_op.create_check_constraint(
            "risk_predictions_readmission_requires_admission_check",
            "prediction_type != 'readmission' OR admission_id IS NOT NULL",
        )

    op.create_index(
        "idx_risk_patient_created",
        "risk_predictions",
        ["patient_id", sa.text("created_at DESC")],
        unique=False,
    )
    op.create_index(
        "idx_risk_predictions_type",
        "risk_predictions",
        ["prediction_type", sa.text("created_at DESC")],
        unique=False,
    )


def downgrade() -> None:
    """Drop the risk_predictions extensions and the model_metadata table."""
    op.drop_index("idx_risk_predictions_type", table_name="risk_predictions")
    op.drop_index("idx_risk_patient_created", table_name="risk_predictions")

    with op.batch_alter_table("risk_predictions") as batch_op:
        batch_op.drop_constraint(
            "risk_predictions_readmission_requires_admission_check", type_="check"
        )
        batch_op.drop_constraint("risk_predictions_window_check", type_="check")
        batch_op.drop_constraint("risk_predictions_confidence_range_check", type_="check")
        batch_op.drop_constraint("risk_predictions_type_check", type_="check")
        batch_op.drop_column("outcome_recorded_at")
        batch_op.drop_column("actual_readmitted")
        batch_op.drop_column("readmission_window")
        batch_op.drop_column("confidence_score")
        batch_op.drop_column("prediction_type")

    # Restore the pre-migration index so a full upgrade/downgrade cycle
    # leaves risk_predictions identical to its 0001 shape.
    op.create_index(
        "idx_risk_patient_created",
        "risk_predictions",
        ["patient_id", sa.text("created_at DESC")],
        unique=False,
    )

    op.drop_index("idx_model_metadata_status", table_name="model_metadata")
    op.drop_table("model_metadata")
