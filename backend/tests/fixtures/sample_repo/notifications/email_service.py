"""Email notification helpers for receipts and password reset flows."""

from __future__ import annotations

from models import Invoice
from utils.decorators import log_execution


def build_email_message(subject: str, body: str, recipient: str) -> dict[str, str]:
    """Build an email payload used by receipt, alert, and reset notifications."""

    return {"subject": subject, "body": body, "recipient": recipient}


@log_execution
def send_receipt_email(invoice: Invoice, recipient: str) -> dict[str, str]:
    """Send the receipt email for a completed order and return the message payload."""

    message = build_email_message(
        subject=f"Receipt for {invoice.invoice_id}",
        body=f"Amount due: {invoice.amount_due} {invoice.currency}",
        recipient=recipient,
    )
    return message


@log_execution
def send_password_reset_email(recipient: str, reset_token: str) -> dict[str, str]:
    """Send a password reset email that contains a reset token for auth workflows."""

    return build_email_message("Reset your password", f"Token: {reset_token}", recipient)
