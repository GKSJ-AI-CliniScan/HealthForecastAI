"""Generic repository helpers for SQLAlchemy models."""

from typing import Any, Generic, TypeVar

from sqlalchemy import func, select
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

    def count(self) -> int:
        """Return the total number of rows."""
        stmt = select(func.count()).select_from(self.model)
        return self.db.execute(stmt).scalar_one()

    def create(self, **values: Any) -> ModelT:
        """Insert a row and return it."""
        obj = self.model(**values)
        self.db.add(obj)
        self.db.commit()
        self.db.refresh(obj)
        return obj

    def update(self, obj: ModelT, **values: Any) -> ModelT:
        """Apply the given field values to an existing row and return it.

        Callers pass only the fields they intend to change, so a partial update
        never blanks a column the client did not send.
        """
        for field, value in values.items():
            setattr(obj, field, value)
        self.db.add(obj)
        self.db.commit()
        self.db.refresh(obj)
        return obj

    def delete(self, obj: ModelT) -> None:
        """Remove a row."""
        self.db.delete(obj)
        self.db.commit()
