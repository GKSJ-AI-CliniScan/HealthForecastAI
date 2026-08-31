"""Role schemas."""

import uuid
from datetime import datetime
from pydantic import BaseModel, ConfigDict


class RoleBase(BaseModel):
    """Base role schema."""
    name: str
    description: str | None = None


class RoleCreate(RoleBase):
    """Role creation payload."""
    pass


class RoleResponse(RoleBase):
    """Role response model."""
    id: uuid.UUID
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
