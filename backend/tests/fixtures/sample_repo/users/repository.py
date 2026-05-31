"""In-memory user repository helpers used by the fixture app."""

from __future__ import annotations

from models import User
from utils.decorators import cache_result, normalize_input
from utils.errors import ValidationError


_USERS: dict[str, User] = {
    "alice@example.com": User(id="u_1", email="alice@example.com", username="alice", password_hash="5e884898da280471"),
    "bob@example.com": User(id="u_2", email="bob@example.com", username="bobby", password_hash="5e884898da280471", roles=["customer", "admin"]),
}


@cache_result
@normalize_input
def get_user_by_email(email: str) -> User:
    """Return a user by email so auth and profile workflows can resolve identity."""

    if email not in _USERS:
        raise ValidationError("unknown user email")
    return _USERS[email]


@normalize_input
def save_user(user: User) -> User:
    """Persist a user in the in-memory store and return the stored record."""

    if not user.email:
        raise ValidationError("user email is required")
    _USERS[user.email] = user
    return user


def get_user_by_id(user_id: str) -> User:
    """Resolve a user by id for lookup flows and test fixtures."""

    for user in _USERS.values():
        if user.id == user_id:
            return user
    raise ValidationError("unknown user id")
