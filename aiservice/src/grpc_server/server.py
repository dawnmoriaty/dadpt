"""gRPC Async Server — implements AIAgentService.

Runs alongside FastAPI on a separate port using grpcio-aio.
Handles: Chat, SyncData, HealthCheck.
"""

from __future__ import annotations

import ast
import json
import time
import uuid
from typing import Any

import grpc
import structlog


from src.config import get_settings
from src.engine.supervisor import Supervisor
from src.engine.task_registry import list_task_types
from src.engine.workflow_context import WorkflowContext
from src.grpc_server.voice_service import VoiceBookingServicer
from src.platform.model_pool import get_model_pool
from src.platform.tenant_registry import get_tenant_registry
from src.platform.tool_factory import ToolFactory
from src.observability.metrics_store import get_metrics_store
from src.vectorstore.data_sync import DataSyncPipeline
from src.vectorstore.qdrant_manager import get_qdrant_manager

logger = structlog.get_logger()

# ── Session store (Redis in production, in-memory for MVP) ──────────────────
SESSION_TTL_SECONDS = 60 * 30
_sessions: dict[str, dict[str, Any]] = {}



class AIAgentServicer:
    """Implements the AIAgentService gRPC interface.

    Since proto generated code may not be available yet, we implement
    this as a generic servicer that registers manually.
    """

    async def Chat(self, request: Any, context: grpc.aio.ServicerContext) -> Any:
        """Handle a chat message — route through supervisor."""
        # Extract fields from request (works with both proto objects and dicts)
        tenant_slug = _get_field(request, "tenant_slug", "")
        raw_session_id = _get_field(request, "session_id", "")
        message = _get_field(request, "message", "")
        user_id = _get_field(request, "user_id", "")
        session_id = _build_session_key(tenant_slug, user_id, raw_session_id)


        logger.info(
            "grpc.chat",
            tenant=tenant_slug,
            session=session_id[:8],
            message_len=len(message),
        )

        # Validate tenant
        registry = get_tenant_registry()
        tenant = registry.get(tenant_slug)
        if tenant is None:
            return _make_chat_response(
                message=f"Tenant '{tenant_slug}' not found",
                status="error",
                session_id=session_id,
            )

        # Build or resume context
        ctx = _get_or_create_context(session_id, tenant_slug, message)

        # Build supervisor
        model_pool = get_model_pool()
        tool_factory = ToolFactory(tenant.grpc_target)
        qdrant = get_qdrant_manager()

        supervisor = Supervisor(
            tenant=tenant,
            model_pool=model_pool,
            tool_factory=tool_factory,
            qdrant_manager=qdrant,
        )

        # Execute
        ctx = await supervisor.handle(ctx)

        # Save session state for multi-turn
        _save_session(session_id, ctx)


        # Build tool call logs
        tool_calls = []
        for tc in ctx.tool_calls_log:
            tool_calls.append({
                "tool_name": tc.get("tool", ""),
                "inputs": json.dumps(tc.get("inputs", {})),
                "output": tc.get("output", "")[:500],
                "timestamp": tc.get("timestamp", ""),
            })

        ui_actions = _build_ui_actions(ctx)
        metrics = _build_metrics(ctx)
        _record_observability(ctx, metrics)

        return _make_chat_response(
            message=ctx.response,
            status=ctx.status,
            session_id=session_id,
            workflow_slug=ctx.workflow_slug or "",
            tool_calls=tool_calls,
            ui_actions=ui_actions,
            trace_id=ctx.trace_id,
            metrics=metrics,
        )

    async def SyncData(self, request: Any, context: grpc.aio.ServicerContext) -> Any:
        """Sync data from backend into Qdrant."""
        tenant_slug = _get_field(request, "tenant_slug", "")
        collection = _get_field(request, "collection", "")
        data_json = _get_field(request, "data_json", "[]")

        logger.info("grpc.sync_data", tenant=tenant_slug, collection=collection)

        registry = get_tenant_registry()
        tenant = registry.get(tenant_slug)
        if tenant is None:
            return {"upserted_count": 0, "message": f"Tenant '{tenant_slug}' not found"}

        try:
            data = json.loads(data_json)
        except json.JSONDecodeError as e:
            return {"upserted_count": 0, "message": f"Invalid JSON: {e}"}

        qdrant = get_qdrant_manager()
        pipeline = DataSyncPipeline(qdrant)

        count = 0
        prefix = tenant.qdrant_prefix

        if collection == "trips":
            count = await pipeline.sync_trips(prefix, data)
        elif collection == "locations":
            count = await pipeline.sync_locations(prefix, data)
        elif collection == "faq":
            count = await pipeline.sync_faq(prefix, data)
        else:
            count = await pipeline.sync_generic(f"{prefix}_{collection}", data)

        return {"upserted_count": count, "message": f"Synced {count} documents"}

    async def HealthCheck(self, request: Any, context: grpc.aio.ServicerContext) -> Any:
        """Health check."""
        registry = get_tenant_registry()
        return {
            "status": "healthy",
            "tenants_loaded": len(registry.list_all()),
            "available_task_types": list_task_types(),
        }


