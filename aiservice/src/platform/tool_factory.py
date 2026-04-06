"""Tool factory for dynamic LangChain tools.

Each tool definition from DB becomes one StructuredTool.
When tenant grpc_target is HTTP, calls use REST endpoints.
"""

from __future__ import annotations

import asyncio
from collections.abc import Awaitable, Callable
from datetime import date as date_cls
from datetime import datetime, timedelta
import json
import unicodedata
from typing import Any
from urllib.parse import urlencode
from urllib.request import urlopen

import grpc
import structlog
from langchain_core.tools import StructuredTool
from pydantic import create_model

from src.config import get_settings
from src.platform.tool_transports.base import BookingTransport
from src.platform.tool_transports.http_backend import HttpBackendTransport
from src.platform.tool_transports.mock_booking import MockBookingTransport

logger = structlog.get_logger()

_TYPE_MAP: dict[str, type] = {
    "string": str,
    "str": str,
    "integer": int,
    "int": int,
    "float": float,
    "number": float,
    "boolean": bool,
    "bool": bool,
}


def _build_input_model(tool_name: str, input_schema: dict[str, Any]):
    fields: dict[str, tuple[type, Any]] = {}
    for field_name, field_type_str in input_schema.items():
        fields[field_name] = (_TYPE_MAP.get(field_type_str, str), ...)
    return create_model(f"{tool_name}_Input", **fields)


