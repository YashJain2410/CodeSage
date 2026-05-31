"""User repository and registration tests for onboarding flows."""

from __future__ import annotations

from pathlib import Path
import sys

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from models import User
from users.repository import get_user_by_email, get_user_by_id, save_user
from users.service import lookup_user_for_auth, register_user_profile


def test_register_user_profile_success() -> None:
    """Register a new user profile and persist it in the in-memory repository."""

    user = register_user_profile({"email": "carol@example.com", "username": "carol", "password": "password123"})
    assert user.email == "carol@example.com"
    assert user.username == "carol"


def test_register_user_profile_invalid_password() -> None:
    """Reject user registration when the password is too short for auth reuse."""

    with pytest.raises(Exception):
        register_user_profile({"email": "dave@example.com", "username": "dave", "password": "short"})


def test_lookup_user_for_auth_by_email() -> None:
    """Resolve a stored user from the auth-facing lookup helper."""

    user = lookup_user_for_auth("alice@example.com")
    assert user.id == "u_1"


def test_get_user_by_email_unknown() -> None:
    """Surface a validation error when a user email is not present in storage."""

    with pytest.raises(Exception):
        get_user_by_email("missing@example.com")


def test_save_user_persists_user() -> None:
    """Persist a new user instance and make it retrievable by id."""

    user = User(id="u_99", email="zoe@example.com", username="zoe", password_hash="hash")
    saved = save_user(user)
    assert get_user_by_id(saved.id).email == "zoe@example.com"
