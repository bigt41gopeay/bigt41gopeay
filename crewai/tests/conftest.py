"""Shared test fixtures.

Environment variables must be set *before* the application settings are first
instantiated, so we configure them at import time, then build the app.
"""

from __future__ import annotations

import os

import pytest

TEST_PASSWORD = "test-password-12345"
TEST_SECRET = "x" * 48  # >= 32 chars

# Configure a deterministic, isolated test environment.
os.environ["CREWAI_ENVIRONMENT"] = "development"
os.environ["CREWAI_SECRET_KEY"] = TEST_SECRET
os.environ["CREWAI_ADMIN_USERNAME"] = "admin"
os.environ["CREWAI_SERVICE_API_KEY"] = "service-key-abcdef"
os.environ["CREWAI_CORS_ALLOW_ORIGINS"] = "http://localhost:5173"

from app.security import hash_password  # noqa: E402

os.environ["CREWAI_ADMIN_PASSWORD_HASH"] = hash_password(TEST_PASSWORD)

from app.config import get_settings  # noqa: E402

# Reset cache so the hash set above is picked up.
get_settings.cache_clear()

# Disable per-IP rate limiting in tests: the limiter is a process-wide singleton,
# so accumulated request counts across tests would otherwise cause flaky 429s.
from app.ratelimit import limiter  # noqa: E402

limiter.enabled = False


@pytest.fixture
async def client():
    import httpx
    from httpx import ASGITransport

    from app.main import create_app

    app = create_app()
    transport = ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as c:
        # Trigger lifespan startup so app.state is populated.
        async with app.router.lifespan_context(app):
            yield c


async def get_token(client) -> str:
    resp = await client.post(
        "/api/v1/auth/token",
        data={"username": "admin", "password": TEST_PASSWORD},
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    assert resp.status_code == 200, resp.text
    return resp.json()["access_token"]
