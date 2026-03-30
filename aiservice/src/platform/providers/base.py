"""Base LLM Provider Adapter — interface that all providers must implement.

To add a new provider (e.g. Qwen, Deepseek):
  1. Create a new file: providers/qwen_adapter.py
  2. Implement LLMProviderAdapter with provider_type = "qwen"
  3. Register in providers/registry.py
"""

from __future__ import annotations

from abc import ABC, abstractmethod

from langchain_core.language_models import BaseChatModel
from pydantic import BaseModel


class ProviderConfig(BaseModel):
    """Unified config passed to every provider adapter."""

    provider_type: str
    api_key: str
    base_url: str | None = None
    model_name: str
    temperature: float = 0.3
    max_tokens: int = 2000
    top_p: float = 1.0
    frequency_penalty: float = 0.0
    presence_penalty: float = 0.0
    system_prefix: str | None = None
    fallback_slug: str | None = None


class LLMProviderAdapter(ABC):
    """Interface for LLM provider adapters.

    Each adapter knows how to create a LangChain BaseChatModel
    for its specific provider (OpenAI, Google, Anthropic, etc.).
    """

    @property
    @abstractmethod
    def provider_type(self) -> str:
        """Unique identifier: 'openai', 'google', 'anthropic', 'qwen', etc."""
        ...

    @abstractmethod
    def build_llm(self, cfg: ProviderConfig) -> BaseChatModel:
        """Create a LangChain LLM client from the given config."""
        ...
