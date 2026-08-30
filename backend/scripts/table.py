import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.base import Base
from app.db.session import engine


def main():
    print(f"Using database: {engine.url}")
    Base.metadata.create_all(engine)
    print("TABLES CREATED:", list(Base.metadata.tables.keys()))


if __name__ == "__main__":
    main()
