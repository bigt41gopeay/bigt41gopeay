"""Integration tests for the API gateway."""

from __future__ import annotations

import asyncio

from tests.conftest import get_token


async def test_healthz_is_public(client):
    resp = await client.get("/healthz")
    assert resp.status_code == 200
    body = resp.json()
    assert body["status"] == "ok"
    assert "version" in body


async def test_login_success_and_failure(client):
    ok = await client.post(
        "/api/v1/auth/token",
        data={"username": "admin", "password": "test-password-12345"},
    )
    assert ok.status_code == 200
    assert ok.json()["token_type"] == "bearer"

    bad = await client.post(
        "/api/v1/auth/token",
        data={"username": "admin", "password": "wrong"},
    )
    assert bad.status_code == 401


async def test_protected_endpoints_require_auth(client):
    assert (await client.get("/api/v1/crews")).status_code == 401
    assert (await client.get("/api/v1/runs")).status_code == 401
    assert (await client.post("/api/v1/runs", json={"crew_id": "x"})).status_code == 401


async def test_list_crews_authenticated(client):
    token = await get_token(client)
    resp = await client.get("/api/v1/crews", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    crews = resp.json()
    assert any(c["id"] == "research_brief" for c in crews)


async def test_run_lifecycle_simulated(client):
    token = await get_token(client)
    headers = {"Authorization": f"Bearer {token}"}

    created = await client.post(
        "/api/v1/runs",
        headers=headers,
        json={"crew_id": "research_brief", "inputs": {"topic": "testing"}},
    )
    assert created.status_code == 201
    run_id = created.json()["id"]

    # Poll until the simulated run finishes.
    final = None
    for _ in range(50):
        resp = await client.get(f"/api/v1/runs/{run_id}", headers=headers)
        assert resp.status_code == 200
        final = resp.json()
        if final["status"] in ("completed", "failed", "cancelled"):
            break
        await asyncio.sleep(0.1)

    assert final is not None
    assert final["status"] == "completed"
    assert final["result"]
    assert len(final["activity"]) >= 2
    assert final["requested_by"] == "admin"


async def test_unknown_crew_rejected(client):
    token = await get_token(client)
    resp = await client.post(
        "/api/v1/runs",
        headers={"Authorization": f"Bearer {token}"},
        json={"crew_id": "does-not-exist", "inputs": {}},
    )
    assert resp.status_code == 404


async def test_run_request_rejects_extra_fields(client):
    token = await get_token(client)
    resp = await client.post(
        "/api/v1/runs",
        headers={"Authorization": f"Bearer {token}"},
        json={"crew_id": "research_brief", "inputs": {}, "evil": "payload"},
    )
    assert resp.status_code == 422


async def test_get_missing_run_returns_404(client):
    token = await get_token(client)
    resp = await client.get(
        "/api/v1/runs/deadbeef", headers={"Authorization": f"Bearer {token}"}
    )
    assert resp.status_code == 404
