"""Pydantic request/response schemas and domain models.

These define and validate every payload crossing the API boundary, which is the
first line of defense against malformed or malicious input from remote clients
(including the iOS app).
"""

from __future__ import annotations

from datetime import datetime
from enum import StrEnum
from typing import Any

from pydantic import BaseModel, Field


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"  # noqa: S105 - OAuth2 token type label, not a secret
    expires_in: int = Field(description="Token lifetime in seconds")


class RunStatus(StrEnum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class CrewSummary(BaseModel):
    """Metadata describing an available crew definition."""

    id: str
    name: str
    description: str
    agents: list[str]
    tasks: list[str]


class RunRequest(BaseModel):
    """Request to launch a crew run.

    ``inputs`` are user-supplied template variables. We constrain the shape to
    avoid unbounded payloads and reject obviously abusive sizes.
    """

    crew_id: str = Field(min_length=1, max_length=128)
    inputs: dict[str, str] = Field(default_factory=dict)

    model_config = {"extra": "forbid"}


class AgentActivity(BaseModel):
    agent: str
    task: str | None = None
    status: str
    timestamp: datetime


class RunRecord(BaseModel):
    """Full lifecycle record of a single crew execution."""

    id: str
    crew_id: str
    status: RunStatus
    created_at: datetime
    started_at: datetime | None = None
    finished_at: datetime | None = None
    inputs: dict[str, str] = Field(default_factory=dict)
    activity: list[AgentActivity] = Field(default_factory=list)
    result: str | None = None
    error: str | None = None
    requested_by: str | None = None


class RunCreated(BaseModel):
    id: str
    status: RunStatus


class HealthResponse(BaseModel):
    status: str
    version: str
    environment: str
    active_runs: int


class EventMessage(BaseModel):
    """Envelope pushed to dashboard / iOS clients over the WebSocket."""

    type: str
    run_id: str | None = None
    data: dict[str, Any] = Field(default_factory=dict)
    timestamp: datetime
