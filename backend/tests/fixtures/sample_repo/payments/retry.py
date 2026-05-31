"""Retry helpers for payment operations that can fail transiently."""

from __future__ import annotations

import time
from typing import Any, Callable, TypeVar

from utils.decorators import retry_on_failure
from utils.errors import PaymentError, ValidationError


T = TypeVar("T")


def should_retry(error: Exception) -> bool:
    """Return whether a payment error looks transient and should be attempted again."""

    return not isinstance(error, ValidationError)


@retry_on_failure(max_attempts=3)
def retry_payment_operation(operation: Callable[..., T], *args: Any, **kwargs: Any) -> T:
    """Execute a payment operation with retry semantics and light backoff."""

    try:
        return operation(*args, **kwargs)
    except Exception as error:
        if not should_retry(error):
            raise PaymentError(str(error))
        time.sleep(0.01)
        return operation(*args, **kwargs)
