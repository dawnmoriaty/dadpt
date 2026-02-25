"""Model Pool — lazy-init & cache LLM clients per model_instance slug.

Reads model_providers (API key env var) + model_instances (config) from DB,
creates the correct LangChain LLM wrapper, caches it, and returns on demand.
"""

from __future__ import annotations

import asyncio
import os
from typing import Any

import structlog
from langchain_core.language_models import BaseChatModel
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from src.db.database import get_session_factory
from src.db.models import ModelInstance, ModelProvider

logger = structlog.get_logger()


class ModelPool:
    """Singleton pool of LLM client instances, keyed by model_instance.slug."""

    def __init__(self) -> None:
        self._cache: dict[str, BaseChatModel] = {}
        self._configs: dict[str, dict[str, Any]] = {}  # slug → merged config
        self._lock = asyncio.Lock()
        self._loaded = False

    # ── public API ──────────────────────────────────────────────────────────

    async def get_llm(self, instance_slug: str) -> BaseChatModel:
        """Return a cached LLM client for the given model_instance slug."""
        if not self._loaded:
            await self._load_all()

        if instance_slug in self._cache:
            return self._cache[instance_slug]

        cfg = self._configs.get(instance_slug)
        if cfg is None:
            raise ValueError(f"Model instance '{instance_slug}' not found in registry")

        llm = self._build_llm(cfg)
        self._cache[instance_slug] = llm
        logger.info("model_pool.created", slug=instance_slug, model=cfg["model_name"])
        return llm

    async def get_llm_with_fallback(self, instance_slug: str) -> BaseChatModel:
        """Try primary model, fall back to fallback_slug on error."""
        try:
            return await self.get_llm(instance_slug)
        except Exception:
            cfg = self._configs.get(instance_slug, {})
            fallback = cfg.get("fallback_slug")
            if fallback:
                logger.warning(
                    "model_pool.fallback", primary=instance_slug, fallback=fallback
                )
                return await self.get_llm(fallback)
            raise

    def invalidate(self, instance_slug: str | None = None) -> None:
        """Drop cached LLM so next call rebuilds from DB config."""
        if instance_slug:
            self._cache.pop(instance_slug, None)
            self._configs.pop(instance_slug, None)
        else:
            self._cache.clear()
            self._configs.clear()
            self._loaded = False

    async def reload(self) -> None:
        """Force reload all configs from DB."""
        self.invalidate()
        await self._load_all()

    # ── internals ───────────────────────────────────────────────────────────

    async def _load_all(self) -> None:
        async with self._lock:
            if self._loaded:
                return
            factory = get_session_factory()
            async with factory() as session:
                stmt = (
                    select(ModelInstance)
                    .options(selectinload(ModelInstance.provider))
                    .where(ModelInstance.enabled.is_(True))
                )
                result = await session.execute(stmt)
                instances = result.scalars().all()

            for inst in instances:
                prov: ModelProvider = inst.provider
                api_key = os.getenv(prov.api_key_env_var, "")
                self._configs[inst.slug] = {
                    "provider_type": prov.provider_type,
                    "api_key": api_key,
                    "base_url": prov.base_url,
                    "model_name": inst.model_name,
                    "temperature": inst.temperature,
                    "max_tokens": inst.max_tokens,
                    "top_p": inst.top_p,
                    "system_prefix": inst.system_prefix,
                    "fallback_slug": inst.fallback_slug,
                }
            self._loaded = True
            logger.info("model_pool.loaded", count=len(self._configs))

    @staticmethod
    def _build_llm(cfg: dict[str, Any]) -> BaseChatModel:
        provider = cfg["provider_type"]

        if provider == "openai":
            from langchain_openai import ChatOpenAI

            return ChatOpenAI(
                model=cfg["model_name"],
                api_key=cfg["api_key"],
                base_url=cfg.get("base_url"),
                temperature=cfg["temperature"],
                max_tokens=cfg["max_tokens"],
                top_p=cfg["top_p"],
            )

        if provider == "google":
            from langchain_google_genai import ChatGoogleGenerativeAI

            return ChatGoogleGenerativeAI(
                model=cfg["model_name"],
                google_api_key=cfg["api_key"],
                temperature=cfg["temperature"],
                max_output_tokens=cfg["max_tokens"],
                top_p=cfg["top_p"],
            )

        if provider == "anthropic":
            from langchain_anthropic import ChatAnthropic

            return ChatAnthropic(
                model=cfg["model_name"],
                api_key=cfg["api_key"],
                temperature=cfg["temperature"],
                max_tokens=cfg["max_tokens"],
                top_p=cfg["top_p"],
            )

        raise ValueError(f"Unsupported provider_type: {provider}")


# ── Singleton ───────────────────────────────────────────────────────────────
_pool: ModelPool | None = None


def get_model_pool() -> ModelPool:
    global _pool
    if _pool is None:
        _pool = ModelPool()
    return _pool
