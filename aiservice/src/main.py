"""Main entry point — boots FastAPI (HTTP) + gRPC server concurrently.

FastAPI serves:
  - /admin           → HTML admin UI
  - /api/admin/...   → CRUD REST API for tenants, models, tools, workflows
  - /api/v1/chat     → REST chat endpoint (for testing / frontend)
  - /docs            → Swagger UI

gRPC serves:
  - AIAgentService   → Chat, SyncData, HealthCheck (for Go backend)
"""

from __future__ import annotations

from contextlib import asynccontextmanager

import structlog
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.admin.router import api_router, chat_router, ui_router
from src.config import get_settings
from src.db.database import close_db, init_db
from src.engine.task_registry import list_task_types
from src.platform.model_pool import get_model_pool
from src.platform.tenant_registry import get_tenant_registry
from src.vectorstore.qdrant_manager import get_qdrant_manager

logger = structlog.get_logger()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup / shutdown lifecycle."""
    settings = get_settings()
    logger.info("startup.begin")

    # 1. Init admin database (create tables)
    await init_db()
    logger.info("startup.db_ready")

    # 2. Init Qdrant
    try:
        qdrant = get_qdrant_manager()
        await qdrant.init()
        logger.info("startup.qdrant_ready")
    except Exception as e:
        logger.warning("startup.qdrant_failed", error=str(e))

    # 3. Load tenant registry
    registry = get_tenant_registry()
    await registry.load()
    logger.info("startup.registry_ready", tenants=len(registry.list_all()))

    # 4. Pre-warm model pool
    pool = get_model_pool()
    await pool.reload()
    logger.info("startup.model_pool_ready")

    # 5. Auto-discover task types
    task_types = list_task_types()
    logger.info("startup.task_types", types=task_types)

    # 6. Start gRPC server in background
    grpc_server = None
    try:
        from src.grpc_server.server import start_grpc_server

        grpc_server = await start_grpc_server()
        logger.info("startup.grpc_ready", port=settings.grpc_port)
    except Exception as e:
        logger.warning("startup.grpc_failed", error=str(e))

    logger.info("startup.complete", http_port=settings.ai_service_port)

    yield  # ── app is running ──

    # Shutdown
    logger.info("shutdown.begin")
    if grpc_server:
        await grpc_server.stop(grace=5)
    qdrant = get_qdrant_manager()
    await qdrant.close()
    await close_db()
    logger.info("shutdown.complete")


def create_app() -> FastAPI:
    """Create and configure FastAPI application."""
    settings = get_settings()

    app = FastAPI(
        title="DADPT AI Agent Platform",
        description="BPMN-style dynamic multi-tenant AI agent service",
        version="0.1.0",
        docs_url="/docs",
        redoc_url="/redoc",
        lifespan=lifespan,
    )

    # CORS
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Routers
    app.include_router(api_router)
    app.include_router(chat_router)
    app.include_router(ui_router)

    # Health check
    @app.get("/health")
    async def health():
        registry = get_tenant_registry()
        return {
            "status": "healthy",
            "environment": settings.environment,
            "tenants_loaded": len(registry.list_all()),
            "task_types": list_task_types(),
        }

    @app.get("/")
    async def root():
        return {
            "service": "DADPT AI Agent Platform",
            "version": "0.1.0",
            "docs": "/docs",
            "admin": "/admin",
        }

    return app


app = create_app()

if __name__ == "__main__":
    settings = get_settings()
    uvicorn.run(
        "src.main:app",
        host="0.0.0.0",
        port=settings.ai_service_port,
        reload=settings.is_dev,
        log_level=settings.log_level.lower(),
    )
