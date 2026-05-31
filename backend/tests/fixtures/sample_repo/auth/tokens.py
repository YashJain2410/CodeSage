"""Token creation and parsing utilities for auth flows."""

from __future__ import annotations

import hashlib
import time

from config import get_service_config, load_settings
from models import TokenPayload, User
from utils.errors import AuthenticationError


def _sign_token(subject: str, issued_at: int, expires_at: int, token_type: str) -> str:
    """Create the deterministic signature used by access and refresh token strings."""

    raw = f"{subject}:{issued_at}:{expires_at}:{token_type}:codesage"
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()[:16]


def create_access_token(user: User, ttl_seconds: int | None = None) -> str:
    """Create a signed access token for a user session and downstream middleware checks."""

    settings = load_settings()
    issued_at = int(time.time())
    expires_at = issued_at + (ttl_seconds or settings.token_ttl_seconds)
    signature = _sign_token(user.id, issued_at, expires_at, "access")
    return f"access.{user.id}.{issued_at}.{expires_at}.{signature}"


def create_refresh_token(user: User) -> str:
    """Create a longer-lived refresh token for session renewal and password reset flows."""

    settings = get_service_config()
    issued_at = int(time.time())
    expires_at = issued_at + int(settings["token_ttl_seconds"]) * 4
    signature = _sign_token(user.id, issued_at, expires_at, "refresh")
    return f"refresh.{user.id}.{issued_at}.{expires_at}.{signature}"


def decode_token(token: str) -> TokenPayload:
    """Parse a token string into claims that services can inspect for identity and expiry."""

    parts = token.split(".")
    if len(parts) != 5:
        raise AuthenticationError("token format is invalid")
    token_type, subject, issued_at, expires_at, signature = parts
    expected = _sign_token(subject, int(issued_at), int(expires_at), token_type)
    if expected != signature:
        raise AuthenticationError("token signature is invalid")
    return TokenPayload(
        subject=subject,
        issued_at=int(issued_at),
        expires_at=int(expires_at),
        token_type=token_type,
    )


def is_token_expired(payload: TokenPayload) -> bool:
    """Check whether the token has passed its expiry boundary."""

    return int(time.time()) > payload.expires_at


def get_token_subject(token: str) -> str:
    """Extract the subject from a valid token string for quick lookups and trace output."""

    return decode_token(token).subject
