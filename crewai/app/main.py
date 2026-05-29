"""FastAPI application entrypoint.

Wires together configuration, the event bus, the crew manager, REST routes, the
WebSocket stream, security middleware, and the static monitoring dashboard.
"""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from . import __version__
from .config import get_settings
from .crew_manager import CrewManager
from .events import EventBus
from .ratelimit import limiter
from .routes import auth, crews, health, runs, ws

logger = logging.getLogger("crewai_gateway")

DASHBOARD_DIR = Path(__file__).resolve().parent.parent / "dashboard"


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    logging.basicConfig(level=settings.log_level.upper())

    # Fail fast if a secret is missing in production.
    settings.effective_secret_key()
    if settings.is_production and not settings.admin_password_hash:
        raise RuntimeError(
            "CREWAI_ADMIN_PASSWORD_HASH must be set in production. "
            "Generate it with: python -m app.security hash <password>"
        )

    event_bus = EventBus()
    app.state.event_bus = event_bus
    app.state.crew_manager = CrewManager(settings, event_bus)
    logger.info("CrewAI gateway started (env=%s, version=%s)", settings.environment, __version__)
    yield
    logger.info("CrewAI gateway shutting down")


def create_app() -> FastAPI:
    settings = get_settings()

    app = FastAPI(
        title="CrewAI Control Gateway",
        version=__version__,
        description="Secure API gateway and monitoring dashboard for CrewAI multi-agent runs.",
        lifespan=lifespan,
        # Hide interactive docs in production to reduce surface area.
        docs_url=None if settings.is_production else "/docs",
        redoc_url=None if settings.is_production else "/redoc",
    )

    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

    # CORS: explicit allow-list, never "*" with credentials.
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["GET", "POST"],
        allow_headers=["Authorization", "Content-Type"],
    )

    @app.middleware("http")
    async def security_headers(request: Request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "no-referrer"
        if settings.is_production:
            response.headers["Strict-Transport-Security"] = (
                "max-age=63072000; includeSubDomains"
            )
        return response

    app.include_router(health.router)
    app.include_router(auth.router)
    app.include_router(crews.router)
    app.include_router(runs.router)
    app.include_router(ws.router)

    # Serve the static monitoring dashboard at the root (if present).
    if DASHBOARD_DIR.is_dir():
        app.mount("/", StaticFiles(directory=str(DASHBOARD_DIR), html=True), name="dashboard")

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(request: Request, exc: Exception):  # noqa: ARG001
        # Never leak stack traces / internals to remote clients.
        logger.exception("Unhandled error")
        return JSONResponse(status_code=500, content={"detail": "Internal server error"})

    return app


app = create_app()
