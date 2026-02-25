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

        qdrant_manager = self.deps.get("qdrant_manager")
        if not qdrant_manager:
            ctx.error = "qdrant_manager dependency not injected"
            ctx.status = "error"
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
            results = await qdrant_manager.search(
                collection_name=full_collection,
                query_text=str(query_text),
                top_k=top_k,
            )
            # Format results as readable text
            context_texts = []
            for r in results:
                payload = r.get("payload", {})
                text = payload.get("text", str(payload))
                score = r.get("score", 0)
                context_texts.append(f"[score={score:.3f}] {text}")

            ctx.set_var(output_key, "\n\n".join(context_texts))
            logger.debug(
                "rag_query.done",
                collection=full_collection,
                results=len(results),
            )
        except Exception as e:
            logger.error("rag_query.error", collection=full_collection, error=str(e))
            # Non-fatal: set empty context, continue workflow
            ctx.set_var(output_key, "")

        return ctx
