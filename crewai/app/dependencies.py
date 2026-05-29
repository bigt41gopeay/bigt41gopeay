"""Shared FastAPI dependency accessors for app-scoped singletons."""

from __future__ import annotations

from fastapi import Request

from .crew_manager import CrewManager
from .events import EventBus


def get_event_bus(request: Request) -> EventBus:
    return request.app.state.event_bus


def get_crew_manager(request: Request) -> CrewManager:
    return request.app.state.crew_manager
