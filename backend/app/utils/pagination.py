"""Pagination utility helper."""

import math
from typing import Any, TypeVar
from pydantic import BaseModel

T = TypeVar("T")


class PaginatedResult(BaseModel):
    """Generic container for paginated query results."""
    items: list[Any]
    total: int
    page: int
    page_size: int
    total_pages: int


def paginate_list(items: list[T], total: int, page: int, page_size: int) -> dict[str, Any]:
    """Format paginated metadata and list items."""
    total_pages = math.ceil(total / page_size) if page_size > 0 else 1
    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": max(1, total_pages),
    }
