"""Admin API Router — CRUD for providers, tenants, models, tools, workflows, agents, skills.

Also serves HTML admin UI via Jinja2 templates and a REST chat endpoint for testing.
"""

from __future__ import annotations

import json
import uuid
from pathlib import Path
from typing import Any

import structlog
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.admin.schemas import (
    AgentCreate,
    AgentOut,
    AgentUpdate,
    ChatInput,
    ChatOutput,
    ModelInstanceCreate,
    ModelInstanceOut,
    ModelInstanceUpdate,
    ProviderCreate,
    ProviderOut,
    ProviderUpdate,
    SkillCreate,
    SkillOut,
    SkillUpdate,
    TenantCreate,
    TenantOut,
    TenantUpdate,
    ToolCreate,
    ToolOut,
    ToolUpdate,
    WorkflowCreate,
    WorkflowOut,
    WorkflowUpdate,
)
from src.db.database import get_session
from src.db.models import (
    AgentDefinition,
    ModelInstance,
    ModelProvider,
    SkillDefinition,
    Tenant,
    ToolDefinition,
    Workflow,
)
from src.engine.supervisor import Supervisor
from src.engine.task_registry import list_task_types
from src.engine.workflow_context import WorkflowContext
from src.engine.workflow_schema import WorkflowDefinitionSchema
from src.platform.model_pool import get_model_pool
from src.platform.tenant_registry import get_tenant_registry
from src.platform.tool_factory import ToolFactory
from src.vectorstore.qdrant_manager import get_qdrant_manager

logger = structlog.get_logger()

# Templates
_template_dir = Path(__file__).parent / "templates"
templates = Jinja2Templates(directory=str(_template_dir))

# ═════════════════════════════════════════════════════════════════════════════
# API Router
# ═════════════════════════════════════════════════════════════════════════════

api_router = APIRouter(prefix="/api/admin", tags=["admin"])
ui_router = APIRouter(tags=["admin-ui"])


# ── Providers ───────────────────────────────────────────────────────────────

@api_router.get("/providers", response_model=list[ProviderOut])
async def list_providers(session: AsyncSession = Depends(get_session)):
    result = await session.execute(select(ModelProvider))
    return result.scalars().all()


@api_router.post("/providers", response_model=ProviderOut)
async def create_provider(data: ProviderCreate, session: AsyncSession = Depends(get_session)):
    provider = ModelProvider(**data.model_dump())
    session.add(provider)
    await session.commit()
    await session.refresh(provider)
    return provider


@api_router.put("/providers/{provider_id}", response_model=ProviderOut)
async def update_provider(
    provider_id: int, data: ProviderUpdate, session: AsyncSession = Depends(get_session)
):
    provider = await session.get(ModelProvider, provider_id)
    if not provider:
        raise HTTPException(404, "Provider not found")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(provider, k, v)
    await session.commit()
    await session.refresh(provider)
    return provider


@api_router.delete("/providers/{provider_id}")
async def delete_provider(provider_id: int, session: AsyncSession = Depends(get_session)):
    provider = await session.get(ModelProvider, provider_id)
    if not provider:
        raise HTTPException(404, "Provider not found")
    await session.delete(provider)
    await session.commit()
    return {"message": "Deleted"}


# ── Tenants ─────────────────────────────────────────────────────────────────

@api_router.get("/tenants", response_model=list[TenantOut])
async def list_tenants(session: AsyncSession = Depends(get_session)):
    result = await session.execute(select(Tenant))
    return result.scalars().all()


@api_router.post("/tenants", response_model=TenantOut)
async def create_tenant(data: TenantCreate, session: AsyncSession = Depends(get_session)):
    tenant = Tenant(**data.model_dump())
    session.add(tenant)
    await session.commit()
    await session.refresh(tenant)
    # Create default Qdrant collections
    qdrant = get_qdrant_manager()
    await qdrant.ensure_tenant_collections(tenant.qdrant_prefix)
    # Reload registry
    await get_tenant_registry().reload()
    return tenant


@api_router.put("/tenants/{tenant_id}", response_model=TenantOut)
async def update_tenant(
    tenant_id: int, data: TenantUpdate, session: AsyncSession = Depends(get_session)
):
    tenant = await session.get(Tenant, tenant_id)
    if not tenant:
        raise HTTPException(404, "Tenant not found")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(tenant, k, v)
    await session.commit()
    await session.refresh(tenant)
    await get_tenant_registry().reload()
    return tenant


