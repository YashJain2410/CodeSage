"""Domain models shared by the sample application."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone


@dataclass
class User:
    """Represent an application user with authentication and billing identity."""

    id: str
    email: str
    username: str
    password_hash: str
    is_active: bool = True
    roles: list[str] = field(default_factory=lambda: ["customer"])

    def display_name(self) -> str:
        """Return the most readable label for login screens, notifications, and audits."""

        return self.username or self.email.split("@")[0]


@dataclass
class Order:
    """Represent a checkout request, its line items, and the current order status."""

    id: str
    user_id: str
    items: list[dict[str, object]]
    total_amount: int
    currency: str = "USD"
    status: str = "pending"

    def line_count(self) -> int:
        """Count the number of item lines that should be included in invoices and emails."""

        return len(self.items)


@dataclass
class Invoice:
    """Represent a generated billing document for a completed order."""

    invoice_id: str
    order_id: str
    user_email: str
    amount_due: int
    currency: str
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))

    def amount_with_tax(self, tax_rate: float = 0.0) -> int:
        """Return the rounded total used by invoice rendering and receipt emails."""

        return int(round(self.amount_due * (1 + tax_rate)))


@dataclass
class PaymentResult:
    """Represent the outcome of a payment or refund request."""

    success: bool
    transaction_id: str
    amount: int
    message: str

    def is_successful(self) -> bool:
        """Return whether the payment flow finished in a reusable success state."""

        return self.success and bool(self.transaction_id)


@dataclass
class TokenPayload:
    """Represent the encoded claims stored inside access and refresh tokens."""

    subject: str
    issued_at: int
    expires_at: int
    token_type: str
    issuer: str = "codesage"


@dataclass
class NotificationResult:
    """Represent the delivery state for email and SMS notifications."""

    channel: str
    recipient: str
    delivered: bool
    detail: str
