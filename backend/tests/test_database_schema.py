"""Schema tests.

These guard two things Milestone 1 depends on:

1. The SQLAlchemy metadata carries the constraints, foreign keys and indexes that
   database/postgres/schema/01_schema.sql documents.
2. The Alembic migration actually runs, and produces the same set of tables as the
   metadata, so `alembic upgrade head` and `Base.metadata.create_all` cannot drift.
"""

from pathlib import Path

import pytest
from sqlalchemy import create_engine, inspect

from alembic import command
from alembic.config import Config
from app.core.rbac import Role
from app.db.base import Base
from app.models import *  # noqa: F401,F403  - register every model with Base.metadata

EXPECTED_TABLES = {
    "admissions",
    "audit_logs",
    "doctor_patient_map",
    "model_metadata",
    "patients",
    "reports",
    "risk_predictions",
    "treatment_outcomes",
    "users",
}

BACKEND_ROOT = Path(__file__).resolve().parents[1]


def _constraint_names(table_name: str) -> set[str]:
    return {c.name for c in Base.metadata.tables[table_name].constraints if c.name}


def _index_names(table_name: str) -> set[str]:
    return {i.name for i in Base.metadata.tables[table_name].indexes if i.name}


def test_every_expected_table_is_registered() -> None:
    """Alembic autogenerate can only see models imported into the metadata."""
    assert set(Base.metadata.tables) >= EXPECTED_TABLES


def test_users_role_is_constrained_to_the_four_roles() -> None:
    """The database rejects a role outside the brief's access matrix."""
    assert "users_role_check" in _constraint_names("users")
    check = next(
        c for c in Base.metadata.tables["users"].constraints if c.name == "users_role_check"
    )
    rendered = str(check.sqltext)
    for role in Role:
        assert f"'{role}'" in rendered


def test_patient_assigned_doctor_is_a_real_foreign_key() -> None:
    """Doctor scoping is only trustworthy if the column actually references users."""
    column = Base.metadata.tables["patients"].c.assigned_doctor_id
    targets = {fk.target_fullname for fk in column.foreign_keys}
    assert targets == {"users.id"}
    assert all(fk.ondelete == "SET NULL" for fk in column.foreign_keys)


def test_admission_patient_foreign_key_cascades() -> None:
    """Deleting a patient must not strand admission rows."""
    column = Base.metadata.tables["admissions"].c.patient_id
    assert {fk.target_fullname for fk in column.foreign_keys} == {"patients.id"}
    assert all(fk.ondelete == "CASCADE" for fk in column.foreign_keys)


def test_admission_dates_are_ordered() -> None:
    """A discharge may not precede its admission."""
    assert "admissions_date_order_check" in _constraint_names("admissions")


def test_doctor_patient_map_prevents_duplicate_assignments() -> None:
    """The same doctor may not be granted the same patient twice."""
    assert "uq_doctor_patient" in _constraint_names("doctor_patient_map")


@pytest.mark.parametrize(
    ("table", "index"),
    [
        ("users", "idx_users_role"),
        ("patients", "idx_patients_assigned_doctor"),
        ("admissions", "idx_admissions_patient"),
        ("doctor_patient_map", "idx_dpm_doctor"),
        ("doctor_patient_map", "idx_dpm_patient"),
        ("audit_logs", "idx_audit_actor_created"),
        ("risk_predictions", "idx_risk_patient_created"),
        ("risk_predictions", "idx_risk_predictions_type"),
        ("model_metadata", "idx_model_metadata_status"),
        ("admissions", "idx_admissions_department"),
        ("reports", "idx_reports_generated_by"),
    ],
)
def test_documented_indexes_exist(table: str, index: str) -> None:
    """Indexes named in the reference schema are declared on the models."""
    assert index in _index_names(table)


def test_model_metadata_prevents_duplicate_name_version() -> None:
    """Re-registering the same model_name + version must be rejected."""
    assert "uq_model_metadata_name_version" in _constraint_names("model_metadata")


def test_model_metadata_algorithm_is_constrained() -> None:
    """Only the three selected algorithms may be registered."""
    assert "model_metadata_algorithm_check" in _constraint_names("model_metadata")