@api_router.delete("/tenants/{tenant_id}")
async def delete_tenant(tenant_id: int, session: AsyncSession = Depends(get_session)):
    tenant = await session.get(Tenant, tenant_id)
    if not tenant:
        raise HTTPException(404, "Tenant not found")
    await session.delete(tenant)
    await session.commit()
    await get_tenant_registry().reload()
    return {"message": "Deleted"}


# ── Model Instances (per tenant) ───────────────────────────────────────────

@api_router.get("/tenants/{tenant_id}/models", response_model=list[ModelInstanceOut])
async def list_models(tenant_id: int, session: AsyncSession = Depends(get_session)):
    result = await session.execute(
        select(ModelInstance).where(ModelInstance.tenant_id == tenant_id)
    )
    return result.scalars().all()


@api_router.post("/tenants/{tenant_id}/models", response_model=ModelInstanceOut)
async def create_model(
    tenant_id: int, data: ModelInstanceCreate, session: AsyncSession = Depends(get_session)
):
    instance = ModelInstance(tenant_id=tenant_id, **data.model_dump())
    session.add(instance)
    await session.commit()
    await session.refresh(instance)
    get_model_pool().invalidate()
    return instance


@api_router.put("/models/{model_id}", response_model=ModelInstanceOut)
async def update_model(
    model_id: int, data: ModelInstanceUpdate, session: AsyncSession = Depends(get_session)
):
    instance = await session.get(ModelInstance, model_id)
    if not instance:
        raise HTTPException(404, "Model instance not found")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(instance, k, v)
    await session.commit()
    await session.refresh(instance)
    get_model_pool().invalidate(instance.slug)
    return instance


@api_router.delete("/models/{model_id}")
async def delete_model(model_id: int, session: AsyncSession = Depends(get_session)):
    instance = await session.get(ModelInstance, model_id)
    if not instance:
        raise HTTPException(404, "Model instance not found")
    get_model_pool().invalidate(instance.slug)
    await session.delete(instance)
    await session.commit()
    return {"message": "Deleted"}


# ── Tool Definitions (per tenant) ──────────────────────────────────────────

@api_router.get("/tenants/{tenant_id}/tools", response_model=list[ToolOut])
async def list_tools(tenant_id: int, session: AsyncSession = Depends(get_session)):
    result = await session.execute(
        select(ToolDefinition).where(ToolDefinition.tenant_id == tenant_id)
    )
    return result.scalars().all()


@api_router.post("/tenants/{tenant_id}/tools", response_model=ToolOut)
async def create_tool(
    tenant_id: int, data: ToolCreate, session: AsyncSession = Depends(get_session)
):
    tool = ToolDefinition(tenant_id=tenant_id, **data.model_dump())
    session.add(tool)
    await session.commit()
    await session.refresh(tool)
    await get_tenant_registry().reload()
    return tool


@api_router.put("/tools/{tool_id}", response_model=ToolOut)
async def update_tool(
    tool_id: int, data: ToolUpdate, session: AsyncSession = Depends(get_session)
):
    tool = await session.get(ToolDefinition, tool_id)
    if not tool:
        raise HTTPException(404, "Tool not found")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(tool, k, v)
    await session.commit()
    await session.refresh(tool)
    await get_tenant_registry().reload()
    return tool


@api_router.delete("/tools/{tool_id}")
async def delete_tool(tool_id: int, session: AsyncSession = Depends(get_session)):
    tool = await session.get(ToolDefinition, tool_id)
    if not tool:
        raise HTTPException(404, "Tool not found")
    await session.delete(tool)
    await session.commit()
    await get_tenant_registry().reload()
    return {"message": "Deleted"}


# ── Workflows (per tenant) ─────────────────────────────────────────────────

@api_router.get("/tenants/{tenant_id}/workflows", response_model=list[WorkflowOut])
async def list_workflows(tenant_id: int, session: AsyncSession = Depends(get_session)):
    result = await session.execute(
        select(Workflow).where(Workflow.tenant_id == tenant_id)
    )
    return result.scalars().all()


@api_router.post("/tenants/{tenant_id}/workflows", response_model=WorkflowOut)
async def create_workflow(
    tenant_id: int, data: WorkflowCreate, session: AsyncSession = Depends(get_session)
):
    workflow = Workflow(tenant_id=tenant_id, **data.model_dump())
    session.add(workflow)
    await session.commit()
    await session.refresh(workflow)
    await get_tenant_registry().reload()
    return workflow


