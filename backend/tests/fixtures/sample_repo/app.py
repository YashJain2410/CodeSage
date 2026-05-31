"""Application entry points for login, registration, checkout, and refund flows."""

from __future__ import annotations

from auth.middleware import authorize_request, require_authentication
from auth.service import authenticate_user, refresh_session, request_password_reset, reset_password
from models import User
from orders.service import checkout_handler as checkout_order, create_order, refund_order
from users.service import register_user_profile
from utils.decorators import audit_action, log_execution, validate_request


@log_execution
@audit_action("app.login")
@validate_request(("identifier", "password"))
def login_handler(payload: dict[str, object]) -> dict[str, str]:
    """Handle the login request by validating input and delegating to auth.service."""

    return authenticate_user(payload)


@log_execution
@audit_action("app.register")
@validate_request(("email", "username", "password"))
def register_handler(payload: dict[str, object]) -> dict[str, str]:
    """Create a user account and return the stored identity for onboarding flows."""

    user = register_user_profile(payload)
    return {"user_id": user.id, "email": user.email}


@log_execution
@audit_action("app.checkout")
@validate_request(("email", "items", "amount"))
def checkout_handler(payload: dict[str, object]) -> dict[str, object]:
    """Perform checkout by resolving the user and forwarding the request to the order service."""

    user = User(id="u_checkout", email=str(payload["email"]), username="checkout", password_hash="")
    return checkout_order(user, list(payload["items"]), payload["amount"], str(payload.get("currency", "USD")))


@log_execution
@audit_action("app.refund")
@validate_request(("order_id", "amount"))
def refund_handler(payload: dict[str, object]) -> dict[str, object]:
    """Handle a refund request and return the result from the order service."""

    result = refund_order(str(payload["order_id"]), payload["amount"])
    return {"transaction_id": result.transaction_id, "success": result.success}


@log_execution
def password_reset_handler(payload: dict[str, object]) -> dict[str, str]:
    """Trigger the password reset request and the follow-up password update flow."""

    request = request_password_reset(payload)
    reset = reset_password({"email": payload["email"], "new_password": payload["new_password"]})
    return {"reset_token": request["reset_token"], "status": reset["status"]}


@log_execution
def token_refresh_handler(authorization_header: str, *, user: User) -> dict[str, str]:
    """Validate bearer auth and mint a fresh access token for the current user."""

    authorize_request(authorization_header, user=user)
    return refresh_session(require_authentication(authorization_header, user=user))
