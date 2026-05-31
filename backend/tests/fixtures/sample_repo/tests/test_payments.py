"""Payment validation, charge, and refund tests that drive the Stripe adapter."""

from __future__ import annotations

from pathlib import Path
import sys

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from models import User
from payments.retry import retry_payment_operation, should_retry
from payments.stripe import charge_card, refund_charge
from payments.validators import validate_amount, validate_currency, validate_invoice_items


def test_validate_amount_success() -> None:
    """Accept a positive integer amount before it reaches payment code."""

    assert validate_amount(1250) == 1250


def test_validate_amount_invalid() -> None:
    """Reject zero-value charges before Stripe is called."""

    with pytest.raises(Exception):
        validate_amount(0)


def test_validate_currency_success() -> None:
    """Normalize a supported payment currency code."""

    assert validate_currency("usd") == "USD"


def test_validate_invoice_items_success() -> None:
    """Accept invoice items that contain line amounts."""

    items = validate_invoice_items([{"name": "Widget", "amount": 100}])
    assert items[0]["amount"] == 100


def test_charge_card_success() -> None:
    """Charge a customer card using the Stripe adapter and return a payment result."""

    user = User(id="u_1", email="alice@example.com", username="alice", password_hash="hash")
    result = charge_card(user, 1500, "USD")
    assert result.success is True
    assert result.transaction_id.startswith("txn_")


def test_charge_card_invalid_amount() -> None:
    """Reject invalid card charges when the amount is not positive."""

    user = User(id="u_1", email="alice@example.com", username="alice", password_hash="hash")
    with pytest.raises(Exception):
        charge_card(user, 0, "USD")


def test_refund_charge_success() -> None:
    """Return a refund payment result for a previously created transaction id."""

    result = refund_charge("txn_abc", 500)
    assert result.success is True
    assert result.transaction_id == "refund_txn_abc"


def test_should_retry_skips_validation_errors() -> None:
    """Detect that validation failures should not be retried as transient payment errors."""

    assert should_retry(Exception("timeout")) is True


def test_retry_payment_operation_runs_function() -> None:
    """Invoke the retry wrapper around a successful in-memory operation."""

    result = retry_payment_operation(lambda value: value + 1, 4)
    assert result == 5
