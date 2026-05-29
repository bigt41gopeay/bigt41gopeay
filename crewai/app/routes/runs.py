"""Endpoints for launching, inspecting, and cancelling crew runs."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status

from ..crew_manager import CrewManager, CrewNotFoundError, RunNotFoundError
from ..dependencies import get_crew_manager
from ..models import RunCreated, RunRecord, RunRequest
from ..security import get_current_subject

router = APIRouter(prefix="/api/v1/runs", tags=["runs"])


@router.post("", response_model=RunCreated, status_code=status.HTTP_201_CREATED)
async def create_run(
    payload: RunRequest,
    subject: str = Depends(get_current_subject),
    manager: CrewManager = Depends(get_crew_manager),
) -> RunCreated:
    try:
        run = await manager.create_run(
            crew_id=payload.crew_id, inputs=payload.inputs, requested_by=subject
        )
    except CrewNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Unknown crew: {payload.crew_id}",
        ) from exc
    return RunCreated(id=run.id, status=run.status)


@router.get("", response_model=list[RunRecord])
async def list_runs(
    _subject: str = Depends(get_current_subject),
    manager: CrewManager = Depends(get_crew_manager),
) -> list[RunRecord]:
    return manager.list_runs()


@router.get("/{run_id}", response_model=RunRecord)
async def get_run(
    run_id: str,
    _subject: str = Depends(get_current_subject),
    manager: CrewManager = Depends(get_crew_manager),
) -> RunRecord:
    try:
        return manager.get_run(run_id)
    except RunNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Run not found"
        ) from exc


@router.post("/{run_id}/cancel", response_model=RunRecord)
async def cancel_run(
    run_id: str,
    _subject: str = Depends(get_current_subject),
    manager: CrewManager = Depends(get_crew_manager),
) -> RunRecord:
    try:
        return await manager.cancel_run(run_id)
    except RunNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Run not found"
        ) from exc
