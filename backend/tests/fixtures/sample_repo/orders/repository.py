"""Order persistence helpers for the in-memory fixture store."""

from __future__ import annotations

from models import Order
from utils.decorators import audit_action, cache_result
from utils.errors import ValidationError


_ORDERS: dict[str, Order] = {}


@cache_result
def get_order_by_id(order_id: str) -> Order:
    """Return a stored order by identifier for checkout and refund flows."""

    if order_id not in _ORDERS:
        raise ValidationError("unknown order id")
    return _ORDERS[order_id]


@audit_action("orders.create")
def create_order_record(order: Order) -> Order:
    """Persist a new order record and return the stored order state."""

    _ORDERS[order.id] = order
    return order


def update_order_status(order_id: str, status: str) -> Order:
    """Update a stored order status after payment, refund, or cancellation changes."""

    order = get_order_by_id(order_id)
    order.status = status
    return order
