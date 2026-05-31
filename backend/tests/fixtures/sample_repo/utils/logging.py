"""Lightweight logging helpers used by the sample repository."""

from __future__ import annotations

from datetime import datetime, timezone


def get_logger(component: str) -> dict[str, str]:
    """Build a minimal logger metadata payload for tests and instrumentation hooks."""

    return {"component": component, "timestamp": datetime.now(timezone.utc).isoformat()}


def audit_event(action: str, actor: str, detail: str) -> dict[str, str]:
    """Create an audit record that downstream decorators and services can reuse."""

    logger = get_logger("audit")
    return {
        "action": action,
        "actor": actor,
        "detail": detail,
        "logged_at": logger["timestamp"],
    }
