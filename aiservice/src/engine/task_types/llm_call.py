"""LLM Call task — invoke any LLM model from the model pool.

Config example (in workflow JSON):
{
    "task_type": "llm_call",
    "config": {
        "model": "bus-search-gpt",
        "prompt_template": "Phân tích yêu cầu: {user_message}",
        "system_prompt": "Bạn là nhân viên tìm kiếm chuyến xe.",
        "output_key": "intent_analysis"
    }
}
"""

from __future__ import annotations

import structlog
from langchain_core.messages import HumanMessage, SystemMessage

from src.engine.task_types.base_task import BaseTask
from src.engine.workflow_context import WorkflowContext

logger = structlog.get_logger()


class LLMCallTask(BaseTask):
    task_type = "llm_call"

    async def execute(self, ctx: WorkflowContext) -> WorkflowContext:
        model_slug = self.config.get("model", "")
        prompt_template = self.config.get("prompt_template", "{user_message}")
        system_prompt = self.config.get("system_prompt", "")
        output_key = self.config.get("output_key", "llm_output")

        # Resolve model from pool
        model_pool = self.deps.get("model_pool")
        if not model_pool:
            ctx.error = "model_pool dependency not injected"
            ctx.status = "error"
            return ctx

        try:
            llm = await model_pool.get_llm_with_fallback(model_slug)
        except ValueError as e:
            ctx.error = str(e)
            ctx.status = "error"
            return ctx

        # Render prompt
        prompt = self._render_template(prompt_template, ctx)

        # Build messages
        messages = []
        if system_prompt:
            rendered_system = self._render_template(system_prompt, ctx)
            messages.append(SystemMessage(content=rendered_system))
        messages.append(HumanMessage(content=prompt))

        # Invoke LLM
        try:
            response = await llm.ainvoke(messages)
            result = response.content if hasattr(response, "content") else str(response)
        except Exception as e:
            logger.error("llm_call.error", model=model_slug, error=str(e))
            ctx.error = f"LLM call failed: {e}"
            ctx.status = "error"
            return ctx

        # Store result
        ctx.set_var(output_key, result)
        logger.debug("llm_call.done", model=model_slug, output_key=output_key, length=len(result))

        return ctx
