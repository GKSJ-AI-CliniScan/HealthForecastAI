"""Role-Based Access Control test suite."""

import pytest
from fastapi.testclient import TestClient


def test_user_management_restricted_to_sysadmin(client: TestClient, user_tokens: dict[str, str]):
    """Ensure non-sysadmin roles cannot access user management."""
    # Doctor accessing users -> 403
    resp_doc = client.get("/api/v1/users", headers={"Authorization": user_tokens["DOCTOR"]})
    assert resp_doc.status_code == 403

    # Hospital Admin accessing users -> 403
    resp_admin = client.get("/api/v1/users", headers={"Authorization": user_tokens["HOSPITAL_ADMIN"]})
    assert resp_admin.status_code == 403

    # Researcher accessing users -> 403
    resp_res = client.get("/api/v1/users", headers={"Authorization": user_tokens["RESEARCHER"]})
    assert resp_res.status_code == 403

    # System Admin accessing users -> 200
    resp_sys = client.get("/api/v1/users", headers={"Authorization": user_tokens["SYSTEM_ADMIN"]})
    assert resp_sys.status_code == 200
    assert resp_sys.json()["total"] >= 5


def test_audit_logs_restricted_to_sysadmin(client: TestClient, user_tokens: dict[str, str]):
    """Ensure audit logs are restricted to System Admin."""
    resp_doc = client.get("/api/v1/admin/audit-logs", headers={"Authorization": user_tokens["DOCTOR"]})
    assert resp_doc.status_code == 403

    resp_sys = client.get("/api/v1/admin/audit-logs", headers={"Authorization": user_tokens["SYSTEM_ADMIN"]})
    assert resp_sys.status_code == 200


def test_unauthenticated_requests_fail(client: TestClient):
    """Ensure endpoints reject requests with missing token."""
    response = client.get("/api/v1/patients")
    assert response.status_code == 401
