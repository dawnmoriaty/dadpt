import json
from typing import Any

import pytest

from src.engine.task_types.grpc_call import GRPCCallTask
from src.engine.task_types.rerank_trips import RerankTripsTask
from src.engine.workflow_context import WorkflowContext


class DummyTool:
    def __init__(self, name: str, result: Any) -> None:
        self.name = name
        self._result = result
        self.calls: list[dict[str, Any]] = []

    async def ainvoke(self, kwargs: dict[str, Any]) -> Any:
        self.calls.append(kwargs)
        return self._result


@pytest.mark.asyncio
async def test_grpc_call_preserves_full_search_trip_metadata() -> None:
    trip_payload = {
        "data": {
            "items": [
                {
                    "id": 101,
                    "provider_name": "Phuong Trang",
                    "origin_name": "Sai Gon",
                    "destination_name": "Da Lat",
                    "departureTime": "2026-04-02T08:30:00",
                    "finalPrice": 280000,
                    "availableSeats": 12,
                    "image_url": "https://cdn.example/trips/101.jpg",
                    "description": "Sleeper 34 seats",
                },
                {
                    "id": 102,
                    "provider_name": "Thanh Buoi",
                    "origin_name": "Sai Gon",
                    "destination_name": "Da Lat",
                    "departureTime": "2026-04-02T09:00:00",
                    "finalPrice": 300000,
                    "availableSeats": 20,
                    "image_url": "https://cdn.example/trips/102.jpg",
                    "description": "Limousine",
                },
            ]
        }
    }

    tool = DummyTool("search_trips", json.dumps(trip_payload))
    task = GRPCCallTask(
        config={
            "tool_name": "search_trips",
            "input_mapping": {
                "origin": "{origin}",
                "destination": "{destination}",
                "date": "{date}",
                "passengers": "{passengers}",
            },
            "output_key": "search_results",
        },
        tool_factory=object(),
        tenant_tools=[tool],
    )

    ctx = WorkflowContext(session_id="s-1", tenant_slug="bus")
    ctx.set_var("origin", "Sai Gon")
    ctx.set_var("destination", "Da Lat")
    ctx.set_var("date", "2026-04-02")
    ctx.set_var("passengers", 2)

    result = await task.execute(ctx)

    assert result.status == "running"
    assert tool.calls[0]["origin"] == "Sai Gon"

    search_results = result.get_var("search_results")
    assert isinstance(search_results, dict)
    assert isinstance(search_results.get("trips"), list)
    assert len(search_results["trips"]) == 2
    assert search_results["trips"][0]["image_url"] == "https://cdn.example/trips/101.jpg"
    assert search_results["trips"][0]["description"] == "Sleeper 34 seats"

    trips = result.get_var("trips")
    assert isinstance(trips, list)
    assert trips[1]["provider_name"] == "Thanh Buoi"
    assert result.get_var("search_trip_count") == 2


@pytest.mark.asyncio
async def test_rerank_trips_extracts_nested_items_and_keeps_metadata() -> None:
    ctx = WorkflowContext(session_id="s-2", tenant_slug="bus")
    ctx.set_var(
        "search_results",
        {
            "data": {
                "items": [
                    {
                        "id": 201,
                        "provider_name": "A",
                        "departureTime": "2026-04-02T07:30:00",
                        "finalPrice": 260000,
                        "availableSeats": 8,
                        "image_url": "https://cdn.example/trips/201.jpg",
                        "description": "Economy",
                    },
                    {
                        "id": 202,
                        "provider_name": "B",
                        "departureTime": "2026-04-02T09:00:00",
                        "finalPrice": 280000,
                        "availableSeats": 25,
                        "image_url": "https://cdn.example/trips/202.jpg",
                        "description": "Luxury",
                    },
                    {
                        "id": 203,
                        "provider_name": "C",
                        "departureTime": "2026-04-02T09:15:00",
                        "finalPrice": 300000,
                        "availableSeats": 18,
                        "image_url": "https://cdn.example/trips/203.jpg",
                        "description": "Limousine",
                    },
                ]
            }
        },
    )

    task = RerankTripsTask(
        config={
            "input_key": "search_results",
            "list_key": "trips",
            "output_key": "top_trips",
            "top_n": 3,
            "related_n": 2,
            "price_field": "finalPrice",
            "departure_field": "departureTime",
            "max_related_gap_minutes": 120,
            "policy": {"profile": "balanced"},
        }
    )

    result = await task.execute(ctx)

    ranked = result.get_var("top_trips")
    related = result.get_var("related_trips")

    assert isinstance(ranked, list)
    assert len(ranked) == 3
    assert ranked[0]["image_url"].startswith("https://cdn.example/trips/")
    assert "_policy_score" in ranked[0]

    assert isinstance(related, list)
    assert related
    assert related[0]["description"] in {"Luxury", "Limousine"}


@pytest.mark.asyncio
async def test_rerank_trips_overwrites_stale_related_trips() -> None:
    ctx = WorkflowContext(session_id="s-3", tenant_slug="bus")
    ctx.set_var("related_trips", [{"id": 999, "provider_name": "stale"}])
    ctx.set_var(
        "search_results",
        {
            "trips": [
                {
                    "id": 301,
                    "provider_name": "Only One",
                    "departureTime": "2026-04-02T10:00:00",
                    "finalPrice": 310000,
                    "availableSeats": 30,
                    "image_url": "https://cdn.example/trips/301.jpg",
                    "description": "Single option",
                }
            ]
        },
    )

    task = RerankTripsTask(
        config={
            "input_key": "search_results",
            "output_key": "top_trips",
            "top_n": 5,
            "related_n": 2,
            "price_field": "finalPrice",
            "departure_field": "departureTime",
        }
    )

    result = await task.execute(ctx)

    assert result.get_var("top_trips")
    assert result.get_var("related_trips") == []
