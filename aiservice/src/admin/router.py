"""Admin API Router — CRUD for providers, tenants, models, tools, workflows, agents, skills.

Also serves HTML admin UI via Jinja2 templates and a REST chat endpoint for testing.
"""

from __future__ import annotations

import json
import uuid
import copy
from pathlib import Path
from typing import Any

import structlog
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
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
    PolicyWeightsUpdate,
    RagEvalInput,
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
from src.db.database import get_session, get_session_factory
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
from src.engine.presentation import ResponseFormatter
from src.grpc_server.session_store import build_session_key, get_or_create_context, save_session
from src.platform.model_pool import get_model_pool
from src.platform.providers.registry import get_provider_registry
from src.platform.tenant_registry import get_tenant_registry
from src.platform.tool_factory import ToolFactory
from src.observability.metrics_store import get_metrics_store
from src.phase4.policy_engine import POLICY_PROFILES
from src.vectorstore.qdrant_manager import get_qdrant_manager

logger = structlog.get_logger()

formatter = ResponseFormatter()


def _qdrant_enabled() -> bool:
    import os

    return os.getenv("ENABLE_QDRANT", "false").strip().lower() in {"1", "true", "yes", "on"}


def _build_chat_metrics(ctx: WorkflowContext) -> dict[str, Any]:
    timings = ctx.task_timings or []
    slowest = max(timings, key=lambda item: float(item.get("elapsed_ms", 0.0)), default=None)
    return {
        "trace_id": ctx.trace_id,
        "total_latency_ms": ctx.get_var("_total_latency_ms", 0.0),
        "task_count": len(timings),
        "tool_count": len(ctx.tool_calls_log or []),
        "policy_used": ctx.get_var("policy_used", {}),
        "rag_metrics": ctx.get_var("rag_metrics", {}),
        "slowest_task": slowest,
        "task_timings": timings,
    }


def _record_chat_metrics(ctx: WorkflowContext, metrics: dict[str, Any]) -> None:
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
        task_type = str(item.get("task_type", ""))
        model = str(ctx.get_var("_resolved_model", "") or "") if task_type == "llm_call" else ""
        tool = ""
        if task_type == "grpc_call":
            for tc in reversed(ctx.tool_calls_log):
                tool = str(tc.get("tool", "") or "")
                if tool:
                    break

        store.record_task(
            {
                "trace_id": ctx.trace_id,
                "tenant_slug": ctx.tenant_slug,
                "workflow_slug": ctx.workflow_slug or "",
                "node": str(item.get("node", "")),
                "task_type": task_type,
                "elapsed_ms": float(item.get("elapsed_ms", 0.0) or 0.0),
                "status": str(item.get("status", "")),
                "model": model,
                "tool": tool,
            }
        )


def _keyword_search_for_eval(results: list[dict[str, Any]], query: str, top_k: int) -> list[dict[str, Any]]:
    terms = [token for token in query.lower().split() if len(token) >= 2]
    if not terms:
        return []

    scored: list[tuple[int, dict[str, Any]]] = []
    for item in results:
        payload = item.get("payload", {})
        text = str(payload.get("text", "")).lower()
        hits = sum(1 for term in terms if term in text)
        if hits <= 0:
            continue
        clone = dict(item)
        clone["score"] = max(float(clone.get("score", 0.0)), 0.2 + (hits * 0.05))
        scored.append((hits, clone))

    scored.sort(key=lambda pair: pair[0], reverse=True)
    return [pair[1] for pair in scored[:top_k]]


def _merge_eval_results(semantic_results: list[dict[str, Any]], keyword_results: list[dict[str, Any]], top_k: int) -> list[dict[str, Any]]:
    merged: dict[Any, dict[str, Any]] = {}
    for item in semantic_results + keyword_results:
        key = item.get("id")
        if key not in merged:
            merged[key] = item
            continue
        if float(item.get("score", 0.0)) > float(merged[key].get("score", 0.0)):
            merged[key] = item

    out = list(merged.values())
    out.sort(key=lambda x: float(x.get("score", 0.0)), reverse=True)
    return out[:top_k]


def _csv_escape(value: Any) -> str:
    text = str(value if value is not None else "")
    if any(ch in text for ch in [",", '"', "\n", "\r"]):
        text = '"' + text.replace('"', '""') + '"'
    return text

