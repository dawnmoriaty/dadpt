"""Parallel task — run multiple branches concurrently, merge results.

Config example (in workflow JSON):
{
    "task_type": "parallel",
    "config": {
        "branches": ["search_trips", "get_faq_context"],
        "merge_strategy": "all"
    }
}

Branches reference node IDs — WorkflowExecutor runs them concurrently.
merge_strategy: "all" (wait for all), "first" (first to complete wins).

Implementation note: The parallel task itself doesn't execute branches.
It sets a special variable `_parallel_branches` that the WorkflowExecutor
reads to know which nodes to run in parallel.
"""

from __future__ import annotations

import structlog

from src.engine.task_types.base_task import BaseTask
from src.engine.workflow_context import WorkflowContext

logger = structlog.get_logger()


class ParallelTask(BaseTask):
    task_type = "parallel"

    async def execute(self, ctx: WorkflowContext) -> WorkflowContext:
        branches = self.config.get("branches", [])
        merge_strategy = self.config.get("merge_strategy", "all")

        ctx.set_var("_parallel_branches", branches)
        ctx.set_var("_parallel_merge_strategy", merge_strategy)

        logger.debug(
            "parallel.setup",
            branches=branches,
            merge_strategy=merge_strategy,
        )

        return ctx
