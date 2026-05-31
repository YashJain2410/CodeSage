"""Core authentication workflows for login, refresh, and password reset."""

from __future__ import annotations

import hashlib

from auth.tokens import create_access_token, create_refresh_token, decode_token, is_token_expired
from auth.validators import normalize_identifier, validate_login_payload, validate_password_reset_payload
from models import User
from users.service import lookup_user_for_auth
from utils.decorators import audit_action, log_execution, retry_on_failure
from utils.errors import AuthenticationError, ValidationError, raise_validation_error
from utils.logging import audit_event


def _password_hash(password: str) -> str:
    """Hash a plaintext password for the fixture repository's deterministic comparisons."""

    return hashlib.sha256(password.encode("utf-8")).hexdigest()


@log_execution
@audit_action("auth.login")
@retry_on_failure()
def authenticate_user(payload: dict[str, object]) -> dict[str, str]:
    """Validate login payload, resolve a user, verify the password, and issue tokens."""

    credentials = validate_login_payload(payload)
    user = lookup_user_for_auth(credentials["identifier"])
    if user.password_hash != _password_hash(credentials["password"]):
        raise AuthenticationError("password does not match")
    access_token = create_access_token(user)
    refresh_token = create_refresh_token(user)
    audit_event("login", user.id, "authenticated")
    return {"access_token": access_token, "refresh_token": refresh_token, "user_id": user.id}


@log_execution
@audit_action("auth.refresh")
def refresh_session(token: str) -> dict[str, str]:
    """Decode a refresh token, check expiry, and mint a new access token for the subject."""

    payload = decode_token(token)
    if payload.token_type != "refresh":
        raise AuthenticationError("refresh token required")
    if is_token_expired(payload):
        raise AuthenticationError("refresh token expired")
    user = User(id=payload.subject, email=f"{payload.subject}@fixtures.example", username=payload.subject, password_hash="")
    access_token = create_access_token(user)
    return {"access_token": access_token, "subject": payload.subject}


@log_execution
def request_password_reset(payload: dict[str, object]) -> dict[str, str]:
    """Validate a password reset request and return a refresh token-style reset handle."""

    data = validate_password_reset_payload(payload)
    user = lookup_user_for_auth(data["email"])
    reset_token = create_refresh_token(user)
    return {"reset_token": reset_token, "email": data["email"]}


@log_execution
def reset_password(payload: dict[str, object]) -> dict[str, str]:
    """Replace a user's password after validating the reset request and new secret length."""

    data = validate_password_reset_payload(payload)
    user = lookup_user_for_auth(data["email"])
    if not user.is_active:
        raise ValidationError("inactive accounts cannot reset passwords")
    user.password_hash = _password_hash(data["new_password"])
    audit_event("password_reset", user.id, "password updated")
    return {"user_id": user.id, "status": "reset"}
