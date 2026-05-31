"""Notification helpers for email and SMS delivery paths."""

from __future__ import annotations

from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from models import Invoice
from notifications.email_service import build_email_message, send_password_reset_email, send_receipt_email
from notifications.sms_service import format_sms_message, send_order_update_sms


def test_build_email_message() -> None:
    """Build an email payload for a normal notification request."""

    message = build_email_message("Hello", "Body text", "user@example.com")
    assert message["recipient"] == "user@example.com"


def test_send_receipt_email() -> None:
    """Send a receipt email for an invoice and return the composed payload."""

    invoice = Invoice(invoice_id="inv_1", order_id="ord_1", user_email="alice@example.com", amount_due=100, currency="USD")
    message = send_receipt_email(invoice, "alice@example.com")
    assert message["subject"].startswith("Receipt")


def test_send_password_reset_email() -> None:
    """Deliver a password reset email containing the reset token."""

    message = send_password_reset_email("alice@example.com", "reset-token")
    assert "reset-token" in message["body"]


def test_format_sms_message() -> None:
    """Trim SMS content so it stays within the delivery limit."""

    assert format_sms_message(" hello world ") == "hello world"


def test_send_order_update_sms() -> None:
    """Send a short order update SMS and return the delivery envelope."""

    result = send_order_update_sms("5550100", "Order confirmed")
    assert result["status"] == "sent"
