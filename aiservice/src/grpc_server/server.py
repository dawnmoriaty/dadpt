"""gRPC async server for AI agent chat."""

from __future__ import annotations

import json
from typing import Any

import grpc
import structlog

from src.config import get_settings
from src.engine.presentation import ResponseFormatter
from src.engine.supervisor import Supervisor
from src.engine.task_registry import list_task_types
from src.engine.workflow_context import WorkflowContext
from src.engine.metrics_helper import build_metrics, record_observability
from src.grpc_server.session_store import build_session_key, get_or_create_context, save_session
from src.grpc_server.voice_service import VoiceBookingServicer
from src.observability.metrics_store import get_metrics_store
from src.platform.model_pool import get_model_pool
from src.platform.tenant_registry import get_tenant_registry
from src.platform.tool_factory import ToolFactory
from src.vectorstore.data_sync import DataSyncPipeline
from src.vectorstore.qdrant_manager import get_qdrant_manager

logger = structlog.get_logger()

formatter = ResponseFormatter()


def _qdrant_enabled() -> bool:
    import os

    return os.getenv("ENABLE_QDRANT", "false").strip().lower() in {"1", "true", "yes", "on"}


class AIAgentServicer:
    async def Chat(self, request: Any, context: grpc.aio.ServicerContext) -> Any:
        tenant_slug = _get_field(request, "tenant_slug", "")
        raw_session_id = _get_field(request, "session_id", "")
        message = _get_field(request, "message", "")
        user_id = _get_field(request, "user_id", "")
        session_id = build_session_key(tenant_slug, user_id, raw_session_id)

        logger.info(
            "grpc.chat",
            tenant=tenant_slug,
            session=session_id[:8],
            message_len=len(message),
        )

        registry = get_tenant_registry()
        tenant = registry.get(tenant_slug)
        if tenant is None:
            return formatter.format(
                WorkflowContext(session_id=session_id, tenant_slug=tenant_slug),
                session_id=session_id,
                metrics={},
            ) | {"message": f"Tenant '{tenant_slug}' not found", "status": "error"}

        ctx = get_or_create_context(session_id, tenant_slug, message)
        supervisor = Supervisor(
            tenant=tenant,
            model_pool=get_model_pool(),
            tool_factory=ToolFactory(tenant.grpc_target),
            qdrant_manager=get_qdrant_manager() if _qdrant_enabled() else None,
        )

        ctx = await supervisor.handle(ctx)
        save_session(session_id, ctx)

        metrics = build_metrics(ctx)
        record_observability(ctx, metrics)
        return formatter.format(ctx, session_id=session_id, metrics=metrics)

    async def SyncData(self, request: Any, context: grpc.aio.ServicerContext) -> Any:
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
        except json.JSONDecodeError as exc:
            return {"upserted_count": 0, "message": f"Invalid JSON: {exc}"}

        if not _qdrant_enabled():
            return {"upserted_count": 0, "message": "Qdrant disabled"}

        pipeline = DataSyncPipeline(get_qdrant_manager())
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
        registry = get_tenant_registry()
        return {
            "status": "healthy",
            "tenants_loaded": len(registry.list_all()),
            "available_task_types": list_task_types(),
        }


def _get_field(obj: Any, name: str, default: Any = "") -> Any:
    if isinstance(obj, dict):
        return obj.get(name, default)
    return getattr(obj, name, default)


class _GenericHandler(grpc.GenericRpcHandler):
    SERVICE_NAME = "aiagent.AIAgentService"

    def __init__(self, servicer: AIAgentServicer) -> None:
        self._methods: dict[str, Any] = {
            "Chat": servicer.Chat,
            "SyncData": servicer.SyncData,
            "HealthCheck": servicer.HealthCheck,
        }

    def service(self, handler_call_details: grpc.HandlerCallDetails):
        method = handler_call_details.method
        if not method:
            return None

        parts = method.split("/")
        if len(parts) < 3:
            return None

        handler_fn = self._methods.get(parts[-1])
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

        handler_fn = self._methods.get(parts[-1])
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


async def start_grpc_server() -> grpc.aio.Server:
    settings = get_settings()
    server = grpc.aio.server()

    servicer = AIAgentServicer()
    voice_servicer = VoiceBookingServicer()

    try:
        from src.grpc_server.generated import ai_agent_pb2_grpc

        ai_agent_pb2_grpc.add_AIAgentServiceServicer_to_server(servicer, server)
        server.add_generic_rpc_handlers([_VoiceGenericHandler(voice_servicer)])
        logger.info("grpc.using_compiled_proto")
    except (ImportError, Exception):
        server.add_generic_rpc_handlers([
            _GenericHandler(servicer),
            _VoiceGenericHandler(voice_servicer),
        ])
        logger.info("grpc.using_generic_json_handler")

    listen_addr = f"0.0.0.0:{settings.grpc_port}"
    server.add_insecure_port(listen_addr)
    await server.start()
    logger.info("grpc.started", address=listen_addr)
    return server
