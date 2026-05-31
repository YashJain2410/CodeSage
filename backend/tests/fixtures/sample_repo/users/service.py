"""User-facing service helpers for registration and profile lookup."""

from __future__ import annotations

import hashlib

from auth.validators import normalize_identifier
from models import User
from users.repository import get_user_by_email, save_user
from utils.decorators import audit_action, log_execution
from utils.errors import ValidationError, raise_validation_error
from utils.logging import audit_event


def _password_hash(password: str) -> str:
    """Hash a plaintext password so registration and login can share the same check."""

    return hashlib.sha256(password.encode("utf-8")).hexdigest()


@log_execution
@audit_action("users.register")
def register_user_profile(payload: dict[str, object]) -> User:
    """Create a user profile, store it, and return the persisted record for auth flows."""

    email = normalize_identifier(str(payload.get("email", "")))
    username = normalize_identifier(str(payload.get("username", "")))
    password = str(payload.get("password", "")).strip()
    if not email:
        raise_validation_error("email", "is required")
    if len(password) < 8:
        raise_validation_error("password", "must contain at least 8 characters")
    user = User(id=f"u_{len(email)}", email=email, username=username, password_hash=_password_hash(password))
    stored = save_user(user)
    audit_event("register", stored.id, "profile created")
    return stored


@log_execution
def lookup_user_for_auth(identifier: str) -> User:
    """Resolve a user for login, refresh, and password reset flows."""

    normalized = normalize_identifier(identifier)
    if "@" in normalized:
        return get_user_by_email(normalized)
    raise ValidationError("login identifier must be an email address")
