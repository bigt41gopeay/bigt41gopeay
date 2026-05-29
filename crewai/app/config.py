"""Application configuration.

All settings are sourced from environment variables (or a local ``.env`` file
during development). Secrets are never hardcoded — the application refuses to
start in production unless a strong ``SECRET_KEY`` has been provided.
"""

from __future__ import annotations

import secrets
from functools import lru_cache
from typing import Literal

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

# Sentinel used to detect that no real secret was supplied. A fresh random value
# is generated per-process so a forgotten secret never silently becomes a shared,
# guessable default across deployments.
_UNSET_SECRET = "CHANGE_ME"  # noqa: S105 - sentinel, not a real credential


class Settings(BaseSettings):
    """Strongly-typed, environment-driven application settings."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        env_prefix="CREWAI_",
        extra="ignore",
    )

    # --- Runtime ---
    environment: Literal["development", "staging", "production"] = "development"
    log_level: str = "INFO"

    # --- Security ---
    # Must be overridden in any non-development environment.
    secret_key: str = _UNSET_SECRET
    access_token_expire_minutes: int = Field(default=60, ge=1, le=1440)
    jwt_algorithm: str = "HS256"

    # Bootstrap admin account. The password hash (not the plaintext) is stored.
    # Generate with: python -m app.security hash <password>
    admin_username: str = "admin"
    admin_password_hash: str = ""

    # Static API key for machine clients (e.g. the iOS app's service account).
    # Optional — when empty, only JWT auth is accepted.
    service_api_key: str = ""

    # --- Networking / CORS ---
    # Comma-separated list of allowed origins for the dashboard / iOS web views.
    # NEVER use "*" together with credentials in production.
    cors_allow_origins: str = "http://localhost:5173,http://localhost:8000"

    # --- Crew execution ---
    max_concurrent_runs: int = Field(default=4, ge=1, le=64)
    run_history_limit: int = Field(default=200, ge=10, le=10000)

    # --- LLM provider keys (read by CrewAI / underlying SDKs) ---
    openai_api_key: str = ""

    @field_validator("secret_key")
    @classmethod
    def _validate_secret(cls, value: str) -> str:
        if value and value != _UNSET_SECRET and len(value) < 32:
            raise ValueError(
                "CREWAI_SECRET_KEY must be at least 32 characters long."
            )
        return value

    @property
    def cors_origins(self) -> list[str]:
        return [o.strip() for o in self.cors_allow_origins.split(",") if o.strip()]

    @property
    def is_production(self) -> bool:
        return self.environment in ("production", "staging")

    def effective_secret_key(self) -> str:
        """Return a usable secret, enforcing safety rules.

        In production a real secret is mandatory. In development we fall back to
        an ephemeral random key (tokens won't survive a restart, which is fine
        for local work and avoids shipping a known default).
        """
        if self.secret_key and self.secret_key != _UNSET_SECRET:
            return self.secret_key
        if self.is_production:
            raise RuntimeError(
                "CREWAI_SECRET_KEY must be set to a strong, random value in "
                "production. Generate one with: openssl rand -hex 32"
            )
        return secrets.token_hex(32)


@lru_cache
def get_settings() -> Settings:
    """Cached settings accessor (single instance per process)."""
    return Settings()
