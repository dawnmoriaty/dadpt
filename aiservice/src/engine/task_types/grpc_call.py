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
import re
from typing import Any

import structlog
from pydantic import BaseModel, Field, ValidationError

from src.engine.task_types.base_task import BaseTask
from src.engine.workflow_context import WorkflowContext

logger = structlog.get_logger()


class GRPCCallConfig(BaseModel):
    tool_name: str = ""
    input_mapping: dict[str, Any] = Field(default_factory=dict)
    output_key: str = "grpc_output"


class GRPCCallTask(BaseTask):
    task_type = "grpc_call"

    async def execute(self, ctx: WorkflowContext) -> WorkflowContext:
        try:
            config = GRPCCallConfig.model_validate(self.config)
        except ValidationError as exc:
            ctx.error = f"grpc_call config invalid: {exc}"
            ctx.status = "error"
            return ctx

        tool_name = config.tool_name.strip()
        input_mapping = config.input_mapping
        output_key = config.output_key

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
        kwargs: dict[str, Any] = {}
        for param_name, template_value in input_mapping.items():
            if isinstance(template_value, str):
                kwargs[param_name] = self._render_template(template_value, ctx)
            else:
                kwargs[param_name] = template_value

        unresolved = [
            key
            for key, value in kwargs.items()
            if isinstance(value, str) and re.fullmatch(r"\{[a-zA-Z0-9_]+\}", value.strip())
        ]
        if unresolved:
            ctx.error = (
                f"gRPC call blocked: unresolved placeholders for tool '{tool_name}': "
                + ", ".join(unresolved)
            )
            ctx.status = "error"
            logger.warning("grpc_call.unresolved_placeholders", tool=tool_name, fields=unresolved)
            return ctx

        # Invoke tool
        try:
            raw_result = await tool.ainvoke(kwargs)
            result = self._decode_tool_result(raw_result)
        except Exception as e:
            logger.error("grpc_call.error", tool=tool_name, error=str(e))
            ctx.error = f"gRPC call failed: {e}"
            ctx.status = "error"
            return ctx

        if tool_name == "search_trips":
            result = self._normalize_search_payload(result)
            trips = self._extract_trip_items(result)
            if trips:
                # Keep a direct list for downstream tasks that read `trips`.
                ctx.set_var("trips", trips)
                ctx.set_var("search_trip_count", len(trips))
            if isinstance(result, dict):
                resolved_date = str(result.get("resolved_date", "") or "").strip()
                if resolved_date:
                    ctx.set_var("date", resolved_date)
            ctx.set_var("search_results_raw", result)

        ctx.set_var(output_key, result)
        ctx.log_tool_call(tool_name, kwargs, self._preview_output(result))
        logger.debug("grpc_call.done", tool=tool_name, output_key=output_key, trace_id=ctx.trace_id)

        return ctx

    @staticmethod
    def _decode_tool_result(raw_result: Any) -> Any:
        if not isinstance(raw_result, str):
            return raw_result

        value = raw_result.strip()
        if not value:
            return value

        parsed = GRPCCallTask._try_json_parse(value)
        if parsed is not None:
            return parsed

        if value.startswith("```"):
            lines = value.splitlines()
            if len(lines) >= 3 and lines[-1].strip().startswith("```"):
                candidate = "\n".join(lines[1:-1]).strip()
                parsed = GRPCCallTask._try_json_parse(candidate)
                if parsed is not None:
                    return parsed

        object_start = value.find("{")
        object_end = value.rfind("}")
        if 0 <= object_start < object_end:
            candidate = value[object_start : object_end + 1].strip()
            parsed = GRPCCallTask._try_json_parse(candidate)
            if parsed is not None:
                return parsed

        list_start = value.find("[")
        list_end = value.rfind("]")
        if 0 <= list_start < list_end:
            candidate = value[list_start : list_end + 1].strip()
            parsed = GRPCCallTask._try_json_parse(candidate)
            if parsed is not None:
                return parsed

        return raw_result

    @staticmethod
    def _try_json_parse(value: str) -> Any | None:
        try:
            return json.loads(value)
        except json.JSONDecodeError:
            return None

    @staticmethod
    def _normalize_search_payload(payload: Any) -> Any:
        if isinstance(payload, list):
            return {"trips": payload, "total": len(payload)}

        if not isinstance(payload, dict):
            return payload

        normalized = dict(payload)
        trips = GRPCCallTask._extract_trip_items(normalized)
        if trips and "trips" not in normalized:
            normalized["trips"] = trips
        if trips and "total" not in normalized:
            normalized["total"] = len(trips)
        return normalized

    @staticmethod
    def _extract_trip_items(payload: Any) -> list[dict[str, Any]]:
        if isinstance(payload, list):
            return [item for item in payload if isinstance(item, dict)]

        if not isinstance(payload, dict):
            return []

        for key in ("trips", "items", "results", "data"):
            nested = payload.get(key)
            if isinstance(nested, list):
                return [item for item in nested if isinstance(item, dict)]
            if isinstance(nested, dict):
                nested_items = GRPCCallTask._extract_trip_items(nested)
                if nested_items:
                    return nested_items

        return []

    @staticmethod
    def _preview_output(result: Any) -> str:
        if isinstance(result, (dict, list)):
            text = json.dumps(result, ensure_ascii=False)
            return text[:1000]
        return str(result)[:1000]