# ── Helpers ─────────────────────────────────────────────────────────────────

def _get_field(obj: Any, name: str, default: Any = "") -> Any:
    """Get field from proto object or dict."""
    if isinstance(obj, dict):
        return obj.get(name, default)
    return getattr(obj, name, default)


def _build_session_key(tenant_slug: str, user_id: str, session_id: str) -> str:
    if user_id:
        return f"{tenant_slug}:{user_id}"
    if session_id:
        return session_id
    return str(uuid.uuid4())


def _get_session_data(session_key: str) -> dict[str, Any] | None:
    record = _sessions.get(session_key)
    if not record:
        return None
    updated_at = record.get("updated_at", 0)
    if updated_at and time.time() - updated_at > SESSION_TTL_SECONDS:
        _sessions.pop(session_key, None)
        return None
    return record.get("data")


def _save_session(session_key: str, ctx: WorkflowContext) -> None:
    _sessions[session_key] = {
        "data": ctx.to_dict(),
        "updated_at": time.time(),
    }



def _get_or_create_context(
    session_id: str, tenant_slug: str, message: str
) -> WorkflowContext:
    """Get existing context (for resume) or create new one."""
    existing = _get_session_data(session_id)

    if existing and existing.get("status") == "paused":
        # Resume paused workflow
        ctx = WorkflowContext.from_dict(existing)
        ctx.user_message = message
        ctx.status = "resuming"
        ctx.add_message("user", message)
        return ctx

    # New context
    ctx = WorkflowContext(
        session_id=session_id,
        tenant_slug=tenant_slug,
        user_message=message,
    )
    ctx.add_message("user", message)

    # Carry forward conversation history if session exists
    if existing:
        ctx.messages = existing.get("messages", [])[-20:]  # keep last 20
        ctx.add_message("user", message)

    return ctx



def _make_chat_response(
    message: str,
    status: str,
    session_id: str,
    workflow_slug: str = "",
    tool_calls: list[dict] | None = None,
    ui_actions: list[dict] | None = None,
    trace_id: str = "",
    metrics: dict[str, Any] | None = None,
) -> dict:
    """Build a ChatResponse dict (serializable to proto)."""
    return {
        "message": message,
        "status": status,
        "session_id": session_id,
        "workflow_slug": workflow_slug,
        "tool_calls": tool_calls or [],
        "ui_actions": ui_actions or [],
        "trace_id": trace_id,
        "metrics": metrics or {},
    }


def _build_ui_actions(ctx: WorkflowContext) -> list[dict[str, Any]]:
    """Build UI actions from workflow outputs for frontend rendering."""
    trips = _extract_trip_items(ctx)
    if not trips:
        return []

    meta = _extract_search_meta(ctx)
    items = [_map_trip_action_item(item, meta) for item in trips]
    items = [item for item in items if item is not None]

    if not items:
        return []

    tags_by_trip = _build_trip_tags(ctx, items)
    explain_by_trip = _build_score_explain(items)
    for item in items:
        trip_id = _to_int(item.get("trip_id"))
        item["tags"] = tags_by_trip.get(trip_id, [])
        item["score_explain"] = explain_by_trip.get(trip_id, {})

    actions: list[dict[str, Any]] = [
        {
            "type": "trip_recommendations",
            "title": "Chuyen xe goi y",
            "items": items,
            "meta": meta,
        }
    ]

    related_items = _extract_related_items(ctx, meta)
    if related_items:
        related_tags = _build_trip_tags(ctx, related_items)
        related_explain = _build_score_explain(related_items)
        for item in related_items:
            trip_id = _to_int(item.get("trip_id"))
            item["tags"] = related_tags.get(trip_id, [])
            item["score_explain"] = related_explain.get(trip_id, {})
        actions.append(
            {
                "type": "related_trip_recommendations",
                "title": "Chuyen lien quan",
                "items": related_items,
                "meta": meta,
            }
        )

    return actions


