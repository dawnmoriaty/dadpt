"""Condition task — BPMN-style gateway, branches based on expression.

Config example (in workflow JSON):
{
    "task_type": "condition",
    "config": {
        "expression": "len(search_results) > 0",
        "true_branch": "format_results",
        "false_branch": "no_results_msg"
    }
}

The expression is evaluated with ctx.variables as local scope.
Result stored in ctx.variables["_condition_result"] as "true" or "false".
The WorkflowExecutor reads _condition_result to pick the correct edge.
"""

from __future__ import annotations

import structlog

from src.engine.task_types.base_task import BaseTask
from src.engine.workflow_context import WorkflowContext

logger = structlog.get_logger()

# Safe builtins allowed in condition expressions
_SAFE_BUILTINS = {
    "len": len,
    "int": int,
    "float": float,
    "str": str,
    "bool": bool,
    "abs": abs,
    "min": min,
    "max": max,
    "round": round,
    "isinstance": isinstance,
    "any": any,
    "all": all,
    "True": True,
    "False": False,
    "None": None,
}


class ConditionTask(BaseTask):
    task_type = "condition"

    async def execute(self, ctx: WorkflowContext) -> WorkflowContext:
        expression = self.config.get("expression", "True")

        try:
            # Evaluate expression in a sandboxed scope
            eval_scope = {**_SAFE_BUILTINS, **ctx.variables}
            result = bool(eval(expression, {"__builtins__": {}}, eval_scope))
        except Exception as e:
            logger.error("condition.eval_error", expression=expression, error=str(e))
            result = False

        ctx.set_var("_condition_result", "true" if result else "false")
        logger.debug("condition.evaluated", expression=expression, result=result)

        return ctx
