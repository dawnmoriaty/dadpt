"""Rerank trips task — sort trips by price and return top N.

Config example:
{
    "task_type": "rerank_trips",
    "config": {
        "input_key": "search_results",
        "list_key": "trips",
        "output_key": "top_trips",
        "top_n": 5,
        "price_field": "base_price"
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


class RerankTripsTask(BaseTask):
    task_type = "rerank_trips"

    async def execute(self, ctx: WorkflowContext) -> WorkflowContext:
        input_key = self.config.get("input_key", "search_results")
        list_key = self.config.get("list_key", "trips")
        output_key = self.config.get("output_key", "top_trips")
        top_n = int(self.config.get("top_n", 5))
        price_field = self.config.get("price_field", "base_price")

        raw_value = ctx.get_var(input_key)
        if isinstance(raw_value, str):
            try:
                raw_value = json.loads(raw_value)
            except json.JSONDecodeError:
                raw_value = []

        trips = self._extract_trips(raw_value, list_key)
        if not isinstance(trips, list):
            trips = []

        ranked = sorted(trips, key=lambda item: self._price_value(item, price_field))
        if top_n > 0:
            ranked = ranked[:top_n]

        ctx.set_var(output_key, ranked)
        ctx.set_var("trip_count", len(trips))
        logger.debug(
            "rerank_trips.done",
            input_key=input_key,
            output_key=output_key,
            count=len(ranked),
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
        else:
            raw_price = None
        if raw_price is None:
            return float("inf")
        try:
            return float(raw_price)
        except (TypeError, ValueError):
            return float("inf")
