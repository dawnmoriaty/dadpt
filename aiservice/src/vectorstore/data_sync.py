"""Data Sync — ingest data from Go backend (via gRPC) into Qdrant.

Uses Polars for high-performance data transformation before embedding.
Two modes:
  1. gRPC pull: AI service calls backend to fetch data (Phase 1 - simpler)
  2. RabbitMQ consume: listen to outbox events (Phase 2 - realtime)
"""

from __future__ import annotations

import json
from typing import Any

import polars as pl
import structlog

from src.vectorstore.qdrant_manager import QdrantManager

logger = structlog.get_logger()


class DataSyncPipeline:
    """Transform raw data (from gRPC/MQ) → Polars → embed → upsert Qdrant."""

    def __init__(self, qdrant_manager: QdrantManager) -> None:
        self.qdrant = qdrant_manager

    async def sync_trips(
        self,
        tenant_prefix: str,
        raw_data: list[dict[str, Any]],
    ) -> int:
        """Transform trip data → embedding-ready documents → upsert."""
        if not raw_data:
            return 0

        df = pl.DataFrame(raw_data)

        # Build searchable text using Polars
        # Each trip becomes: "Chuyến xe từ {origin} đến {destination}, khởi hành {time}, giá {price}đ"
        documents = []
        for row in df.iter_rows(named=True):
            text_parts = [
                f"Chuyến xe từ {row.get('origin_name', '')} ({row.get('origin_city', '')})",
                f"đến {row.get('destination_name', '')} ({row.get('destination_city', '')})",
                f"khởi hành {row.get('departure_time', '')}",
                f"đến {row.get('arrival_time', '')}",
                f"giá {row.get('base_price', 0)}đ",
                f"nhà xe {row.get('provider_name', '')}",
                f"còn {row.get('available_seats', 0)} ghế",
                f"trạng thái {row.get('status', '')}",
            ]
            if row.get("is_hot_deal"):
                text_parts.append("ƯU ĐÃI ĐẶC BIỆT")

            text = ", ".join(text_parts)
            documents.append(
                {
                    "id": row.get("id", 0),
                    "text": text,
                    "metadata": {
                        "trip_id": row.get("id"),
                        "origin": row.get("origin_name"),
                        "destination": row.get("destination_name"),
                        "departure_time": str(row.get("departure_time", "")),
                        "base_price": row.get("base_price"),
                        "available_seats": row.get("available_seats"),
                        "status": row.get("status"),
                        "provider": row.get("provider_name"),
                    },
                }
            )

        collection = f"{tenant_prefix}_trips"
        count = await self.qdrant.upsert(collection, documents)
        logger.info("data_sync.trips", tenant=tenant_prefix, count=count)
        return count

    async def sync_locations(
        self,
        tenant_prefix: str,
        raw_data: list[dict[str, Any]],
    ) -> int:
        """Transform location data → embedding-ready documents → upsert."""
        if not raw_data:
            return 0

        documents = []
        for loc in raw_data:
            text = f"{loc.get('name', '')} - {loc.get('city', '')} - {loc.get('address', '')} {loc.get('keywords', '')}"
            documents.append(
                {
                    "id": loc.get("id", 0),
                    "text": text.strip(),
                    "metadata": {
                        "location_id": loc.get("id"),
                        "name": loc.get("name"),
                        "city": loc.get("city"),
                        "address": loc.get("address"),
                    },
                }
            )

        collection = f"{tenant_prefix}_locations"
        count = await self.qdrant.upsert(collection, documents)
        logger.info("data_sync.locations", tenant=tenant_prefix, count=count)
        return count

    async def sync_faq(
        self,
        tenant_prefix: str,
        raw_data: list[dict[str, Any]],
    ) -> int:
        """Sync FAQ/knowledge base documents."""
        if not raw_data:
            return 0

        documents = []
        for i, item in enumerate(raw_data):
            question = item.get("question", "")
            answer = item.get("answer", "")
            text = f"Câu hỏi: {question}\nTrả lời: {answer}"
            documents.append(
                {
                    "id": item.get("id", i),
                    "text": text,
                    "metadata": {
                        "question": question,
                        "answer": answer,
                        "category": item.get("category", "general"),
                    },
                }
            )

        collection = f"{tenant_prefix}_faq"
        count = await self.qdrant.upsert(collection, documents)
        logger.info("data_sync.faq", tenant=tenant_prefix, count=count)
        return count

    async def sync_generic(
        self,
        collection_name: str,
        raw_data: list[dict[str, Any]],
        text_field: str = "text",
    ) -> int:
        """Generic sync — just embed the text_field and upsert."""
        if not raw_data:
            return 0

        documents = []
        for i, item in enumerate(raw_data):
            text = item.get(text_field, str(item))
            doc_id = item.get("id", i)
            metadata = {k: v for k, v in item.items() if k not in ("id", text_field)}
            documents.append({"id": doc_id, "text": text, "metadata": metadata})

        count = await self.qdrant.upsert(collection_name, documents)
        logger.info("data_sync.generic", collection=collection_name, count=count)
        return count
