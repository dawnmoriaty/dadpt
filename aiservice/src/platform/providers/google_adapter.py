"""Google Generative AI provider adapter."""

from __future__ import annotations

from langchain_core.language_models import BaseChatModel

from src.platform.providers.base import LLMProviderAdapter, ProviderConfig


class GoogleAdapter(LLMProviderAdapter):
    """Creates ChatGoogleGenerativeAI instances."""

    @property
    def provider_type(self) -> str:
        return "google"

    def build_llm(self, cfg: ProviderConfig) -> BaseChatModel:
        from langchain_google_genai import ChatGoogleGenerativeAI

        return ChatGoogleGenerativeAI(
            model=cfg.model_name,
            google_api_key=cfg.api_key,
            temperature=cfg.temperature,
            max_output_tokens=cfg.max_tokens,
            top_p=cfg.top_p,
            max_retries=1,
            timeout=30,
        )
