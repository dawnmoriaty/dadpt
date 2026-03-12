# AI Service Context

## Purpose
Multi-tenant AI agent service providing chat workflows, tool execution, and vector search for the bus ticketing platform.

## Runtime Entry Points
- `src/main.py`: FastAPI + gRPC bootstrap and lifecycle.
- `src/grpc_server/server.py`: gRPC server used by the Go backend.
- `src/admin/router.py`: Admin CRUD for tenants, models, tools, workflows, agents, skills.

## Data Model (Admin DB)
- `src/db/models.py`: SQLAlchemy models for tenants, tools, workflows, agents, skills, model providers/instances.
- `src/db/database.py`: async SQLite engine setup.

## Core Concepts
- **Tenants**: Logical partitions (e.g., `bus`). Each has `grpc_target`, `qdrant_prefix`, models, tools, workflows.
- **Workflows**: Node graph executed per request (BPMN-style). Defined in DB; seeded in `src/seed.py`.
- **Agents/Skills**: Supervisor routes to agent → skill, each skill holds a workflow definition.
- **Tools**: Dynamic gRPC/HTTP calls defined in DB (`tool_definitions`).

## Task Types (Workflow Nodes)
- `src/engine/task_types/llm_call.py`: LLM execution.
- `src/engine/task_types/grpc_call.py`: tool invocation.
- `src/engine/task_types/rerank_trips.py`: sort trips by price.
- `src/engine/task_types/rag_query.py`: Qdrant retrieval.
- `src/engine/task_types/json_extract.py`: parse inputs from raw text/JSON.

## Vector Search
- `src/vectorstore/qdrant_manager.py`: collection management, upsert, and search.
- Collections use tenant prefix, e.g. `bus_trips`.

## Tool Integration
- `src/platform/tool_factory.py`: builds tools for backend calls.
  - Uses gRPC by default.
  - If `grpc_target` starts with `http://` or `https://`, it falls back to REST calls.

## Seeds / Defaults
- `src/seed.py`: default tenants, model providers, model instances, tool definitions, workflows, agents, skills.

## Workflow Data Flow (Chat)
1. Backend calls gRPC `Chat`.
2. Supervisor routes to agent + skill.
3. Workflow runs tasks (LLM → tool → rerank → RAG → formatter).
4. Response and tool logs returned.
