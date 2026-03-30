"""Rerank trips task with phase-4 dynamic policy scoring."""

from __future__ import annotations

import json
from typing import Any

import structlog

from src.engine.task_types.base_task import BaseTask
from src.engine.workflow_context import WorkflowContext
from src.phase4.policy_engine import resolve_policy_weights, score_trip

logger = structlog.get_logger()


class RerankTripsTask(BaseTask):
    task_type = "rerank_trips"

    async def execute(self, ctx: WorkflowContext) -> WorkflowContext:
        input_key = self.config.get("input_key", "search_results")
        list_key = self.config.get("list_key", "trips")
        output_key = self.config.get("output_key", "top_trips")
        top_n = int(self.config.get("top_n", 5))
        price_field = self.config.get("price_field", "base_price")
        related_n = int(self.config.get("related_n", 2))
        departure_field = self.config.get("departure_field", "departureTime")
        max_related_gap_minutes = int(self.config.get("max_related_gap_minutes", 180))
        policy_cfg = self.config.get("policy", {})

        raw_value = ctx.get_var(input_key)
        if isinstance(raw_value, str):
            try:
                raw_value = json.loads(raw_value)
            except json.JSONDecodeError:
                raw_value = []

        trips = self._extract_trips(raw_value, list_key)
        if not isinstance(trips, list):
            trips = []

        weights = resolve_policy_weights(policy_cfg if isinstance(policy_cfg, dict) else {})

        ctx.set_var(
            "policy_used",
            {
                "profile": str((policy_cfg or {}).get("profile", "custom")) if isinstance(policy_cfg, dict) else "custom",
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
            trip_score = score_trip(
                trip,
                min_price=min_price,
                max_price=max_price,
                earliest_departure=earliest_departure,
                latest_departure=latest_departure,
                max_seats=max_seats,
                weights=weights,
            )
            item = dict(trip)
            item["_policy_score"] = round(trip_score, 6)
            scored.append(item)

        ranked = sorted(
            scored,
            key=lambda item: (-float(item.get("_policy_score", 0.0)), self._price_value(item, price_field)),
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

        if related:
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
            },
            trace_id=ctx.trace_id,
        )
        return ctx

    @staticmethod
    def _extract_trips(raw_value: Any, list_key: str) -> list[dict[str, Any]]:
        if isinstance(raw_value, list):
            return raw_value
        if isinstance(raw_value, dict):
            if list_key and isinstance(raw_value.get(list_key), list):
                return raw_value[list_key]
            for key in ("trips", "items", "data", "results"):
                if isinstance(raw_value.get(key), list):
                    return raw_value[key]
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
        vals = [self._departure_minutes(item, departure_field) for item in trips]
        vals = [v for v in vals if v is not None]
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
            raw = item.get("departure_time") if isinstance(item.get("departure_time"), str) else None
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
