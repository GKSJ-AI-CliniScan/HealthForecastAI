"""Seed script for demo user accounts."""

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.security import hash_password
from app.models.user import User

# Demo accounts - these are for demonstration purposes only
DEMO_USERS = [
    {
        "email": "dr.reddy@healthforecast.org",
        "full_name": "Dr. Rama Reddy",
        "role": "doctor",
        "department": "Cardiology",
        "password": "password123",
    },
    {
        "email": "admin.ops@healthforecast.org",
        "full_name": "Operations Administrator",
        "role": "hospital_admin",
        "department": "Operations",
        "password": "password123",
    },
    {
        "email": "researcher@healthforecast.org",
        "full_name": "Research Analyst",
        "role": "researcher",
        "department": "Research",
        "password": "password123",
    },
    {
        "email": "admin@healthforecast.org",
        "full_name": "System Administrator",
        "role": "system_admin",
        "department": "IT",
        "password": "password123",
    },
]


def seed_demo_users():
    """Create demo user accounts in the database."""
    # Read DATABASE_URL from environment or use default
    import os
    from app.core.config import settings

    database_url = os.environ.get("DATABASE_URL", settings.DATABASE_URL)

    engine = create_engine(database_url)
    SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)

    db = SessionLocal()

    try:
        for user_data in DEMO_USERS:
            # Check if user already exists
            existing = db.query(User).filter(User.email == user_data["email"]).first()
            if existing:
                print(f"User {user_data['email']} already exists, skipping...")
                continue

            # Create user
            user = User(
                email=user_data["email"],
                full_name=user_data["full_name"],
                hashed_password=hash_password(user_data["password"]),
                role=user_data["role"],
                department=user_data["department"],
                is_active=True,
            )

            db.add(user)
            print(f"Created demo user: {user_data['email']} ({user_data['role']})")

        db.commit()
        print("\n✅ Demo accounts created successfully!")
        print("\nDemo credentials:")
        print("  dr.reddy@healthforecast.org / password123")
        print("  admin.ops@healthforecast.org / password123")
        print("  researcher@healthforecast.org / password123")
        print("  admin@healthforecast.org / password123")

    finally:
        db.close()


if __name__ == "__main__":
    seed_demo_users()
