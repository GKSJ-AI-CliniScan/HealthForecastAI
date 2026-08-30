import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.security import hash_password
from app.db.session import SessionLocal
from app.models.user import User

ADMIN_EMAIL = "admin@healthforecast.ai"
ADMIN_PASSWORD = "Admin@12345"


def main():
    db = SessionLocal()
    try:
        existing = db.query(User).filter(User.email == ADMIN_EMAIL).first()
        if existing:
            print(f"Admin already exists: {ADMIN_EMAIL}")
            return

        admin = User(
            email=ADMIN_EMAIL,
            full_name="System Administrator",
            hashed_password=hash_password(ADMIN_PASSWORD),
            role="system_admin",
            department="IT",
            is_active=True,
        )
        db.add(admin)
        db.commit()
        print(f"ADMIN CREATED: {ADMIN_EMAIL} / {ADMIN_PASSWORD}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
