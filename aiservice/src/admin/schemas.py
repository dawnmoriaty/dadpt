"""Pydantic schemas for Admin API request/response validation."""

from __future__ import annotations

from pydantic import BaseModel


# ─── Model Providers ────────────────────────────────────────────────────────

class ProviderCreate(BaseModel):
    slug: str
    name: str
    provider_type: str  # openai | google | anthropic | qwen | deepseek ...
    api_key_env_var: str = ""  # fallback env var (e.g. "OPENAI_API_KEY")
    api_key: str | None = None  # plaintext API key → encrypted before storing
    base_url: str | None = None
    rate_limit_rpm: int = 500

class ProviderUpdate(BaseModel):
    name: str | None = None
    provider_type: str | None = None
    api_key_env_var: str | None = None
    api_key: str | None = None  # new plaintext key → re-encrypt
    base_url: str | None = None
    rate_limit_rpm: int | None = None
    enabled: bool | None = None

class ProviderOut(BaseModel):
    id: int
    slug: str
    name: str
    provider_type: str
    api_key_env_var: str
    has_api_key: bool = False  # True if encrypted key exists in DB (never expose key)
    base_url: str | None
    rate_limit_rpm: int
    enabled: bool

    model_config = {"from_attributes": True}


# ─── Tenants ────────────────────────────────────────────────────────────────

class TenantCreate(BaseModel):
    slug: str
    name: str
    description: str | None = None
    grpc_target: str
    qdrant_prefix: str
    supervisor_model_slug: str | None = None
    supervisor_prompt: str | None = None
    max_turns: int = 20
    fallback_message: str = "Xin lỗi, tôi chưa hiểu yêu cầu của bạn."

class TenantUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    grpc_target: str | None = None
    qdrant_prefix: str | None = None
    supervisor_model_slug: str | None = None
    supervisor_prompt: str | None = None
    max_turns: int | None = None
    fallback_message: str | None = None
    enabled: bool | None = None

class TenantOut(BaseModel):
    id: int
    slug: str
    name: str
    description: str | None
    grpc_target: str
    qdrant_prefix: str
    supervisor_model_slug: str | None
    max_turns: int
    enabled: bool

    model_config = {"from_attributes": True}


# ─── Model Instances ────────────────────────────────────────────────────────

class ModelInstanceCreate(BaseModel):
    slug: str
    display_name: str
    provider_id: int
    model_name: str  # gpt-4o, gemini-2.0-flash, etc.
    temperature: float = 0.3
    max_tokens: int = 2000
    top_p: float = 1.0
    system_prefix: str | None = None
    purpose: str = "general"
    fallback_slug: str | None = None

class ModelInstanceUpdate(BaseModel):
    display_name: str | None = None
    provider_id: int | None = None
    model_name: str | None = None
    temperature: float | None = None
    max_tokens: int | None = None
    top_p: float | None = None
    system_prefix: str | None = None
    purpose: str | None = None
    fallback_slug: str | None = None
    enabled: bool | None = None

class ModelInstanceOut(BaseModel):
    id: int
    slug: str
    display_name: str
    provider_id: int
    model_name: str
    temperature: float
    max_tokens: int
    top_p: float
    purpose: str
    fallback_slug: str | None
    enabled: bool

    model_config = {"from_attributes": True}


# ─── Tool Definitions ──────────────────────────────────────────────────────

class ToolCreate(BaseModel):
    name: str
    description: str
    grpc_method: str
    input_schema: dict
    output_schema: dict | None = None

class ToolUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    grpc_method: str | None = None
    input_schema: dict | None = None
    output_schema: dict | None = None
    enabled: bool | None = None

class ToolOut(BaseModel):
    id: int
    name: str
    description: str
    grpc_method: str
    input_schema: dict
    output_schema: dict | None
    enabled: bool

    model_config = {"from_attributes": True}


# ─── Workflows (LEGACY) ─────────────────────────────────────────────────────

class WorkflowCreate(BaseModel):
    name: str
    slug: str
    description: str | None = None
    trigger_description: str
    definition: dict  # {"nodes": {...}, "edges": [...]}

class WorkflowUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    trigger_description: str | None = None
    definition: dict | None = None
    enabled: bool | None = None

class WorkflowOut(BaseModel):
    id: int
    name: str
    slug: str
    description: str | None
    trigger_description: str
    definition: dict
    enabled: bool

    model_config = {"from_attributes": True}


# ─── Agent Definitions ──────────────────────────────────────────────────────

class AgentCreate(BaseModel):
    slug: str
    name: str
    description: str
    role_prompt: str
    model_slug: str | None = None
    icon: str | None = None
    priority: int = 0
    routing_config: dict | None = None

class AgentUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    role_prompt: str | None = None
    model_slug: str | None = None
    icon: str | None = None
    priority: int | None = None
    routing_config: dict | None = None
    enabled: bool | None = None

class AgentOut(BaseModel):
    id: int
    tenant_id: int
    slug: str
    name: str
    description: str
    role_prompt: str
    model_slug: str | None
    icon: str | None
    priority: int
    routing_config: dict | None
    enabled: bool

    model_config = {"from_attributes": True}


# ─── Skill Definitions ─────────────────────────────────────────────────────

class SkillCreate(BaseModel):
    slug: str
    name: str
    description: str
    trigger_description: str
    model_slug: str | None = None
    workflow_definition: dict  # {"nodes": {...}, "edges": [...]}
    input_schema: dict | None = None
    output_schema: dict | None = None
    config_timer: dict | None = None

class SkillUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    trigger_description: str | None = None
    model_slug: str | None = None
    workflow_definition: dict | None = None
    input_schema: dict | None = None
    output_schema: dict | None = None
    config_timer: dict | None = None
    enabled: bool | None = None

class SkillOut(BaseModel):
    id: int
    agent_id: int
    slug: str
    name: str
    description: str
    trigger_description: str
    model_slug: str | None
    workflow_definition: dict
    input_schema: dict | None
    output_schema: dict | None
    config_timer: dict | None
    enabled: bool

    model_config = {"from_attributes": True}


# ─── Chat (REST API for testing) ───────────────────────────────────────────

class ChatInput(BaseModel):
    tenant_slug: str
    session_id: str | None = None
    message: str
    user_id: str | None = None

class ChatOutput(BaseModel):
    message: str
    status: str
    session_id: str
    workflow_slug: str | None = None
    tool_calls: list[dict] = []

