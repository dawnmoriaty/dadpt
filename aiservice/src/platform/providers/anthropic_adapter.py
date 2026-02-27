"""Anthropic provider adapter."""

from __future__ import annotations

from langchain_core.language_models import BaseChatModel

from src.platform.providers.base import LLMProviderAdapter, ProviderConfig


class AnthropicAdapter(LLMProviderAdapter):
    """Creates ChatAnthropic instances."""

    @property
    def provider_type(self) -> str:
        return "anthropic"

    def build_llm(self, cfg: ProviderConfig) -> BaseChatModel:
        from langchain_anthropic import ChatAnthropic

        return ChatAnthropic(
            model=cfg.model_name,
            api_key=cfg.api_key,
            temperature=cfg.temperature,
            max_tokens=cfg.max_tokens,
            top_p=cfg.top_p,
        )
