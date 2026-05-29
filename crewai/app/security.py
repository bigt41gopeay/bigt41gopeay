"""Authentication and authorization helpers.

Provides:
- Password hashing/verification (bcrypt via passlib).
- JWT access-token issuance and validation.
- FastAPI dependencies for protecting REST endpoints and WebSockets.
- A constant-time API-key check for machine clients.

Run as a module to generate a password hash for the bootstrap admin account:

    python -m app.security hash 'your-strong-password'
"""

from __future__ import annotations

import hmac
import sys
from datetime import UTC, datetime, timedelta

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from passlib.context import CryptContext

from .config import Settings, get_settings

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/v1/auth/token", auto_error=False)

_pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


# --- Passwords ---------------------------------------------------------------

def hash_password(plain: str) -> str:
    return _pwd_context.hash(plain)


def verify_password(plain: str, hashed: str) -> bool:
    if not hashed:
        return False
    try:
        return _pwd_context.verify(plain, hashed)
    except ValueError:
        # Malformed hash in config — treat as auth failure rather than 500.
        return False


# --- API keys ----------------------------------------------------------------

def verify_api_key(presented: str, settings: Settings) -> bool:
    """Constant-time comparison of a presented API key against the configured one."""
    expected = settings.service_api_key
    if not expected or not presented:
        return False
    return hmac.compare_digest(presented, expected)


# --- JWT ---------------------------------------------------------------------

def create_access_token(subject: str, settings: Settings) -> str:
    now = datetime.now(UTC)
    expire = now + timedelta(minutes=settings.access_token_expire_minutes)
    payload = {
        "sub": subject,
        "iat": int(now.timestamp()),
        "exp": int(expire.timestamp()),
        "type": "access",
    }
    return jwt.encode(
        payload,
        settings.effective_secret_key(),
        algorithm=settings.jwt_algorithm,
    )


def decode_token(token: str, settings: Settings) -> dict:
    """Decode and validate a JWT, raising 401 on any problem."""
    try:
        payload = jwt.decode(
            token,
            settings.effective_secret_key(),
            algorithms=[settings.jwt_algorithm],
            options={"require": ["exp", "sub"]},
        )
    except jwt.PyJWTError as exc:  # expired, bad signature, malformed, ...
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc
    if payload.get("type") != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token type",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return payload


# --- FastAPI dependencies ----------------------------------------------------

async def get_current_subject(
    token: str | None = Depends(oauth2_scheme),
    settings: Settings = Depends(get_settings),
) -> str:
    """Resolve the authenticated principal from a Bearer JWT.

    Used to protect REST endpoints. WebSocket auth is handled separately because
    the WS handshake cannot use the standard Authorization dependency cleanly.
    """
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    payload = decode_token(token, settings)
    return str(payload["sub"])


def authenticate_websocket_token(token: str | None, settings: Settings) -> str | None:
    """Validate a token presented during a WebSocket handshake.

    Returns the subject on success, or ``None`` on failure (caller closes the
    socket). Accepts either a JWT or, if configured, the service API key.
    """
    if not token:
        return None
    if verify_api_key(token, settings):
        return "service-client"
    try:
        payload = decode_token(token, settings)
    except HTTPException:
        return None
    return str(payload["sub"])


# --- CLI helper --------------------------------------------------------------

def _main(argv: list[str]) -> int:
    if len(argv) != 3 or argv[1] != "hash":
        print("usage: python -m app.security hash <password>", file=sys.stderr)
        return 2
    print(hash_password(argv[2]))
    return 0


if __name__ == "__main__":  # pragma: no cover
    raise SystemExit(_main(sys.argv))