def _build_metrics(ctx: WorkflowContext) -> dict[str, Any]:
    task_timings = ctx.task_timings or []
    total_latency = ctx.get_var("_total_latency_ms", 0.0)
    tool_count = len(ctx.tool_calls_log or [])
    task_count = len(task_timings)
    slowest = max(task_timings, key=lambda item: float(item.get("elapsed_ms", 0.0)), default=None)

    return {
        "trace_id": ctx.trace_id,
        "total_latency_ms": total_latency,
        "task_count": task_count,
        "tool_count": tool_count,
        "policy_used": ctx.get_var("policy_used", {}),
        "rag_metrics": ctx.get_var("rag_metrics", {}),
        "slowest_task": slowest,
        "task_timings": task_timings,
    }


def _record_observability(ctx: WorkflowContext, metrics: dict[str, Any]) -> None:
    store = get_metrics_store()
    store.record_chat(
        {
            "trace_id": ctx.trace_id,
            "tenant_slug": ctx.tenant_slug,
            "workflow_slug": ctx.workflow_slug or "",
            "status": ctx.status,
            "total_latency_ms": metrics.get("total_latency_ms", 0.0),
        }
    )

    for item in ctx.task_timings or []:
        node = str(item.get("node", ""))
        task_type = str(item.get("task_type", ""))
        model = ""
        tool = ""

        if task_type == "llm_call":
            model = str(ctx.get_var("_resolved_model", "") or "")
        if task_type == "grpc_call":
            for tool_call in reversed(ctx.tool_calls_log):
                tool = str(tool_call.get("tool", "") or "")
                if tool:
                    break

        store.record_task(
            {
                "trace_id": ctx.trace_id,
                "tenant_slug": ctx.tenant_slug,
                "workflow_slug": ctx.workflow_slug or "",
                "node": node,
                "task_type": task_type,
                "elapsed_ms": float(item.get("elapsed_ms", 0.0) or 0.0),
                "status": str(item.get("status", "")),
                "model": model,
                "tool": tool,
            }
        )


def _extract_search_meta(ctx: WorkflowContext) -> dict[str, Any]:
    base = {
        "origin": "",
        "destination": "",
        "date": "",
        "passengers": 1,
    }

    search_call = None
    for tool_call in reversed(ctx.tool_calls_log):
        if tool_call.get("tool") == "search_trips":
            search_call = tool_call
            break

    if not search_call:
        return base

    inputs = search_call.get("inputs", {})
    if not isinstance(inputs, dict):
        return base

    base["origin"] = str(inputs.get("origin", "") or "")
    base["destination"] = str(inputs.get("destination", "") or "")
    base["date"] = str(inputs.get("date", "") or "")

    try:
        passengers = int(inputs.get("passengers", 1))
        base["passengers"] = max(1, passengers)
    except (TypeError, ValueError):
        base["passengers"] = 1

    return base


def _extract_trip_items(ctx: WorkflowContext) -> list[dict[str, Any]]:
    for key in ("top_trips", "search_results", "trips"):
        raw_value = ctx.get_var(key)
        items = _trip_list_from_value(raw_value)
        if items:
            return items[:5]

    for tool_call in reversed(ctx.tool_calls_log):
        if tool_call.get("tool") != "search_trips":
            continue
        output = tool_call.get("output")
        items = _trip_list_from_value(output)
        if items:
            return items[:5]

    return []


def _extract_related_items(ctx: WorkflowContext, meta: dict[str, Any]) -> list[dict[str, Any]]:
    raw = ctx.get_var("related_trips")
    trips = _trip_list_from_value(raw)
    if not trips:
        return []

    items = [_map_trip_action_item(item, meta) for item in trips]
    items = [item for item in items if item is not None]
    return items[:3]


