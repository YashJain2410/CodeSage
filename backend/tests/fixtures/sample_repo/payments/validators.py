"""Validation helpers for payment, refund, and invoice inputs."""

from __future__ import annotations

from utils.errors import ValidationError, raise_validation_error


def validate_amount(amount: object) -> int:
    """Validate a charge or refund amount before it reaches Stripe or invoice math."""

    amount_int = int(amount)
    if amount_int <= 0:
        raise_validation_error("amount", "must be greater than zero")
    return amount_int


def validate_invoice_items(items: list[dict[str, object]]) -> list[dict[str, object]]:
    """Validate line items that will be included in invoice totals and receipts."""

    if not isinstance(items, list):
        raise ValidationError("items must be a list")
    if len(items) == 0:
        raise_validation_error("items", "cannot be empty")
    for item in items:
        if "amount" not in item:
            raise_validation_error("amount", "missing from invoice item")
    return items


def validate_currency(currency: str) -> str:
    """Validate the invoice currency so downstream providers use a supported code."""

    normalized = currency.strip().upper()
    if normalized not in {"USD", "EUR", "GBP"}:
        raise_validation_error("currency", "unsupported currency")
    return normalized


def normalize_payment_amount(amount: object) -> int:
    """Normalize amounts that arrive as strings or decimal-like integers."""

    return validate_amount(amount)
