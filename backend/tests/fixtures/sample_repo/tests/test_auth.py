"""Auth workflow tests that exercise real login, refresh, and reset functions."""

from __future__ import annotations

from pathlib import Path
import sys

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from auth.service import authenticate_user, refresh_session, request_password_reset, reset_password
from auth.tokens import create_refresh_token
from auth.validators import validate_login_payload, validate_password_reset_payload
from users.repository import get_user_by_email


def test_validate_login_payload_normalizes_identifier() -> None:
    """Validate that login identifiers are normalized before auth lookup."""

    payload = validate_login_payload({"identifier": " Alice@Example.com ", "password": "password"})
    assert payload["identifier"] == "alice@example.com"


def test_authenticate_user_success() -> None:
    """Authenticate an existing fixture user and return access and refresh tokens."""

    result = authenticate_user({"identifier": "alice@example.com", "password": "password"})
    assert result["user_id"] == "u_1"
    assert result["access_token"].startswith("access.")
    assert result["refresh_token"].startswith("refresh.")


def test_authenticate_user_invalid_password() -> None:
    """Reject login attempts with a password that does not match the stored hash."""

    with pytest.raises(Exception):
        authenticate_user({"identifier": "alice@example.com", "password": "wrongpass"})


def test_refresh_session_returns_access_token() -> None:
    """Turn a valid refresh token back into a fresh access token for the same subject."""

    user = get_user_by_email("alice@example.com")
    token = create_refresh_token(user)
    result = refresh_session(token)
    assert result["subject"] == user.id
    assert result["access_token"].startswith("access.")


def test_password_reset_flow_returns_reset_token() -> None:
    """Create a password reset handle and then update the password using that payload."""

    request = request_password_reset({"email": "alice@example.com", "new_password": "newpassword123"})
    assert request["email"] == "alice@example.com"
    payload = validate_password_reset_payload({"email": "alice@example.com", "new_password": "newpassword123"})
    assert payload["new_password"] == "newpassword123"
    result = reset_password({"email": "alice@example.com", "new_password": "newpassword123"})
    assert result["status"] == "reset"
