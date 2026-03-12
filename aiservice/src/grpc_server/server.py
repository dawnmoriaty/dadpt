"""gRPC Async Server — implements AIAgentService.

Runs alongside FastAPI on a separate port using grpcio-aio.
Handles: Chat, SyncData, HealthCheck.
"""

from __future__ import annotations

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
from src.platform.model_pool import get_model_pool
from src.platform.tenant_registry import get_tenant_registry
from src.platform.tool_factory import ToolFactory
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

        return _make_chat_response(
            message=ctx.response,
            status=ctx.status,
            session_id=session_id,
            workflow_slug=ctx.workflow_slug or "",
            tool_calls=tool_calls,
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
) -> dict:
    """Build a ChatResponse dict (serializable to proto)."""
    return {
        "message": message,
        "status": status,
        "session_id": session_id,
        "workflow_slug": workflow_slug,
        "tool_calls": tool_calls or [],
    }


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


# ── Server startup ──────────────────────────────────────────────────────────

async def start_grpc_server() -> grpc.aio.Server:
    """Start the gRPC async server."""
    settings = get_settings()
    server = grpc.aio.server()

    servicer = AIAgentServicer()

    try:
        # Try compiled proto stubs first (best performance)
        from src.grpc_server.generated import ai_agent_pb2_grpc

        ai_agent_pb2_grpc.add_AIAgentServiceServicer_to_server(servicer, server)
        logger.info("grpc.using_compiled_proto")
    except (ImportError, Exception):
        # Fallback: JSON-based generic handler (works without protoc)
        server.add_generic_rpc_handlers([_GenericHandler(servicer)])
        logger.info("grpc.using_generic_json_handler")

    listen_addr = f"[::]:{settings.grpc_port}"
    server.add_insecure_port(listen_addr)
    await server.start()
    logger.info("grpc.started", address=listen_addr)

    return server
