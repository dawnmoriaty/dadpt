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
import unicodedata
from datetime import datetime, timedelta
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
        fallback_text_key = str(self.config.get("fallback_text_key", "") or "").strip()

        raw_value = ctx.get_var(input_key) if input_key else None
        if raw_value is None and input_key == "user_message":
            raw_value = ctx.user_message
        raw_text = raw_value if isinstance(raw_value, str) else ""
        data = self._load_json(raw_value)

        fallback_text = ""
        if fallback_text_key:
            fallback_raw = ctx.get_var(fallback_text_key)
            if fallback_raw is None and fallback_text_key == "user_message":
                fallback_raw = ctx.user_message
            if isinstance(fallback_raw, str):
                fallback_text = fallback_raw

        if not fields and isinstance(data, dict):
            fields = {key: key for key in data.keys()}

        source_data = data if isinstance(data, dict) else {}
        context_first_fields = {
            "origin",
            "from",
            "origin_name",
            "destination",
            "to",
            "destination_name",
            "date",
            "departure_date",
            "travel_date",
            "time",
            "departure_time",
            "departure_time_hint",
            "passengers",
            "passenger",
            "seats",
            "budget",
            "max_price",
            "price",
            "maxprice",
        }
        extracted = {}
        for target_key, source_key in fields.items():
            value = source_data.get(source_key)

            if str(target_key).lower() in {"origin", "from", "origin_name", "destination", "to", "destination_name"}:
                value = self._sanitize_location(value)

            if self._is_blank(value):
                value = self._extract_from_text(raw_text, source_key)

            source_key_lower = str(source_key).lower()
            if fallback_text and source_key_lower in context_first_fields:
                fallback_value = self._extract_from_text(fallback_text, source_key)
                if not self._is_blank(fallback_value):
                    value = fallback_value

            if self._is_blank(value) and fallback_text:
                value = self._extract_from_text(fallback_text, source_key)

            if str(target_key).lower() in {"origin", "from", "origin_name", "destination", "to", "destination_name"}:
                value = self._sanitize_location(value)

            value = self._cast_value(value, casts.get(target_key))
            if not self._is_blank(value):
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
    def _is_blank(value: Any) -> bool:
        return value is None or (isinstance(value, str) and not value.strip())

    @staticmethod
    def _extract_from_text(raw_text: str, key: str) -> Any:
        if not raw_text:
            return None
        key_lower = key.lower()
        normalized_text = JsonExtractTask._normalize_text(raw_text)

        if key_lower in {"time", "departure_time", "departure_time_hint"}:
            return JsonExtractTask._extract_departure_time(raw_text, normalized_text)

        if key_lower in {"date", "departure_date", "travel_date"}:
            match = re.search(r"\d{4}-\d{2}-\d{2}", raw_text)
            if match:
                return match.group(0)

            today = datetime.now()
            if "ngay mai" in normalized_text or "ngaymai" in normalized_text:
                return (today + timedelta(days=1)).strftime("%Y-%m-%d")
            if "hom nay" in normalized_text or "homnay" in normalized_text:
                return today.strftime("%Y-%m-%d")
            if "ngay kia" in normalized_text or "ngaykia" in normalized_text:
                return (today + timedelta(days=2)).strftime("%Y-%m-%d")

            return None

        patterns: list[str] = []
        if key_lower in {"origin", "from", "origin_name"}:
            patterns = [r"origin\s*[:=]\s*([^\n,]+)", r"điểm đi\s*[:=]\s*([^\n,]+)", r"diem di\s*[:=]\s*([^\n,]+)"]
        elif key_lower in {"destination", "to", "destination_name"}:
            patterns = [r"destination\s*[:=]\s*([^\n,]+)", r"điểm đến\s*[:=]\s*([^\n,]+)", r"diem den\s*[:=]\s*([^\n,]+)"]
        elif key_lower in {"passengers", "passenger", "seats"}:
            patterns = [
                r"passengers?\s*[:=]\s*(\d+)",
                r"số người\s*[:=]?\s*(\d+)",
                r"so nguoi\s*[:=]?\s*(\d+)",
                r"(\d+)\s*(?:người|nguoi|gh[eế]|ch[oỗ]|ve|vé)\b",
            ]
        elif key_lower in {"budget", "max_price", "price", "maxprice"}:
            budget_match = re.search(r"ngan\s*sach\s*(\d{2,4})\s*k\b", normalized_text)
            if budget_match:
                return str(int(budget_match.group(1)) * 1000)

            compact_match = re.search(r"(?:duoi|toi da|toi da|khoang|tam)\s*(\d{2,4})\s*k\b", normalized_text)
            if compact_match:
                return str(int(compact_match.group(1)) * 1000)
            plain_match = re.search(r"(?:duoi|toi da|toida|khoang|tam)\s*(\d{5,7})\b", normalized_text)
            if plain_match:
                return plain_match.group(1)
            per_ticket_match = re.search(r"(\d{2,4})\s*k\s*(?:/ve|moi ve|ve)\b", normalized_text)
            if per_ticket_match:
                return str(int(per_ticket_match.group(1)) * 1000)

        for pattern in patterns:
            match = re.search(pattern, raw_text, flags=re.IGNORECASE)
            if match:
                return match.group(1).strip().strip('"')
            match = re.search(JsonExtractTask._normalize_text(pattern), normalized_text, flags=re.IGNORECASE)
            if match:
                return match.group(1).strip().strip('"')

        if key_lower in {"origin", "from", "origin_name", "destination", "to", "destination_name"}:
            route_match = re.search(
                r"t[uừ]\s+(.+?)\s+[đd][ếe]n\s+(.+?)(?:\s+ng[àa]y\s+\d{4}-\d{2}-\d{2}|\s+ng[àa]y\s+mai|\s+h[oô]m\s+nay|\s+ng[àa]y\s+kia|\s+l[úu]c\s+\d{1,2}(?::\d{1,2}|h\d{0,2})?|\s+\d{1,2}(?::\d{1,2}|h\d{0,2})|\s+\d+\s*(?:gh[eế]|ve|vé|ch[oỗ])|$)",
                raw_text,
                flags=re.IGNORECASE,
            )
            if not route_match:
                route = JsonExtractTask._extract_route_from_normalized_text(normalized_text)
                if route:
                    origin_value, destination_value = route
                    if key_lower in {"origin", "from", "origin_name"}:
                        return origin_value
                    return destination_value
            elif route_match:
                origin_value = route_match.group(1).strip()
                destination_value = route_match.group(2).strip()
                if key_lower in {"origin", "from", "origin_name"}:
                    return origin_value
                return destination_value

        return None

    @staticmethod
    def _normalize_text(value: str) -> str:
        normalized = unicodedata.normalize("NFKD", value)
        ascii_like = "".join(char for char in normalized if not unicodedata.combining(char))
        return ascii_like.replace("đ", "d").replace("Đ", "D").lower()

    @staticmethod
    def _extract_route_from_normalized_text(value: str) -> tuple[str, str] | None:
        text = f" {value} "
        if " di " not in text:
            return None

        left, right = text.split(" di ", 1)
        origin = left.strip()
        for prefix in ("tim chuyen ", "tim xe ", "chuyen ", "xe "):
            if origin.startswith(prefix):
                origin = origin[len(prefix):].strip()
                break

        destination = right.strip()
        for marker in (" ngay ", " hom nay", " ngay mai", " ngay kia", " luc ", " vao "):
            if marker in destination:
                destination = destination.split(marker, 1)[0].strip()
                break

        destination = re.sub(r"\b\d{1,2}(?::\d{1,2}|h\d{0,2})\b.*$", "", destination).strip()
        destination = re.sub(r"\b\d+\s*(?:ghe|cho|ve)\b.*$", "", destination).strip()

        if not origin or not destination:
            return None
        return origin, destination

    @staticmethod
    def _extract_departure_time(raw_text: str, normalized_text: str) -> str | None:
        del raw_text

        hh_mm_match = re.search(r"\b([01]?\d|2[0-3])[:h]([0-5]?\d)\b", normalized_text)
        if hh_mm_match:
            hour = int(hh_mm_match.group(1))
            minute = int(hh_mm_match.group(2))
            if 0 <= hour <= 23 and 0 <= minute <= 59:
                return f"{hour:02d}:{minute:02d}"

        hour_match = re.search(r"(?:luc|vao)?\s*\b([01]?\d|2[0-3])\s*(?:h|gio)\b", normalized_text)
        if not hour_match:
            hour_match = re.search(r"\b([01]?\d|2[0-3])\s*(?:h|gio)\b", normalized_text)
        if hour_match:
            hour = int(hour_match.group(1))
            minute = 0

            has_evening_hint = (
                bool(re.search(r"\bchieu\b", normalized_text))
                or bool(re.search(r"\btoi nay\b", normalized_text))
                or bool(re.search(r"\bbuoi toi\b", normalized_text))
                or bool(re.search(r"\bpm\b", normalized_text))
            )
            if 1 <= hour < 12 and has_evening_hint:
                hour += 12
            if hour == 12 and any(word in normalized_text for word in ("sang", "am")):
                hour = 0

        if 0 <= hour <= 23:
            return f"{hour:02d}:{minute:02d}"

        return None

    @staticmethod
    def _sanitize_location(value: Any) -> str:
        if value is None:
            return ""

        text = " ".join(str(value).strip().split())
        if not text:
            return ""

        lowered = JsonExtractTask._normalize_text(text)
        for prefix in (
            "toi muon ",
            "minh muon ",
            "cho toi ",
            "di ",
            "tu ",
            "xuat phat tu ",
        ):
            if lowered.startswith(prefix):
                text = text[len(prefix):].strip()
                lowered = JsonExtractTask._normalize_text(text)

        for marker in (" ngay ", " luc ", " gio ", " ngan sach ", " gia ", " cho "):
            idx = lowered.find(marker)
            if idx > 0:
                text = text[:idx].strip(" ,.")
                lowered = JsonExtractTask._normalize_text(text)
                break

        if len(text) < 2:
            return ""
        return text.strip(" ,.")
