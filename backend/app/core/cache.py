"""A small time-limited cache for expensive aggregate reports - Milestone 4.

The hospital dashboards run whole-table aggregates (63,000 patients) that change
only when a batch load or scoring run finishes. Recomputing them for every page
view made the API CPU-bound under modest load. Caching them for a short time
trades a bounded amount of staleness for an order of magnitude more throughput.

What is and is not cached:

* Only pure aggregate computations are cached, *after* the router has authorised
  the caller and written any audit row. A cache hit skips the SQL, never the
  permission check or the audit trail.
* The cache key includes who is asking in the only way results depend on it: the
  role, and the user id for a doctor (whose results are scoped to their caseload).
  One doctor can therefore never be served another doctor's numbers.
* Values are deep-copied in and out, so a caller that mutates a result cannot
  poison the next reader.

The cache is per process. With several workers each keeps its own copy, so two
requests can differ by up to one TTL. `CACHE_TTL_SECONDS=0` turns it off; the test
suite does, so tests see their own writes immediately.
"""

from __future__ import annotations

import copy
import functools
import threading
import time
from collections.abc import Callable
from typing import Any, TypeVar

from app.core.config import settings
from app.core.rbac import Role

F = TypeVar("F", bound=Callable[..., Any])

_store: dict[tuple, tuple[float, Any]] = {}
_lock = threading.Lock()
_MAX_ENTRIES = 512


def clear() -> None:
    """Drop every cached value (used by tests and after a data load)."""
    with _lock:
        _store.clear()


def _who(value: Any) -> Any:
    """Reduce an actor to the parts a result can depend on; pass anything else through."""
    role = getattr(value, "role", None)
    if role is None or not hasattr(value, "id"):
        return value
    return (str(role), value.id if role == Role.DOCTOR else None)


def ttl_cache(function: F) -> F:
    """Cache a service function's result for `settings.CACHE_TTL_SECONDS`.

    The first positional argument must be the database session and is not part of
    the key. Works for any function whose other arguments are hashable, or are an
    actor (see `_who`).
    """

    @functools.wraps(function)
    def wrapper(db: Any, *args: Any, **kwargs: Any) -> Any:
        ttl = settings.CACHE_TTL_SECONDS
        if ttl <= 0:
            return function(db, *args, **kwargs)

        key = (
            function.__module__,
            function.__qualname__,
            tuple(_who(a) for a in args),
            tuple(sorted((k, _who(v)) for k, v in kwargs.items())),
        )
        now = time.monotonic()
        with _lock:
            hit = _store.get(key)
            if hit is not None and now - hit[0] < ttl:
                return copy.deepcopy(hit[1])

        value = function(db, *args, **kwargs)

        with _lock:
            if len(_store) >= _MAX_ENTRIES:
                oldest = min(_store, key=lambda k: _store[k][0])
                del _store[oldest]
            _store[key] = (now, copy.deepcopy(value))
        return value

    return wrapper  # type: ignore[return-value]
