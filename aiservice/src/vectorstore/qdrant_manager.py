"""Qdrant Manager — dynamic collection management per tenant.

Each tenant gets its own set of collections with a prefix:
  bus_trips, bus_locations, bus_faq
  banking_products, banking_faq
  ...

Handles: create collections, upsert embeddings, semantic search, cleanup.
"""

from __future__ import annotations

from typing import Any

import hashlib
import structlog
from qdrant_client import AsyncQdrantClient
from qdrant_client.models import Distance, PointStruct, VectorParams


from src.config import get_settings

logger = structlog.get_logger()


class QdrantManager:
    """Manages Qdrant collections and vector operations."""

    def __init__(self) -> None:
        self._client: AsyncQdrantClient | None = None
        self._embedding_fn = None

    async def init(self) -> None:
        """Initialize Qdrant client and embedding function."""
        settings = get_settings()
        self._client = AsyncQdrantClient(
            host=settings.qdrant_host,
            port=settings.qdrant_port,
            api_key=settings.qdrant_api_key or None,
        )
        logger.info(
            "qdrant.connected",
            host=settings.qdrant_host,
            port=settings.qdrant_port,
        )

    def _get_client(self) -> AsyncQdrantClient:
        if self._client is None:
            raise RuntimeError("QdrantManager not initialized. Call init() first.")
        return self._client

    async def _get_embedding(self, text: str) -> list[float]:
        """Get embedding vector for text using OpenAI or fallback."""
        settings = get_settings()
        if not settings.openai_api_key:
            return self._fallback_embedding(text, settings.embedding_dimensions)

        if self._embedding_fn is None:
            from langchain_openai import OpenAIEmbeddings

            self._embedding_fn = OpenAIEmbeddings(
                model=settings.embedding_model,
                api_key=settings.openai_api_key,
                dimensions=settings.embedding_dimensions,
            )
        return await self._embedding_fn.aembed_query(text)

    @staticmethod
    def _fallback_embedding(text: str, dimensions: int) -> list[float]:
        """Generate a deterministic embedding without external APIs."""
        if dimensions <= 0:
            return []
        digest = hashlib.sha256(text.encode("utf-8", errors="ignore")).digest()
        vector = []
        for i in range(dimensions):
            byte = digest[i % len(digest)]
            vector.append((byte / 255.0) * 2 - 1)
        return vector


    # ── Collection Management ───────────────────────────────────────────────

    async def ensure_collection(self, collection_name: str) -> None:
        """Create collection if it doesn't exist."""
        client = self._get_client()
        settings = get_settings()

        collections = await client.get_collections()
        existing = {c.name for c in collections.collections}

        if collection_name not in existing:
            await client.create_collection(
                collection_name=collection_name,
                vectors_config=VectorParams(
                    size=settings.embedding_dimensions,
                    distance=Distance.COSINE,
                ),
            )
            logger.info("qdrant.collection_created", name=collection_name)

    async def ensure_tenant_collections(
        self, prefix: str, collection_types: list[str] | None = None
    ) -> None:
        """Create all standard collections for a tenant."""
        if collection_types is None:
            collection_types = ["knowledge", "faq", "memory"]

        for ct in collection_types:
            await self.ensure_collection(f"{prefix}_{ct}")

    async def delete_tenant_collections(self, prefix: str) -> None:
        """Delete all collections for a tenant."""
        client = self._get_client()
        collections = await client.get_collections()
        for c in collections.collections:
            if c.name.startswith(f"{prefix}_"):
                await client.delete_collection(c.name)
                logger.info("qdrant.collection_deleted", name=c.name)

    # ── Vector Operations ───────────────────────────────────────────────────

    async def upsert(
        self,
        collection_name: str,
        documents: list[dict[str, Any]],
    ) -> int:
        """Upsert documents into a collection.

        Each document: {"id": str|int, "text": str, "metadata": dict}
        """
        await self.ensure_collection(collection_name)
        client = self._get_client()

        points = []
        for doc in documents:
            text = doc.get("text", "")
            vector = await self._get_embedding(text)
            payload = {
                "text": text,
                **(doc.get("metadata", {})),
            }
            points.append(
                PointStruct(
                    id=doc["id"] if isinstance(doc["id"], int) else hash(doc["id"]) % (2**63),
                    vector=vector,
                    payload=payload,
                )
            )

        if points:
            await client.upsert(collection_name=collection_name, points=points)
            logger.info("qdrant.upserted", collection=collection_name, count=len(points))

        return len(points)

    async def search(
        self,
        collection_name: str,
        query_text: str,
        top_k: int = 5,
    ) -> list[dict[str, Any]]:
        """Semantic search — returns list of {id, score, payload}."""
        client = self._get_client()

        # Check if collection exists
        collections = await client.get_collections()
        existing = {c.name for c in collections.collections}
        if collection_name not in existing:
            logger.warning("qdrant.collection_not_found", name=collection_name)
            return []

        query_vector = await self._get_embedding(query_text)

        results = await self._search_points(client, collection_name, query_vector, top_k)

        return [
            {
                "id": r.id,
                "score": r.score,
                "payload": r.payload,
            }
            for r in results
        ]

    @staticmethod
    async def _search_points(
        client: AsyncQdrantClient,
        collection_name: str,
        query_vector: list[float],
        top_k: int,
    ) -> list[Any]:
        if hasattr(client, "query_points"):
            response = await client.query_points(
                collection_name=collection_name,
                query=query_vector,
                limit=top_k,
                with_payload=True,
            )
            if hasattr(response, "points"):
                return response.points
            return response
        if hasattr(client, "search"):
            return await client.search(
                collection_name=collection_name,
                query_vector=query_vector,
                limit=top_k,
            )
        if hasattr(client, "search_points"):
            response = await client.search_points(
                collection_name=collection_name,
                query_vector=query_vector,
                limit=top_k,
            )
            if hasattr(response, "result"):
                return response.result
            if hasattr(response, "points"):
                return response.points
            return response
        raise AttributeError("Qdrant client has no search method")


    # ── Cleanup ─────────────────────────────────────────────────────────────

    async def close(self) -> None:
        if self._client:
            await self._client.close()
            self._client = None


# Singleton
_manager: QdrantManager | None = None


def get_qdrant_manager() -> QdrantManager:
    global _manager
    if _manager is None:
        _manager = QdrantManager()
    return _manager