# Templates
_template_dir = Path(__file__).parent / "templates"
templates = Jinja2Templates(directory=str(_template_dir))

# ═════════════════════════════════════════════════════════════════════════════
# API Router
# ═════════════════════════════════════════════════════════════════════════════

api_router = APIRouter(prefix="/api/admin", tags=["admin"])
ui_router = APIRouter(tags=["admin-ui"])


# ── Providers ───────────────────────────────────────────────────────────────


def _provider_to_out(provider: ModelProvider) -> dict:
    """Convert ModelProvider ORM → dict with has_api_key computed field."""
    return {
        "id": provider.id,
        "slug": provider.slug,
        "name": provider.name,
        "provider_type": provider.provider_type,
        "api_key_env_var": provider.api_key_env_var,
        "has_api_key": bool(provider.encrypted_api_key),
        "base_url": provider.base_url,
        "rate_limit_rpm": provider.rate_limit_rpm,
        "enabled": provider.enabled,
    }

@api_router.get("/providers", response_model=list[ProviderOut])
async def list_providers(session: AsyncSession = Depends(get_session)):
    result = await session.execute(select(ModelProvider))
    providers = result.scalars().all()
    return [_provider_to_out(p) for p in providers]


@api_router.get("/providers/supported-types")
async def list_supported_types():
    """List all supported LLM provider types."""
    registry = get_provider_registry()
    return {"supported_types": registry.supported_types()}


@api_router.post("/providers", response_model=ProviderOut)
async def create_provider(data: ProviderCreate, session: AsyncSession = Depends(get_session)):
    # Extract plaintext api_key before creating ORM object
    plaintext_key = data.api_key
    provider_data = data.model_dump(exclude={"api_key"})
    provider = ModelProvider(**provider_data)

    # Encrypt and store if api_key provided
    if plaintext_key:
        from src.platform.crypto import get_crypto
        provider.encrypted_api_key = get_crypto().encrypt(plaintext_key)

    session.add(provider)
    try:
        await session.commit()
    except IntegrityError:
        await session.rollback()
        raise HTTPException(409, f"Provider with slug '{data.slug}' already exists")
    await session.refresh(provider)
    get_model_pool().invalidate()
    return _provider_to_out(provider)


@api_router.put("/providers/{provider_id}", response_model=ProviderOut)
async def update_provider(
    provider_id: int, data: ProviderUpdate, session: AsyncSession = Depends(get_session)
):
    provider = await session.get(ModelProvider, provider_id)
    if not provider:
        raise HTTPException(404, "Provider not found")

    # Handle api_key separately (encrypt before storing)
    update_data = data.model_dump(exclude_unset=True, exclude={"api_key"})
    for k, v in update_data.items():
        setattr(provider, k, v)

    # Encrypt new api_key if provided
    if data.api_key is not None:
        from src.platform.crypto import get_crypto
        provider.encrypted_api_key = get_crypto().encrypt(data.api_key)

    await session.commit()
    await session.refresh(provider)
    get_model_pool().invalidate()
    return _provider_to_out(provider)


@api_router.delete("/providers/{provider_id}")
async def delete_provider(provider_id: int, session: AsyncSession = Depends(get_session)):
    provider = await session.get(ModelProvider, provider_id)
    if not provider:
        raise HTTPException(404, "Provider not found")
    await session.delete(provider)
    await session.commit()
    get_model_pool().invalidate()
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
    try:
        await session.commit()
    except IntegrityError:
        await session.rollback()
        raise HTTPException(409, f"Tenant with slug '{data.slug}' already exists")
    await session.refresh(tenant)
    # Create default Qdrant collections
    try:
        qdrant = get_qdrant_manager()
        await qdrant.ensure_tenant_collections(tenant.qdrant_prefix)
    except Exception:
        pass  # Qdrant may not be running — tenant still created
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


@api_router.get("/diagnostics/models")
async def diagnostics_models():
    """Quick diagnostics for all active model instances.

    Returns model tuning knobs + LLM build status to help tune routing/recognition.
    """
    pool = get_model_pool()
    await pool.reload()

    items: list[dict[str, Any]] = []
    for slug, cfg in pool._configs.items():
        status = "ok"
        error = ""
        try:
            await pool.get_llm(slug)
        except Exception as exc:
            status = "error"
            error = str(exc)

        items.append(
            {
                "slug": slug,
                "provider_type": cfg.provider_type,
                "model_name": cfg.model_name,
                "temperature": cfg.temperature,
                "top_p": cfg.top_p,
                "max_tokens": cfg.max_tokens,
                "frequency_penalty": cfg.frequency_penalty,
                "presence_penalty": cfg.presence_penalty,
                "fallback_slug": cfg.fallback_slug,
                "status": status,
                "error": error,
            }
        )

    return {"count": len(items), "items": items}


