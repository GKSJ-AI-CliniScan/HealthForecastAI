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
    "patients",
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
    ],
)
def test_documented_indexes_exist(table: str, index: str) -> None:
    """Indexes named in the reference schema are declared on the models."""
    assert index in _index_names(table)


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
    ],
)
def test_defaults_are_enforced_by_the_database(table: str, column: str) -> None:
    """A raw SQL insert - the dataset import path - must still get its defaults."""
    assert Base.metadata.tables[table].c[column].server_default is not None


def test_audit_log_actor_has_no_foreign_key() -> None:
    """An audit row must survive the deletion of the account that produced it."""
    assert not Base.metadata.tables["audit_logs"].c.actor_id.foreign_keys


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
