"""Create one demo account per role so the dashboard can be reviewed.

    python database/postgres/seeds/seed_users.py

Passwords are development placeholders and are printed on creation. They are not
production credentials and the script refuses to run outside development.
"""

from __future__ import annotations

import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[3]
BACKEND_ROOT = REPO_ROOT / "backend"
for path in (str(REPO_ROOT), str(BACKEND_ROOT)):
    if path not in sys.path:
        sys.path.insert(0, path)

from app.core.config import settings
from app.core.rbac import Role
from app.core.security import hash_password
from app.db.session import SessionLocal
from app.models.user import User

DEMO_PASSWORD = "Demo12345"

DEMO_USERS = (
    ("doctor@hospital.example", "Dr Asha Verma", Role.DOCTOR, "Internal Medicine"),
    ("admin@hospital.example", "Ravi Menon", Role.HOSPITAL_ADMIN, "Administration"),
    ("researcher@hospital.example", "Dr Lin Wei", Role.RESEARCHER, "Clinical Research"),
    ("sysadmin@hospital.example", "Priya Nair", Role.SYSTEM_ADMIN, "IT"),
)


def main() -> int:
    """Insert the demo accounts, skipping any that already exist."""
    if settings.ENVIRONMENT.lower() not in {"development", "test", "local"}:
        print(f"Refusing to seed demo accounts in ENVIRONMENT={settings.ENVIRONMENT}.")
        return 1

    db = SessionLocal()
    created = 0
    try:
        for email, full_name, role, department in DEMO_USERS:
            if db.query(User).filter(User.email == email).one_or_none() is not None:
                print(f"    exists  {email}")
                continue
            db.add(
                User(
                    email=email,
                    full_name=full_name,
                    hashed_password=hash_password(DEMO_PASSWORD),
                    role=str(role),
                    department=department,
                    is_active=True,
                )
            )
            created += 1
            print(f"    created {email:<28} role={role}")
        db.commit()
    finally:
        db.close()

    print(f"\n{created} account(s) created. Password for all demo accounts: {DEMO_PASSWORD}")
    print("Development credentials only - never load this file in production.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
