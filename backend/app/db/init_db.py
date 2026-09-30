"""Seed the demo accounts.

Milestone 1. Run once, after the schema has been migrated:

    alembic upgrade head
    python -m app.db.init_db

Passwords come from SEED_PASSWORD, or are generated and printed if it is not
set. They are demo accounts for a development database - never run this against
anything real, and never commit the password it prints.
"""

from __future__ import annotations

import os
import secrets
import sys

from sqlalchemy import inspect
from sqlalchemy.orm import Session

from app.core.logging_config import logger
from app.core.rbac import Role
from app.db.base import Base
from app.db.session import SessionLocal, engine
from app.models import (  # noqa: F401  - imported so Base.metadata knows every table
    Admission,
    AuditLog,
    Patient,
    RiskPrediction,
    TreatmentOutcome,
    User,
)
from app.schemas.user import UserCreate
from app.services import auth_service

SEED_USERS: tuple[tuple[str, str, Role, str | None], ...] = (
    ("admin@healthforecast.org", "System Administrator", Role.SYSTEM_ADMIN, "IT"),
    ("dr.reddy@healthforecast.org", "Dr Anitha Reddy", Role.DOCTOR, "Endocrinology"),
    ("dr.mehta@healthforecast.org", "Dr Sanjay Mehta", Role.DOCTOR, "Internal Medicine"),
    ("admin.ops@healthforecast.org", "Hospital Administrator", Role.HOSPITAL_ADMIN, "Operations"),
    ("researcher@healthforecast.org", "Healthcare Researcher", Role.RESEARCHER, "Research"),
)


def check_schema() -> None:
    """Refuse to seed a database that Alembic has not migrated.

    This used to call Base.metadata.create_all. That built tables straight from
    the models, bypassing migrations: the database looked fine but carried no
    alembic_version row and none of the CHECK constraints, and the first real
    migration then failed with "relation already exists". Alembic owns the
    schema; this only verifies it is there.
    """
    inspector = inspect(engine)
    missing = [name for name in Base.metadata.tables if not inspector.has_table(name)]
    if missing or not inspector.has_table("alembic_version"):
        raise SystemExit(
            "The database has not been migrated (missing: "
            + (", ".join(missing) or "alembic_version")
            + "). Run: cd backend && alembic upgrade head"
        )
    logger.info("Schema present: %s", ", ".join(sorted(Base.metadata.tables)))


def seed_users(db: Session, password: str) -> list[User]:
    """Create the demo accounts, skipping any that already exist."""
    created: list[User] = []

    for email, full_name, role, department in SEED_USERS:
        if auth_service.get_user_by_email(db, email) is not None:
            logger.info("User already exists, skipping: %s", email)
            continue

        user = auth_service.create_user(
            db,
            UserCreate(
                email=email,
                full_name=full_name,
                role=role,
                department=department,
                password=password,
            ),
        )
        created.append(user)
        logger.info("Created %s (%s)", user.email, user.role)

    return created


def main() -> int:
    """Verify the schema and seed the demo accounts."""
    password = os.environ.get("SEED_PASSWORD")
    generated = password is None
    if generated:
        password = secrets.token_urlsafe(16)

    check_schema()

    with SessionLocal() as db:
        # Read the values inside the session: the ORM objects are detached once
        # it closes, and touching an attribute then raises.
        created = [(user.role, user.email) for user in seed_users(db, password)]

    if not created:
        print("Nothing to seed - every demo account already exists.")
        return 0

    print(f"\nCreated {len(created)} account(s):\n")
    for role, email in created:
        print(f"  {role:16} {email}")

    if generated:
        print(f"\nGenerated password for all seeded accounts: {password}")
        print("Set SEED_PASSWORD to choose your own. Do not commit this value.\n")
    else:
        print("\nUsing the password from SEED_PASSWORD.\n")

    return 0


if __name__ == "__main__":
    sys.exit(main())
