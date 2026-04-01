"""Human Input task — pause workflow, wait for user reply, then resume.

Config example (in workflow JSON):
{
    "task_type": "human_input",
    "config": {
        "prompt_template": "Tôi tìm thấy các chuyến sau:\n{search_summary}\nBạn muốn đặt chuyến nào?",
        "output_key": "user_choice"
    }
}

When executed:
1. Renders prompt_template → sets ctx.response (sent back to user)
2. Sets ctx.status = "paused"
3. WorkflowExecutor stops, serializes context to Redis
4. When user replies, context is restored, user's message → ctx.variables[output_key]
5. Workflow resumes from next node
"""

from __future__ import annotations

import structlog

from src.engine.task_types.base_task import BaseTask
from src.engine.workflow_context import WorkflowContext

logger = structlog.get_logger()


class HumanInputTask(BaseTask):
    task_type = "human_input"

    async def execute(self, ctx: WorkflowContext) -> WorkflowContext:
        prompt_template = self.config.get("prompt_template", "Vui lòng trả lời:")
        output_key = self.config.get("output_key", "user_input")
        friendly_prompt_template = self.config.get("friendly_prompt", "")
        options = self.config.get("options", [])

        # If we're resuming (user already replied), capture their response
        if ctx.status == "resuming":
            ctx.set_var(output_key, ctx.user_message)
            ctx.status = "running"
            logger.debug("human_input.resumed", output_key=output_key)
            return ctx

        # Otherwise, pause and send prompt to user
        prompt = self._render_template(prompt_template, ctx)
        if isinstance(friendly_prompt_template, str) and friendly_prompt_template.strip():
            prompt = self._render_template(friendly_prompt_template, ctx)

        if isinstance(options, list) and options:
            existing = ctx.get_var("ui_actions")
            ui_actions = existing if isinstance(existing, list) else []
            ui_actions.append(
                {
                    "type": "quick_replies",
                    "prompt": prompt,
                    "options": [str(option) for option in options if str(option).strip()],
                }
            )
            ctx.set_var("ui_actions", ui_actions)

        ctx.response = prompt
        ctx.status = "paused"
        logger.debug("human_input.paused", output_key=output_key)

        return ctx
