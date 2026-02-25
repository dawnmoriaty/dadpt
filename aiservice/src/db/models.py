"""SQLAlchemy ORM models — admin config database.

4-layer architecture:
  model_providers       (global)  — API keys per LLM vendor
  tenants               (global)  — isolated customer / domain
  model_instances       (tenant)  — which model + params a tenant uses
  tool_definitions      (tenant)  — gRPC methods a tenant can call
  agent_definitions     (tenant)  — AI employees (chuyên môn)
  skill_definitions     (agent)   — AI skills (kỹ năng) with workflow JSON
  workflows             (tenant)  — legacy BPMN-style workflow JSON (backward compat)
"""

from __future__ import annotations

import datetime as dt
from typing import Optional

from sqlalchemy import (
    JSON,
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    pass


# ─────────────────────────────────────────────────────────────────────────────
# LAYER 1 — Global Model Providers (API keys)
# ─────────────────────────────────────────────────────────────────────────────
class ModelProvider(Base):
    """Platform-level LLM provider — stores API key reference."""

    __tablename__ = "model_providers"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    slug: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    provider_type: Mapped[str] = mapped_column(
        String(32), nullable=False
    )  # openai | google | anthropic | custom
    # Phase-1: store env-var name like "OPENAI_API_KEY"; Phase-2: encrypted blob
    api_key_env_var: Mapped[str] = mapped_column(String(128), nullable=False)
    base_url: Mapped[Optional[str]] = mapped_column(String(256), nullable=True)
    rate_limit_rpm: Mapped[int] = mapped_column(Integer, default=500)
    enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[dt.datetime] = mapped_column(
        DateTime, server_default=func.now()
    )

    # relationships
    model_instances: Mapped[list["ModelInstance"]] = relationship(back_populates="provider")


# ─────────────────────────────────────────────────────────────────────────────
# LAYER 2 — Tenants
# ─────────────────────────────────────────────────────────────────────────────
class Tenant(Base):
    """An isolated customer / business domain (bus, banking, edu …)."""

    __tablename__ = "tenants"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    slug: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    grpc_target: Mapped[str] = mapped_column(
        String(256), nullable=False
    )  # e.g. "bus-backend:50052"
    qdrant_prefix: Mapped[str] = mapped_column(
        String(64), nullable=False
    )  # collection prefix
    supervisor_model_slug: Mapped[Optional[str]] = mapped_column(
        String(64), nullable=True
    )  # which model_instance the supervisor uses
    supervisor_prompt: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    max_turns: Mapped[int] = mapped_column(Integer, default=20)
    fallback_message: Mapped[str] = mapped_column(
        Text, default="Xin lỗi, tôi chưa hiểu yêu cầu của bạn. Bạn có thể nói rõ hơn không?"
    )
    enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[dt.datetime] = mapped_column(
        DateTime, server_default=func.now()
    )

    # relationships
    model_instances: Mapped[list["ModelInstance"]] = relationship(back_populates="tenant")
    tool_definitions: Mapped[list["ToolDefinition"]] = relationship(back_populates="tenant")
    workflows: Mapped[list["Workflow"]] = relationship(back_populates="tenant")
    agent_definitions: Mapped[list["AgentDefinition"]] = relationship(
        back_populates="tenant", cascade="all, delete-orphan"
    )


# ─────────────────────────────────────────────────────────────────────────────
# LAYER 3a — Model Instances (per tenant)
# ─────────────────────────────────────────────────────────────────────────────
class ModelInstance(Base):
    """A concrete LLM configuration bound to a tenant."""

    __tablename__ = "model_instances"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    tenant_id: Mapped[int] = mapped_column(ForeignKey("tenants.id"), nullable=False)
    provider_id: Mapped[int] = mapped_column(ForeignKey("model_providers.id"), nullable=False)
    slug: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    display_name: Mapped[str] = mapped_column(String(128), nullable=False)
    model_name: Mapped[str] = mapped_column(
        String(64), nullable=False
    )  # gpt-4o, gemini-2.0-flash …
    temperature: Mapped[float] = mapped_column(Float, default=0.3)
    max_tokens: Mapped[int] = mapped_column(Integer, default=2000)
    top_p: Mapped[float] = mapped_column(Float, default=1.0)
    system_prefix: Mapped[Optional[str]] = mapped_column(
        Text, nullable=True
    )  # prepended to every prompt
    purpose: Mapped[str] = mapped_column(
        String(64), default="general"
    )  # search | reasoning | conversation | …
    fallback_slug: Mapped[Optional[str]] = mapped_column(
        String(64), nullable=True
    )  # auto-fallback on error
    enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[dt.datetime] = mapped_column(
        DateTime, server_default=func.now()
    )

    # relationships
    tenant: Mapped["Tenant"] = relationship(back_populates="model_instances")
    provider: Mapped["ModelProvider"] = relationship(back_populates="model_instances")


# ─────────────────────────────────────────────────────────────────────────────
# LAYER 3b — Tool Definitions (per tenant)
# ─────────────────────────────────────────────────────────────────────────────
class ToolDefinition(Base):
    """A callable gRPC method exposed as a LangChain tool at runtime."""

    __tablename__ = "tool_definitions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    tenant_id: Mapped[int] = mapped_column(ForeignKey("tenants.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(64), nullable=False)  # search_trips
    description: Mapped[str] = mapped_column(
        Text, nullable=False
    )  # LLM reads this to decide when to call
    grpc_method: Mapped[str] = mapped_column(String(128), nullable=False)  # SearchTrips
    input_schema: Mapped[dict] = mapped_column(
        JSON, nullable=False
    )  # {"origin": "string", "destination": "string", "date": "string"}
    output_schema: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[dt.datetime] = mapped_column(
        DateTime, server_default=func.now()
    )

    # relationships
    tenant: Mapped["Tenant"] = relationship(back_populates="tool_definitions")