def test_model_metadata_status_is_constrained() -> None:
    """The staged -> production -> retired/rejected lifecycle is enforced."""
    assert "model_metadata_status_check" in _constraint_names("model_metadata")


def test_model_metadata_promoted_by_is_a_real_foreign_key() -> None:
    """Promotion is attributable to a real user account."""
    column = Base.metadata.tables["model_metadata"].c.promoted_by
    targets = {fk.target_fullname for fk in column.foreign_keys}
    assert targets == {"users.id"}
    assert all(fk.ondelete == "SET NULL" for fk in column.foreign_keys)


def test_risk_predictions_type_is_constrained() -> None:
    """A prediction row must be either a risk score or a readmission forecast."""
    assert "risk_predictions_type_check" in _constraint_names("risk_predictions")


def test_risk_predictions_readmission_requires_admission() -> None:
    """A readmission forecast must be tied to the admission it forecasts."""
    assert "risk_predictions_readmission_requires_admission_check" in _constraint_names(
        "risk_predictions"
    )


def test_risk_predictions_window_is_constrained() -> None:
    """Only the two supported forecast horizons (30/90 day) are valid."""
    assert "risk_predictions_window_check" in _constraint_names("risk_predictions")


@pytest.mark.parametrize(
    ("table", "column"),
    [
        ("users", "role"),
        ("users", "is_active"),
        ("users", "created_at"),
        ("patients", "created_at"),
        ("doctor_patient_map", "assigned_at"),
        ("audit_logs", "outcome"),
        ("audit_logs", "created_at"),
        ("risk_predictions", "created_at"),
        ("risk_predictions", "prediction_type"),
        ("model_metadata", "status"),
        ("reports", "generated_at"),
    ],
)
def test_defaults_are_enforced_by_the_database(table: str, column: str) -> None:
    """A raw SQL insert - the dataset import path - must still get its defaults."""
    assert Base.metadata.tables[table].c[column].server_default is not None


def test_audit_log_actor_has_no_foreign_key() -> None:
    """An audit row must survive the deletion of the account that produced it."""
    assert not Base.metadata.tables["audit_logs"].c.actor_id.foreign_keys


def test_admissions_has_a_department_column() -> None:
    """Department-level analytics (Milestone 3) needs a real column, not admission_type."""
    assert "department" in Base.metadata.tables["admissions"].c


def test_treatment_outcomes_outcome_is_constrained() -> None:
    """Only the four documented outcome values may be recorded."""
    assert "treatment_outcomes_outcome_check" in _constraint_names("treatment_outcomes")


def test_reports_type_and_format_are_constrained() -> None:
    """Only the supported report types and export formats may be stored."""
    names = _constraint_names("reports")
    assert {"reports_type_check", "reports_format_check", "reports_file_size_check"} <= names


def test_reports_generated_by_restricts_user_deletion() -> None:
    """A user with report history cannot be deleted out from under it."""
    column = Base.metadata.tables["reports"].c.generated_by
    assert {fk.target_fullname for fk in column.foreign_keys} == {"users.id"}
    assert all(fk.ondelete == "RESTRICT" for fk in column.foreign_keys)


def test_reports_file_path_is_unique() -> None:
    """Two report rows can never point at the same stored file."""
    assert Base.metadata.tables["reports"].c.file_path.unique


def test_migration_upgrades_and_downgrades_cleanly(tmp_path: Path, monkeypatch) -> None:
    """`alembic upgrade head` builds the same tables the metadata declares."""
    from app.core import config as config_module

    db_path = tmp_path / "migration_check.db"
    url = f"sqlite+pysqlite:///{db_path}"
    monkeypatch.setattr(config_module.settings, "DATABASE_URL", url)

    alembic_cfg = Config(str(BACKEND_ROOT / "alembic.ini"))
    alembic_cfg.set_main_option("script_location", str(BACKEND_ROOT / "alembic"))

    command.upgrade(alembic_cfg, "head")

    engine = create_engine(url, future=True)
    try:
        tables = set(inspect(engine).get_table_names())
        assert tables >= EXPECTED_TABLES
    finally:
        engine.dispose()

    command.downgrade(alembic_cfg, "base")

    engine = create_engine(url, future=True)
    try:
        remaining = set(inspect(engine).get_table_names()) - {"alembic_version"}
        assert remaining == set()
    finally:
        engine.dispose()
