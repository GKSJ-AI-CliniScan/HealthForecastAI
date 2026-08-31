"""Generic Base Repository providing standardized CRUD operations."""

import uuid
from collections.abc import Sequence
from typing import Any, Generic, TypeVar
from sqlalchemy import select, func
from sqlalchemy.orm import Session

from app.db.base import Base

ModelType = TypeVar("ModelType", bound=Base)


class BaseRepository(Generic[ModelType]):
    """Base repository with common database access methods."""

    def __init__(self, model: type[ModelType], db: Session):
        self.model = model
        self.db = db

    def get_by_id(self, id_: uuid.UUID) -> ModelType | None:
        """Get single record by primary key."""
        return self.db.query(self.model).filter(self.model.id == id_).first()

    def get_all(self, skip: int = 0, limit: int = 100) -> Sequence[ModelType]:
        """Get all records with offset and limit."""
        return self.db.query(self.model).offset(skip).limit(limit).all()

    def count(self) -> int:
        """Count total records."""
        return self.db.query(func.count(self.model.id)).scalar() or 0

    def create(self, obj_in: ModelType) -> ModelType:
        """Add and commit a new record."""
        self.db.add(obj_in)
        self.db.commit()
        self.db.refresh(obj_in)
        return obj_in

    def update(self, db_obj: ModelType) -> ModelType:
        """Update and commit an existing record."""
        self.db.commit()
        self.db.refresh(db_obj)
        return db_obj

    def delete(self, id_: uuid.UUID) -> bool:
        """Delete a record by primary key."""
        obj = self.get_by_id(id_)
        if obj:
            self.db.delete(obj)
            self.db.commit()
            return True
        return False
