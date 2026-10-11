"""Settings normalisation for externally supplied configuration."""

from __future__ import annotations

from sqlalchemy.engine import make_url

from app.core.config import Settings


def test_bare_postgres_urls_are_routed_to_the_installed_driver() -> None:
    """A hosted platform hands out `postgresql://`, which SQLAlchemy sends to
    psycopg2. This project only ships psycopg 3, so that URL has to be rewritten
    or the first query of a fresh deploy raises ModuleNotFoundError.
    """
    settings = Settings(DATABASE_URL="postgresql://user:pw@d.example.com:5432/db")

    assert settings.DATABASE_URL == "postgresql+psycopg://user:pw@d.example.com:5432/db"
    assert make_url(settings.DATABASE_URL).get_driver_name() == "psycopg"


def test_other_dialects_pass_through_unchanged() -> None:
    for url in (
        "postgresql+psycopg://user:pw@d.example.com:5432/db",
        "sqlite:///./healthforecast.db",
    ):
        normalized = Settings(DATABASE_URL=url).DATABASE_URL
        assert normalized == url
