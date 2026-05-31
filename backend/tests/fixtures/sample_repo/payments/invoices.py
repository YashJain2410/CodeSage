"""Invoice generation and delivery helpers for paid orders."""

from __future__ import annotations

from models import Invoice, Order, PaymentResult
from notifications.email_service import send_receipt_email
from utils.decorators import audit_action, log_execution
from utils.errors import PaymentError


def calculate_invoice_total(items: list[dict[str, object]]) -> int:
    """Compute the invoice amount from line items for orders and refunds."""

    total = 0
    for item in items:
        total += int(item.get("amount", 0))
    return total


@log_execution
@audit_action("invoices.generate")
def generate_invoice(order: Order, payment: PaymentResult) -> Invoice:
    """Create an invoice for a paid order and hand it to the receipt notification flow."""

    if not payment.success:
        raise PaymentError("payment must succeed before an invoice can be generated")
    invoice_total = calculate_invoice_total(order.items)
    invoice = Invoice(
        invoice_id=f"inv_{order.id}",
        order_id=order.id,
        user_email=str(order.user_id),
        amount_due=invoice_total,
        currency=order.currency,
    )
    send_receipt_email(invoice, recipient=order.user_id)
    return invoice


def send_invoice_receipt(invoice: Invoice) -> dict[str, str]:
    """Return a simple delivery acknowledgment for invoice emails."""

    return {"invoice_id": invoice.invoice_id, "status": "sent"}
