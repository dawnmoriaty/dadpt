"""Supervisor — the "brain" that routes user intent to the right workflow.

Supports two routing modes:
  1. Agent→Skill routing (new): tenant has agents → use AgentRouter for 2-level routing
  2. Flat workflow routing (legacy): tenant only has workflows → use LLM to pick workflow

Flow:
1. Receives user message + tenant_slug
2. Loads tenant config
3. If tenant has agents → AgentRouter selects Agent→Skill → run skill's workflow
4. Else if tenant has workflows → LLM selects workflow (legacy)
5. If no match → LLM answers directly (fallback)
6. Handles pause/resume for multi-turn conversations
"""

from __future__ import annotations

import json
from typing import Any

import structlog
from langchain_core.messages import HumanMessage, SystemMessage

from src.engine.agent_router import AgentRouter
from src.engine.workflow_context import WorkflowContext
from src.engine.workflow_executor import WorkflowExecutor
from src.platform.model_pool import ModelPool
from src.platform.tenant_registry import TenantConfig
from src.platform.tool_factory import ToolFactory

logger = structlog.get_logger()

# Template for the supervisor's routing prompt (legacy flat workflow mode)
ROUTING_PROMPT = """Bạn là {tenant_name} AI Assistant. Nhiệm vụ của bạn là phân tích yêu cầu của khách hàng và chọn kỹ năng (workflow) phù hợp nhất.

Các kỹ năng bạn có:
{workflow_list}

Trả về JSON THUẦN TÚY (không markdown, không code block) theo format:
{{"workflow": "<workflow_slug hoặc null>", "reason": "<lý do ngắn gọn>"}}

Nếu không có workflow nào phù hợp, trả về: {{"workflow": null, "reason": "..."}}
"""

FALLBACK_PROMPT = """Bạn là {tenant_name} AI Assistant. Hãy trả lời câu hỏi sau một cách thân thiện và hữu ích.
Nếu bạn không biết câu trả lời, hãy nói rõ.

{supervisor_prompt}"""