def _build_trip_tags(ctx: WorkflowContext, items: list[dict[str, Any]]) -> dict[int, list[str]]:
    if not items:
        return {}

    prices = [float(item.get("price", 0.0) or 0.0) for item in items if float(item.get("price", 0.0) or 0.0) > 0]
    earliest_departure = None
    if items:
        departures = [item.get("departure_time", "") for item in items if isinstance(item.get("departure_time"), str)]
        departures = [d for d in departures if d]
        if departures:
            earliest_departure = min(departures)

    tags: dict[int, list[str]] = {}
    min_price = min(prices) if prices else None

    for item in items:
        item_tags: list[str] = []
        trip_id = _to_int(item.get("trip_id"))
        price = _to_float(item.get("price"))
        dep = str(item.get("departure_time", "") or "")

        if min_price is not None and price > 0 and abs(price - min_price) < 0.01:
            item_tags.append("best_price")
        if earliest_departure and dep and dep == earliest_departure:
            item_tags.append("faster")
        if price >= 300000:
            item_tags.append("premium")

        if item_tags:
            tags[trip_id] = item_tags

    return tags


def _build_score_explain(items: list[dict[str, Any]]) -> dict[int, dict[str, Any]]:
    if not items:
        return {}

    prices = [
        _to_float(item.get("price"))
        for item in items
        if _to_float(item.get("price")) > 0
    ]
    min_price = min(prices) if prices else None

    departures = [
        str(item.get("departure_time", "") or "")
        for item in items
        if str(item.get("departure_time", "") or "")
    ]
    earliest_dep = min(departures) if departures else ""

    explain: dict[int, dict[str, Any]] = {}
    for item in items:
        trip_id = _to_int(item.get("trip_id"))
        if trip_id <= 0:
            continue

        reasons: list[str] = []
        price = _to_float(item.get("price"))
        if min_price is not None and price > 0 and abs(price - min_price) < 0.01:
            reasons.append("Gia thap nhat")

        dep = str(item.get("departure_time", "") or "")
        if earliest_dep and dep == earliest_dep:
            reasons.append("Khoi hanh som")

        seats = _to_int(item.get("available_seats"))
        if seats >= 25:
            reasons.append("Con nhieu ghe")

        explain[trip_id] = {
            "reasons": reasons,
            "price": price,
            "available_seats": seats,
        }

    return explain


def _trip_list_from_value(raw_value: Any) -> list[dict[str, Any]]:
    if raw_value is None:
        return []

    if isinstance(raw_value, str):
        raw_value = raw_value.strip()
        if not raw_value:
            return []
        try:
            raw_value = json.loads(raw_value)
        except json.JSONDecodeError:
            try:
                raw_value = ast.literal_eval(raw_value)
            except (ValueError, SyntaxError):
                return []

    if isinstance(raw_value, list):
        return [item for item in raw_value if isinstance(item, dict)]

    if not isinstance(raw_value, dict):
        return []

    for key in ("trips", "items", "results", "data"):
        value = raw_value.get(key)
        if isinstance(value, list):
            return [item for item in value if isinstance(item, dict)]
        if isinstance(value, dict):
            nested = _trip_list_from_value(value)
            if nested:
                return nested

    return []


def _map_trip_action_item(raw_trip: dict[str, Any], meta: dict[str, Any]) -> dict[str, Any] | None:
    trip_id = _to_int(raw_trip.get("id"))
    if trip_id <= 0:
        return None

    passengers = meta.get("passengers", 1)
    if not isinstance(passengers, int) or passengers <= 0:
        passengers = 1

    return {
        "trip_id": trip_id,
        "provider_name": _first_str(raw_trip, "provider_name", "providerName"),
        "origin_name": _first_str(raw_trip, "origin_name", "originName"),
        "destination_name": _first_str(raw_trip, "destination_name", "destinationName"),
        "departure_time": _first_str(raw_trip, "departure_time", "departureTime"),
        "arrival_time": _first_str(raw_trip, "arrival_time", "arrivalTime"),
        "price": _to_float(_first_value(raw_trip, "final_price", "finalPrice", "base_price", "basePrice")),
        "available_seats": _to_int(_first_value(raw_trip, "available_seats", "availableSeats")),
        "status": _first_str(raw_trip, "status"),
        "book_now": {
            "trip_id": trip_id,
            "passengers": passengers,
            "payment_method": "cod",
        },
        "detail_url": f"/trips/{trip_id}",
    }


