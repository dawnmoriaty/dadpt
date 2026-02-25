"""Agent Router — 2-level LLM routing for Agent-as-Employee architecture.

Pure Python — no framework dependency. Uses LLM to:
  Step 1: Select the best Agent for the user's intent
  Step 2: Select the best Skill within that Agent

Model resolution chain: skill.model_slug → agent.model_slug → tenant supervisor model
"""

from __future__ import annotations

import json
import logging
from dataclasses import dataclass
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from src.engine.workflow_context import WorkflowContext
    from src.platform.model_pool import ModelPool
    from src.platform.tenant_registry import AgentConfig, SkillConfig, TenantConfig

logger = logging.getLogger(__name__)


@dataclass
class RouteResult:
    """Result of the 2-level routing."""
    agent: AgentConfig
    skill: SkillConfig
    resolved_model_slug: str  # final model after fallback chain


class AgentRouter:
    """Routes user intent → Agent → Skill using LLM.

    Pure Python class — instantiated with a ModelPool reference, no framework deps.
    """

    def __init__(self, model_pool: ModelPool) -> None:
        self._model_pool = model_pool

    async def route(
        self,
        ctx: WorkflowContext,
        tenant_config: TenantConfig,
    ) -> RouteResult | None:
        """2-level routing: user intent → Agent → Skill.

        Returns None if no agent/skill matches (caller should fallback).
        """
        agents = [a for a in tenant_config.agents if a.enabled]
        if not agents:
            return None

        # Step 1: Select Agent
        selected_agent = await self._select_agent(ctx, tenant_config, agents)
        if selected_agent is None:
            return None

        # Step 2: Select Skill within Agent
        skills = [s for s in selected_agent.skills if s.enabled]
        if not skills:
            logger.warning("Agent '%s' has no enabled skills", selected_agent.slug)
            return None

        selected_skill = await self._select_skill(ctx, tenant_config, selected_agent, skills)
        if selected_skill is None:
            return None

        # Resolve model: skill → agent → tenant supervisor
        resolved_model = self._resolve_model(selected_skill, selected_agent, tenant_config)

        return RouteResult(
            agent=selected_agent,
            skill=selected_skill,
            resolved_model_slug=resolved_model,
        )

    async def _select_agent(
        self,
        ctx: WorkflowContext,
        tenant_config: TenantConfig,
        agents: list[AgentConfig],
    ) -> AgentConfig | None:
        """Use LLM to pick the best agent for the user's message."""
        if len(agents) == 1:
            return agents[0]

        # Sort by priority (lower = higher priority)
        agents_sorted = sorted(agents, key=lambda a: a.priority)

        agent_descriptions = "\n".join(
            f"- {a.slug}: {a.description}" for a in agents_sorted
        )

        routing_prompt = (
            f"You are a router. Given the user message, select the most appropriate agent.\n"
            f"Available agents:\n{agent_descriptions}\n\n"
            f"User message: {ctx.last_user_message}\n\n"
            f"Respond with ONLY the agent slug (e.g. 'customer_support'). "
            f"If none match, respond with 'NONE'."
        )

        model_slug = tenant_config.supervisor_model_slug
        if not model_slug:
            logger.warning("No supervisor model configured for tenant '%s'", tenant_config.slug)
            return agents_sorted[0]  # fallback to highest priority

        try:
            llm = self._model_pool.get(model_slug)
            response = await llm.ainvoke(routing_prompt)
            selected_slug = response.content.strip().strip("'\"").lower()

            if selected_slug == "none":
                return None

            for agent in agents_sorted:
                if agent.slug == selected_slug:
                    logger.info("Routed to agent: %s", selected_slug)
                    return agent

            # Fuzzy fallback: if LLM returns partial match
            logger.warning("LLM returned unknown agent slug '%s', falling back to first", selected_slug)
            return agents_sorted[0]
        except Exception:
            logger.exception("Agent routing LLM call failed, falling back to first agent")
            return agents_sorted[0]

    async def _select_skill(
        self,
        ctx: WorkflowContext,
        tenant_config: TenantConfig,
        agent: AgentConfig,
        skills: list[SkillConfig],
    ) -> SkillConfig | None:
        """Use LLM to pick the best skill within the selected agent."""
        if len(skills) == 1:
            return skills[0]

        skill_descriptions = "\n".join(
            f"- {s.slug}: {s.trigger_description}" for s in skills
        )

        routing_prompt = (
            f"You are {agent.name}. {agent.role_prompt}\n\n"
            f"Given the user message, select the most appropriate skill to handle it.\n"
            f"Available skills:\n{skill_descriptions}\n\n"
            f"User message: {ctx.last_user_message}\n\n"
            f"Respond with ONLY the skill slug (e.g. 'check_trip'). "
            f"If none match, respond with 'NONE'."
        )

        # Use agent's model or tenant supervisor model
        model_slug = agent.model_slug or tenant_config.supervisor_model_slug
        if not model_slug:
            return skills[0]

        try:
            llm = self._model_pool.get(model_slug)
            response = await llm.ainvoke(routing_prompt)
            selected_slug = response.content.strip().strip("'\"").lower()

            if selected_slug == "none":
                return None

            for skill in skills:
                if skill.slug == selected_slug:
                    logger.info("Routed to skill: %s.%s", agent.slug, selected_slug)
                    return skill

            logger.warning("LLM returned unknown skill slug '%s', falling back to first", selected_slug)
            return skills[0]
        except Exception:
            logger.exception("Skill routing LLM call failed, falling back to first skill")
            return skills[0]

    @staticmethod
    def _resolve_model(
        skill: SkillConfig,
        agent: AgentConfig,
        tenant_config: TenantConfig,
    ) -> str:
        """Model fallback chain: skill → agent → tenant supervisor."""
        if skill.model_slug:
            return skill.model_slug
        if agent.model_slug:
            return agent.model_slug
        return tenant_config.supervisor_model_slug or ""
