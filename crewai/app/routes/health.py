"""Health and readiness endpoints (unauthenticated, for load balancers)."""

from __future__ import annotations

from fastapi import APIRouter, Depends

from .. import __version__
from ..config import Settings, get_settings
from ..crew_manager import CrewManager
from ..dependencies import get_crew_manager
from ..models import HealthResponse

router = APIRouter(tags=["health"])


@router.get("/healthz", response_model=HealthResponse)
async def healthz(
    settings: Settings = Depends(get_settings),
    manager: CrewManager = Depends(get_crew_manager),
) -> HealthResponse:
    return HealthResponse(
        status="ok",
        version=__version__,
        environment=settings.environment,
        active_runs=manager.active_run_count,
    )
