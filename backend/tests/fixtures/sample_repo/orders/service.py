"""Order workflow orchestration for checkout, cancellation, and refund paths."""

from __future__ import annotations

from models import Invoice, Order, PaymentResult, User
from notifications.email_service import send_receipt_email
from notifications.sms_service import send_order_update_sms
from payments.invoices import generate_invoice
from payments.stripe import charge_card, refund_charge
from payments.validators import validate_amount, validate_invoice_items
from orders.repository import create_order_record, update_order_status
from utils.decorators import audit_action, log_execution, measure_timing
from utils.errors import PaymentError, ValidationError
from utils.logging import audit_event


def _build_order(user: User, items: list[dict[str, object]], amount: int) -> Order:
    """Build an order object before persisting it and sending it to payment."""

    return Order(id=f"ord_{user.id}_{len(items)}", user_id=user.id, items=items, total_amount=amount)


@log_execution
@audit_action("orders.create")
@measure_timing
def create_order(user: User, items: list[dict[str, object]], amount: object, currency: str = "USD") -> Order:
    """Validate a new order request, persist it, and return the created order."""

    validated_amount = validate_amount(amount)
    validated_items = validate_invoice_items(items)
    order = _build_order(user, validated_items, validated_amount)
    order.currency = currency
    stored = create_order_record(order)
    audit_event("order_created", user.id, stored.id)
    return stored


@log_execution
@audit_action("orders.checkout")
def checkout_handler(user: User, items: list[dict[str, object]], amount: object, currency: str = "USD") -> dict[str, object]:
    """Create an order, charge the card, generate an invoice, and notify the buyer."""

    order = create_order(user, items, amount, currency)
    payment = charge_card(user, amount, currency)
    if not payment.success:
        raise PaymentError("payment did not complete")
    invoice = generate_invoice(order, payment)
    send_receipt_email(invoice, recipient=user.email)
    send_order_update_sms("5550100", f"Order {order.id} is confirmed")
    update_order_status(order.id, "paid")
    return {"order_id": order.id, "invoice_id": invoice.invoice_id, "transaction_id": payment.transaction_id}


@log_execution
def refund_order(order_id: str, amount: object) -> PaymentResult:
    """Refund a stored order, update the status, and return the refund result."""

    normalized_amount = validate_amount(amount)
    order = update_order_status(order_id, "refund_pending")
    result = refund_charge(f"txn_{order.id}", normalized_amount)
    if not result.success:
        raise ValidationError("refund failed")
    update_order_status(order.id, "refunded")
    return result
