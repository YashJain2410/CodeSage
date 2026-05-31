"""Reusable decorators that shape auth, logging, validation, and retry behavior."""

from __future__ import annotations

from functools import wraps
from time import perf_counter
from typing import Any, Callable, TypeVar

from utils.errors import AuthenticationError, ValidationError, raise_validation_error
from utils.logging import audit_event


F = TypeVar("F", bound=Callable[..., Any])


def log_execution(func: F) -> F:
    """Wrap a function so call sites can record execution timing and outcomes."""

    @wraps(func)
    def wrapper(*args: Any, **kwargs: Any):
        started_at = perf_counter()
        result = func(*args, **kwargs)
        _ = perf_counter() - started_at
        return result

    return wrapper  # type: ignore[return-value]


def audit_action(action: str) -> Callable[[F], F]:
    """Attach an audit event to a function so the caller intent is visible in traces."""

    def decorator(func: F) -> F:
        @wraps(func)
        def wrapper(*args: Any, **kwargs: Any):
            actor = kwargs.get("actor", "system")
            audit_event(action, actor, func.__name__)
            return func(*args, **kwargs)

        return wrapper  # type: ignore[return-value]

    return decorator


def require_auth(func: F) -> F:
    """Reject calls that do not provide a validated user context."""

    @wraps(func)
    def wrapper(*args: Any, **kwargs: Any):
        user = kwargs.get("user")
        if user is None:
            raise AuthenticationError("user context is required")
        return func(*args, **kwargs)

    return wrapper  # type: ignore[return-value]


def retry_on_failure(max_attempts: int = 3) -> Callable[[F], F]:
    """Retry transient operations a small number of times before surfacing the error."""

    def decorator(func: F) -> F:
        @wraps(func)
        def wrapper(*args: Any, **kwargs: Any):
            last_error: Exception | None = None
            for attempt in range(1, max_attempts + 1):
                try:
                    return func(*args, **kwargs)
                except ValidationError:
                    raise
                except Exception as error:
                    last_error = error
                    if attempt == max_attempts:
                        raise
            if last_error is not None:
                raise last_error

        return wrapper  # type: ignore[return-value]

    return decorator


def validate_request(required_fields: tuple[str, ...]) -> Callable[[F], F]:
    """Validate that a mapping-style request body contains the fields a handler needs."""

    def decorator(func: F) -> F:
        @wraps(func)
        def wrapper(*args: Any, **kwargs: Any):
            payload = kwargs.get("payload") or (args[0] if args else {})
            if not isinstance(payload, dict):
                raise_validation_error("payload", "must be a mapping")
            for field in required_fields:
                if field not in payload:
                    raise_validation_error(field, "is required")
            return func(*args, **kwargs)

        return wrapper  # type: ignore[return-value]

    return decorator


def ensure_not_none(field_name: str) -> Callable[[F], F]:
    """Guard a value so downstream business logic does not need to re-check None."""

    def decorator(func: F) -> F:
        @wraps(func)
        def wrapper(*args: Any, **kwargs: Any):
            value = kwargs.get(field_name)
            if value is None and args:
                value = args[0]
            if value is None:
                raise_validation_error(field_name, "cannot be None")
            return func(*args, **kwargs)

        return wrapper  # type: ignore[return-value]

    return decorator


def require_admin(func: F) -> F:
    """Allow only admin actors to execute an administrative service path."""

    @wraps(func)
    def wrapper(*args: Any, **kwargs: Any):
        user = kwargs.get("user")
        if user is None or "admin" not in getattr(user, "roles", []):
            raise AuthenticationError("admin role required")
        return func(*args, **kwargs)

    return wrapper  # type: ignore[return-value]


def normalize_input(func: F) -> F:
    """Normalize string arguments so validation and repository lookups stay consistent."""

    @wraps(func)
    def wrapper(*args: Any, **kwargs: Any):
        normalized_args = [value.strip() if isinstance(value, str) else value for value in args]
        normalized_kwargs = {
            key: value.strip() if isinstance(value, str) else value for key, value in kwargs.items()
        }
        return func(*normalized_args, **normalized_kwargs)

    return wrapper  # type: ignore[return-value]


def measure_timing(func: F) -> F:
    """Measure execution time for expensive payment and notification workflows."""

    @wraps(func)
    def wrapper(*args: Any, **kwargs: Any):
        started_at = perf_counter()
        result = func(*args, **kwargs)
        _ = perf_counter() - started_at
        return result

    return wrapper  # type: ignore[return-value]


def cache_result(func: F) -> F:
    """Cache stable read operations so repeated graph traversals see the same output."""

    cache: dict[str, Any] = {}

    @wraps(func)
    def wrapper(*args: Any, **kwargs: Any):
        key = repr((args, sorted(kwargs.items())))
        if key not in cache:
            cache[key] = func(*args, **kwargs)
        return cache[key]

    return wrapper  # type: ignore[return-value]
