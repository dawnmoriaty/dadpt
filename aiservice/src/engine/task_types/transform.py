"""Transform task — data transformation via Jinja2-style templates or Polars.

Config example (in workflow JSON):
{
    "task_type": "transform",
    "config": {
        "template": "Tìm thấy {trip_count} chuyến xe từ {origin} đến {destination}.",
        "output_key": "formatted_result"
    }
}

For Polars operations:
{
    "task_type": "transform",
    "config": {
        "mode": "polars",
        "input_key": "raw_trips",
        "operations": [
            {"sort_by": "base_price"},
            {"head": 5}
        ],
        "output_key": "top_trips"
    }
}
"""

from __future__ import annotations

import json
from typing import Any

import structlog

from src.engine.task_types.base_task import BaseTask
from src.engine.workflow_context import WorkflowContext

logger = structlog.get_logger()


class TransformTask(BaseTask):
    task_type = "transform"

    async def execute(self, ctx: WorkflowContext) -> WorkflowContext:
        mode = self.config.get("mode", "template")
        output_key = self.config.get("output_key", "transform_output")

        if mode == "polars":
            result = await self._polars_transform(ctx)
        else:
            result = self._template_transform(ctx)

        ctx.set_var(output_key, result)
        logger.debug("transform.done", mode=mode, output_key=output_key)
        return ctx

    def _template_transform(self, ctx: WorkflowContext) -> str:
        template = self.config.get("template", "")
        return self._render_template(template, ctx)

    async def _polars_transform(self, ctx: WorkflowContext) -> Any:
        import polars as pl

        input_key = self.config.get("input_key", "")
        operations = self.config.get("operations", [])

        raw_data = ctx.get_var(input_key, [])

        # Convert to Polars DataFrame
        if isinstance(raw_data, str):
            try:
                raw_data = json.loads(raw_data)
            except json.JSONDecodeError:
                return raw_data

        if isinstance(raw_data, list) and raw_data:
            df = pl.DataFrame(raw_data)
        else:
            return raw_data

        # Apply operations sequentially
        for op in operations:
            if isinstance(op, dict):
                for op_name, op_value in op.items():
                    if op_name == "sort_by":
                        df = df.sort(op_value)
                    elif op_name == "head":
                        df = df.head(op_value)
                    elif op_name == "tail":
                        df = df.tail(op_value)
                    elif op_name == "filter":
                        # Simple filter: {"column": "status", "op": "==", "value": "scheduled"}
                        col = op_value.get("column", "")
                        oper = op_value.get("op", "==")
                        val = op_value.get("value", "")
                        if oper == "==":
                            df = df.filter(pl.col(col) == val)
                        elif oper == "!=":
                            df = df.filter(pl.col(col) != val)
                        elif oper == ">":
                            df = df.filter(pl.col(col) > val)
                        elif oper == "<":
                            df = df.filter(pl.col(col) < val)
                    elif op_name == "select":
                        df = df.select(op_value)

        # Return as list of dicts
        return df.to_dicts()