@api_router.get("/diagnostics/qdrant/{tenant_slug}")
async def diagnostics_qdrant(tenant_slug: str, q: str = "chuyen xe", top_k: int = 3):
    """Inspect Qdrant retrieval quality for a tenant prefix."""
    registry = get_tenant_registry()
    tenant = registry.get(tenant_slug)
    if not tenant:
        raise HTTPException(404, f"Tenant '{tenant_slug}' not found")

    qdrant = get_qdrant_manager() if _qdrant_enabled() else None

    collections = [
        f"{tenant.qdrant_prefix}_faq",
        f"{tenant.qdrant_prefix}_trips",
        f"{tenant.qdrant_prefix}_knowledge",
    ]

    probes: dict[str, Any] = {}
    for name in collections:
        try:
            rows = await qdrant.search(name, q, top_k=top_k)
        except Exception as exc:
            probes[name] = {"status": "error", "error": str(exc), "results": []}
            continue

        probes[name] = {
            "status": "ok",
            "result_count": len(rows),
            "top_scores": [round(float(r.get("score", 0.0)), 4) for r in rows[:3]],
        }

    return {
        "tenant": tenant_slug,
        "qdrant_prefix": tenant.qdrant_prefix,
        "query": q,
        "collections": probes,
    }


@api_router.get("/diagnostics/chat-trace/{tenant_slug}")
async def diagnostics_chat_trace(tenant_slug: str, message: str):
    """Run a synthetic chat and return full trace metrics for profiling."""
    tenant = get_tenant_registry().get(tenant_slug)
    if not tenant:
        raise HTTPException(404, f"Tenant '{tenant_slug}' not found")

    ctx = WorkflowContext(
        session_id=str(uuid.uuid4()),
        tenant_slug=tenant_slug,
        user_message=message,
    )
    ctx.add_message("user", message)

    supervisor = Supervisor(
        tenant=tenant,
        model_pool=get_model_pool(),
        tool_factory=ToolFactory(tenant.grpc_target),
        qdrant_manager=get_qdrant_manager(),
    )
    ctx = await supervisor.handle(ctx)

    return {
        "status": ctx.status,
        "workflow_slug": ctx.workflow_slug,
        "trace_id": ctx.trace_id,
        "metrics": _build_chat_metrics(ctx),
        "tool_calls": ctx.tool_calls_log,
    }


@api_router.get("/diagnostics/metrics")
async def diagnostics_metrics(window_seconds: int = 300):
    """Rolling observability metrics (p50/p95, task/model/tool breakdown)."""
    window = max(60, min(window_seconds, 3600))
    return get_metrics_store().summary(window_seconds=window)


@api_router.get("/phase4/policy-profiles")
async def phase4_policy_profiles():
    return {
        "profiles": {
            name: {
                "price_weight": profile.price,
                "departure_weight": profile.departure,
                "seats_weight": profile.seats,
            }
            for name, profile in POLICY_PROFILES.items()
        }
    }


