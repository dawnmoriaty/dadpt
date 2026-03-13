# DADPT AI Agent Platform

BPMN-style dynamic multi-tenant AI agent service. Mỗi "skill" là một workflow JSON — không cần code Python cho mỗi skill mới.

## Architecture

```
Go Backend ──gRPC──▶ AI Service (FastAPI + gRPC Server)
                              │
                       Supervisor Agent
                      ╱    │    │    ╲
                Workflow  Workflow  Workflow  Workflow
                (JSON)    (JSON)    (JSON)    (JSON)
                              │
                     BPMN Task Engine
                    ╱   │   │   │   ╲
              llm_call grpc_call rag_query condition human_input
                              │
                        Qdrant VectorDB
```

## Key Concepts

| Concept             | Description                                                                                           |
| ------------------- | ----------------------------------------------------------------------------------------------------- |
| **Tenant**          | Isolated customer domain (bus, banking, edu...)                                                       |
| **Model Provider**  | Global LLM vendor (OpenAI, Google, Anthropic)                                                         |
| **Model Instance**  | Per-tenant model config (slug, temperature, purpose)                                                  |
| **Tool Definition** | gRPC method exposed to AI (SearchTrips, CreateBooking...)                                             |
| **Workflow**        | BPMN-style JSON DAG — nodes are task types, edges are flow                                            |
| **Task Type**       | Reusable building block (llm_call, grpc_call, rag_query, condition, human_input, transform, parallel) |

## Quick Start

```bash
# 1. Install dependencies
cd aiservice
pip install -e .

# 2. Setup env
cp .env.example .env
# Edit .env with your API keys

# 3. Start infrastructure (from backend/)
docker compose up -d bus.qdrant bus.redis

# 4. Seed bus tenant
python -m src.seed

# 5. Run the server
.\.venv\Scripts\python -m src.main
# → FastAPI: http://localhost:8100
# → Admin UI: http://localhost:8100/admin
# → Swagger: http://localhost:8100/docs
# → gRPC: localhost:50051

# 6. (Optional) Generate proto stubs
bash scripts/gen_proto.sh
```

## Adding a New Tenant (Zero Code)

1. Go to **Admin UI** → Create Provider (if new API key)
2. Create **Tenant** (slug, name, gRPC target, Qdrant prefix)
3. Create **Model Instances** (pick provider + model + temperature)
4. Create **Tool Definitions** (gRPC methods the AI can call)
5. Create **Workflows** (JSON: nodes + edges using task types)
6. Click **Reload** → Done!

## Adding a New Task Type (One File)

Drop a file into `src/engine/task_types/`:

```python
from src.engine.task_types.base_task import BaseTask
from src.engine.workflow_context import WorkflowContext

class MyCustomTask(BaseTask):
    task_type = "my_custom"  # use this in workflow JSON

    async def execute(self, ctx: WorkflowContext) -> WorkflowContext:
        # Your logic here
        ctx.set_var(self.config["output_key"], "result")
        return ctx
```

Auto-discovered on next restart. No registration needed.

## Project Structure

```
aiservice/
├── proto/ai_agent.proto          # gRPC service definition
├── src/
│   ├── main.py                   # FastAPI + gRPC dual boot
│   ├── seed.py                   # Bootstrap bus tenant
│   ├── config/                   # Pydantic settings
│   ├── db/                       # SQLAlchemy models (SQLite)
│   │   ├── database.py
│   │   └── models.py             # Tenants, Providers, Models, Tools, Workflows
│   ├── engine/                   # BPMN workflow engine
│   │   ├── workflow_context.py   # Shared state object
│   │   ├── workflow_executor.py  # DAG runner
│   │   ├── supervisor.py         # Intent → workflow router
│   │   ├── task_registry.py      # Auto-discovery
│   │   └── task_types/           # Reusable task implementations
│   │       ├── llm_call.py       # Call any LLM
│   │       ├── grpc_call.py      # Call any gRPC method
│   │       ├── rag_query.py      # Qdrant semantic search
│   │       ├── condition.py      # BPMN gateway
│   │       ├── transform.py      # Polars / template transform
│   │       ├── human_input.py    # Pause/resume for user input
│   │       └── parallel.py       # Concurrent branches
│   ├── platform/                 # Multi-tenant infrastructure
│   │   ├── model_pool.py         # LLM connection pool
│   │   ├── tenant_registry.py    # In-memory tenant configs
│   │   └── tool_factory.py       # DB row → LangChain Tool
│   ├── vectorstore/              # Qdrant + data pipeline
│   │   ├── qdrant_manager.py
│   │   └── data_sync.py          # Polars transform → Qdrant
│   ├── grpc_server/              # gRPC async server
│   │   └── server.py
│   └── admin/                    # Admin REST API + HTML UI
│       ├── router.py
│       ├── schemas.py
│       └── templates/            # Jinja2 HTML
```
