"""Workflow Context — shared mutable state passed through every task node.

Analogous to BPMN process variables / execution context.
"""

from __future__ import annotations

import datetime as dt
from dataclasses import dataclass, field
from typing import Any


@dataclass
class WorkflowContext:
    """Mutable state that flows through the workflow DAG."""

    # ── identity ──
    session_id: str  # conversation session
    tenant_slug: str
    workflow_slug: str | None = None  # which workflow is running

    # ── conversation ──
    user_message: str = ""
    messages: list[dict[str, str]] = field(default_factory=list)  # chat history

    # ── variables — tasks read/write here ──
    variables: dict[str, Any] = field(default_factory=dict)

    # ── execution tracking ──
    current_node: str | None = None
    visited_nodes: list[str] = field(default_factory=list)
    status: str = "running"  # running | paused | completed | error

    # ── output ──
    response: str = ""  # final message back to user
    tool_calls_log: list[dict[str, Any]] = field(default_factory=list)

    # ── metadata ──
    created_at: str = field(default_factory=lambda: dt.datetime.now(dt.UTC).isoformat())
    error: str | None = None

    # ── helpers ──

    def set_var(self, key: str, value: Any) -> None:
        self.variables[key] = value

    def get_var(self, key: str, default: Any = None) -> Any:
        return self.variables.get(key, default)

    def add_message(self, role: str, content: str) -> None:
        self.messages.append({"role": role, "content": content})

    def log_tool_call(self, tool_name: str, inputs: dict, output: str) -> None:
        self.tool_calls_log.append(
            {
                "tool": tool_name,
                "inputs": inputs,
                "output": output,
                "timestamp": dt.datetime.now(dt.UTC).isoformat(),
            }
        )

    def to_dict(self) -> dict[str, Any]:
        """Serialize for Redis pause/resume storage."""
        return {
            "session_id": self.session_id,
            "tenant_slug": self.tenant_slug,
            "workflow_slug": self.workflow_slug,
            "user_message": self.user_message,
            "messages": self.messages,
            "variables": self.variables,
            "current_node": self.current_node,
            "visited_nodes": self.visited_nodes,
            "status": self.status,
            "response": self.response,
            "tool_calls_log": self.tool_calls_log,
            "created_at": self.created_at,
            "error": self.error,
        }

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> WorkflowContext:
        """Deserialize from Redis."""
        return cls(**{k: v for k, v in data.items() if k in cls.__dataclass_fields__})