@api_router.post("/phase4/tenants/{tenant_slug}/skills/{skill_slug}/policy")
async def phase4_set_skill_policy(
    tenant_slug: str,
    skill_slug: str,
    payload: PolicyWeightsUpdate,
):
    registry = get_tenant_registry()
    tenant = registry.get(tenant_slug)
    if not tenant:
        raise HTTPException(404, f"Tenant '{tenant_slug}' not found")
    has_profile = bool(payload.profile)
    if has_profile and payload.profile not in POLICY_PROFILES:
        raise HTTPException(400, f"Unknown profile '{payload.profile}'")

    has_custom_weights = any(
        value is not None
        for value in (
            payload.price_weight,
            payload.departure_weight,
            payload.seats_weight,
        )
    )

    if not has_profile and not has_custom_weights:
        raise HTTPException(400, "Provide profile or custom weights")

    session_factory = get_session_factory()
    async with session_factory() as session:
        tenant_row = (await session.execute(select(Tenant).where(Tenant.slug == tenant_slug))).scalars().first()
        if not tenant_row:
            raise HTTPException(404, f"Tenant '{tenant_slug}' not found")

        agent_rows = (
            await session.execute(select(AgentDefinition).where(AgentDefinition.tenant_id == tenant_row.id))
        ).scalars().all()

        target_skill = None
        for agent in agent_rows:
            skill = (
                await session.execute(
                    select(SkillDefinition).where(
                        SkillDefinition.agent_id == agent.id,
                        SkillDefinition.slug == skill_slug,
                    )
                )
            ).scalars().first()
            if skill:
                target_skill = skill
                break

        if not target_skill:
            raise HTTPException(404, f"Skill '{skill_slug}' not found in tenant '{tenant_slug}'")

        wf = copy.deepcopy(target_skill.workflow_definition or {})
        nodes = wf.get("nodes", {})
        rerank_node = nodes.get("rerank")
        if not isinstance(rerank_node, dict):
            raise HTTPException(400, "Workflow has no rerank node")

        config = rerank_node.get("config", {})
        if not isinstance(config, dict):
            config = {}
        if has_profile:
            config["policy"] = {"profile": payload.profile}
        else:
            config["policy"] = {
                "profile": "custom",
                "price_weight": float(payload.price_weight if payload.price_weight is not None else 0.5),
                "departure_weight": float(payload.departure_weight if payload.departure_weight is not None else 0.3),
                "seats_weight": float(payload.seats_weight if payload.seats_weight is not None else 0.2),
            }

        # Phase 5 retrieval tuning attached to rag node config
        rag_node = nodes.get("rag")
        if isinstance(rag_node, dict):
            rag_config = rag_node.get("config", {})
            if not isinstance(rag_config, dict):
                rag_config = {}
            if payload.rag_hybrid is not None:
                rag_config["hybrid"] = payload.rag_hybrid
            if payload.rag_keyword_top_k is not None:
                rag_config["keyword_top_k"] = max(1, int(payload.rag_keyword_top_k))
            if payload.rag_top_k is not None:
                rag_config["top_k"] = max(1, int(payload.rag_top_k))
            rag_node["config"] = rag_config
            nodes["rag"] = rag_node
        rerank_node["config"] = config
        nodes["rerank"] = rerank_node
        wf["nodes"] = nodes
        target_skill.workflow_definition = wf
        await session.commit()

    await registry.reload(tenant_slug)
    return {
        "message": "Policy updated",
        "tenant": tenant_slug,
        "skill": skill_slug,
        "policy": config.get("policy", {}),
        "rag": (nodes.get("rag", {}) or {}).get("config", {}),
    }


@api_router.post("/phase5/rag-eval/{tenant_slug}")
async def phase5_rag_eval(tenant_slug: str, payload: RagEvalInput):
    tenant = get_tenant_registry().get(tenant_slug)
    if not tenant:
        raise HTTPException(404, f"Tenant '{tenant_slug}' not found")

    qdrant = get_qdrant_manager()
    collection = f"{tenant.qdrant_prefix}_{payload.collection}"
    top_k = max(1, int(payload.top_k))
    keyword_top_k = max(1, int(payload.keyword_top_k))

    rows: list[dict[str, Any]] = []
    score_peaks: list[float] = []
    non_empty = 0

    for query in payload.queries:
        semantic = await qdrant.search(collection_name=collection, query_text=query, top_k=top_k)
        keyword = []
        if payload.hybrid:
            keyword = _keyword_search_for_eval(semantic, query, keyword_top_k)
        merged = _merge_eval_results(semantic, keyword, top_k)

        if merged:
            non_empty += 1
            score_peaks.append(float(merged[0].get("score", 0.0) or 0.0))

        rows.append(
            {
                "query": query,
                "semantic_count": len(semantic),
                "keyword_count": len(keyword),
                "merged_count": len(merged),
                "top_score": float(merged[0].get("score", 0.0) or 0.0) if merged else 0.0,
            }
        )

    total = len(payload.queries)
    hit_rate = (non_empty / total) if total > 0 else 0.0
    avg_top_score = (sum(score_peaks) / len(score_peaks)) if score_peaks else 0.0

    return {
        "tenant": tenant_slug,
        "collection": collection,
        "hybrid": payload.hybrid,
        "top_k": top_k,
        "keyword_top_k": keyword_top_k,
        "summary": {
            "query_count": total,
            "hit_rate": round(hit_rate, 4),
            "avg_top_score": round(avg_top_score, 4),
        },
        "rows": rows,
    }


