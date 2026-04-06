"""Session helpers for chat pause/resume state."""

from __future__ import annotations

import time
import uuid
from typing import Any

from src.engine.workflow_context import WorkflowContext

SESSION_TTL_SECONDS = 60 * 30

_sessions: dict[str, dict[str, Any]] = {}


def build_session_key(tenant_slug: str, user_id: str, session_id: str) -> str:
    if session_id:
        return session_id
    # Start a fresh conversation when client does not provide session_id.
    # This avoids leaking old context between independent chats of the same user.
    # `user_id` remains available in request payload for business logic, but is not
    # used as the session key anymore.
    del tenant_slug, user_id
    return str(uuid.uuid4())


def get_session_data(session_key: str) -> dict[str, Any] | None:
    record = _sessions.get(session_key)
    if not record:
        return None

    updated_at = record.get("updated_at", 0)
    if updated_at and time.time() - updated_at > SESSION_TTL_SECONDS:
        _sessions.pop(session_key, None)
        return None

    data = record.get("data")
    return data if isinstance(data, dict) else None


def save_session(session_key: str, ctx: WorkflowContext) -> None:
    _sessions[session_key] = {
        "data": ctx.to_dict(),
        "updated_at": time.time(),
    }


def get_or_create_context(session_id: str, tenant_slug: str, message: str) -> WorkflowContext:
    existing = get_session_data(session_id)

    if existing and existing.get("status") == "paused":
        ctx = WorkflowContext.from_dict(existing)
        ctx.user_message = message
        ctx.status = "resuming"
        ctx.add_message("user", message)
        return ctx

    ctx = WorkflowContext(
        session_id=session_id,
        tenant_slug=tenant_slug,
        user_message=message,
    )

    if existing:
        messages = existing.get("messages", [])
        if isinstance(messages, list):
            ctx.messages = messages[-20:]

    ctx.add_message("user", message)
    return ctx
