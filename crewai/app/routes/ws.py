"""WebSocket endpoint streaming live run/agent events to clients.

Clients (dashboard, iOS app) connect to ``/api/v1/ws?token=<jwt-or-api-key>``.
The token is validated during the handshake; unauthenticated sockets are closed
immediately with policy-violation code 1008.
"""

from __future__ import annotations

import asyncio
import contextlib

from fastapi import APIRouter, Query, WebSocket, WebSocketDisconnect

from ..config import get_settings
from ..dependencies import get_event_bus
from ..security import authenticate_websocket_token

router = APIRouter()


@router.websocket("/api/v1/ws")
async def events_socket(websocket: WebSocket, token: str | None = Query(default=None)) -> None:
    settings = get_settings()
    subject = authenticate_websocket_token(token, settings)
    if subject is None:
        # Reject before accepting so no data is exchanged with an unauthorized peer.
        await websocket.close(code=1008)
        return

    await websocket.accept()
    bus = get_event_bus(websocket)
    queue = await bus.subscribe()
    try:
        while True:
            message = await queue.get()
            await websocket.send_text(message.model_dump_json())
    except WebSocketDisconnect:
        pass
    except asyncio.CancelledError:
        raise
    finally:
        await bus.unsubscribe(queue)
        with contextlib.suppress(RuntimeError):
            await websocket.close()
