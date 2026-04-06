from typing import Any
from src.engine.workflow_context import WorkflowContext
from src.observability.metrics_store import get_metrics_store

def build_metrics(ctx: WorkflowContext) -> dict[str, Any]:
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

def record_observability(ctx: WorkflowContext, metrics: dict[str, Any]) -> None:
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
            for tool_call in reversed(ctx.tool_calls_log):
                tool = str(tool_call.get("tool", "") or "")
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
