"""Tenant Registry — loads tenant configs into memory, supports hot-reload.

Now supports both:
  - Legacy flat workflows (backward compatible)
  - New Agent→Skill hierarchy
"""

from __future__ import annotations

import asyncio
import os
from dataclasses import dataclass, field

import structlog
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from src.db.database import get_session_factory
from src.db.models import AgentDefinition, SkillDefinition, Tenant

logger = structlog.get_logger()


# ─────────────────────────────────────────────────────────────────────────────
# Config dataclasses — pure Python, no framework dependency
# ─────────────────────────────────────────────────────────────────────────────

@dataclass
class SkillConfig:
    """In-memory snapshot of a skill definition."""
    id: int
    slug: str
    name: str
    description: str
    trigger_description: str
    model_slug: str | None
    workflow_definition: dict
    input_schema: dict | None
    output_schema: dict | None
    config_timer: dict | None
    enabled: bool = True


@dataclass
class AgentConfig:
    """In-memory snapshot of an agent definition."""
    id: int
    slug: str
    name: str
    description: str
    role_prompt: str
    model_slug: str | None
    icon: str | None
    priority: int
    routing_config: dict | None
    skills: list[SkillConfig] = field(default_factory=list)
    enabled: bool = True


@dataclass
class TenantConfig:
    """In-memory snapshot of a tenant's full configuration."""

    id: int
    slug: str
    name: str
    description: str | None
    grpc_target: str
    qdrant_prefix: str
    supervisor_model_slug: str | None
    supervisor_prompt: str | None
    max_turns: int
    fallback_message: str
    tools: list[dict] = field(default_factory=list)
    workflows: list[dict] = field(default_factory=list)  # legacy flat workflows
    agents: list[AgentConfig] = field(default_factory=list)  # new agent hierarchy

    @property
    def has_agents(self) -> bool:
        """True if tenant uses the new Agent→Skill architecture."""
        return len(self.agents) > 0


class TenantRegistry:
    """In-memory registry of all tenant configurations."""

    def __init__(self) -> None:
        self._tenants: dict[str, TenantConfig] = {}
        self._lock = asyncio.Lock()
        self._loaded = False

    async def load(self) -> None:
        """Load all enabled tenants from DB into memory."""
        async with self._lock:
            factory = get_session_factory()
            async with factory() as session:
                stmt = (
                    select(Tenant)
                    .options(
                        selectinload(Tenant.tool_definitions),
                        selectinload(Tenant.workflows),
                        selectinload(Tenant.agent_definitions)
                        .selectinload(AgentDefinition.skill_definitions),
                    )
                    .where(Tenant.enabled.is_(True))
                )
                result = await session.execute(stmt)
                tenants = result.scalars().all()

            new_map: dict[str, TenantConfig] = {}
            for t in tenants:
                tools = [
                    {
                        "id": td.id,
                        "name": td.name,
                        "description": td.description,
                        "grpc_method": td.grpc_method,
                        "input_schema": td.input_schema,
                        "output_schema": td.output_schema,
                    }
                    for td in t.tool_definitions
                    if td.enabled
                ]
                # Legacy flat workflows
                workflows = [
                    {
                        "id": w.id,
                        "name": w.name,
                        "slug": w.slug,
                        "description": w.description,
                        "trigger_description": w.trigger_description,
                        "definition": w.definition,
                    }
                    for w in t.workflows
                    if w.enabled
                ]
                # New Agent→Skill hierarchy
                agents = [
                    AgentConfig(
                        id=ad.id,
                        slug=ad.slug,
                        name=ad.name,
                        description=ad.description,
                        role_prompt=ad.role_prompt,
                        model_slug=ad.model_slug,
                        icon=ad.icon,
                        priority=ad.priority,
                        routing_config=ad.routing_config,
                        enabled=ad.enabled,
                        skills=[
                            SkillConfig(
                                id=sd.id,
                                slug=sd.slug,
                                name=sd.name,
                                description=sd.description,
                                trigger_description=sd.trigger_description,
                                model_slug=sd.model_slug,
                                workflow_definition=sd.workflow_definition,
                                input_schema=sd.input_schema,
                                output_schema=sd.output_schema,
                                config_timer=sd.config_timer,
                                enabled=sd.enabled,
                            )
                            for sd in ad.skill_definitions
                            if sd.enabled
                        ],
                    )
                    for ad in t.agent_definitions
                    if ad.enabled
                ]

                new_map[t.slug] = TenantConfig(
                    id=t.id,
                    slug=t.slug,
                    name=t.name,
                    description=t.description,
                    grpc_target=t.grpc_target,
                    qdrant_prefix=t.qdrant_prefix,
                    supervisor_model_slug=t.supervisor_model_slug,
                    supervisor_prompt=t.supervisor_prompt,
                    max_turns=t.max_turns,
                    fallback_message=t.fallback_message,
                    tools=tools,
                    workflows=workflows,
                    agents=agents,
                )

            self._apply_runtime_grpc_target_overrides(new_map)

            self._tenants = new_map
            self._loaded = True
            logger.info("tenant_registry.loaded", count=len(new_map))

    @staticmethod
    def _apply_runtime_grpc_target_overrides(tenants: dict[str, TenantConfig]) -> None:
        """Allow runtime override of grpc_target without DB mutation.

        Priority:
          1) TENANT_GRPC_TARGET_<TENANT_SLUG_UPPER>
          2) DEFAULT_GRPC_TARGET
        """
        default_target = os.getenv("DEFAULT_GRPC_TARGET", "").strip()

        for slug, tenant in tenants.items():
            tenant_key = f"TENANT_GRPC_TARGET_{slug.upper()}"
            override = os.getenv(tenant_key, "").strip()
            if override:
                logger.info("tenant_registry.grpc_target_override", tenant=slug, source=tenant_key, target=override)
                tenant.grpc_target = override
                continue

            current = (tenant.grpc_target or "").strip().lower()
            is_local_target = current.startswith("localhost:") or current.startswith("127.0.0.1:")

            if default_target and is_local_target:
                logger.info("tenant_registry.grpc_target_override", tenant=slug, source="DEFAULT_GRPC_TARGET", target=default_target)
                tenant.grpc_target = default_target

    def get(self, slug: str) -> TenantConfig | None:
        return self._tenants.get(slug)

    def list_all(self) -> list[TenantConfig]:
        return list(self._tenants.values())

    async def reload(self, slug: str | None = None) -> None:
        """Hot-reload — either a single tenant or everything."""
        # For simplicity, reload all (SQLite is fast enough)
        await self.load()
        logger.info("tenant_registry.reloaded", slug=slug or "ALL")

    @property
    def loaded(self) -> bool:
        return self._loaded


# Singleton
_registry: TenantRegistry | None = None


def get_tenant_registry() -> TenantRegistry:
    global _registry
    if _registry is None:
        _registry = TenantRegistry()
    return _registry
