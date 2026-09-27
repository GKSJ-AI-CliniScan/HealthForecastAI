"""Local-disk storage for generated report files.

Callers never supply a path: names are generated here, and every read,
write and delete re-validates the name against a strict pattern and confirms
the resolved path is still inside the storage root.
"""

import re
import uuid
from pathlib import Path

from app.core.config import settings

_FILE_NAME = re.compile(r"^[0-9a-f]{32}\.(csv|xlsx|pdf)$")


class InvalidReportFileNameError(ValueError):
    """Raised for a stored name that is not one this module could have generated."""


def storage_root() -> Path:
    """The configured storage directory, created on first use."""
    root = Path(settings.REPORT_STORAGE_DIR).resolve()
    root.mkdir(parents=True, exist_ok=True)
    return root


def new_file_name(extension: str) -> str:
    """A fresh, unguessable file name for a report of this format."""
    name = f"{uuid.uuid4().hex}.{extension}"
    if not _FILE_NAME.match(name):
        raise InvalidReportFileNameError(name)
    return name


def resolve(file_name: str) -> Path:
    """Absolute path for a stored name, refusing anything that could escape the root."""
    if not _FILE_NAME.match(file_name):
        raise InvalidReportFileNameError(file_name)
    root = storage_root()
    path = (root / file_name).resolve()
    if path.parent != root:
        raise InvalidReportFileNameError(file_name)
    return path


def write(file_name: str, content: bytes) -> int:
    """Write a new file (never overwriting one) and return its size in bytes."""
    path = resolve(file_name)
    with path.open("xb") as handle:
        handle.write(content)
    return len(content)


def remove(file_name: str) -> None:
    """Delete a stored file; a file that is already gone is not an error."""
    resolve(file_name).unlink(missing_ok=True)
