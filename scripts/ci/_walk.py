"""Repository walking helpers shared by the CI checks."""

from __future__ import annotations

import subprocess
from pathlib import Path

SKIP_DIRS = {
    ".git",
    "node_modules",
    ".next",
    "out",
    "dist",
    "build",
    "__pycache__",
    ".venv",
    "venv",
    ".mypy_cache",
    ".ruff_cache",
    ".pytest_cache",
    ".ipynb_checkpoints",
    "htmlcov",
    ".turbo",
    "wheels",
}


def repo_root() -> Path:
    """Return the repository root."""
    return Path(__file__).resolve().parents[2]


def tracked_files() -> list[Path]:
    """Return every git-tracked file, falling back to a filesystem walk."""
    root = repo_root()
    try:
        output = subprocess.run(
            ["git", "ls-files", "-z"],
            cwd=root,
            capture_output=True,
            text=True,
            check=True,
            timeout=60,
        ).stdout
        names = [name for name in output.split("\0") if name]
        if names:
            return [root / name for name in names]
    except (subprocess.SubprocessError, OSError):
        pass
    return walk_files()


def walk_files() -> list[Path]:
    """Walk the working tree, skipping build and dependency directories."""
    root = repo_root()
    found: list[Path] = []
    stack = [root]
    while stack:
        current = stack.pop()
        try:
            entries = list(current.iterdir())
        except OSError:
            continue
        for entry in entries:
            if entry.is_dir():
                if entry.name not in SKIP_DIRS:
                    stack.append(entry)
            else:
                found.append(entry)
    return found


def rel(path: Path) -> str:
    """Return a repo-relative POSIX path for annotations."""
    try:
        return path.resolve().relative_to(repo_root()).as_posix()
    except ValueError:
        return path.as_posix()
