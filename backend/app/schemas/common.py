"""Shared response envelopes."""

from typing import Any, Generic, TypeVar

from pydantic import BaseModel

T = TypeVar("T")


class ApiEnvelope(BaseModel, Generic[T]):
    """`{success, data}` wrapper the dashboard services unwrap.

    Endpoints that predate this keep returning bare payloads; only the
    Milestone 3 routes are wrapped, so no existing caller breaks.
    """

    success: bool = True
    data: T

    @classmethod
    def ok(cls, payload: Any) -> "ApiEnvelope[Any]":
        """Wrap a payload as a successful response."""
        return cls[Any](success=True, data=payload)
