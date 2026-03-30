"""OpenAI provider adapter."""

from __future__ import annotations

from langchain_core.language_models import BaseChatModel

from src.platform.providers.base import LLMProviderAdapter, ProviderConfig


class OpenAIAdapter(LLMProviderAdapter):
    """Creates ChatOpenAI instances."""

    @property
    def provider_type(self) -> str:
        return "openai"

    def build_llm(self, cfg: ProviderConfig) -> BaseChatModel:
        from langchain_openai import ChatOpenAI

        return ChatOpenAI(
            model=cfg.model_name,
            api_key=cfg.api_key,
            base_url=cfg.base_url,
            temperature=cfg.temperature,
            max_tokens=cfg.max_tokens,
            top_p=cfg.top_p,
            frequency_penalty=cfg.frequency_penalty,
            presence_penalty=cfg.presence_penalty,
        )
