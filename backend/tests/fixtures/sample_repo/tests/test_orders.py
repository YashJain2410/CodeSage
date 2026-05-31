"""Order creation, checkout, and refund tests for the checkout flow."""

from __future__ import annotations

from pathlib import Path
import sys

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from models import User
from orders.service import checkout_handler, create_order, refund_order


def test_create_order_success() -> None:
    """Create and persist an order for a logged-in buyer."""

    user = User(id="u_1", email="alice@example.com", username="alice", password_hash="hash")
    order = create_order(user, [{"name": "Widget", "amount": 100}], 100)
    assert order.status == "pending"
    assert order.total_amount == 100


def test_create_order_invalid_amount() -> None:
    """Reject order creation when the amount is not positive."""

    user = User(id="u_1", email="alice@example.com", username="alice", password_hash="hash")
    with pytest.raises(Exception):
        create_order(user, [{"name": "Widget", "amount": 100}], 0)


def test_checkout_handler_success() -> None:
    """Run the full checkout chain from order creation through invoice generation."""

    user = User(id="u_1", email="alice@example.com", username="alice", password_hash="hash")
    result = checkout_handler(user, [{"name": "Widget", "amount": 100}], 100)
    assert result["order_id"].startswith("ord_")
    assert result["invoice_id"].startswith("inv_")


def test_refund_order_success() -> None:
    """Refund a previously created order and return the refund payment result."""

    user = User(id="u_1", email="alice@example.com", username="alice", password_hash="hash")
    order = create_order(user, [{"name": "Widget", "amount": 100}], 100)
    result = refund_order(order.id, 100)
    assert result.success is True


def test_checkout_handler_emits_transaction_id() -> None:
    """Verify that checkout returns the Stripe transaction id needed for support traces."""

    user = User(id="u_1", email="alice@example.com", username="alice", password_hash="hash")
    result = checkout_handler(user, [{"name": "Widget", "amount": 250}], 250)
    assert "transaction_id" in result
