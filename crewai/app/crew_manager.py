"""Crew run lifecycle manager.

Owns the set of in-flight and historical runs, enforces a concurrency limit,
executes crews off the event loop (CrewAI is synchronous and CPU/IO heavy), and
publishes lifecycle events to the :class:`EventBus` for live monitoring.

State is kept in-process and bounded. For durability or multi-replica
deployments, back ``_runs`` with an external store (e.g. Redis/Postgres) — the
public interface is intentionally storage-agnostic.
"""

from __future__ import annotations

import asyncio
import uuid
from collections import OrderedDict
from datetime import UTC, datetime

from .config import Settings
from .crew_factory import crewai_available, get_crew_definition
from .events import EventBus
from .models import AgentActivity, RunRecord, RunStatus


def _now() -> datetime:
    return datetime.now(UTC)


class RunNotFoundError(Exception):
    pass


class CrewNotFoundError(Exception):
    pass


class CrewManager:
    def __init__(self, settings: Settings, event_bus: EventBus) -> None:
        self._settings = settings
        self._bus = event_bus
        self._runs: OrderedDict[str, RunRecord] = OrderedDict()
        self._tasks: dict[str, asyncio.Task] = {}
        self._semaphore = asyncio.Semaphore(settings.max_concurrent_runs)
        self._lock = asyncio.Lock()

    # --- Queries -------------------------------------------------------------

    def list_runs(self) -> list[RunRecord]:
        return list(self._runs.values())

    def get_run(self, run_id: str) -> RunRecord:
        run = self._runs.get(run_id)
        if run is None:
            raise RunNotFoundError(run_id)
        return run

    @property
    def active_run_count(self) -> int:
        return sum(
            1 for r in self._runs.values()
            if r.status in (RunStatus.PENDING, RunStatus.RUNNING)
        )

    # --- Commands ------------------------------------------------------------

    async def create_run(
        self, crew_id: str, inputs: dict[str, str], requested_by: str | None
    ) -> RunRecord:
        if get_crew_definition(crew_id) is None:
            raise CrewNotFoundError(crew_id)

        run = RunRecord(
            id=uuid.uuid4().hex,
            crew_id=crew_id,
            status=RunStatus.PENDING,
            created_at=_now(),
            inputs=inputs,
            requested_by=requested_by,
        )
        async with self._lock:
            self._runs[run.id] = run
            self._evict_if_needed()

        await self._bus.publish("run.created", run_id=run.id, data=run.model_dump(mode="json"))
        self._tasks[run.id] = asyncio.create_task(self._execute(run.id))
        return run

    async def cancel_run(self, run_id: str) -> RunRecord:
        run = self.get_run(run_id)
        task = self._tasks.get(run_id)
        if run.status in (RunStatus.PENDING, RunStatus.RUNNING) and task is not None:
            task.cancel()
        return run

    # --- Internal ------------------------------------------------------------

    def _evict_if_needed(self) -> None:
        """Drop oldest *finished* runs once over the configured history limit."""
        limit = self._settings.run_history_limit
        while len(self._runs) > limit:
            for rid, rec in self._runs.items():
                if rec.status in (
                    RunStatus.COMPLETED, RunStatus.FAILED, RunStatus.CANCELLED
                ):
                    del self._runs[rid]
                    self._tasks.pop(rid, None)
                    break
            else:
                break  # nothing evictable (all active) — keep them

    async def _record_activity(
        self, run: RunRecord, agent: str, status: str, task: str | None = None
    ) -> None:
        activity = AgentActivity(agent=agent, task=task, status=status, timestamp=_now())
        run.activity.append(activity)
        await self._bus.publish(
            "agent.activity", run_id=run.id, data=activity.model_dump(mode="json")
        )

    async def _execute(self, run_id: str) -> None:
        run = self._runs[run_id]
        try:
            async with self._semaphore:
                run.status = RunStatus.RUNNING
                run.started_at = _now()
                await self._bus.publish(
                    "run.started", run_id=run.id, data={"started_at": run.started_at.isoformat()}
                )

                definition = get_crew_definition(run.crew_id)
                if definition is None:  # validated in create_run; defensive guard
                    raise CrewNotFoundError(run.crew_id)

                use_real = crewai_available() and bool(self._settings.openai_api_key)
                if use_real:
                    result = await self._run_real_crew(run, definition)
                else:
                    result = await self._run_simulated_crew(run, definition)

                run.result = result
                run.status = RunStatus.COMPLETED
                run.finished_at = _now()
                await self._bus.publish(
                    "run.completed",
                    run_id=run.id,
                    data={"finished_at": run.finished_at.isoformat(), "result": result},
                )
        except asyncio.CancelledError:
            run.status = RunStatus.CANCELLED
            run.finished_at = _now()
            await self._bus.publish("run.cancelled", run_id=run.id, data={})
            raise
        except Exception as exc:  # noqa: BLE001 - surface failure to clients
            run.status = RunStatus.FAILED
            run.finished_at = _now()
            run.error = f"{type(exc).__name__}: {exc}"
            await self._bus.publish("run.failed", run_id=run.id, data={"error": run.error})
        finally:
            self._tasks.pop(run_id, None)

    async def _run_real_crew(self, run: RunRecord, definition) -> str:
        loop = asyncio.get_running_loop()
        await self._record_activity(run, definition.agent_names[0], "started")
        crew = definition.builder(run.inputs)
        # CrewAI kickoff is blocking; run it in the default thread pool so the
        # event loop (and WebSocket fan-out) stays responsive.
        output = await loop.run_in_executor(None, crew.kickoff, run.inputs)
        await self._record_activity(run, definition.agent_names[-1], "completed")
        return str(output)

    async def _run_simulated_crew(self, run: RunRecord, definition) -> str:
        """Deterministic, dependency-free execution for local/dev/demo use.

        Streams realistic-looking agent activity so the dashboard and iOS app can
        be exercised without LLM credentials.
        """
        for agent, task in zip(definition.agent_names, definition.task_names, strict=False):
            await self._record_activity(run, agent, "started", task=task)
            await asyncio.sleep(1.0)
            await self._record_activity(run, agent, "completed", task=task)
        topic = run.inputs.get("topic", "the requested subject")
        return (
            f"[simulated] Crew '{definition.name}' completed work on '{topic}'. "
            "Set CREWAI_OPENAI_API_KEY and install crewai to run real agents."
        )
