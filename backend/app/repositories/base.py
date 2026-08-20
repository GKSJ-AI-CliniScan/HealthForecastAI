"""Generic repository helpers for SQLAlchemy models."""

from typing import Any, Generic, TypeVar

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.base import Base

ModelT = TypeVar("ModelT", bound=Base)


class BaseRepository(Generic[ModelT]):
    """Thin CRUD wrapper so services never talk to the session directly."""

    def __init__(self, model: type[ModelT], db: Session) -> None:
        self.model = model
        self.db = db

    def get(self, obj_id: int) -> ModelT | None:
        """Return one row by primary key."""
        return self.db.get(self.model, obj_id)

    def list(self, limit: int = 100, offset: int = 0) -> list[ModelT]:
        """Return a page of rows."""
        stmt = select(self.model).limit(limit).offset(offset)
        return list(self.db.execute(stmt).scalars().all())

    def create(self, **values: Any) -> ModelT:
        """Insert a row and return it."""
        obj = self.model(**values)
        self.db.add(obj)
        self.db.commit()
        self.db.refresh(obj)
        return obj
