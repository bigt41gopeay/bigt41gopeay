"""Unit tests for auth primitives."""

from __future__ import annotations

import pytest
from fastapi import HTTPException

from app.config import get_settings
from app.security import (
    authenticate_websocket_token,
    create_access_token,
    decode_token,
    hash_password,
    verify_api_key,
    verify_password,
)


def test_password_hash_roundtrip():
    h = hash_password("hunter2")
    assert h != "hunter2"
    assert verify_password("hunter2", h)
    assert not verify_password("wrong", h)


def test_verify_password_handles_empty_and_malformed():
    assert not verify_password("x", "")
    assert not verify_password("x", "not-a-real-hash")


def test_jwt_roundtrip():
    settings = get_settings()
    token = create_access_token("alice", settings)
    payload = decode_token(token, settings)
    assert payload["sub"] == "alice"
    assert payload["type"] == "access"


def test_jwt_rejects_tampered_token():
    settings = get_settings()
    token = create_access_token("alice", settings)
    with pytest.raises(HTTPException):
        decode_token(token + "tampered", settings)


def test_api_key_constant_time_check():
    settings = get_settings()
    assert verify_api_key(settings.service_api_key, settings)
    assert not verify_api_key("wrong", settings)
    assert not verify_api_key("", settings)


def test_ws_token_accepts_jwt_and_api_key():
    settings = get_settings()
    token = create_access_token("alice", settings)
    assert authenticate_websocket_token(token, settings) == "alice"
    assert authenticate_websocket_token(settings.service_api_key, settings) == "service-client"
    assert authenticate_websocket_token("garbage", settings) is None
    assert authenticate_websocket_token(None, settings) is None