@api_router.put("/workflows/{workflow_id}", response_model=WorkflowOut)
async def update_workflow(
    workflow_id: int, data: WorkflowUpdate, session: AsyncSession = Depends(get_session)
):
    wf = await session.get(Workflow, workflow_id)
    if not wf:
        raise HTTPException(404, "Workflow not found")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(wf, k, v)
    await session.commit()
    await session.refresh(wf)
    await get_tenant_registry().reload()
    return wf


@api_router.delete("/workflows/{workflow_id}")
async def delete_workflow(workflow_id: int, session: AsyncSession = Depends(get_session)):
    wf = await session.get(Workflow, workflow_id)
    if not wf:
        raise HTTPException(404, "Workflow not found")
    await session.delete(wf)
    await session.commit()
    await get_tenant_registry().reload()
    return {"message": "Deleted"}


# ── Agent Definitions (per tenant) ─────────────────────────────────────────

@api_router.get("/tenants/{tenant_id}/agents", response_model=list[AgentOut])
async def list_agents(tenant_id: int, session: AsyncSession = Depends(get_session)):
    result = await session.execute(
        select(AgentDefinition).where(AgentDefinition.tenant_id == tenant_id)
    )
    return result.scalars().all()


@api_router.post("/tenants/{tenant_id}/agents", response_model=AgentOut)
async def create_agent(
    tenant_id: int, data: AgentCreate, session: AsyncSession = Depends(get_session)
):
    agent = AgentDefinition(tenant_id=tenant_id, **data.model_dump())
    session.add(agent)
    await session.commit()
    await session.refresh(agent)
    await get_tenant_registry().reload()
    return agent


@api_router.get("/agents/{agent_id}", response_model=AgentOut)
async def get_agent(agent_id: int, session: AsyncSession = Depends(get_session)):
    agent = await session.get(AgentDefinition, agent_id)
    if not agent:
        raise HTTPException(404, "Agent not found")
    return agent


@api_router.put("/agents/{agent_id}", response_model=AgentOut)
async def update_agent(
    agent_id: int, data: AgentUpdate, session: AsyncSession = Depends(get_session)
):
    agent = await session.get(AgentDefinition, agent_id)
    if not agent:
        raise HTTPException(404, "Agent not found")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(agent, k, v)
    await session.commit()
    await session.refresh(agent)
    await get_tenant_registry().reload()
    return agent


@api_router.delete("/agents/{agent_id}")
async def delete_agent(agent_id: int, session: AsyncSession = Depends(get_session)):
    agent = await session.get(AgentDefinition, agent_id)
    if not agent:
        raise HTTPException(404, "Agent not found")
    await session.delete(agent)
    await session.commit()
    await get_tenant_registry().reload()
    return {"message": "Deleted"}


# ── Skill Definitions (per agent) ──────────────────────────────────────────

@api_router.get("/agents/{agent_id}/skills", response_model=list[SkillOut])
async def list_skills(agent_id: int, session: AsyncSession = Depends(get_session)):
    result = await session.execute(
        select(SkillDefinition).where(SkillDefinition.agent_id == agent_id)
    )
    return result.scalars().all()


@api_router.post("/agents/{agent_id}/skills", response_model=SkillOut)
async def create_skill(
    agent_id: int, data: SkillCreate, session: AsyncSession = Depends(get_session)
):
    skill = SkillDefinition(agent_id=agent_id, **data.model_dump())
    session.add(skill)
    await session.commit()
    await session.refresh(skill)
    await get_tenant_registry().reload()
    return skill


@api_router.get("/skills/{skill_id}", response_model=SkillOut)
async def get_skill(skill_id: int, session: AsyncSession = Depends(get_session)):
    skill = await session.get(SkillDefinition, skill_id)
    if not skill:
        raise HTTPException(404, "Skill not found")
    return skill


@api_router.put("/skills/{skill_id}", response_model=SkillOut)
async def update_skill(
    skill_id: int, data: SkillUpdate, session: AsyncSession = Depends(get_session)
):
    skill = await session.get(SkillDefinition, skill_id)
    if not skill:
        raise HTTPException(404, "Skill not found")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(skill, k, v)
    await session.commit()
    await session.refresh(skill)
    await get_tenant_registry().reload()
    return skill


@api_router.delete("/skills/{skill_id}")
async def delete_skill(skill_id: int, session: AsyncSession = Depends(get_session)):
    skill = await session.get(SkillDefinition, skill_id)
    if not skill:
        raise HTTPException(404, "Skill not found")
    await session.delete(skill)
    await session.commit()
    await get_tenant_registry().reload()
    return {"message": "Deleted"}


