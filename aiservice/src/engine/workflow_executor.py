"""Workflow Executor — runs a BPMN-style workflow definition (JSON DAG).

Given a workflow definition like:
{
  "nodes": {
    "extract": {"task_type": "llm_call", "config": {...}},
    "search":  {"task_type": "grpc_call", "config": {...}},
    ...
  },
  "edges": [
    {"from": "START", "to": "extract"},
    {"from": "extract", "to": "search"},
    {"from": "search", "to": "check", "condition": "true"},
    ...
  ]
}

The executor:
1. Parses nodes + edges into a DAG
2. Starts at START, follows edges
3. For each node: lookup task_type → TaskRegistry → execute(context)
4. Condition nodes: reads ctx._condition_result to pick edge
5. Human input nodes: pauses, serializes context, resumes later
6. Parallel nodes: runs branches concurrently via asyncio.gather
"""

from __future__ import annotations

import asyncio
import copy
import json
from typing import Any

import structlog

from src.engine.task_registry import create_task
from src.engine.workflow_context import WorkflowContext

logger = structlog.get_logger()

# Special node names
START = "START"
END = "END"


class WorkflowExecutor:
    """Execute a BPMN-style workflow definition against a WorkflowContext."""

    def __init__(self, deps: dict[str, Any]) -> None:
        """
        Args:
            deps: Shared dependencies injected into every task.
                  Keys: model_pool, tool_factory, tenant_tools, qdrant_manager, qdrant_prefix
        """
        self.deps = deps

    async def run(
        self,
        definition: dict[str, Any],
        ctx: WorkflowContext,
    ) -> WorkflowContext:
        """Run the full workflow from START to END (or until paused)."""
        nodes: dict[str, dict] = definition.get("nodes", {})
        edges: list[dict] = definition.get("edges", [])

        # Build adjacency: node_id → list of (target_id, condition|None)
        adjacency = self._build_adjacency(edges)

        # Find start node
        start_targets = adjacency.get(START, [])
        if not start_targets:
            ctx.error = "Workflow has no START edge"
            ctx.status = "error"
            return ctx

        # If resuming from pause, jump to the paused node
        if ctx.status == "resuming" and ctx.current_node:
            current = ctx.current_node
            ctx.status = "resuming"
        else:
            current = start_targets[0][0]  # first target from START
            ctx.status = "running"

        # Execute nodes in sequence following edges
        max_iterations = 50  # safety limit
        iteration = 0

        while current != END and iteration < max_iterations:
            iteration += 1

            if current not in nodes:
                ctx.error = f"Node '{current}' not found in workflow definition"
                ctx.status = "error"
                break

            node_def = nodes[current]
            task_type = node_def.get("task_type", "")
            task_config = node_def.get("config", {})

            ctx.current_node = current
            ctx.visited_nodes.append(current)

            logger.debug(
                "workflow.executing_node",
                node=current,
                task_type=task_type,
                iteration=iteration,
            )

            # Handle parallel task specially
            if task_type == "parallel":
                ctx = await self._execute_parallel(node_def, nodes, adjacency, ctx)
                if ctx.status in ("paused", "error"):
                    break
            else:
                # Create and execute task
                try:
                    task = create_task(task_type, task_config, **self.deps)
                    ctx = await task.execute(ctx)
                except Exception as e:
                    logger.error("workflow.task_error", node=current, error=str(e))
                    ctx.error = f"Task '{current}' failed: {e}"
                    ctx.status = "error"
                    break

            # Check if paused (human_input)
            if ctx.status == "paused":
                logger.info("workflow.paused", node=current)
                break

            # Check if error
            if ctx.status == "error":
                break

            # Follow edges to next node
            current = self._resolve_next_node(current, adjacency, ctx)

        # If we exited the loop normally
        if current == END:
            ctx.status = "completed"
            ctx.current_node = END

        if iteration >= max_iterations:
            ctx.error = "Workflow exceeded maximum iterations"
            ctx.status = "error"

        logger.info(
            "workflow.finished",
            status=ctx.status,
            nodes_visited=len(ctx.visited_nodes),
        )

        return ctx

    def _build_adjacency(
        self, edges: list[dict]
    ) -> dict[str, list[tuple[str, str | None]]]:
        """Build adjacency list from edge definitions."""
        adj: dict[str, list[tuple[str, str | None]]] = {}
        for edge in edges:
            src = edge.get("from", "")
            tgt = edge.get("to", "")
            condition = edge.get("condition")  # "true", "false", or None
            adj.setdefault(src, []).append((tgt, condition))
        return adj

    def _resolve_next_node(
        self,
        current: str,
        adjacency: dict[str, list[tuple[str, str | None]]],
        ctx: WorkflowContext,
    ) -> str:
        """Determine which node to go to next based on edges + condition results."""
        targets = adjacency.get(current, [])

        if not targets:
            return END

        # If there's a condition result (from a condition node), use it
        condition_result = ctx.get_var("_condition_result")

        if condition_result is not None:
            # Look for a matching conditional edge
            for target, cond in targets:
                if cond == condition_result:
                    # Clear condition result after using it
                    ctx.variables.pop("_condition_result", None)
                    return target
            # If no conditional edge matched, try unconditional
            for target, cond in targets:
                if cond is None:
                    ctx.variables.pop("_condition_result", None)
                    return target
            # Clear anyway
            ctx.variables.pop("_condition_result", None)
            return END

        # No condition — take the first unconditional edge (or first edge)
        for target, cond in targets:
            if cond is None:
                return target

        # Fallback: first edge regardless
        return targets[0][0] if targets else END

    async def _execute_parallel(
        self,
        node_def: dict,
        nodes: dict[str, dict],
        adjacency: dict[str, list[tuple[str, str | None]]],
        ctx: WorkflowContext,
    ) -> WorkflowContext:
        """Execute parallel branches concurrently."""
        config = node_def.get("config", {})
        branches = config.get("branches", [])
        merge_strategy = config.get("merge_strategy", "all")

        if not branches:
            return ctx

        async def _run_branch(branch_node_id: str) -> dict[str, Any]:
            """Run a single branch node and return its variables."""
            if branch_node_id not in nodes:
                return {}
            branch_def = nodes[branch_node_id]
            task_type = branch_def.get("task_type", "")
            task_config = branch_def.get("config", {})

            # Create a shallow copy of context for this branch
            branch_ctx = copy.copy(ctx)
            branch_ctx.variables = dict(ctx.variables)

            try:
                task = create_task(task_type, task_config, **self.deps)
                branch_ctx = await task.execute(branch_ctx)
                return branch_ctx.variables
            except Exception as e:
                logger.error("parallel.branch_error", node=branch_node_id, error=str(e))
                return {}

        if merge_strategy == "first":
            # Return first completed
            done, pending = await asyncio.wait(
                [asyncio.create_task(_run_branch(b)) for b in branches],
                return_when=asyncio.FIRST_COMPLETED,
            )
            for p in pending:
                p.cancel()
            for task in done:
                ctx.variables.update(task.result())
                break
        else:
            # Wait for all
            results = await asyncio.gather(
                *[_run_branch(b) for b in branches],
                return_exceptions=True,
            )
            for r in results:
                if isinstance(r, dict):
                    ctx.variables.update(r)

        # Mark parallel branches as visited
        ctx.visited_nodes.extend(branches)

        return ctx
