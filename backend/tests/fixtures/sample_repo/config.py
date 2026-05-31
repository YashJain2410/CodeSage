"""Application settings helpers for the sample web app."""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class AppSettings:
    """Container for the core service settings used across auth, payments, and notifications."""

    service_name: str
    environment: str
    token_ttl_seconds: int
    retry_limit: int
    support_email: str


def load_settings() -> AppSettings:
    """Load the application defaults that drive token lifetime, retry policy, and support routing."""

    return AppSettings(
        service_name="CodeSage Fixture Shop",
        environment="test",
        token_ttl_seconds=900,
        retry_limit=3,
        support_email="support@fixtures.example",
    )


def get_service_config() -> dict[str, str | int]:
    """Expose a serializable settings view for modules that need endpoints and thresholds."""

    settings = load_settings()
    return {
        "service_name": settings.service_name,
        "environment": settings.environment,
        "token_ttl_seconds": settings.token_ttl_seconds,
        "retry_limit": settings.retry_limit,
        "support_email": settings.support_email,
        "stripe_currency": "USD",
        "invoice_prefix": "INV",
    }
