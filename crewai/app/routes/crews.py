"""Endpoints for discovering available crews."""

from __future__ import annotations

from fastapi import APIRouter, Depends

from ..crew_factory import list_crews
from ..models import CrewSummary
from ..security import get_current_subject

router = APIRouter(prefix="/api/v1/crews", tags=["crews"])


@router.get("", response_model=list[CrewSummary])
async def get_crews(_subject: str = Depends(get_current_subject)) -> list[CrewSummary]:
    return [
        CrewSummary(
            id=c.id,
            name=c.name,
            description=c.description,
            agents=c.agent_names,
            tasks=c.task_names,
        )
        for c in list_crews()
    ]
