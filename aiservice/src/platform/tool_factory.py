"""Tool Factory — dynamically creates LangChain StructuredTools from DB rows.

Each tool_definition row → one LangChain tool that calls a gRPC method.
Zero code per tool — everything from database config.
"""

from __future__ import annotations

from typing import Any

import aiohttp
import grpc
import json
import structlog
from langchain_core.tools import StructuredTool
from pydantic import create_model


logger = structlog.get_logger()

# Maps JSON schema type strings to Python types
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
    """Dynamically create a Pydantic model from the tool's input_schema JSON.

    input_schema example: {"origin": "string", "destination": "string", "date": "string"}
    """
    fields = {}
    for field_name, field_type_str in input_schema.items():
        py_type = _TYPE_MAP.get(field_type_str, str)
        fields[field_name] = (py_type, ...)  # all required for now
    return create_model(f"{tool_name}_Input", **fields)


class ToolFactory:
    """Creates LangChain tools from tool_definition configs."""

    def __init__(self, grpc_target: str) -> None:
        self._grpc_target = grpc_target
        self._channel: grpc.aio.Channel | None = None

    def _is_http_target(self) -> bool:
        return self._grpc_target.startswith("http://") or self._grpc_target.startswith(
            "https://"
        )

    def _get_channel(self) -> grpc.aio.Channel:
        if self._channel is None:
            self._channel = grpc.aio.insecure_channel(self._grpc_target)
        return self._channel


    async def _invoke_http(self, grpc_method: str, **kwargs: Any) -> str:
        if grpc_method == "SearchTrips":
            return await self._search_trips_http(**kwargs)
        if grpc_method == "GetLocations":
            return await self._get_locations_http(**kwargs)
        return '{"error": "HTTP fallback not implemented"}'

    async def _search_trips_http(self, **kwargs: Any) -> str:
        origin = str(kwargs.get("origin", "")).strip()
        destination = str(kwargs.get("destination", "")).strip()
        date = str(kwargs.get("date", "")).strip()
        passengers = int(kwargs.get("passengers", 1) or 1)

        if not origin or not destination or not date:
            return '{"error": "Missing origin/destination/date"}'

        async with aiohttp.ClientSession() as session:
            origin_id = await self._resolve_location_id(session, origin)
            destination_id = await self._resolve_location_id(session, destination)
            if not origin_id or not destination_id:
                return '{"trips": [], "total": 0}'

            params = {
                "originId": origin_id,
                "destinationId": destination_id,
                "departureDate": date,
                "minSeats": passengers,
            }
            async with session.get(f"{self._grpc_target}/api/v1/trips", params=params) as resp:
                try:
                    raw = await resp.json()
                except Exception:
                    return await resp.text()
                if isinstance(raw, dict):
                    data = raw.get("data", {})
                    items = data.get("items", []) if isinstance(data, dict) else []
                    total = data.get("total", len(items)) if isinstance(data, dict) else len(items)
                    return json.dumps({"trips": items, "total": total})
                return json.dumps({"trips": [], "total": 0})

    async def _get_locations_http(self, **kwargs: Any) -> str:
        query = str(kwargs.get("query", "")).strip()
        if not query:
            return '{"locations": []}'
        params = {"q": query}
        async with aiohttp.ClientSession() as session:
            async with session.get(
                f"{self._grpc_target}/api/v1/locations/search", params=params
            ) as resp:
                payload = await resp.text()
                return payload

    async def _resolve_location_id(self, session: aiohttp.ClientSession, query: str) -> int | None:
        params = {"q": query}
        async with session.get(f"{self._grpc_target}/api/v1/locations/search", params=params) as resp:
            try:
                data = await resp.json()
            except Exception:
                return None
        items = data.get("data", []) if isinstance(data, dict) else []
        if not items:
            return None
        return items[0].get("id")

    def create_tool(self, tool_config: dict[str, Any]) -> StructuredTool:
        """Convert a tool_definition dict → LangChain StructuredTool.

        The tool will call the specified gRPC method when invoked by the LLM.
        """
        name = tool_config["name"]
        description = tool_config["description"]
        grpc_method = tool_config["grpc_method"]
        input_schema = tool_config.get("input_schema", {})

        input_model = _build_input_model(name, input_schema)

        # Build the async callable that invokes gRPC
        async def _invoke_grpc(**kwargs: Any) -> str:
            """Call the backend gRPC method with the given arguments."""
            if self._is_http_target():
                return await self._invoke_http(grpc_method, **kwargs)
            try:
                channel = self._get_channel()
                # Use generic unary-unary call via channel
                # The gRPC method path format: /package.Service/Method
                method_path = f"/aiagent.AIAgentBackend/{grpc_method}"
                import json

                # Serialize request as JSON bytes (proto-JSON transcoding)
                request_bytes = json.dumps(kwargs).encode("utf-8")

                # Make unary-unary call
                response = await channel.unary_unary(
                    method_path,
                    request_serializer=lambda x: x,
                    response_deserializer=lambda x: x,
                )(request_bytes)

                return response.decode("utf-8") if response else "{}"
            except grpc.aio.AioRpcError as e:
                logger.error("tool.grpc_error", tool=name, method=grpc_method, error=str(e))
                return f'{{"error": "gRPC call failed: {e.code().name}"}}'
            except Exception as e:
                logger.error("tool.error", tool=name, error=str(e))
                return f'{{"error": "{str(e)}"}}'

        return StructuredTool.from_function(
            coroutine=_invoke_grpc,
            name=name,
            description=description,
            args_schema=input_model,
        )


    def create_tools(self, tool_configs: list[dict[str, Any]]) -> list[StructuredTool]:
        """Batch create tools from a list of tool_definition dicts."""
        tools = []
        for cfg in tool_configs:
            try:
                tools.append(self.create_tool(cfg))
                logger.debug("tool_factory.created", name=cfg["name"])
            except Exception as e:
                logger.error("tool_factory.error", name=cfg.get("name"), error=str(e))
        return tools

    async def close(self) -> None:
        if self._channel:
            await self._channel.close()
            self._channel = None
