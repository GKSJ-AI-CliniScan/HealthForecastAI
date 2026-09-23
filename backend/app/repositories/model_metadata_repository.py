"""Data access for the ML model registry."""

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.model_metadata import ModelMetadata
from app.repositories.base import BaseRepository


class ModelMetadataRepository(BaseRepository[ModelMetadata]):
    """Queries the model registry / inference services depend on."""

    def __init__(self, db: Session) -> None:
        super().__init__(ModelMetadata, db)

    def get_production(self, model_name: str) -> ModelMetadata | None:
        """Return the current production version of a model family, if any.

        Ties (more than one row somehow left in "production") are broken by
        the most recently promoted, then most recently trained - see
        demote_other_versions, which is what normally keeps this to one row.
        """
        stmt = (
            select(ModelMetadata)
            .where(
                ModelMetadata.model_name == model_name,
                ModelMetadata.status == "production",
            )
            .order_by(
                ModelMetadata.promoted_at.desc().nullslast(),
                ModelMetadata.trained_at.desc(),
            )
            .limit(1)
        )
        return self.db.execute(stmt).scalars().first()

    def list_for_name(self, model_name: str) -> list[ModelMetadata]:
        """Return every registered version of a model family, newest first."""
        stmt = (
            select(ModelMetadata)
            .where(ModelMetadata.model_name == model_name)
            .order_by(ModelMetadata.trained_at.desc())
        )
        return list(self.db.execute(stmt).scalars().all())

    def list_all(self) -> list[ModelMetadata]:
        """Return the full registry, newest first."""
        stmt = select(ModelMetadata).order_by(ModelMetadata.trained_at.desc())
        return list(self.db.execute(stmt).scalars().all())

    def demote_other_versions(self, model_name: str, keep_id: int) -> None:
        """Retire every other production row for this model family.

        Keeps get_production unambiguous: at most one row per model_name is
        ever "production" after a promotion, without needing a unique index
        to enforce it (retired history stays queryable via list_for_name).
        """
        stmt = select(ModelMetadata).where(
            ModelMetadata.model_name == model_name,
            ModelMetadata.status == "production",
            ModelMetadata.id != keep_id,
        )
        for record in self.db.execute(stmt).scalars().all():
            record.status = "retired"
            self.db.add(record)
        self.db.flush()
