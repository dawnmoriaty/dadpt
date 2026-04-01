"""Rerank trips task with phase-4 dynamic policy scoring."""

from __future__ import annotations

import json
import re
from typing import Any

import structlog
from pydantic import BaseModel, Field, ValidationError

from src.engine.task_types.base_task import BaseTask
from src.engine.workflow_context import WorkflowContext
from src.phase4.policy_engine import resolve_policy_weights, score_trip

logger = structlog.get_logger()


class RerankConfig(BaseModel):
    input_key: str = "search_results"
    list_key: str = "trips"
    output_key: str = "top_trips"
    top_n: int = 5
    price_field: str = "base_price"
    related_n: int = 2
    departure_field: str = "departureTime"
    max_related_gap_minutes: int = 180
    policy: dict[str, Any] = Field(default_factory=dict)
    preferred_time_key: str = "time"
    preferred_time_weight: float = 0.2


class RerankTripsTask(BaseTask):
    task_type = "rerank_trips"

    async def execute(self, ctx: WorkflowContext) -> WorkflowContext:
        try:
            config = RerankConfig.model_validate(self.config)
        except ValidationError as exc:
            ctx.error = f"rerank_trips config invalid: {exc}"
            ctx.status = "error"
            return ctx

        input_key = config.input_key
        list_key = config.list_key
        output_key = config.output_key
        top_n = max(0, config.top_n)
        price_field = config.price_field
        related_n = max(0, config.related_n)
        departure_field = config.departure_field
        max_related_gap_minutes = max(0, config.max_related_gap_minutes)
        policy_cfg = config.policy
        preferred_time_key = config.preferred_time_key
        preferred_time_weight = max(0.0, config.preferred_time_weight)

        raw_value = ctx.get_var(input_key)
        raw_value = self._decode_payload(raw_value)

        trips = self._extract_trips(raw_value, list_key)
        preferred_departure_minutes = self._parse_preferred_minutes(ctx.get_var(preferred_time_key))
        if preferred_departure_minutes is not None:
            ctx.set_var(
                "preferred_departure_time",
                {
                    "key": preferred_time_key,
                    "minutes": preferred_departure_minutes,
                },
            )

        weights = resolve_policy_weights(policy_cfg)

        ctx.set_var(
            "policy_used",
            {
                "profile": str((policy_cfg or {}).get("profile", "custom")),
                "price_weight": weights.price,
                "departure_weight": weights.departure,
                "seats_weight": weights.seats,
            },
        )

        min_price, max_price = self._price_bounds(trips, price_field)
        earliest_departure, latest_departure = self._departure_bounds(trips, departure_field)
        max_seats = max((self._seats_value(item) for item in trips), default=1)

        scored: list[dict[str, Any]] = []
        for trip in trips:
            base_score = score_trip(
                trip,
                min_price=min_price,
                max_price=max_price,
                earliest_departure=earliest_departure,
                latest_departure=latest_departure,
                max_seats=max_seats,
                weights=weights,
            )
            time_match_score = self._time_match_score(
                trip,
                departure_field=departure_field,
                preferred_departure_minutes=preferred_departure_minutes,
            )
            item = dict(trip)
            trip_score = base_score + (time_match_score * preferred_time_weight)
            item["_policy_score"] = round(trip_score, 6)
            if preferred_departure_minutes is not None:
                item["_time_match_score"] = round(time_match_score, 6)
            scored.append(item)

        ranked = sorted(
            scored,
            key=lambda item: (
                -float(item.get("_policy_score", 0.0)),
                self._price_value(item, price_field),
            ),
        )
        if top_n > 0:
            ranked = ranked[:top_n]

        related = self._compute_related_trips(
            ranked,
            price_field=price_field,
            departure_field=departure_field,
            related_n=related_n,
            max_related_gap_minutes=max_related_gap_minutes,
        )

        # Always overwrite to avoid leaking stale related trips from previous turns.
        ctx.set_var("related_trips", related)

        ctx.set_var(output_key, ranked)
        ctx.set_var("trip_count", len(trips))
        logger.debug(
            "rerank_trips.done",
            input_key=input_key,
            output_key=output_key,
            count=len(ranked),
            related_count=len(related),
            policy={
                "price_weight": weights.price,
                "departure_weight": weights.departure,
                "seats_weight": weights.seats,
                "preferred_time_weight": preferred_time_weight,
            },
            trace_id=ctx.trace_id,
        )
        return ctx

    @staticmethod
    def _decode_payload(raw_value: Any) -> Any:
        if not isinstance(raw_value, str):
            return raw_value

        value = raw_value.strip()
        if not value:
            return []

        parsed = RerankTripsTask._try_json_parse(value)
        if parsed is not None:
            return parsed

        if value.startswith("```"):
            lines = value.splitlines()
            if len(lines) >= 3 and lines[-1].strip().startswith("```"):
                candidate = "\n".join(lines[1:-1]).strip()
                parsed = RerankTripsTask._try_json_parse(candidate)
                if parsed is not None:
                    return parsed

        object_start = value.find("{")
        object_end = value.rfind("}")
        if 0 <= object_start < object_end:
            candidate = value[object_start : object_end + 1]
            parsed = RerankTripsTask._try_json_parse(candidate)
            if parsed is not None:
                return parsed

        list_start = value.find("[")
        list_end = value.rfind("]")
        if 0 <= list_start < list_end:
            candidate = value[list_start : list_end + 1]
            parsed = RerankTripsTask._try_json_parse(candidate)
            if parsed is not None:
                return parsed

        return []

    @staticmethod
    def _try_json_parse(value: str) -> Any | None:
        try:
            return json.loads(value)
        except json.JSONDecodeError:
            return None

    @staticmethod
    def _extract_trips(raw_value: Any, list_key: str) -> list[dict[str, Any]]:
        if isinstance(raw_value, list):
            return [item for item in raw_value if isinstance(item, dict)]
        if isinstance(raw_value, dict):
            keys: list[str] = []
            if list_key:
                keys.append(list_key)
            keys.extend(["trips", "items", "results", "data"])

            seen: set[str] = set()
            for key in keys:
                if key in seen:
                    continue
                seen.add(key)

                nested = raw_value.get(key)
                if isinstance(nested, list):
                    return [item for item in nested if isinstance(item, dict)]
                if isinstance(nested, dict):
                    nested_items = RerankTripsTask._extract_trips(nested, list_key)
                    if nested_items:
                        return nested_items
        return []

    @staticmethod
    def _price_value(item: Any, price_field: str) -> float:
        if isinstance(item, dict):
            raw_price = item.get(price_field)
            if raw_price is None:
                raw_price = item.get("finalPrice")
            if raw_price is None:
                raw_price = item.get("basePrice")
            if raw_price is None:
                raw_price = item.get("final_price")
            if raw_price is None:
                raw_price = item.get("base_price")
        else:
            raw_price = None

        if raw_price is None:
            return float("inf")

        try:
            return float(raw_price)
        except (TypeError, ValueError):
            return float("inf")

    @staticmethod
    def _seats_value(item: dict[str, Any]) -> int:
        raw = item.get("availableSeats")
        if raw is None:
            raw = item.get("available_seats")
        if raw is None:
            return 0
        if isinstance(raw, bool):
            return int(raw)
        if not isinstance(raw, (int, float, str, bytes, bytearray)):
            return 0
        try:
            return int(raw)
        except (TypeError, ValueError):
            return 0

    def _price_bounds(self, trips: list[dict[str, Any]], price_field: str) -> tuple[float, float]:
        vals = [self._price_value(item, price_field) for item in trips]
        vals = [v for v in vals if v != float("inf")]
        if not vals:
            return 0.0, 1.0
        return min(vals), max(vals)

    def _departure_bounds(self, trips: list[dict[str, Any]], departure_field: str) -> tuple[int | None, int | None]:
        raw_vals = [self._departure_minutes(item, departure_field) for item in trips]
        vals: list[int] = [v for v in raw_vals if v is not None]
        if not vals:
            return None, None
        return min(vals), max(vals)

    def _compute_related_trips(
        self,
        ranked: list[dict[str, Any]],
        *,
        price_field: str,
        departure_field: str,
        related_n: int,
        max_related_gap_minutes: int,
    ) -> list[dict[str, Any]]:
        if related_n <= 0 or len(ranked) <= 1:
            return []

        anchor = ranked[0]
        anchor_price = self._price_value(anchor, price_field)
        anchor_departure = self._departure_minutes(anchor, departure_field)
        if anchor_departure is None:
            return []

        candidates: list[tuple[int, float, dict[str, Any]]] = []
        for trip in ranked[1:]:
            dep_minutes = self._departure_minutes(trip, departure_field)
            if dep_minutes is None:
                continue

            gap = abs(dep_minutes - anchor_departure)
            if gap > max_related_gap_minutes:
                continue

            price_gap = abs(self._price_value(trip, price_field) - anchor_price)
            candidates.append((gap, price_gap, trip))

        candidates.sort(key=lambda item: (item[0], item[1]))
        return [item[2] for item in candidates[:related_n]]

    @staticmethod
    def _departure_minutes(item: dict[str, Any], departure_field: str) -> int | None:
        raw = item.get(departure_field)
        if not isinstance(raw, str):
            departure_time = item.get("departure_time")
            raw = departure_time if isinstance(departure_time, str) else None
        if not raw:
            return None

        hhmm = None
        if len(raw) >= 16 and "T" in raw:
            hhmm = raw[11:16]
        elif len(raw) >= 5 and raw[2] == ":":
            hhmm = raw[:5]

        if not hhmm:
            return None

        try:
            hour = int(hhmm[0:2])
            minute = int(hhmm[3:5])
            return hour * 60 + minute
        except (TypeError, ValueError):
            return None

    @staticmethod
    def _parse_preferred_minutes(raw: Any) -> int | None:
        if not isinstance(raw, str):
            return None

        value = raw.strip()
        if not value:
            return None

        hhmm_match = re.search(r"\b([01]?\d|2[0-3]):([0-5]\d)\b", value)
        if hhmm_match:
            hour = int(hhmm_match.group(1))
            minute = int(hhmm_match.group(2))
            return hour * 60 + minute

        hour_match = re.search(r"\b([01]?\d|2[0-3])h(?:([0-5]?\d))?\b", value, flags=re.IGNORECASE)
        if hour_match:
            hour = int(hour_match.group(1))
            minute = int(hour_match.group(2) or 0)
            if 0 <= minute <= 59:
                return hour * 60 + minute

        return None

    def _time_match_score(
        self,
        item: dict[str, Any],
        *,
        departure_field: str,
        preferred_departure_minutes: int | None,
    ) -> float:
        if preferred_departure_minutes is None:
            return 0.0

        departure_minutes = self._departure_minutes(item, departure_field)
        if departure_minutes is None:
            return 0.0

        gap = abs(departure_minutes - preferred_departure_minutes)
        capped_gap = min(gap, 360)
        return max(0.0, 1.0 - (capped_gap / 360.0))
