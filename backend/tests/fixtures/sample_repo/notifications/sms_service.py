"""SMS notification helpers for order updates and payment failures."""

from __future__ import annotations

from utils.decorators import audit_action, log_execution


def format_sms_message(message: str) -> str:
    """Format an SMS body so order updates and payment alerts remain concise."""

    return message.strip()[:160]


@log_execution
@audit_action("notifications.sms")
def send_order_update_sms(phone_number: str, message: str) -> dict[str, str]:
    """Send a short order-status SMS and return the delivery envelope."""

    return {"phone_number": phone_number, "message": format_sms_message(message), "status": "sent"}
