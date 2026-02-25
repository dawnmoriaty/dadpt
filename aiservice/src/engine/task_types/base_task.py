"""Base interface for all task types.

Every task type implements this ABC — code once, configure from DB forever.
Analogous to a BPMN ServiceTask / UserTask template.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any

from src.engine.workflow_context import WorkflowContext


class BaseTask(ABC):
    """Abstract base for all workflow task types."""

    # Subclasses set this; used by TaskRegistry auto-discovery
    task_type: str = ""

    def __init__(self, config: dict[str, Any], **deps: Any) -> None:
        """
        Args:
            config: Node-level config from workflow JSON definition.
            **deps: Injected dependencies (model_pool, tool_factory, qdrant …).
        """
        self.config = config
        self.deps = deps

    @abstractmethod
    async def execute(self, ctx: WorkflowContext) -> WorkflowContext:
        """Run this task, mutate context, return it."""
        ...

    # ── helpers ──

    def _render_template(self, template: str, ctx: WorkflowContext) -> str:
        """Simple variable interpolation: {var_name} → ctx.variables[var_name]."""
        try:
            # Build a merge dict of variables + top-level context fields
            render_vars = {
                "user_message": ctx.user_message,
                "response": ctx.response,
                "session_id": ctx.session_id,
                "tenant_slug": ctx.tenant_slug,
                **ctx.variables,
            }
            return template.format(**render_vars)
        except KeyError:
            # If a variable is missing, return template as-is
            return template