# ─────────────────────────────────────────────────────────────────────────────
# LAYER 3c — Workflows (per tenant) — BPMN-style (LEGACY — backward compat)
# ─────────────────────────────────────────────────────────────────────────────
class Workflow(Base):
    """A BPMN-style workflow definition — pure JSON, zero code.

    LEGACY: Kept for backward compatibility. New tenants should use
    AgentDefinition → SkillDefinition instead.
    """

    __tablename__ = "workflows"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    tenant_id: Mapped[int] = mapped_column(ForeignKey("tenants.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    slug: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    trigger_description: Mapped[str] = mapped_column(
        Text, nullable=False
    )  # LLM reads this to decide which workflow to activate
    definition: Mapped[dict] = mapped_column(
        JSON, nullable=False
    )  # {"nodes": {...}, "edges": [...]}
    enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[dt.datetime] = mapped_column(
        DateTime, server_default=func.now()
    )

    # relationships
    tenant: Mapped["Tenant"] = relationship(back_populates="workflows")


# ─────────────────────────────────────────────────────────────────────────────
# LAYER 4a — Agent Definitions (per tenant) — "AI Employee"
# Inspired by: bpm_object + bpm_participant + bpm_assignment_rule
# ─────────────────────────────────────────────────────────────────────────────
class AgentDefinition(Base):
    """An AI employee with a specific expertise area.

    Analogous to a BPMN participant/lane — represents a role (soát vé,
    chăm sóc KH, bán hàng) that owns multiple skills.
    """

    __tablename__ = "agent_definitions"
    __table_args__ = (
        UniqueConstraint("tenant_id", "slug", name="uq_agent_tenant_slug"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    tenant_id: Mapped[int] = mapped_column(ForeignKey("tenants.id"), nullable=False)
    slug: Mapped[str] = mapped_column(String(64), nullable=False)  # e.g. "ticket_inspector"
    name: Mapped[str] = mapped_column(String(128), nullable=False)  # "Nhân viên soát vé"
    description: Mapped[str] = mapped_column(Text, nullable=False)
    role_prompt: Mapped[str] = mapped_column(
        Text, nullable=False
    )  # System prompt: "Bạn là nhân viên soát vé..."
    model_slug: Mapped[Optional[str]] = mapped_column(
        String(64), nullable=True
    )  # Default LLM for this agent (skill can override)
    icon: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)  # Emoji/icon for UI
    priority: Mapped[int] = mapped_column(
        Integer, default=0
    )  # Routing priority (lower = higher, like bpm_config_link_node)
    routing_config: Mapped[Optional[dict]] = mapped_column(
        JSON, nullable=True
    )  # Mapping input/output (like bpm_assignment_rule)
    enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[dt.datetime] = mapped_column(
        DateTime, server_default=func.now()
    )

    # relationships
    tenant: Mapped["Tenant"] = relationship(back_populates="agent_definitions")
    skill_definitions: Mapped[list["SkillDefinition"]] = relationship(
        back_populates="agent", cascade="all, delete-orphan"
    )


# ─────────────────────────────────────────────────────────────────────────────
# LAYER 4b — Skill Definitions (per agent) — "AI Skill"
# Inspired by: bpm_config_node + bpm_form + bpm_config_link_node
# ─────────────────────────────────────────────────────────────────────────────
class SkillDefinition(Base):
    """A specific skill owned by an AI agent, containing a workflow definition.

    Analogous to a BPMN sub-process — a complete workflow graph (nodes + edges)
    that executes when the skill is triggered.
    """

    __tablename__ = "skill_definitions"
    __table_args__ = (
        UniqueConstraint("agent_id", "slug", name="uq_skill_agent_slug"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    agent_id: Mapped[int] = mapped_column(
        ForeignKey("agent_definitions.id"), nullable=False
    )
    slug: Mapped[str] = mapped_column(String(64), nullable=False)  # e.g. "check_trip"
    name: Mapped[str] = mapped_column(String(128), nullable=False)  # "Rà soát chuyến đi"
    description: Mapped[str] = mapped_column(Text, nullable=False)
    trigger_description: Mapped[str] = mapped_column(
        Text, nullable=False
    )  # LLM reads this to match intent (like bpm_form trigger)
    model_slug: Mapped[Optional[str]] = mapped_column(
        String(64), nullable=True
    )  # Override model for this skill (None = agent default)
    workflow_definition: Mapped[dict] = mapped_column(
        JSON, nullable=False
    )  # {"nodes": {...}, "edges": [...]} — BPMN-style DAG
    input_schema: Mapped[Optional[dict]] = mapped_column(
        JSON, nullable=True
    )  # Expected input mapping (like bpm_assignment_rule.mapping_input)
    output_schema: Mapped[Optional[dict]] = mapped_column(
        JSON, nullable=True
    )  # Expected output mapping
    config_timer: Mapped[Optional[dict]] = mapped_column(
        JSON, nullable=True
    )  # Timeout config (from bpm_form.config_timer)
    enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[dt.datetime] = mapped_column(
        DateTime, server_default=func.now()
    )

    # relationships
    agent: Mapped["AgentDefinition"] = relationship(back_populates="skill_definitions")
