"""Provider Registry — auto-registers all built-in adapters.

To add a new provider:
  1. Create providers/my_adapter.py implementing LLMProviderAdapter
  2. Import and register it in _register_builtins() below

That's it — ModelPool, Admin API, etc. all pick it up automatically.
"""

from __future__ import annotations

import structlog

from src.platform.providers.base import LLMProviderAdapter

logger = structlog.get_logger()


class ProviderRegistry:
    """Central registry mapping provider_type → adapter instance."""

    def __init__(self) -> None:
        self._adapters: dict[str, LLMProviderAdapter] = {}

    def register(self, adapter: LLMProviderAdapter) -> None:
        """Register a provider adapter."""
        self._adapters[adapter.provider_type] = adapter
        logger.debug("provider_registry.registered", provider_type=adapter.provider_type)

    def get(self, provider_type: str) -> LLMProviderAdapter:
        """Get adapter by provider_type. Raises ValueError if unsupported."""
        adapter = self._adapters.get(provider_type)
        if adapter is None:
            supported = ", ".join(sorted(self._adapters.keys()))
            raise ValueError(
                f"Unsupported provider_type: '{provider_type}'. "
                f"Supported: [{supported}]"
            )
        return adapter

    def supported_types(self) -> list[str]:
        """List all registered provider types."""
        return sorted(self._adapters.keys())


def _register_builtins(registry: ProviderRegistry) -> None:
    """Register all built-in provider adapters."""
    from src.platform.providers.anthropic_adapter import AnthropicAdapter
    from src.platform.providers.google_adapter import GoogleAdapter
    from src.platform.providers.huggingface_adapter import HuggingFaceAdapter
    from src.platform.providers.openai_adapter import OpenAIAdapter

    registry.register(OpenAIAdapter())
    registry.register(GoogleAdapter())
    registry.register(AnthropicAdapter())
    registry.register(HuggingFaceAdapter())


# ── Singleton ───────────────────────────────────────────────────────────────
_registry: ProviderRegistry | None = None


def get_provider_registry() -> ProviderRegistry:
    global _registry
    if _registry is None:
        _registry = ProviderRegistry()
        _register_builtins(_registry)
    return _registry
