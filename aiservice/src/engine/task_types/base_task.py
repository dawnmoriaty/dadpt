"""Base interface for all task types.

Every task type implements this ABC — code once, configure from DB forever.
Analogous to a BPMN ServiceTask / UserTask template.
"""

from __future__ import annotations

import json
import re
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
        render_vars = self._build_render_vars(ctx)
        try:
            return template.format(**render_vars)
        except KeyError:
            # Resolve plain single placeholder with best effort.
            # Example: template = "{origin}" while origin exists inside JSON in search_params.
            match = re.fullmatch(r"\{([a-zA-Z0-9_]+)\}", template.strip())
            if not match:
                return template

            key = match.group(1)
            value = render_vars.get(key)
            if value is None:
                return template
            return str(value)

    @staticmethod
    def _build_render_vars(ctx: WorkflowContext) -> dict[str, Any]:
        render_vars: dict[str, Any] = {
            "user_message": ctx.user_message,
            "response": ctx.response,
            "session_id": ctx.session_id,
            "tenant_slug": ctx.tenant_slug,
            **ctx.variables,
        }

        # Auto-flatten dict-like payloads in variables to make workflows deterministic.
        # This helps configs like input_mapping: {"origin": "{origin}"} when
        # previous LLM output was stored as JSON in a single key (e.g. "search_params").
        for value in list(ctx.variables.values()):
            parsed = BaseTask._coerce_dict(value)
            if not parsed:
                continue
            for key, item in parsed.items():
                render_vars.setdefault(str(key), item)

        return render_vars

    @staticmethod
    def _coerce_dict(value: Any) -> dict[str, Any] | None:
        if isinstance(value, dict):
            return value
        if not isinstance(value, str):
            return None

        text = value.strip()
        if not text.startswith("{"):
            return None

        try:
            parsed = json.loads(text)
        except json.JSONDecodeError:
            return None

        if isinstance(parsed, dict):
            return parsed
        return None
