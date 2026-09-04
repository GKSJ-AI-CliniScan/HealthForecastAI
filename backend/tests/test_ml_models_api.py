"""Tests for the AI model management endpoints (N4b: GET /models/metrics).

No existing tests covered this router before N4b, so the RBAC guard on the
other two endpoints is covered here too, not just the new one.
"""

import json
from pathlib import Path

from fastapi.testclient import TestClient

from app.core.config import settings
from app.core.rbac import Role
from app.services import model_service


def _write_metrics(tmp_path: Path, monkeypatch, summary: dict) -> None:
    """Point MODEL_ARTIFACT_DIR at tmp_path and write metrics.json there."""
    monkeypatch.setattr(settings, "MODEL_ARTIFACT_DIR", str(tmp_path))
    (tmp_path / model_service.METRICS_FILENAME).write_text(json.dumps(summary), encoding="utf-8")


def test_metrics_returns_the_best_models_real_numbers(
    client: TestClient, auth_header, tmp_path: Path, monkeypatch
) -> None:
    """The five fields come from metrics.json's best_model entry, not placeholders."""
    _write_metrics(
        tmp_path,
        monkeypatch,
        {
            "best_model": "xgboost",
            "promoted": True,
            "results": {
                "xgboost": {
                    "accuracy": 0.6868,
                    "precision": 0.1454,
                    "recall": 0.5099,
                    "f1": 0.2263,
                    "roc_auc": 0.6534,
                }
            },
        },
    )
    response = client.get("/api/v1/models/metrics", headers=auth_header(Role.SYSTEM_ADMIN))
    assert response.status_code == 200
    body = response.json()
    assert body == {
        "accuracy": 0.6868,
        "precision": 0.1454,
        "recall": 0.5099,
        "f1": 0.2263,
        "roc_auc": 0.6534,
    }
    assert all(value is not None for value in body.values())


def test_metrics_is_503_not_nulls_when_metrics_json_is_missing(
    client: TestClient, auth_header, tmp_path: Path, monkeypatch
) -> None:
    """An untrained model is an outage, not a 200 full of nulls (C3)."""
    monkeypatch.setattr(settings, "MODEL_ARTIFACT_DIR", str(tmp_path))
    response = client.get("/api/v1/models/metrics", headers=auth_header(Role.SYSTEM_ADMIN))
    assert response.status_code == 503
    assert "No metrics recorded" in response.json()["detail"]


def test_metrics_is_503_on_a_malformed_metrics_file(
    client: TestClient, auth_header, tmp_path: Path, monkeypatch
) -> None:
    """A metrics.json missing the fields this endpoint promises is also a 503, not a 500."""
    monkeypatch.setattr(settings, "MODEL_ARTIFACT_DIR", str(tmp_path))
    (tmp_path / model_service.METRICS_FILENAME).write_text(
        json.dumps({"best_model": "xgboost", "results": {}}), encoding="utf-8"
    )
    response = client.get("/api/v1/models/metrics", headers=auth_header(Role.SYSTEM_ADMIN))
    assert response.status_code == 503


def test_metrics_is_denied_to_a_non_admin_role(
    client: TestClient, auth_header, tmp_path: Path, monkeypatch
) -> None:
    """model:manage is held only by system_admin - a doctor must not reach this."""
    _write_metrics(
        tmp_path,
        monkeypatch,
        {
            "best_model": "m",
            "results": {
                "m": dict.fromkeys(("accuracy", "precision", "recall", "f1", "roc_auc"), 0.5)
            },
        },
    )
    response = client.get("/api/v1/models/metrics", headers=auth_header(Role.DOCTOR))
    assert response.status_code == 403


def test_active_model_endpoint_still_requires_model_manage(client: TestClient, auth_header) -> None:
    """Unrelated to N4b, but this router had zero tests before - cover it once."""
    denied = client.get("/api/v1/models/active", headers=auth_header(Role.RESEARCHER))
    assert denied.status_code == 403

    allowed = client.get("/api/v1/models/active", headers=auth_header(Role.SYSTEM_ADMIN))
    assert allowed.status_code == 200
    assert allowed.json()["status"] == "not-loaded"
