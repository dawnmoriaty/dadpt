"""RAG Query task — semantic search against Qdrant vector DB.

Config example (in workflow JSON):
{
    "task_type": "rag_query",
    "config": {
        "collection": "faq",
        "query_key": "user_message",
        "top_k": 5,
        "output_key": "rag_context"
    }
}

If collection is relative (no prefix), it auto-prepends tenant's qdrant_prefix.
"""

from __future__ import annotations

import structlog

from src.engine.task_types.base_task import BaseTask
from src.engine.workflow_context import WorkflowContext

logger = structlog.get_logger()


class RAGQueryTask(BaseTask):
    task_type = "rag_query"

    async def execute(self, ctx: WorkflowContext) -> WorkflowContext:
        collection = self.config.get("collection", "faq")
        query_key = self.config.get("query_key", "user_message")
        top_k = self.config.get("top_k", 5)
        output_key = self.config.get("output_key", "rag_context")
        keyword_top_k = int(self.config.get("keyword_top_k", 3))
        hybrid = bool(self.config.get("hybrid", True))

        qdrant_manager = self.deps.get("qdrant_manager")
        if not qdrant_manager:
            ctx.set_var(output_key, "")
            ctx.set_var(
                "rag_metrics",
                {
                    "collection": "",
                    "semantic_count": 0,
                    "keyword_count": 0,
                    "merged_count": 0,
                    "hybrid": hybrid,
                    "disabled": True,
                },
            )
            return ctx

        # Get query text from context
        query_text = ctx.get_var(query_key, ctx.user_message)
        if not query_text:
            ctx.set_var(output_key, [])
            return ctx

        # Auto-prefix collection with tenant prefix
        tenant_prefix = self.deps.get("qdrant_prefix", ctx.tenant_slug)
        full_collection = f"{tenant_prefix}_{collection}"

        try:
            semantic_results = await qdrant_manager.search(
                collection_name=full_collection,
                query_text=str(query_text),
                top_k=top_k,
            )
            keyword_results = []
            if hybrid:
                keyword_results = _keyword_search(semantic_results, str(query_text), keyword_top_k)

            results = _merge_results(semantic_results, keyword_results, top_k)
            # Format results as readable text
            context_texts = []
            for r in results:
                payload = r.get("payload", {})
                text = payload.get("text", str(payload))
                score = r.get("score", 0)
                context_texts.append(f"[score={score:.3f}] {text}")

            ctx.set_var(output_key, "\n\n".join(context_texts))
            ctx.set_var(
                "rag_metrics",
                {
                    "collection": full_collection,
                    "semantic_count": len(semantic_results),
                    "keyword_count": len(keyword_results),
                    "merged_count": len(results),
                    "hybrid": hybrid,
                },
            )
            logger.debug(
                "rag_query.done",
                collection=full_collection,
                results=len(results),
                semantic_count=len(semantic_results),
                keyword_count=len(keyword_results),
                hybrid=hybrid,
                trace_id=ctx.trace_id,
            )
        except Exception as e:
            logger.error("rag_query.error", collection=full_collection, error=str(e))
            # Non-fatal: set empty context, continue workflow
            ctx.set_var(output_key, "")

        return ctx


def _keyword_search(results: list[dict], query: str, top_k: int) -> list[dict]:
    terms = [t for t in query.lower().split() if len(t) >= 2]
    if not terms:
        return []

    scored: list[tuple[int, dict]] = []
    for item in results:
        payload = item.get("payload", {})
        text = str(payload.get("text", "")).lower()
        hits = sum(1 for term in terms if term in text)
        if hits > 0:
            clone = dict(item)
            clone["score"] = max(float(clone.get("score", 0.0)), 0.2 + (hits * 0.05))
            scored.append((hits, clone))

    scored.sort(key=lambda pair: pair[0], reverse=True)
    return [pair[1] for pair in scored[:top_k]]


def _merge_results(semantic_results: list[dict], keyword_results: list[dict], top_k: int) -> list[dict]:
    merged: dict[Any, dict] = {}
    for item in semantic_results + keyword_results:
        key = item.get("id")
        if key not in merged:
            merged[key] = item
            continue
        if float(item.get("score", 0.0)) > float(merged[key].get("score", 0.0)):
            merged[key] = item

    out = list(merged.values())
    out.sort(key=lambda x: float(x.get("score", 0.0)), reverse=True)
    return out[:top_k]
