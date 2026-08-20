"""Helpers for producing researcher safe, de-identified records."""

import hashlib


def pseudonymise(identifier: str, salt: str) -> str:
    """Return a stable, non-reversible pseudonym for a direct identifier.

    Used before any record is exposed to the researcher role. The salt must come
    from configuration and must never be committed to the repository.
    """
    digest = hashlib.sha256(f"{salt}:{identifier}".encode()).hexdigest()
    return f"PT-{digest[:16].upper()}"
