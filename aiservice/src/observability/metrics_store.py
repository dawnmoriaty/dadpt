"""In-memory metrics store for chat/task observability.

Phase 3.1 goals:
- Rolling window summary (default 5 minutes)
- p50/p95 latency for chat and task groups
- Breakdowns by workflow/task/model/tool
"""

from __future__ import annotations

import time
from collections import Counter, defaultdict, deque
from typing import Any


class MetricsStore:
    def __init__(self, max_events: int = 10000) -> None:
        self._chat_events: deque[dict[str, Any]] = deque(maxlen=max_events)
        self._task_events: deque[dict[str, Any]] = deque(maxlen=max_events * 3)

    def record_chat(self, event: dict[str, Any]) -> None:
        event = dict(event)
        event.setdefault("ts", time.time())
        self._chat_events.append(event)

    def record_task(self, event: dict[str, Any]) -> None:
        event = dict(event)
        event.setdefault("ts", time.time())
        self._task_events.append(event)

    def summary(self, window_seconds: int = 300) -> dict[str, Any]:
        now = time.time()
        chat_events = [e for e in self._chat_events if now - float(e.get("ts", 0)) <= window_seconds]
        task_events = [e for e in self._task_events if now - float(e.get("ts", 0)) <= window_seconds]

        chat_latencies = [float(e.get("total_latency_ms", 0.0) or 0.0) for e in chat_events]
        status_counter = Counter(str(e.get("status", "unknown")) for e in chat_events)
        workflow_counter = Counter(str(e.get("workflow_slug", "")) for e in chat_events)

        task_by_type: dict[str, list[float]] = defaultdict(list)
        model_counter: Counter[str] = Counter()
        tool_counter: Counter[str] = Counter()

        for task in task_events:
            t = str(task.get("task_type", "unknown"))
            elapsed = float(task.get("elapsed_ms", 0.0) or 0.0)
            task_by_type[t].append(elapsed)

            model = str(task.get("model", "") or "")
            if model:
                model_counter[model] += 1

            tool = str(task.get("tool", "") or "")
            if tool:
                tool_counter[tool] += 1

        task_breakdown = {
            t: {
                "count": len(vals),
                "avg_ms": round(sum(vals) / len(vals), 2) if vals else 0.0,
                "p50_ms": round(_percentile(vals, 50), 2),
                "p95_ms": round(_percentile(vals, 95), 2),
            }
            for t, vals in task_by_type.items()
        }

        return {
            "window_seconds": window_seconds,
            "chat": {
                "count": len(chat_events),
                "status": dict(status_counter),
                "avg_latency_ms": round(sum(chat_latencies) / len(chat_latencies), 2) if chat_latencies else 0.0,
                "p50_latency_ms": round(_percentile(chat_latencies, 50), 2),
                "p95_latency_ms": round(_percentile(chat_latencies, 95), 2),
                "workflows": dict(workflow_counter),
            },
            "tasks": {
                "count": len(task_events),
                "by_type": task_breakdown,
                "models": dict(model_counter),
                "tools": dict(tool_counter),
            },
        }


def _percentile(values: list[float], p: int) -> float:
    if not values:
        return 0.0
    sorted_vals = sorted(values)
    idx = int(round((p / 100) * (len(sorted_vals) - 1)))
    idx = max(0, min(idx, len(sorted_vals) - 1))
    return sorted_vals[idx]


_store: MetricsStore | None = None


def get_metrics_store() -> MetricsStore:
    global _store
    if _store is None:
        _store = MetricsStore()
    return _store
