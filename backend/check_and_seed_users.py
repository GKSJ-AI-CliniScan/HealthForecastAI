"""Check existing users and seed demo accounts if needed."""

from sqlalchemy import select, text
from sqlalchemy.orm import sessionmaker

from app.core.config import settings
from app.core.security import hash_password
from app.db.session import engine
from app.models.user import User

DEMO_USERS = [
    {"email": "dr.reddy@healthforecast.org", "full_name": "Dr. Rama Reddy", "role": "doctor", "department": "Cardiology", "password": "password123"},
    {"email": "admin.ops@healthforecast.org", "full_name": "Operations Administrator", "role": "hospital_admin", "department": "Operations", "password": "password123"},
    {"email": "researcher@healthforecast.org", "full_name": "Research Analyst", "role": "researcher", "department": "Research", "password": "password123"},
    {"email": "admin@healthforecast.org", "full_name": "System Administrator", "role": "system_admin", "department": "IT", "password": "password123"},
]

SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)
db = SessionLocal()

try:
    print("=== Checking existing users in Supabase ===\n")
    
    existing_emails = [u.email for u in db.query(User).all()]
    print(f"Total users in database: {len(existing_emails)}\n")
    
    for email in ["dr.reddy@healthforecast.org", "admin.ops@healthforecast.org", "researcher@healthforecast.org", "admin@healthforecast.org"]:
        exists = email in existing_emails
        status = "✓ EXISTS" if exists else "✗ MISSING"
        print(f"  {status}: {email}")
    
    print("\n=== Seeding missing demo accounts ===\n")
    
    created_count = 0
    for user_data in DEMO_USERS:
        existing = db.query(User).filter(User.email == user_data["email"]).first()
        if existing:
            print(f"  SKIP: {user_data['email']} (already exists)")
            continue
        
        user = User(
            email=user_data["email"],
            full_name=user_data["full_name"],
            hashed_password=hash_password(user_data["password"]),
            role=user_data["role"],
            department=user_data["department"],
            is_active=True,
        )
        db.add(user)
        print(f"  CREATED: {user_data['email']} ({user_data['role']})")
        created_count += 1
    
    db.commit()
    
    print(f"\n✅ Demo accounts ready! Created {created_count} new users.")
    print("\nDemo credentials:")
    for u in DEMO_USERS:
        print(f"  {u['email']} / {u['password']}")

finally:
    db.close()
