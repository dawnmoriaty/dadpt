"""Hugging Face Inference API provider adapter.

Uses the free HF Inference API (serverless) — no billing required.
Supported models: any text-generation model on HF Hub with Inference API enabled.

Recommended free models:
  - microsoft/Phi-3-mini-4k-instruct
  - HuggingFaceH4/zephyr-7b-beta
  - mistralai/Mistral-7B-Instruct-v0.3
  - google/gemma-2-2b-it
  - Qwen/Qwen2.5-72B-Instruct  (gated — needs accept on HF)
"""

from __future__ import annotations

from langchain_core.language_models import BaseChatModel

from src.platform.providers.base import LLMProviderAdapter, ProviderConfig


class HuggingFaceAdapter(LLMProviderAdapter):
    """Creates ChatHuggingFace instances via HF Inference API (serverless, free)."""

    @property
    def provider_type(self) -> str:
        return "huggingface"

    def build_llm(self, cfg: ProviderConfig) -> BaseChatModel:
        from langchain_huggingface import (
            ChatHuggingFace,
            HuggingFaceEndpoint,
        )

        # HuggingFaceEndpoint wraps the free Inference API
        endpoint = HuggingFaceEndpoint(
            repo_id=cfg.model_name,
            huggingfacehub_api_token=cfg.api_key,
            task="text-generation",
            max_new_tokens=cfg.max_tokens,
            top_p=cfg.top_p,
            temperature=max(cfg.temperature, 0.01),  # HF requires > 0
            timeout=60,
        )

        # Wrap in ChatHuggingFace for LangChain chat interface
        return ChatHuggingFace(
            llm=endpoint,
            verbose=False,
        )
