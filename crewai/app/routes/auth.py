"""Authentication endpoints.

Exposes an OAuth2 password-grant token endpoint. The iOS app exchanges the
admin credentials (or, preferably, a dedicated user credential) for a short-
lived JWT, then sends it as ``Authorization: Bearer <token>`` on every request.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordRequestForm

from ..config import Settings, get_settings
from ..models import Token
from ..ratelimit import limiter
from ..security import create_access_token, verify_password

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])


@router.post("/token", response_model=Token)
@limiter.limit("10/minute")
async def login(
    request: Request,
    form: OAuth2PasswordRequestForm = Depends(),
    settings: Settings = Depends(get_settings),
) -> Token:
    """Exchange username/password for a JWT access token."""
    valid_user = (
        form.username == settings.admin_username
        and verify_password(form.password, settings.admin_password_hash)
    )
    if not valid_user:
        # Identical response for unknown user vs. bad password (no enumeration).
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = create_access_token(subject=form.username, settings=settings)
    return Token(
        access_token=token,
        expires_in=settings.access_token_expire_minutes * 60,
    )
