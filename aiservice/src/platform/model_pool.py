"""Model Pool — lazy-init & cache LLM clients per model_instance slug.

Reads model_providers (API key: DB encrypted or env var fallback) +
model_instances (config) from DB, creates the correct LangChain LLM wrapper
via ProviderRegistry, caches it, and returns on demand.
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
from src.platform.providers.base import ProviderConfig
from src.platform.providers.registry import get_provider_registry

logger = structlog.get_logger()


def _resolve_api_key(provider: ModelProvider) -> str:
    """Resolve API key: encrypted DB value → settings/env var fallback → error.

    Priority chain:
      1. provider.encrypted_api_key (Fernet-encrypted in DB)
      2. Settings field matching api_key_env_var (Pydantic loads .env here)
      3. os.getenv(provider.api_key_env_var) (actual OS env var)
      4. ValueError
    """
    # 1. Try encrypted key from DB
    if provider.encrypted_api_key:
        from src.platform.crypto import get_crypto

        try:
            return get_crypto().decrypt(provider.encrypted_api_key)
        except ValueError:
            logger.warning(
                "model_pool.decrypt_failed",
                provider=provider.slug,
                hint="Check ENCRYPTION_KEY",
            )

    # 2. Fallback to env var (check Pydantic settings first, then os.environ)
    if provider.api_key_env_var:
        # Pydantic BaseSettings loads .env into attributes (snake_case)
        # e.g. GOOGLE_API_KEY → settings.google_api_key
        from src.config import get_settings

        settings = get_settings()
        settings_attr = provider.api_key_env_var.lower()
        settings_val = getattr(settings, settings_attr, None)
        if settings_val and settings_val not in ("", "your-openai-key", "your-google-ai-key"):
            return settings_val

        # Also check raw os.environ (for vars not in Settings model)
        env_key = os.getenv(provider.api_key_env_var, "")
        if env_key and env_key not in ("your-openai-key", "your-google-ai-key"):
            return env_key

    raise ValueError(
        f"No API key available for provider '{provider.slug}'. "
        f"Set encrypted_api_key via Admin API or configure env var '{provider.api_key_env_var}'."
    )


class ModelPool:
    """Singleton pool of LLM client instances, keyed by model_instance.slug."""

    def __init__(self) -> None:
        self._cache: dict[str, BaseChatModel] = {}
        self._configs: dict[str, ProviderConfig] = {}  # slug → typed config
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
        logger.info("model_pool.created", slug=instance_slug, model=cfg.model_name)
        return llm

    async def get_llm_with_fallback(self, instance_slug: str) -> BaseChatModel:
        """Try primary model, fall back to fallback_slug on error."""
        try:
            return await self.get_llm(instance_slug)
        except Exception:
            cfg = self._configs.get(instance_slug)
            fallback = cfg.fallback_slug if cfg else None
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
                try:
                    api_key = _resolve_api_key(prov)
                except ValueError as e:
                    logger.warning(
                        "model_pool.skip_instance",
                        slug=inst.slug,
                        reason=str(e),
                    )
                    continue

                self._configs[inst.slug] = ProviderConfig(
                    provider_type=prov.provider_type,
                    api_key=api_key,
                    base_url=prov.base_url,
                    model_name=inst.model_name,
                    temperature=inst.temperature,
                    max_tokens=inst.max_tokens,
                    top_p=inst.top_p,
                    system_prefix=inst.system_prefix,
                    fallback_slug=inst.fallback_slug,
                )
            self._loaded = True
            logger.info("model_pool.loaded", count=len(self._configs))

    @staticmethod
    def _build_llm(cfg: ProviderConfig) -> BaseChatModel:
        """Delegate LLM construction to the provider registry."""
        registry = get_provider_registry()
        adapter = registry.get(cfg.provider_type)
        return adapter.build_llm(cfg)


# ── Singleton ───────────────────────────────────────────────────────────────
_pool: ModelPool | None = None


def get_model_pool() -> ModelPool:
    global _pool
    if _pool is None:
        _pool = ModelPool()
    return _pool
