"""Error types and formatting helpers for the sample app."""

from __future__ import annotations


class AppError(Exception):
    """Base application error used when a service wants a stable domain exception."""


class ValidationError(AppError):
    """Raise when request data fails local validation before any repository call."""


class AuthenticationError(AppError):
    """Raise when a caller cannot authenticate or a token cannot be trusted."""


class PaymentError(AppError):
    """Raise when a charge, refund, or invoice operation cannot be completed."""


def format_error(error: Exception) -> str:
    """Render a compact human-readable error message for logs and API responses."""

    return f"{error.__class__.__name__}: {error}"


def raise_validation_error(field: str, reason: str) -> None:
    """Raise a validation exception with field context for handlers and tests."""

    raise ValidationError(f"{field}: {reason}")