class Supervisor:
    """Routes user messages to the correct workflow or fallback LLM.

    Backward compatible: supports both Agent→Skill (new) and flat workflows (legacy).
    """

    def __init__(
        self,
        tenant: TenantConfig,
        model_pool: ModelPool,
        tool_factory: ToolFactory,
        qdrant_manager: Any | None = None,
    ) -> None:
        self.tenant = tenant
        self.model_pool = model_pool
        self.tool_factory = tool_factory
        self.qdrant_manager = qdrant_manager

        # Pre-build LangChain tools from tenant tool definitions
        self.lc_tools = tool_factory.create_tools(tenant.tools)

        # Build workflow executor deps
        self.executor_deps: dict[str, Any] = {
            "model_pool": model_pool,
            "tool_factory": tool_factory,
            "tenant_tools": self.lc_tools,
            "qdrant_manager": qdrant_manager,
            "qdrant_prefix": tenant.qdrant_prefix,
        }

        # Initialize AgentRouter if tenant uses agents
        self._agent_router: AgentRouter | None = None
        if tenant.has_agents:
            self._agent_router = AgentRouter(model_pool)

    async def handle(self, ctx: WorkflowContext) -> WorkflowContext:
        """Main entry point — route and execute."""

        # If resuming a paused workflow, go straight to executor
        if ctx.status == "resuming" and ctx.workflow_slug:
            return await self._resume_workflow(ctx)

        # ── New: Agent→Skill routing ──
        if self._agent_router and self.tenant.has_agents:
            return await self._handle_agent_routing(ctx)

        # ── Legacy: Flat workflow routing ──
        return await self._handle_legacy_routing(ctx)

    async def _handle_agent_routing(self, ctx: WorkflowContext) -> WorkflowContext:
        """Route via Agent→Skill hierarchy (new architecture)."""
        route_result = await self._agent_router.route(ctx, self.tenant)

        if route_result:
            agent = route_result.agent
            skill = route_result.skill

            ctx.workflow_slug = f"{agent.slug}.{skill.slug}"
            ctx.variables["_agent_slug"] = agent.slug
            ctx.variables["_skill_slug"] = skill.slug
            ctx.variables["_resolved_model"] = route_result.resolved_model_slug

            # Inject agent's role_prompt into context
            ctx.variables["_role_prompt"] = agent.role_prompt

            logger.info(
                "supervisor.agent_routed",
                tenant=self.tenant.slug,
                agent=agent.slug,
                skill=skill.slug,
                model=route_result.resolved_model_slug,
            )

            # Override model in executor deps if skill/agent specifies one
            deps = {**self.executor_deps}
            if route_result.resolved_model_slug:
                deps["override_model_slug"] = route_result.resolved_model_slug

            executor = WorkflowExecutor(deps)
            ctx = await executor.run(skill.workflow_definition, ctx)

            # If workflow errored and no response was generated, use fallback
            if ctx.status == "error" and not ctx.response:
                logger.warning(
                    "supervisor.workflow_error_fallback",
                    workflow=ctx.workflow_slug,
                    error=ctx.error,
                )
                ctx = await self._fallback_response(ctx)
        else:
            # No agent/skill matched → fallback
            ctx = await self._fallback_response(ctx)

        return ctx

    async def _handle_legacy_routing(self, ctx: WorkflowContext) -> WorkflowContext:
        """Route via flat workflow list (legacy architecture)."""
        selected_workflow = await self._route_intent(ctx)

        if selected_workflow:
            ctx.workflow_slug = selected_workflow["slug"]
            definition = selected_workflow["definition"]

            logger.info(
                "supervisor.routed",
                tenant=self.tenant.slug,
                workflow=selected_workflow["slug"],
            )

            executor = WorkflowExecutor(self.executor_deps)
            ctx = await executor.run(definition, ctx)

            # If workflow errored and no response was generated, use fallback
            if ctx.status == "error" and not ctx.response:
                ctx = await self._fallback_response(ctx)
        else:
            ctx = await self._fallback_response(ctx)

        return ctx

    async def _route_intent(self, ctx: WorkflowContext) -> dict | None:
        """Use LLM to determine which workflow matches the user's intent (legacy)."""
        workflows = self.tenant.workflows
        if not workflows:
            return None

        # Build workflow list description for the prompt
        workflow_lines = []
        for w in workflows:
            workflow_lines.append(f"- **{w['slug']}**: {w['trigger_description']}")
        workflow_list = "\n".join(workflow_lines)

        routing_prompt = ROUTING_PROMPT.format(
            tenant_name=self.tenant.name,
            workflow_list=workflow_list,
        )

        # Use supervisor model or first available model
        model_slug = self.tenant.supervisor_model_slug
        if not model_slug:
            logger.warning("supervisor.no_model", tenant=self.tenant.slug)
            return None

        try:
            llm = await self.model_pool.get_llm_with_fallback(model_slug)
            messages = [
                SystemMessage(content=routing_prompt),
                HumanMessage(content=ctx.user_message),
            ]
            response = await llm.ainvoke(messages)
            content = response.content if hasattr(response, "content") else str(response)

            # Parse JSON response
            # Strip markdown code blocks if present
            content = content.strip()
            if content.startswith("```"):
                content = content.split("\n", 1)[-1]
                content = content.rsplit("```", 1)[0]
            content = content.strip()

            result = json.loads(content)
            selected_slug = result.get("workflow")

            if selected_slug:
                # Find the workflow definition
                for w in workflows:
                    if w["slug"] == selected_slug:
                        logger.debug(
                            "supervisor.intent_matched",
                            workflow=selected_slug,
                            reason=result.get("reason", ""),
                        )
                        return w

            logger.debug("supervisor.no_match", reason=result.get("reason", ""))
            return None

        except (json.JSONDecodeError, Exception) as e:
            logger.error("supervisor.routing_error", error=str(e))
            return None

    async def _fallback_response(self, ctx: WorkflowContext) -> WorkflowContext:
        """Generate a direct LLM response when no workflow matches."""
        model_slug = self.tenant.supervisor_model_slug
        if not model_slug:
            ctx.response = self.tenant.fallback_message
            ctx.status = "completed"
            return ctx

        try:
            llm = await self.model_pool.get_llm_with_fallback(model_slug)
            system = FALLBACK_PROMPT.format(
                tenant_name=self.tenant.name,
                supervisor_prompt=self.tenant.supervisor_prompt or "",
            )
            messages = [
                SystemMessage(content=system),
                *[
                    HumanMessage(content=m["content"])
                    if m["role"] == "user"
                    else SystemMessage(content=m["content"])
                    for m in ctx.messages[-10:]  # last 10 messages for context
                ],
                HumanMessage(content=ctx.user_message),
            ]
            response = await llm.ainvoke(messages)
            ctx.response = response.content if hasattr(response, "content") else str(response)
        except Exception as e:
            logger.error("supervisor.fallback_error", error=str(e))
            ctx.response = self.tenant.fallback_message

        ctx.status = "completed"
        return ctx

    async def _resume_workflow(self, ctx: WorkflowContext) -> WorkflowContext:
        """Resume a paused workflow (e.g., after human_input)."""
        workflow_slug = ctx.workflow_slug

        # Check if it's an agent.skill slug (new format)
        if "." in workflow_slug:
            agent_slug, skill_slug = workflow_slug.split(".", 1)
            for agent in self.tenant.agents:
                if agent.slug == agent_slug:
                    for skill in agent.skills:
                        if skill.slug == skill_slug:
                            executor = WorkflowExecutor(self.executor_deps)
                            ctx = await executor.run(skill.workflow_definition, ctx)
                            return ctx

        # Legacy flat workflow resume
        definition = None
        for w in self.tenant.workflows:
            if w["slug"] == workflow_slug:
                definition = w["definition"]
                break

        if not definition:
            ctx.error = f"Workflow '{workflow_slug}' not found for resume"
            ctx.status = "error"
            return ctx

        executor = WorkflowExecutor(self.executor_deps)
        ctx = await executor.run(definition, ctx)
        return ctx
