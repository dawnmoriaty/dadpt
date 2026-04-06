"""Agent Router — 2-level LLM routing for Agent-as-Employee architecture.

Pure Python — no framework dependency. Uses LLM to:
  Step 1: Select the best Agent for the user's intent
  Step 2: Select the best Skill within that Agent

Model resolution chain: skill.model_slug → agent.model_slug → tenant supervisor model
"""

from __future__ import annotations

import json
import logging
import re
import unicodedata
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
    confidence: float = 0.0


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
        selected_agent, agent_confidence = await self._select_agent(ctx, tenant_config, agents)
        if selected_agent is None:
            return None

        # Step 2: Select Skill within Agent
        skills = [s for s in selected_agent.skills if s.enabled]
        if not skills:
            logger.warning("Agent '%s' has no enabled skills", selected_agent.slug)
            return None

        selected_skill, skill_confidence = await self._select_skill(ctx, tenant_config, selected_agent, skills)
        if selected_skill is None:
            return None

        # Resolve model: skill → agent → tenant supervisor
        resolved_model = self._resolve_model(selected_skill, selected_agent, tenant_config)

        return RouteResult(
            agent=selected_agent,
            skill=selected_skill,
            resolved_model_slug=resolved_model,
            confidence=min(agent_confidence, skill_confidence),
        )

    async def _select_agent(
        self,
        ctx: WorkflowContext,
        tenant_config: TenantConfig,
        agents: list[AgentConfig],
    ) -> tuple[AgentConfig | None, float]:
        """Use LLM to pick the best agent for the user's message."""
        if len(agents) == 1:
            return agents[0], 1.0

        # Sort by priority (lower = higher priority)
        agents_sorted = sorted(agents, key=lambda a: a.priority)

        message = (ctx.user_message or "").lower()

        # Step 0: fast rule-based routing using configurable keywords.
        best_rule_agent, best_rule_score = self._select_agent_by_rules(message, agents_sorted)
        if best_rule_agent and best_rule_score >= 0.55:
            return best_rule_agent, min(0.95, best_rule_score)

        agent_descriptions = "\n".join(f"- {a.slug}: {a.description}" for a in agents_sorted)

        routing_prompt = (
            f"You are a router. Given the user message, select the most appropriate agent.\n"
            f"Available agents:\n{agent_descriptions}\n\n"
            f"User message: {ctx.user_message}\n\n"
            "Respond with strict JSON only: "
            '{"agent": "<slug or NONE>", "confidence": <0..1>}'
        )

        model_slug = tenant_config.supervisor_model_slug
        if not model_slug:
            logger.warning("No supervisor model configured for tenant '%s'", tenant_config.slug)
            return agents_sorted[0], 0.5  # fallback to highest priority

        try:
            llm = await self._model_pool.get_llm_with_fallback(model_slug)
            response = await llm.ainvoke(routing_prompt)
            selected_slug, confidence = self._parse_router_output(response.content)

            if selected_slug == "none":
                return None, 0.0

            for agent in agents_sorted:
                if agent.slug == selected_slug:
                    logger.info("Routed to agent: %s", selected_slug)
                    return agent, confidence

            # Fuzzy fallback: if LLM returns partial match
            logger.warning("LLM returned unknown agent slug '%s', falling back to first", selected_slug)
            return agents_sorted[0], 0.3
        except Exception:
            logger.exception("Agent routing LLM call failed, falling back to first agent")
            return agents_sorted[0], 0.2

    async def _select_skill(
        self,
        ctx: WorkflowContext,
        tenant_config: TenantConfig,
        agent: AgentConfig,
        skills: list[SkillConfig],
    ) -> tuple[SkillConfig | None, float]:
        """Use LLM to pick the best skill within the selected agent."""
        if len(skills) == 1:
            return skills[0], 1.0

        message = (ctx.user_message or "").lower()
        best_rule_skill, best_rule_score = self._select_skill_by_rules(message, skills)
        if best_rule_skill and best_rule_score >= 0.55:
            return best_rule_skill, min(0.95, best_rule_score)

        skill_descriptions = "\n".join(
            f"- {s.slug}: {s.trigger_description}" for s in skills
        )

        routing_prompt = (
            f"You are {agent.name}. {agent.role_prompt}\n\n"
            f"Given the user message, select the most appropriate skill to handle it.\n"
            f"Available skills:\n{skill_descriptions}\n\n"
            f"User message: {ctx.user_message}\n\n"
            "Respond with strict JSON only: "
            '{"skill": "<slug or NONE>", "confidence": <0..1>}'
        )

        # Use agent's model or tenant supervisor model
        model_slug = agent.model_slug or tenant_config.supervisor_model_slug
        if not model_slug:
            return skills[0], 0.5

        try:
            llm = await self._model_pool.get_llm_with_fallback(model_slug)
            response = await llm.ainvoke(routing_prompt)
            selected_slug, confidence = self._parse_router_output(response.content, field="skill")

            if selected_slug == "none":
                return None, 0.0

            for skill in skills:
                if skill.slug == selected_slug:
                    logger.info("Routed to skill: %s.%s", agent.slug, selected_slug)
                    return skill, confidence

            logger.warning("LLM returned unknown skill slug '%s', falling back to first", selected_slug)
            return skills[0], 0.3
        except Exception:
            logger.exception("Skill routing LLM call failed, falling back to first skill")
            return skills[0], 0.2

    @staticmethod
    def _parse_router_output(raw: str, field: str = "agent") -> tuple[str, float]:
        text = (raw or "").strip()
        if text.startswith("```"):
            text = text.split("\n", 1)[-1]
            text = text.rsplit("```", 1)[0]
            text = text.strip()

        try:
            parsed = json.loads(text)
            slug = str(parsed.get(field, "NONE")).strip().lower()
            confidence_raw = parsed.get("confidence", 0.0)
            confidence = float(confidence_raw)
            confidence = max(0.0, min(1.0, confidence))
            return slug, confidence
        except Exception:
            cleaned = re.sub(r"[^a-zA-Z0-9_\-]", "", text).lower()
            if not cleaned:
                return "none", 0.0
            return cleaned, 0.4

    @staticmethod
    def _keyword_score(message: str, keywords: list[str]) -> float:
        if not message or not keywords:
            return 0.0

        normalized_message = AgentRouter._normalize_text(message)
        hits = 0
        for kw in keywords:
            token = AgentRouter._normalize_text(kw)
            if token and token in normalized_message:
                hits += 1
        if hits == 0:
            return 0.0
        return min(1.0, hits / max(1, len(keywords)))

    @staticmethod
    def _normalize_text(value: str) -> str:
        normalized = unicodedata.normalize("NFKD", str(value or "").strip().lower())
        ascii_text = "".join(char for char in normalized if not unicodedata.combining(char))
        return " ".join(ascii_text.replace("đ", "d").replace("Đ", "D").split())

    def _select_agent_by_rules(self, message: str, agents: list[AgentConfig]) -> tuple[AgentConfig | None, float]:
        best_agent = None
        best_score = 0.0
        for agent in agents:
            cfg = agent.routing_config or {}
            keywords = cfg.get("keywords", []) if isinstance(cfg, dict) else []
            score = self._keyword_score(message, keywords if isinstance(keywords, list) else [])
            if score > best_score:
                best_score = score
                best_agent = agent
        return best_agent, best_score

    def _select_skill_by_rules(self, message: str, skills: list[SkillConfig]) -> tuple[SkillConfig | None, float]:
        best_skill = None
        best_score = 0.0
        for skill in skills:
            keywords: list[str] = []

            input_schema = skill.input_schema if isinstance(skill.input_schema, dict) else {}
            schema_keywords = input_schema.get("intent_keywords", []) if isinstance(input_schema, dict) else []
            if isinstance(schema_keywords, list):
                keywords.extend(str(k).strip().lower() for k in schema_keywords if str(k).strip())

            words = [w.strip().lower() for w in (skill.trigger_description or "").split() if w.strip()]
            keywords.extend([w for w in words if len(w) >= 4][:10])

            score = self._keyword_score(message, keywords)
            if score > best_score:
                best_score = score
                best_skill = skill
        return best_skill, best_score

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
