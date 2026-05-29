"""Shared rate limiter instance.

Kept in its own module so route modules and the app factory can both import it
without creating an import cycle.
"""

from __future__ import annotations

from slowapi import Limiter
from slowapi.util import get_remote_address

# Per-client-IP limiter. A sane global default protects every endpoint; tighter
# per-route limits are applied with decorators where abuse is most likely
# (authentication, run creation).
limiter = Limiter(key_func=get_remote_address, default_limits=["120/minute"])
