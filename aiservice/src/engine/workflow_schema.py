"""Pydantic schemas for validating workflow JSON definitions.

react-flow compatible — includes position metadata for visual builder.
BPMN-inspired edge types (SEQUENCE, CONDITIONAL, DEFAULT) with priority.

Pure Python — no framework dependency.
"""

from __future__ import annotations

from pydantic import BaseModel, field_validator


class NodePositionSchema(BaseModel):
    """Position of a node in the visual builder canvas."""
    x: float = 0.0
    y: float = 0.0


class NodeSchema(BaseModel):
    """A single node in the workflow DAG.

    Maps to bpm_config_node — defines task type and configuration.
    """
    task_type: str  # llm_call | rag_query | grpc_call | condition | human_input
    label: str = ""  # Display name in visual builder
    config: dict = {}  # Task-specific configuration
    position: NodePositionSchema | None = None  # react-flow position {"x", "y"}


class EdgeSchema(BaseModel):
    """A directed edge between two nodes.

    Maps to bpm_config_link_node — source/target use react-flow naming.
    """
    source: str  # from_node_id (react-flow naming)
    target: str  # to_node_id
    condition: str | None = None  # Condition expression for CONDITIONAL edges
    priority: int = 0  # Lower = higher priority (like bpm_config_link_node)
    flow_type: str = "SEQUENCE"  # SEQUENCE | CONDITIONAL | DEFAULT

    @field_validator("flow_type")
    @classmethod
    def validate_flow_type(cls, v: str) -> str:
        allowed = {"SEQUENCE", "CONDITIONAL", "DEFAULT"}
        if v not in allowed:
            msg = f"flow_type must be one of {allowed}, got '{v}'"
            raise ValueError(msg)
        return v


class WorkflowDefinitionSchema(BaseModel):
    """Complete workflow definition — validated from JSON.

    Structure: {"nodes": {"node_id": NodeSchema, ...}, "edges": [...]}
    Compatible with react-flow for visual builder.
    """
    nodes: dict[str, NodeSchema]
    edges: list[EdgeSchema]

    @field_validator("edges")
    @classmethod
    def validate_edge_references(cls, edges: list[EdgeSchema], info) -> list[EdgeSchema]:
        """Ensure all edge source/target reference existing nodes."""
        nodes = info.data.get("nodes", {})
        if not nodes:
            return edges
        for edge in edges:
            if edge.source not in nodes:
                msg = f"Edge source '{edge.source}' not found in nodes"
                raise ValueError(msg)
            if edge.target not in nodes:
                msg = f"Edge target '{edge.target}' not found in nodes"
                raise ValueError(msg)
        return edges
