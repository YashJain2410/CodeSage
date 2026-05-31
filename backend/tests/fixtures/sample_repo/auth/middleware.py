"""Middleware-style auth helpers for request inspection and authorization."""

from __future__ import annotations

from auth.tokens import decode_token, get_token_subject, is_token_expired
from models import TokenPayload, User
from utils.decorators import require_auth
from utils.errors import AuthenticationError


def extract_bearer_token(authorization_header: str) -> str:
    """Extract the bearer token from an HTTP authorization header."""

    prefix = "Bearer "
    if not authorization_header.startswith(prefix):
        raise AuthenticationError("Bearer header required")
    return authorization_header[len(prefix) :]


@require_auth
def require_authentication(authorization_header: str, *, user: User) -> TokenPayload:
    """Validate a bearer token and return its payload for downstream request handling."""

    token = extract_bearer_token(authorization_header)
    payload = decode_token(token)
    if is_token_expired(payload):
        raise AuthenticationError("access token expired")
    return payload


def authorize_request(authorization_header: str, *, user: User) -> dict[str, str]:
    """Return an authorization summary that handlers can use for routing and audit logs."""

    payload = require_authentication(authorization_header, user=user)
    return {"subject": get_token_subject(authorization_header[len("Bearer ") :]), "token_type": payload.token_type}
