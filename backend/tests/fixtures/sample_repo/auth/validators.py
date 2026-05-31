"""Auth payload validation helpers."""

from __future__ import annotations

from utils.errors import ValidationError, raise_validation_error


def normalize_identifier(identifier: str) -> str:
    """Normalize usernames and email addresses for login and registration lookups."""

    return identifier.strip().lower()


def validate_login_payload(payload: dict[str, object]) -> dict[str, str]:
    """Validate the login payload before the service resolves a user and checks a password."""

    identifier = normalize_identifier(str(payload.get("identifier", "")))
    password = str(payload.get("password", "")).strip()
    if not identifier:
        raise_validation_error("identifier", "is required")
    if len(password) < 8:
        raise_validation_error("password", "must contain at least 8 characters")
    return {"identifier": identifier, "password": password}


def validate_password_reset_payload(payload: dict[str, object]) -> dict[str, str]:
    """Validate the password reset payload before a token is exchanged for a new secret."""

    email = normalize_identifier(str(payload.get("email", "")))
    new_password = str(payload.get("new_password", "")).strip()
    if not email:
        raise_validation_error("email", "is required")
    if len(new_password) < 10:
        raise ValidationError("new_password must contain at least 10 characters")
    return {"email": email, "new_password": new_password}