def _first_value(data: dict[str, Any], *keys: str) -> Any:
    for key in keys:
        if key in data and data[key] is not None:
            return data[key]
    return None


def _first_str(data: dict[str, Any], *keys: str) -> str:
    value = _first_value(data, *keys)
    if value is None:
        return ""
    return str(value)


def _to_int(value: Any) -> int:
    try:
        return int(value)
    except (TypeError, ValueError):
        return 0


def _to_float(value: Any) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return 0.0


# ── Generic gRPC handler (works without compiled proto stubs) ───────────────

class _GenericHandler(grpc.GenericRpcHandler):
    """Routes /aiagent.AIAgentService/<Method> to the servicer using JSON."""

    SERVICE_NAME = "aiagent.AIAgentService"

    def __init__(self, servicer: AIAgentServicer) -> None:
        self._servicer = servicer
        self._methods: dict[str, Any] = {
            "Chat": servicer.Chat,
            "SyncData": servicer.SyncData,
            "HealthCheck": servicer.HealthCheck,
        }

    def service(self, handler_call_details: grpc.HandlerCallDetails):
        method = handler_call_details.method  # e.g. "/aiagent.AIAgentService/Chat"
        if not method:
            return None
        parts = method.split("/")
        if len(parts) < 3:
            return None
        method_name = parts[-1]
        handler_fn = self._methods.get(method_name)
        if handler_fn is None:
            return None

        async def _handle(request_bytes: bytes, context: grpc.aio.ServicerContext) -> bytes:
            request = json.loads(request_bytes) if request_bytes else {}
            result = await handler_fn(request, context)
            return json.dumps(result).encode("utf-8")

        return grpc.unary_unary_rpc_method_handler(
            _handle,
            request_deserializer=lambda x: x,
            response_serializer=lambda x: x,
        )


class _VoiceGenericHandler(grpc.GenericRpcHandler):
    """Routes /aiagent.VoiceBookingService/<Method> using JSON payloads."""

    SERVICE_NAME = "aiagent.VoiceBookingService"

    def __init__(self, servicer: VoiceBookingServicer) -> None:
        self._methods: dict[str, Any] = {
            "ParseCommand": servicer.ParseCommand,
            "TranscribeAudio": servicer.TranscribeAudio,
            "HealthCheck": servicer.HealthCheck,
        }

    def service(self, handler_call_details: grpc.HandlerCallDetails):
        method = handler_call_details.method
        if not method:
            return None
        parts = method.split("/")
        if len(parts) < 3:
            return None
        method_name = parts[-1]
        handler_fn = self._methods.get(method_name)
        if handler_fn is None:
            return None

        async def _handle(request_bytes: bytes, context: grpc.aio.ServicerContext) -> bytes:
            request = json.loads(request_bytes) if request_bytes else {}
            result = await handler_fn(request, context)
            return json.dumps(result).encode("utf-8")

        return grpc.unary_unary_rpc_method_handler(
            _handle,
            request_deserializer=lambda x: x,
            response_serializer=lambda x: x,
        )


# ── Server startup ──────────────────────────────────────────────────────────

async def start_grpc_server() -> grpc.aio.Server:
    """Start the gRPC async server."""
    settings = get_settings()
    server = grpc.aio.server()

    servicer = AIAgentServicer()
    voice_servicer = VoiceBookingServicer()

    try:
        # Try compiled proto stubs first (best performance)
        from src.grpc_server.generated import ai_agent_pb2_grpc

        ai_agent_pb2_grpc.add_AIAgentServiceServicer_to_server(servicer, server)
        # Voice service currently uses generic JSON fallback until proto stubs are generated.
        server.add_generic_rpc_handlers([_VoiceGenericHandler(voice_servicer)])
        logger.info("grpc.using_compiled_proto")
    except (ImportError, Exception):
        # Fallback: JSON-based generic handler (works without protoc)
        server.add_generic_rpc_handlers([
            _GenericHandler(servicer),
            _VoiceGenericHandler(voice_servicer),
        ])
        logger.info("grpc.using_generic_json_handler")

    # Use IPv4 bind for broader compatibility in Docker/Windows environments.
    listen_addr = f"0.0.0.0:{settings.grpc_port}"
    server.add_insecure_port(listen_addr)
    await server.start()
    logger.info("grpc.started", address=listen_addr)

    return server
