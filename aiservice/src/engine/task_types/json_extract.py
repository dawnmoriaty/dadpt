"""Extract JSON fields into workflow context variables.

Config example:
{
    "task_type": "json_extract",
    "config": {
        "input_key": "search_params",
        "fields": {
            "origin": "origin",
            "destination": "destination",
            "date": "date",
            "passengers": "passengers"
        },
        "casts": {
            "passengers": "int"
        }
    }
}
"""

from __future__ import annotations

import json
import re
from typing import Any

import structlog

from src.engine.task_types.base_task import BaseTask
from src.engine.workflow_context import WorkflowContext

logger = structlog.get_logger()


class JsonExtractTask(BaseTask):
    task_type = "json_extract"

    async def execute(self, ctx: WorkflowContext) -> WorkflowContext:
        input_key = self.config.get("input_key", "")
        fields = self.config.get("fields", {})
        casts = self.config.get("casts", {})
        defaults = self.config.get("defaults", {})
        output_key = self.config.get("output_key")

        raw_value = ctx.get_var(input_key) if input_key else None
        if raw_value is None and input_key == "user_message":
            raw_value = ctx.user_message
        raw_text = raw_value if isinstance(raw_value, str) else ""
        data = self._load_json(raw_value)

        if not fields and isinstance(data, dict):
            fields = {key: key for key in data.keys()}

        extracted = {}
        if isinstance(data, dict):
            for target_key, source_key in fields.items():
                value = data.get(source_key)
                if value is None:
                    value = self._extract_from_text(raw_text, source_key)
                value = self._cast_value(value, casts.get(target_key))
                if value is not None:
                    ctx.set_var(target_key, value)
                    extracted[target_key] = value

        for target_key, default_value in defaults.items():
            if target_key not in extracted and default_value is not None:
                ctx.set_var(target_key, default_value)
                extracted[target_key] = default_value

        if output_key:
            ctx.set_var(output_key, extracted)

        logger.debug("json_extract.done", input_key=input_key, extracted=list(extracted.keys()))
        return ctx

    @staticmethod
    def _load_json(raw_value: Any) -> Any:
        if isinstance(raw_value, str):
            try:
                return json.loads(raw_value)
            except json.JSONDecodeError:
                start = raw_value.find("{")
                end = raw_value.rfind("}")
                if start != -1 and end != -1 and end > start:
                    try:
                        return json.loads(raw_value[start : end + 1])
                    except json.JSONDecodeError:
                        return {}
                return {}
        return raw_value

    @staticmethod
    def _cast_value(value: Any, cast_type: str | None) -> Any:
        if value is None or not cast_type:
            return value
        try:
            if cast_type == "int":
                return int(value)
            if cast_type == "float":
                return float(value)
            if cast_type == "str":
                return str(value)
            if cast_type == "bool":
                if isinstance(value, str):
                    return value.strip().lower() in {"1", "true", "yes", "y"}
                return bool(value)
        except (TypeError, ValueError):
            return value
        return value

    @staticmethod
    def _extract_from_text(raw_text: str, key: str) -> Any:
        if not raw_text:
            return None
        key_lower = key.lower()
        if key_lower in {"date", "departure_date", "travel_date"}:
            match = re.search(r"\d{4}-\d{2}-\d{2}", raw_text)
            return match.group(0) if match else None

        patterns: list[str] = []
        if key_lower in {"origin", "from", "origin_name"}:
            patterns = [r"origin\s*[:=]\s*([^\n,]+)", r"điểm đi\s*[:=]\s*([^\n,]+)", r"diem di\s*[:=]\s*([^\n,]+)"]
        elif key_lower in {"destination", "to", "destination_name"}:
            patterns = [r"destination\s*[:=]\s*([^\n,]+)", r"điểm đến\s*[:=]\s*([^\n,]+)", r"diem den\s*[:=]\s*([^\n,]+)"]
        elif key_lower in {"passengers", "passenger", "seats"}:
            patterns = [r"passengers?\s*[:=]\s*(\d+)", r"số người\s*[:=]\s*(\d+)", r"so nguoi\s*[:=]\s*(\d+)"]

        for pattern in patterns:
            match = re.search(pattern, raw_text, flags=re.IGNORECASE)
            if match:
                return match.group(1).strip().strip('"')

        if key_lower in {"origin", "from", "origin_name", "destination", "to", "destination_name"}:
            route_match = re.search(
                r"t[uừ]\s+(.+?)\s+[đd][ếe]n\s+(.+?)(?:\s+ng[àa]y\s+\d{4}-\d{2}-\d{2}|$)",
                raw_text,
                flags=re.IGNORECASE,
            )
            if route_match:
                origin_value = route_match.group(1).strip()
                destination_value = route_match.group(2).strip()
                if key_lower in {"origin", "from", "origin_name"}:
                    return origin_value
                return destination_value

        return None
