"""Persistence and validation tests for the model_metadata registry table.

These exercise the ORM model directly against the in-memory SQLite database
built by the `db_session` fixture (see conftest.py), the same way
test_repositories.py tests the other tables - no HTTP layer involved, since
Milestone 2's model registry endpoints do not exist yet.
"""

from datetime import UTC, datetime

import pytest
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.model_metadata import ModelMetadata
from app.models.user import User


def _make_admin(session: Session) -> User:
    user = User(
        email="admin@hospital.org",
        full_name="System Admin",
        hashed_password="not-a-real-hash",
        role="system_admin",
    )
    session.add(user)
    session.commit()
    session.refresh(user)
    return user


def _make_model(**overrides) -> ModelMetadata:
    defaults = {
        "model_name": "readmission_xgboost",
        "version": "1.0.0",
        "algorithm": "xgboost",
        "accuracy": 0.82,
        "precision_score": 0.77,
        "recall": 0.71,
        "f1_score": 0.74,
        "roc_auc": 0.79,
        "artifact_path": "ml/artifacts/readmission_xgboost_v1.joblib",
        "trained_at": datetime.now(UTC),
    }
    defaults.update(overrides)
    return ModelMetadata(**defaults)


def test_create_and_read_model_metadata_row(db_session: Session) -> None:
    """A fully-populated training run registers and reads back unchanged."""
    model = _make_model()
    db_session.add(model)
    db_session.commit()
    db_session.refresh(model)

    assert model.id is not None
    assert model.status == "staged"
    assert model.model_name == "readmission_xgboost"
    assert model.roc_auc == pytest.approx(0.79)
    assert model.promoted_at is None
    assert model.promoted_by is None


def test_status_defaults_to_staged_when_not_supplied(db_session: Session) -> None:
    """A freshly trained model is never auto-promoted."""
    model = _make_model()
    db_session.add(model)
    db_session.commit()
    db_session.refresh(model)

    assert model.status == "staged"


def test_metrics_are_optional(db_session: Session) -> None:
    """A model can be registered before evaluation metrics are known."""
    model = _make_model(
        accuracy=None, precision_score=None, recall=None, f1_score=None, roc_auc=None
    )
    db_session.add(model)
    db_session.commit()
    db_session.refresh(model)

    assert model.accuracy is None
    assert model.roc_auc is None


def test_duplicate_name_and_version_is_rejected(db_session: Session) -> None:
    """Re-registering the same model_name + version must fail (uq_model_metadata_name_version)."""
    db_session.add(_make_model())
    db_session.commit()

    db_session.add(_make_model())
    with pytest.raises(IntegrityError):
        db_session.commit()


def test_same_name_different_version_is_allowed(db_session: Session) -> None:
    """Two versions of the same model family may coexist."""
    db_session.add(_make_model(version="1.0.0"))
    db_session.commit()

    db_session.add(_make_model(version="1.1.0"))
    db_session.commit()  # must not raise


def test_invalid_algorithm_is_rejected(db_session: Session) -> None:
    """Only xgboost / random_forest / logistic_regression may be registered."""
    db_session.add(_make_model(algorithm="neural_network"))
    with pytest.raises(IntegrityError):
        db_session.commit()


def test_invalid_status_is_rejected(db_session: Session) -> None:
    """The lifecycle status is constrained to the four documented values."""
    db_session.add(_make_model(status="deployed"))
    with pytest.raises(IntegrityError):
        db_session.commit()


@pytest.mark.parametrize(
    "metric",
    ["accuracy", "precision_score", "recall", "f1_score", "roc_auc"],
)
def test_metric_above_one_is_rejected(db_session: Session, metric: str) -> None:
    """Every evaluation metric is a probability-shaped value in [0, 1]."""
    db_session.add(_make_model(**{metric: 1.5}))
    with pytest.raises(IntegrityError):
        db_session.commit()


@pytest.mark.parametrize(
    "metric",
    ["accuracy", "precision_score", "recall", "f1_score", "roc_auc"],
)
def test_metric_below_zero_is_rejected(db_session: Session, metric: str) -> None:
    """Metrics cannot be negative."""
    db_session.add(_make_model(**{metric: -0.1}))
    with pytest.raises(IntegrityError):
        db_session.commit()


def test_promotion_is_attributed_to_a_real_user(db_session: Session) -> None:
    """Promoting a model records which system administrator approved it."""
    admin = _make_admin(db_session)
    model = _make_model()
    model.status = "production"
    model.promoted_at = datetime.now(UTC)
    model.promoted_by = admin.id
    db_session.add(model)
    db_session.commit()
    db_session.refresh(model)

    assert model.promoted_by == admin.id
    assert model.status == "production"


def test_deleting_the_promoting_user_keeps_the_model_row(db_session: Session) -> None:
    """The promotion record must outlive the account that made it (ON DELETE SET NULL)."""
    admin = _make_admin(db_session)
    model = _make_model()
    model.status = "production"
    model.promoted_by = admin.id
    db_session.add(model)
    db_session.commit()

    db_session.delete(admin)
    db_session.commit()
    db_session.refresh(model)

    assert model.promoted_by is None
    assert model.status == "production"
