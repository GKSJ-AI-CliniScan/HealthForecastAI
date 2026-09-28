"""Drop and recreate every table. Destroys all data - use only in dev."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.db.base import Base
from app.db.session import engine
import app.models.user  # noqa: F401
import app.models.patient  # noqa: F401
import app.models.admission  # noqa: F401
import app.models.prediction  # noqa: F401
import app.models.treatment  # noqa: F401
import app.models.audit_log  # noqa: F401


def main():
    confirm = input("This will DELETE all data in the database. Type 'yes' to continue: ")
    if confirm.strip().lower() != "yes":
        print("Cancelled.")
        return
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)
    print("Database reset: all tables dropped and recreated.")


if __name__ == "__main__":
    main()