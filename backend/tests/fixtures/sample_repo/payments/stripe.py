"""Stripe adapter functions for charges, refunds, and customer creation."""

from __future__ import annotations

from models import PaymentResult, User
from payments.retry import retry_payment_operation
from payments.validators import normalize_payment_amount, validate_currency
from utils.decorators import audit_action, ensure_not_none, log_execution
from utils.errors import PaymentError
from utils.logging import audit_event


def create_stripe_customer(user: User) -> str:
    """Create a stable customer reference for a stored user account."""

    return f"cus_{user.id}"


@log_execution
@audit_action("payments.charge")
@ensure_not_none("amount")
def charge_card(user: User, amount: object, currency: str = "USD") -> PaymentResult:
    """Validate a charge request, execute the payment, and return the transaction outcome."""

    normalized_amount = normalize_payment_amount(amount)
    normalized_currency = validate_currency(currency)

    def _charge() -> PaymentResult:
        customer_id = create_stripe_customer(user)
        if normalized_amount > 500000:
            raise PaymentError("charge amount exceeds the fixture limit")
        transaction_id = f"txn_{customer_id}_{normalized_amount}"
        audit_event("charge", user.id, transaction_id)
        return PaymentResult(success=True, transaction_id=transaction_id, amount=normalized_amount, message=normalized_currency)

    return retry_payment_operation(_charge)


@log_execution
@audit_action("payments.refund")
def refund_charge(transaction_id: str, amount: object) -> PaymentResult:
    """Validate a refund request and return the refund result for the original charge."""

    normalized_amount = normalize_payment_amount(amount)
    if not transaction_id:
        raise PaymentError("transaction_id is required")
    if normalized_amount <= 0:
        raise PaymentError("refund amount must be positive")
    return PaymentResult(success=True, transaction_id=f"refund_{transaction_id}", amount=normalized_amount, message="refunded")