class ToolFactory:
    _AUTO_SEARCH_WINDOW_DAYS = 14
    _DEFAULT_LOCATION_LIMIT = 200
    _MAX_LOCATION_CANDIDATES = 200
    _MAX_TRIPS_PER_PAIR = 100
    _MAX_TRIPS_PER_SEARCH = 120
    _LOCATION_QUERY_STOPWORDS = {
        "toi",
        "muon",
        "tim",
        "chuyen",
        "xe",
        "ve",
        "den",
        "di",
        "tu",
        "ngay",
        "hom",
        "nay",
        "mai",
        "kia",
        "luc",
        "gio",
        "khoang",
        "cho",
        "nguoi",
        "ghe",
        "can",
        "dat",
        "gia",
        "ngan",
        "sach",
    }
    _LOCATION_CANONICAL_REPLACEMENTS = (
        ("saigon", "sai gon"),
        ("tp ho chi minh", "ho chi minh"),
        ("tp hcm", "ho chi minh"),
        ("tphcm", "ho chi minh"),
        ("hcm", "ho chi minh"),
        ("hanoi", "ha noi"),
    )

    def __init__(self, grpc_target: str) -> None:
        self._grpc_target = grpc_target
        self._channel: grpc.aio.Channel | None = None
        self._booking_transport: BookingTransport = self._init_booking_transport()

    def _init_booking_transport(self) -> BookingTransport:
        settings = get_settings()
        if settings.booking_call_mode == "live":
            return HttpBackendTransport(self._grpc_target)
        return MockBookingTransport()

    def _is_http_target(self) -> bool:
        return self._grpc_target.startswith("http://") or self._grpc_target.startswith("https://")

    def _get_channel(self) -> grpc.aio.Channel:
        if self._channel is None:
            self._channel = grpc.aio.insecure_channel(self._grpc_target)
        return self._channel

    async def _invoke_http(self, grpc_method: str, **kwargs: Any) -> str:
        handlers: dict[str, Callable[..., Awaitable[str]]] = {
            "SearchTrips": self._search_trips_http,
            "GetLocations": self._get_locations_http,
            "CreateBooking": self._create_booking_http,
        }
        handler = handlers.get(grpc_method)
        if handler is None:
            return json.dumps({"error": f"HTTP fallback not implemented for method '{grpc_method}'"})
        return await handler(**kwargs)

    async def _search_trips_http(self, **kwargs: Any) -> str:
        origin = str(kwargs.get("origin", "") or "").strip()
        destination = str(kwargs.get("destination", "") or "").strip()
        requested_date = str(kwargs.get("date", "") or "").strip()
        passengers = max(1, self._to_int(kwargs.get("passengers")) or 1)

        if not origin or not destination:
            return json.dumps({"error": "Missing origin/destination"})

        origin_ids = await self._resolve_location_ids(origin)
        destination_ids = await self._resolve_location_ids(destination)
        if not origin_ids or not destination_ids:
            return json.dumps(
                {
                    "trips": [],
                    "total": 0,
                    "resolved_date": "",
                    "requested_date": requested_date or "auto",
                },
                ensure_ascii=False,
            )

        date_candidates = self._build_departure_dates(requested_date)
        resolved_date = ""
        trips: list[dict[str, Any]] = []
        for departure_date in date_candidates:
            items = await self._search_trip_matrix(
                origin_ids=origin_ids,
                destination_ids=destination_ids,
                departure_date=departure_date,
                passengers=passengers,
            )
            if items:
                resolved_date = departure_date
                trips = items
                break

        return json.dumps(
            {
                "trips": trips,
                "total": len(trips),
                "resolved_date": resolved_date,
                "requested_date": requested_date or "auto",
            },
            ensure_ascii=False,
        )

    async def _create_booking_http(self, **kwargs: Any) -> str:
        result = await self._booking_transport.create_booking(kwargs)
        return json.dumps(result, ensure_ascii=False)

    async def _search_trip_matrix(
        self,
        *,
        origin_ids: list[int],
        destination_ids: list[int],
        departure_date: str,
        passengers: int,
    ) -> list[dict[str, Any]]:
        items: list[dict[str, Any]] = []
        seen_trip_ids: set[int] = set()

        for origin_id in origin_ids:
            for destination_id in destination_ids:
                if origin_id == destination_id:
                    continue

                payload = await self._http_get_json(
                    f"{self._grpc_target}/api/v1/trips",
                    {
                        "originId": origin_id,
                        "destinationId": destination_id,
                        "departureDate": departure_date,
                        "minSeats": passengers,
                        "page": 1,
                        "limit": self._MAX_TRIPS_PER_PAIR,
                    },
                )
                for raw_item in self._extract_trip_items(payload):
                    if not isinstance(raw_item, dict):
                        continue

                    trip_id = self._to_int(raw_item.get("id"))
                    if trip_id > 0 and trip_id in seen_trip_ids:
                        continue
                    if trip_id > 0:
                        seen_trip_ids.add(trip_id)

                    self._trim_trip_payload(raw_item)
                    items.append(raw_item)
                    if len(items) >= self._MAX_TRIPS_PER_SEARCH:
                        return items

        return items

    @staticmethod
    def _extract_trip_items(payload: Any) -> list[dict[str, Any]]:
        if isinstance(payload, dict):
            data = payload.get("data")
            if isinstance(data, dict):
                nested_items = data.get("items")
                if isinstance(nested_items, list):
                    return [item for item in nested_items if isinstance(item, dict)]

            items = payload.get("items")
            if isinstance(items, list):
                return [item for item in items if isinstance(item, dict)]

        if isinstance(payload, list):
            return [item for item in payload if isinstance(item, dict)]

        return []

    @staticmethod
    def _trim_trip_payload(trip: dict[str, Any]) -> None:
        for key in ("seatLayout", "bookedSeats", "seat_layout", "booked_seats"):
            trip.pop(key, None)

    async def _get_locations_http(self, **kwargs: Any) -> str:
        query = str(kwargs.get("query", "") or kwargs.get("q", "")).strip()
        if not query:
            return json.dumps({"locations": []})

        limit = self._normalize_limit(self._to_int(kwargs.get("limit")) or self._DEFAULT_LOCATION_LIMIT)
        payload = await self._http_get_text(
            f"{self._grpc_target}/api/v1/locations/search",
            {"q": query, "limit": limit},
        )
        return payload

    async def _resolve_location_ids(self, query: str) -> list[int]:
        candidates = await self._search_locations_http(query, self._DEFAULT_LOCATION_LIMIT)
        if not candidates:
            return []

        filtered = [
            item
            for item in candidates
            if self._location_matches_query(
                query,
                [item.get("name"), item.get("city"), item.get("keywords")],
            )
        ]
        source = filtered if filtered else candidates

        ids: list[int] = []
        for item in source:
            location_id = self._to_int(item.get("id"))
            if location_id <= 0 or location_id in ids:
                continue
            ids.append(location_id)
            if len(ids) >= self._MAX_LOCATION_CANDIDATES:
                break
        return ids

    async def _search_locations_http(self, query: str, limit: int) -> list[dict[str, Any]]:
        query_text = str(query or "").strip()
        if not query_text:
            return []

        search_queries = self._build_location_queries(query_text)
        results: list[dict[str, Any]] = []
        seen_ids: set[int] = set()
        for search_query in search_queries:
            payload = await self._http_get_json(
                f"{self._grpc_target}/api/v1/locations/search",
                {
                    "q": search_query,
                    "limit": self._normalize_limit(limit),
                },
            )
            items = self._extract_location_items(payload)
            for item in items:
                location_id = self._to_int(item.get("id"))
                if location_id > 0 and location_id in seen_ids:
                    continue
                if location_id > 0:
                    seen_ids.add(location_id)
                results.append(item)
                if len(results) >= self._MAX_LOCATION_CANDIDATES:
                    return results
        return results

    @staticmethod
    def _extract_location_items(payload: Any) -> list[dict[str, Any]]:
        if isinstance(payload, dict):
            data = payload.get("data")
            if isinstance(data, list):
                return [item for item in data if isinstance(item, dict)]
            locations = payload.get("locations")
            if isinstance(locations, list):
                return [item for item in locations if isinstance(item, dict)]
        if isinstance(payload, list):
            return [item for item in payload if isinstance(item, dict)]
        return []

    def _build_location_queries(self, raw_query: str) -> list[str]:
        normalized = self._normalize_phrase(raw_query)
        queries: list[str] = []
        for candidate in (raw_query.strip(), normalized):
            value = candidate.strip()
            if value and value not in queries:
                queries.append(value)

        normalized_tokens = [
            token for token in normalized.split() if len(token) >= 2 and token not in self._LOCATION_QUERY_STOPWORDS
        ]
        if normalized_tokens:
            city_hint = " ".join(normalized_tokens[-3:]).strip()
            if city_hint and city_hint not in queries:
                queries.append(city_hint)

        return queries[:3]

    def _build_departure_dates(self, raw_date: str) -> list[str]:
        today = date_cls.today()
        normalized = self._normalize_phrase(raw_date)
        parsed_date = self._parse_date(raw_date)

        if normalized in {"", "auto", "gan nhat", "som nhat", "hom nay", "today"}:
            start_date = today
        elif normalized in {"ngay mai", "mai", "tomorrow"}:
            start_date = today + timedelta(days=1)
        elif normalized in {"ngay kia", "mot"}:
            start_date = today + timedelta(days=2)
        elif parsed_date is not None:
            start_date = parsed_date
        else:
            start_date = today

        if start_date < today:
            start_date = today

        return [
            (start_date + timedelta(days=offset)).strftime("%Y-%m-%d")
            for offset in range(self._AUTO_SEARCH_WINDOW_DAYS + 1)
        ]

    @classmethod
    def _normalize_phrase(cls, value: str) -> str:
        normalized = unicodedata.normalize("NFKD", str(value or "").strip().lower())
        ascii_text = "".join(char for char in normalized if not unicodedata.combining(char))
        text = " ".join(ascii_text.replace("đ", "d").replace("Đ", "D").split())
        for source, target in cls._LOCATION_CANONICAL_REPLACEMENTS:
            text = text.replace(source, target)
        return " ".join(text.split())

    def _location_matches_query(self, query: str, candidates: list[Any]) -> bool:
        normalized_query = self._normalize_phrase(query)
        if not normalized_query:
            return True

        query_tokens = [token for token in normalized_query.split() if len(token) >= 2]
        required_overlap = 1 if len(query_tokens) <= 2 else 2

        for candidate in candidates:
            normalized_candidate = self._normalize_phrase(str(candidate or ""))
            if not normalized_candidate:
                continue
            if normalized_query in normalized_candidate or normalized_candidate in normalized_query:
                return True
            candidate_tokens = [token for token in normalized_candidate.split() if len(token) >= 2]
            overlap = len(set(query_tokens) & set(candidate_tokens))
            if overlap >= required_overlap:
                return True

        return False

    @staticmethod
    def _parse_date(raw_date: str) -> date_cls | None:
        text = str(raw_date or "").strip()
        if not text:
            return None

        for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%d-%m-%Y"):
            try:
                return datetime.strptime(text, fmt).date()
            except ValueError:
                continue

        if len(text) >= 10:
            try:
                return datetime.strptime(text[:10], "%Y-%m-%d").date()
            except ValueError:
                return None
        return None

    @staticmethod
    def _to_int(value: Any) -> int:
        try:
            return int(value)
        except (TypeError, ValueError):
            return 0

    @classmethod
    def _normalize_limit(cls, value: int) -> int:
        if value <= 0:
            return cls._DEFAULT_LOCATION_LIMIT
        if value > cls._MAX_LOCATION_CANDIDATES:
            return cls._MAX_LOCATION_CANDIDATES
        return value

    @staticmethod
    async def _http_get_text(url: str, params: dict[str, Any]) -> str:
        def _fetch() -> str:
            query = urlencode(params)
            with urlopen(f"{url}?{query}") as response:  # noqa: S310
                return response.read().decode("utf-8")

        return await asyncio.to_thread(_fetch)

    async def _http_get_json(self, url: str, params: dict[str, Any]) -> dict[str, Any] | list[Any] | str:
        raw = await self._http_get_text(url, params)
        try:
            return json.loads(raw)
        except json.JSONDecodeError:
            return raw

    def create_tool(self, tool_config: dict[str, Any]) -> StructuredTool:
        name = tool_config["name"]
        description = tool_config["description"]
        grpc_method = tool_config["grpc_method"]
        input_schema = tool_config.get("input_schema", {})

        input_model = _build_input_model(name, input_schema)

        async def _invoke_grpc(**kwargs: Any) -> str:
            if self._is_http_target():
                return await self._invoke_http(grpc_method, **kwargs)
            try:
                channel = self._get_channel()
                method_path = f"/aiagent.AIAgentBackend/{grpc_method}"
                request_bytes = json.dumps(kwargs).encode("utf-8")
                response = await channel.unary_unary(
                    method_path,
                    request_serializer=lambda value: value,
                    response_deserializer=lambda value: value,
                )(request_bytes)
                return response.decode("utf-8") if response else "{}"
            except grpc.aio.AioRpcError as exc:
                logger.error("tool.grpc_error", tool=name, method=grpc_method, error=str(exc))
                return json.dumps({"error": f"gRPC call failed: {exc.code().name}"})
            except Exception as exc:
                logger.error("tool.error", tool=name, error=str(exc))
                return json.dumps({"error": str(exc)})

        return StructuredTool.from_function(
            coroutine=_invoke_grpc,
            name=name,
            description=description,
            args_schema=input_model,
        )

    def create_tools(self, tool_configs: list[dict[str, Any]]) -> list[StructuredTool]:
        tools: list[StructuredTool] = []
        for cfg in tool_configs:
            try:
                tools.append(self.create_tool(cfg))
                logger.debug("tool_factory.created", name=cfg["name"])
            except Exception as exc:
                logger.error("tool_factory.error", name=cfg.get("name"), error=str(exc))
        return tools

    async def close(self) -> None:
        if self._channel:
            await self._channel.close()
            self._channel = None
