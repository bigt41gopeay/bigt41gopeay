"""In-process asynchronous event bus.

Crew runs publish lifecycle events here; connected WebSocket clients (the
dashboard and the iOS app) subscribe to receive a live stream. This keeps the
execution layer decoupled from the transport layer.

For a single-process deployment this is sufficient. To scale horizontally,
swap this implementation for a Redis pub/sub channel behind the same interface.
"""

from __future__ import annotations

import asyncio
import contextlib
from datetime import UTC, datetime
from typing import Any

from .models import EventMessage


class EventBus:
    def __init__(self, queue_maxsize: int = 1000) -> None:
        self._subscribers: set[asyncio.Queue[EventMessage]] = set()
        self._queue_maxsize = queue_maxsize
        self._lock = asyncio.Lock()

    async def subscribe(self) -> asyncio.Queue[EventMessage]:
        queue: asyncio.Queue[EventMessage] = asyncio.Queue(maxsize=self._queue_maxsize)
        async with self._lock:
            self._subscribers.add(queue)
        return queue

    async def unsubscribe(self, queue: asyncio.Queue[EventMessage]) -> None:
        async with self._lock:
            self._subscribers.discard(queue)

    async def publish(
        self, event_type: str, *, run_id: str | None = None, data: dict[str, Any] | None = None
    ) -> None:
        message = EventMessage(
            type=event_type,
            run_id=run_id,
            data=data or {},
            timestamp=datetime.now(UTC),
        )
        async with self._lock:
            subscribers = list(self._subscribers)
        for queue in subscribers:
            # Never block a publisher on a slow consumer: drop the oldest event
            # for that subscriber instead of stalling the whole run.
            if queue.full():
                with contextlib.suppress(asyncio.QueueEmpty):
                    queue.get_nowait()
            with contextlib.suppress(asyncio.QueueFull):
                queue.put_nowait(message)

    @property
    def subscriber_count(self) -> int:
        return len(self._subscribers)