@api_router.post("/phase5/rag-compare/{tenant_slug}")
async def phase5_rag_compare(tenant_slug: str, payload: RagEvalInput):
    tenant = get_tenant_registry().get(tenant_slug)
    if not tenant:
        raise HTTPException(404, f"Tenant '{tenant_slug}' not found")

    qdrant = get_qdrant_manager()
    collection = f"{tenant.qdrant_prefix}_{payload.collection}"
    top_k = max(1, int(payload.top_k))
    keyword_top_k = max(1, int(payload.keyword_top_k))

    rows: list[dict[str, Any]] = []
    for query in payload.queries:
        semantic = await qdrant.search(collection_name=collection, query_text=query, top_k=top_k)
        semantic_merged = _merge_eval_results(semantic, [], top_k)
        hybrid_keyword = _keyword_search_for_eval(semantic, query, keyword_top_k)
        hybrid_merged = _merge_eval_results(semantic, hybrid_keyword, top_k)

        semantic_top = float(semantic_merged[0].get("score", 0.0) or 0.0) if semantic_merged else 0.0
        hybrid_top = float(hybrid_merged[0].get("score", 0.0) or 0.0) if hybrid_merged else 0.0

        rows.append(
            {
                "query": query,
                "semantic_count": len(semantic_merged),
                "hybrid_count": len(hybrid_merged),
                "semantic_top_score": semantic_top,
                "hybrid_top_score": hybrid_top,
                "delta": round(hybrid_top - semantic_top, 6),
            }
        )

    improved = sum(1 for row in rows if row["delta"] > 0)
    worsened = sum(1 for row in rows if row["delta"] < 0)
    unchanged = len(rows) - improved - worsened

    return {
        "tenant": tenant_slug,
        "collection": collection,
        "top_k": top_k,
        "keyword_top_k": keyword_top_k,
        "summary": {
            "query_count": len(rows),
            "improved": improved,
            "unchanged": unchanged,
            "worsened": worsened,
        },
        "rows": rows,
    }


@api_router.post("/phase5/rag-compare/{tenant_slug}/csv")
async def phase5_rag_compare_csv(tenant_slug: str, payload: RagEvalInput):
    compared = await phase5_rag_compare(tenant_slug, payload)
    rows = compared.get("rows", [])

    headers = ["query", "semantic_count", "hybrid_count", "semantic_top_score", "hybrid_top_score", "delta"]
    lines = [",".join(headers)]
    for row in rows:
        lines.append(
            ",".join(
                _csv_escape(row.get(key, "")) for key in headers
            )
        )

    csv_text = "\n".join(lines)
    return {
        "tenant": tenant_slug,
        "summary": compared.get("summary", {}),
        "csv": csv_text,
    }


# ── Chat endpoint (REST — for testing / frontend) ──────────────────────────

chat_router = APIRouter(prefix="/api/v1", tags=["chat"])


@chat_router.post("/chat", response_model=ChatOutput)
async def chat(data: ChatInput):
    """REST chat endpoint — mirrors gRPC Chat for convenience."""
    raw_session_id = data.session_id or ""
    tenant_slug = data.tenant_slug
    session_id = build_session_key(tenant_slug, data.user_id or "", raw_session_id)

    registry = get_tenant_registry()

    tenant = registry.get(tenant_slug)
    if not tenant:
        raise HTTPException(404, f"Tenant '{tenant_slug}' not found")

    # Build context
    ctx = get_or_create_context(session_id, tenant_slug, data.message)


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
    save_session(session_id, ctx)


    metrics = _build_chat_metrics(ctx)
    _record_chat_metrics(ctx, metrics)

    return ChatOutput(**formatter.format(ctx, session_id=session_id, metrics=metrics))


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
    registry = get_provider_registry()
    return templates.TemplateResponse(
        "dashboard.html",
        {
            "request": request,
            "tenants": tenants,
            "providers": providers,
            "task_types": list_task_types(),
            "supported_types": registry.supported_types(),
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