# ── Workflow validation ────────────────────────────────────────────────────

@api_router.post("/skills/{skill_id}/validate")
async def validate_skill_workflow(
    skill_id: int, session: AsyncSession = Depends(get_session)
):
    """Validate a skill's workflow_definition against the schema."""
    skill = await session.get(SkillDefinition, skill_id)
    if not skill:
        raise HTTPException(404, "Skill not found")
    try:
        parsed = WorkflowDefinitionSchema.model_validate(skill.workflow_definition)
        return {
            "valid": True,
            "node_count": len(parsed.nodes),
            "edge_count": len(parsed.edges),
        }
    except Exception as e:
        return {"valid": False, "error": str(e)}


# ── Reload ──────────────────────────────────────────────────────────────────

@api_router.post("/reload")
async def reload_all():
    """Hot-reload all registries."""
    await get_tenant_registry().reload()
    await get_model_pool().reload()
    return {"message": "Reloaded all registries"}


@api_router.post("/reload/{tenant_slug}")
async def reload_tenant(tenant_slug: str):
    """Hot-reload a specific tenant."""
    await get_tenant_registry().reload(tenant_slug)
    get_model_pool().invalidate()
    return {"message": f"Reloaded tenant '{tenant_slug}'"}


# ── Chat endpoint (REST — for testing / frontend) ──────────────────────────

chat_router = APIRouter(prefix="/api/v1", tags=["chat"])


@chat_router.post("/chat", response_model=ChatOutput)
async def chat(data: ChatInput):
    """REST chat endpoint — mirrors gRPC Chat for convenience."""
    session_id = data.session_id or str(uuid.uuid4())
    tenant_slug = data.tenant_slug

    registry = get_tenant_registry()
    tenant = registry.get(tenant_slug)
    if not tenant:
        raise HTTPException(404, f"Tenant '{tenant_slug}' not found")

    # Build context
    from src.grpc_server.server import _get_or_create_context

    ctx = _get_or_create_context(session_id, tenant_slug, data.message)

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

    ctx = await supervisor.handle(ctx)

    # Save session
    from src.grpc_server.server import _sessions

    _sessions[session_id] = ctx.to_dict()

    return ChatOutput(
        message=ctx.response,
        status=ctx.status,
        session_id=session_id,
        workflow_slug=ctx.workflow_slug,
        tool_calls=ctx.tool_calls_log,
    )


# ── Task Types info ────────────────────────────────────────────────────────

@api_router.get("/task-types")
async def get_task_types():
    """List all available BPMN task types."""
    return {"task_types": list_task_types()}


# ═════════════════════════════════════════════════════════════════════════════
# Admin HTML UI
# ═════════════════════════════════════════════════════════════════════════════

@ui_router.get("/admin", response_class=HTMLResponse)
async def admin_dashboard(request: Request, session: AsyncSession = Depends(get_session)):
    """Main admin dashboard — lists tenants and providers."""
    tenants = (await session.execute(select(Tenant))).scalars().all()
    providers = (await session.execute(select(ModelProvider))).scalars().all()
    return templates.TemplateResponse(
        "dashboard.html",
        {
            "request": request,
            "tenants": tenants,
            "providers": providers,
            "task_types": list_task_types(),
        },
    )


@ui_router.get("/admin/tenants/{tenant_slug}", response_class=HTMLResponse)
async def admin_tenant_detail(
    request: Request, tenant_slug: str, session: AsyncSession = Depends(get_session)
):
    """Tenant detail — models, tools, workflows, agents, skills."""
    result = await session.execute(
        select(Tenant)
        .options(
            selectinload(Tenant.model_instances).selectinload(ModelInstance.provider),
            selectinload(Tenant.tool_definitions),
            selectinload(Tenant.workflows),
            selectinload(Tenant.agent_definitions)
            .selectinload(AgentDefinition.skill_definitions),
        )
        .where(Tenant.slug == tenant_slug)
    )
    tenant = result.scalars().first()
    if not tenant:
        raise HTTPException(404, "Tenant not found")

    providers = (await session.execute(select(ModelProvider))).scalars().all()

    return templates.TemplateResponse(
        "tenant_detail.html",
        {
            "request": request,
            "tenant": tenant,
            "providers": providers,
            "task_types": list_task_types(),
        },
    )
