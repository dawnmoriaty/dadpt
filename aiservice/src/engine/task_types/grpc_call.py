"""gRPC Call task — invoke any backend gRPC method dynamically.

Config example (in workflow JSON):
{
    "task_type": "grpc_call",
    "config": {
        "tool_name": "search_trips",
        "input_mapping": {
            "origin": "{origin_city}",
            "destination": "{destination_city}",
            "date": "{travel_date}"
        },
        "output_key": "search_results"
    }
}
"""

from __future__ import annotations

import json

import structlog

from src.engine.task_types.base_task import BaseTask
from src.engine.workflow_context import WorkflowContext

logger = structlog.get_logger()


class GRPCCallTask(BaseTask):
    task_type = "grpc_call"

    async def execute(self, ctx: WorkflowContext) -> WorkflowContext:
        tool_name = self.config.get("tool_name", "")
        input_mapping = self.config.get("input_mapping", {})
        output_key = self.config.get("output_key", "grpc_output")

        # Resolve tool from factory
        tool_factory = self.deps.get("tool_factory")
        if not tool_factory:
            ctx.error = "tool_factory dependency not injected"
            ctx.status = "error"
            return ctx

        # Find the matching tool by name from tenant tools
        tenant_tools = self.deps.get("tenant_tools", [])
        tool = None
        for t in tenant_tools:
            if t.name == tool_name:
                tool = t
                break

        if tool is None:
            ctx.error = f"Tool '{tool_name}' not found"
            ctx.status = "error"
            return ctx

        # Build input kwargs by resolving template variables
        kwargs = {}
        for param_name, template_value in input_mapping.items():
            if isinstance(template_value, str):
                kwargs[param_name] = self._render_template(template_value, ctx)
            else:
                kwargs[param_name] = template_value

        # Invoke tool
        try:
            result = await tool.ainvoke(kwargs)
            if isinstance(result, str):
                # Try to parse as JSON
                try:
                    result = json.loads(result)
                except json.JSONDecodeError:
                    pass
        except Exception as e:
            logger.error("grpc_call.error", tool=tool_name, error=str(e))
            ctx.error = f"gRPC call failed: {e}"
            ctx.status = "error"
            return ctx

        ctx.set_var(output_key, result)
        ctx.log_tool_call(tool_name, kwargs, str(result)[:500])
        logger.debug("grpc_call.done", tool=tool_name, output_key=output_key)

        return ctx
