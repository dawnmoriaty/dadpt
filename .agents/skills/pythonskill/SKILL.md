---
name: pythonskill
description: |
  Bộ luật Python cho dự án LLM/RAG Agent Backend. Kế thừa global SKILL.
  FastAPI, Pydantic v2, SQLAlchemy, Alembic, LangChain LCEL, mypy strict.
  Phục vụ LLM pipeline và RAG agent. Bất kỳ AI nào gặp task Python đều follow file này.
  Keywords: python, fastapi, pydantic, langchain, rag, llm, alembic, sqlalchemy, mypy, agent.
---

# PYTHON ENGINEERING LAW (LLM / RAG FOCUS)

> Kế thừa: `global/SKILL.md`. Xung đột → file này thắng.

---

## §1. PROJECT LAYOUT

```
src/
├── main.py                     # FastAPI app factory + lifespan
├── config/
│   ├── settings.py             # Pydantic BaseSettings (env-based)
│   └── llm.py                  # LLM client configs (model, temperature, etc.)
├── common/
│   ├── exceptions.py           # Custom exceptions (AppError, NotFoundError)
│   ├── response.py             # ApiResponse[T], ErrorResponse
│   ├── pagination.py           # PageParams, PageResponse
│   └── deps.py                 # FastAPI Depends (get_db, get_current_user)
├── <feature>/                  # Feature modules
│   ├── router.py               # FastAPI APIRouter
│   ├── schemas.py              # Pydantic v2 models (Request/Response)
│   ├── models.py               # SQLAlchemy ORM models
│   ├── repository.py           # Data access (SQLAlchemy queries)
│   ├── service.py              # Business logic
│   └── exceptions.py           # Feature-specific exceptions
├── rag/                        # RAG pipeline module
│   ├── router.py               # /ask, /ingest endpoints
│   ├── schemas.py              # QueryRequest, QueryResponse, IngestRequest
│   ├── pipeline.py             # LCEL chain definition
│   ├── retriever.py            # Vector store retriever wrapper
│   ├── embeddings.py           # Embedding model config
│   ├── splitter.py             # Document chunking logic
│   └── prompts.py              # Prompt templates (KHÔNG hardcode)
├── agent/                      # LLM Agent module
│   ├── router.py               # /agent/chat endpoints
│   ├── schemas.py              # ChatRequest, ChatResponse, ToolCall
│   ├── agent.py                # Agent definition (tool binding, memory)
│   └── tools/                  # Agent tools
│       ├── __init__.py
│       ├── search.py           # Search tool
│       └── calculator.py       # Calculator tool
├── db/
│   ├── database.py             # AsyncSession factory, engine
│   └── base.py                 # DeclarativeBase
├── migrations/                 # Alembic
│   ├── env.py
│   ├── alembic.ini
│   └── versions/               # Migration files (IMMUTABLE)
└── tests/
    ├── conftest.py             # Fixtures: async client, test DB
    ├── test_<feature>/
    └── test_rag/
```

---

## §2. PYDANTIC V2 — Schema Law

### §2.1 Request/Response = Pydantic Model

```python
from pydantic import BaseModel, Field, ConfigDict

class CreateTripRequest(BaseModel):
    model_config = ConfigDict(strict=True)

    provider_id: int = Field(..., gt=0)
    base_price: float = Field(..., gt=0)
    departure_time: str = Field(..., min_length=1)

class TripResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)  # ORM mode

    id: int
    provider_name: str
    base_price: float
    status: TripStatus

class UpdateTripRequest(BaseModel):
    base_price: float | None = None
    departure_time: str | None = None
```

### §2.2 Schema Rules

- ✅ Request: `BaseModel` + `Field(...)` validators.
- ✅ Response: `BaseModel` + `ConfigDict(from_attributes=True)` cho ORM mapping.
- ✅ Update: `| None = None` cho optional fields.
- ✅ Type unions: `str | None` (Python 3.10+ syntax, KHÔNG `Optional[str]`).
- ❌ KHÔNG dùng `dict` làm request/response.
- ❌ KHÔNG dùng `Any` trong schema fields.
- ❌ KHÔNG return ORM model trực tiếp — convert qua Pydantic.

---

## §3. FASTAPI — Router & Endpoint

### §3.1 Router Pattern

```python
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(prefix="/trips", tags=["trips"])

@router.post("", status_code=status.HTTP_201_CREATED, response_model=ApiResponse[TripResponse])
async def create_trip(
    request: CreateTripRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ApiResponse[TripResponse]:
    service = TripService(TripRepository(db))
    result = await service.create(request)
    return ApiResponse(data=result, message="Trip created")

@router.get("/{trip_id}", response_model=ApiResponse[TripResponse])
async def get_trip(trip_id: int, db: AsyncSession = Depends(get_db)) -> ApiResponse[TripResponse]:
    service = TripService(TripRepository(db))
    result = await service.get_by_id(trip_id)
    return ApiResponse(data=result)
```

### §3.2 Endpoint Rules

- ✅ `async def` cho mọi endpoint (async-first).
- ✅ `Depends()` cho DB session, current user, pagination.
- ✅ `response_model` type hint trên mỗi endpoint.
- ✅ `status_code` cho POST (201), DELETE (204).
- ❌ Controller KHÔNG có business logic — delegate service.
- ❌ KHÔNG try/except trong endpoint — dùng exception handler.

### §3.3 Exception Handler

```python
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

@app.exception_handler(AppError)
async def app_error_handler(request: Request, exc: AppError) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code,
        content={"code": exc.status_code, "status": "error", "message": exc.message, "error_code": exc.error_code},
    )

@app.exception_handler(Exception)
async def generic_error_handler(request: Request, exc: Exception) -> JSONResponse:
    logger.error("Unhandled exception", exc_info=exc)
    return JSONResponse(status_code=500, content={"code": 500, "status": "error", "message": "Internal server error"})
```

---

## §4. SERVICE LAYER

```python
class TripService:
    def __init__(self, repo: TripRepository) -> None:
        self._repo = repo

    async def create(self, request: CreateTripRequest) -> TripResponse:
        entity = Trip(**request.model_dump())
        saved = await self._repo.create(entity)
        return TripResponse.model_validate(saved)

    async def get_by_id(self, trip_id: int) -> TripResponse:
        entity = await self._repo.get_by_id(trip_id)
        if entity is None:
            raise NotFoundError("Trip", trip_id)
        return TripResponse.model_validate(entity)
```

**Rules:**
- ✅ Constructor injection (pass repo/client via `__init__`).
- ✅ Return Pydantic model, KHÔNG return ORM entity.
- ✅ Raise custom exception cho business error.
- ❌ KHÔNG import FastAPI (Request, Response) trong service layer.

---

## §5. REPOSITORY LAYER

```python
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

class TripRepository:
    def __init__(self, db: AsyncSession) -> None:
        self._db = db

    async def get_by_id(self, trip_id: int) -> Trip | None:
        result = await self._db.execute(select(Trip).where(Trip.id == trip_id))
        return result.scalar_one_or_none()

    async def create(self, entity: Trip) -> Trip:
        self._db.add(entity)
        await self._db.flush()
        await self._db.refresh(entity)
        return entity

    async def list(self, offset: int, limit: int) -> tuple[list[Trip], int]:
        query = select(Trip).offset(offset).limit(limit)
        result = await self._db.execute(query)
        count_result = await self._db.execute(select(func.count()).select_from(Trip))
        return list(result.scalars().all()), count_result.scalar_one()
```

**Rules:**
- ✅ AsyncSession (async-first).
- ✅ `select()` syntax (SQLAlchemy 2.0 style), KHÔNG legacy `session.query()`.
- ✅ Return ORM entity hoặc `None`, KHÔNG raise trong repo (trừ integrity error).
- ❌ KHÔNG business logic trong repository.

---

## §6. ORM MODEL — SQLAlchemy

```python
from sqlalchemy import String, BigInteger, Enum
from sqlalchemy.orm import Mapped, mapped_column, DeclarativeBase

class Base(DeclarativeBase):
    pass

class Trip(Base):
    __tablename__ = "trips"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    provider_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    status: Mapped[TripStatus] = mapped_column(Enum(TripStatus), nullable=False, default=TripStatus.SCHEDULED)
    base_price: Mapped[float] = mapped_column(nullable=False)
```

- ✅ SQLAlchemy 2.0 `Mapped[T]` + `mapped_column()`.
- ✅ `__tablename__` explicit.
- ❌ KHÔNG legacy `Column()` style.

---

## §7. MIGRATION — Alembic

```bash
# Tạo migration
alembic revision --autogenerate -m "add_trips_table"

# Apply
alembic upgrade head

# Rollback
alembic downgrade -1
```

- ✅ Alembic autogenerate CHO PHÉP (khác Go/Java — Python convention).
- ✅ Review generated migration TRƯỚC khi commit.
- ❌ KHÔNG sửa migration đã merge vào main. Tạo migration MỚI.
- ❌ KHÔNG xóa migration files.

---

## §8. LLM / RAG PIPELINE LAW

### §8.1 Configuration — KHÔNG Hardcode

```python
# config/llm.py
from pydantic_settings import BaseSettings

class LLMSettings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="LLM_")

    model_name: str = "gpt-4o-mini"
    temperature: float = 0.0
    max_tokens: int = 4096
    embedding_model: str = "text-embedding-3-small"
    chunk_size: int = 1000
    chunk_overlap: int = 200
    top_k: int = 5
    vector_store_collection: str = "default"

llm_settings = LLMSettings()
```

**Rules:**
- ✅ Model name, temperature, chunk_size, top_k = env variable.
- ❌ KHÔNG hardcode model name: `ChatOpenAI(model="gpt-4o")`.
- ❌ KHÔNG hardcode chunk_size: `RecursiveCharacterTextSplitter(chunk_size=1000)`.
- ✅ Dùng `llm_settings.model_name`, `llm_settings.chunk_size`.

### §8.2 LCEL Chain (LangChain Expression Language)

```python
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.runnables import RunnablePassthrough
from langchain_core.output_parsers import StrOutputParser

# ✅ LCEL chain — typed, composable
prompt = ChatPromptTemplate.from_template(ANSWER_TEMPLATE)

chain = (
    {"context": retriever | format_docs, "question": RunnablePassthrough()}
    | prompt
    | llm
    | StrOutputParser()
)

# Usage
answer = await chain.ainvoke("What is the refund policy?")
```

**Rules:**
- ✅ LCEL pipe syntax (`|`) cho chain composition.
- ✅ `ainvoke()` / `astream()` (async variants).
- ❌ KHÔNG legacy `LLMChain`, `RetrievalQA`, `load_qa_chain`.
- ❌ KHÔNG `chain.run()` — dùng `chain.invoke()` hoặc `chain.ainvoke()`.
- ✅ Mỗi step trong chain có type rõ ràng.

### §8.3 Prompt Templates

```python
# rag/prompts.py
SYSTEM_PROMPT = """You are a helpful assistant. Answer based on the provided context.
If the context doesn't contain the answer, say "I don't know."

Context: {context}
"""

ANSWER_TEMPLATE = """Based on the following context, answer the question.

Context:
{context}

Question: {question}

Answer:"""
```

- ✅ Templates trong file riêng (`prompts.py`), KHÔNG inline trong chain.
- ✅ Dùng `{variable}` placeholder.
- ❌ KHÔNG f-string cho prompt (thiếu template validation).

### §8.4 Retriever Pattern

```python
# rag/retriever.py
from langchain_core.vectorstores import VectorStore

class DocumentRetriever:
    def __init__(self, vector_store: VectorStore, top_k: int) -> None:
        self._retriever = vector_store.as_retriever(search_kwargs={"k": top_k})

    async def get_relevant_docs(self, query: str) -> list[Document]:
        return await self._retriever.ainvoke(query)
```

- ✅ Wrap vector store retriever — inject `top_k` từ config.
- ✅ `ainvoke()` async.
- ❌ KHÔNG `similarity_search()` trực tiếp — dùng retriever abstraction.

### §8.5 Document Chunking

```python
# rag/splitter.py
from langchain_text_splitters import RecursiveCharacterTextSplitter

def create_splitter(chunk_size: int, chunk_overlap: int) -> RecursiveCharacterTextSplitter:
    return RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
        length_function=len,
        separators=["\n\n", "\n", ". ", " ", ""],
    )
```

- ✅ `chunk_size`, `chunk_overlap` từ config, KHÔNG hardcode.
- ✅ Factory function return splitter.

---

## §9. AGENT PATTERN

### §9.1 Tool Definition

```python
from langchain_core.tools import tool

@tool
def search_trips(query: str, departure_date: str | None = None) -> str:
    """Search for available bus trips based on query and optional departure date."""
    # Implementation
    return json.dumps(results)
```

- ✅ `@tool` decorator + docstring (LLM đọc docstring để quyết định dùng tool).
- ✅ Type hints trên mọi parameter.
- ✅ Return `str` (serialized JSON).
- ❌ KHÔNG generic docstring — phải mô tả rõ tool làm gì.

### §9.2 Agent Definition

```python
from langchain_core.language_models import BaseChatModel

def create_agent(llm: BaseChatModel, tools: list) -> AgentExecutor:
    llm_with_tools = llm.bind_tools(tools)
    prompt = ChatPromptTemplate.from_messages([
        ("system", AGENT_SYSTEM_PROMPT),
        ("placeholder", "{chat_history}"),
        ("human", "{input}"),
        ("placeholder", "{agent_scratchpad}"),
    ])
    agent = create_tool_calling_agent(llm, tools, prompt)
    return AgentExecutor(agent=agent, tools=tools, verbose=False)
```

- ✅ Agent config inject qua factory function.
- ✅ Memory: `chat_history` placeholder.
- ❌ KHÔNG `verbose=True` trong production.
- ❌ KHÔNG hardcode LLM instance — inject từ ngoài.

---

## §10. ERROR HANDLING — Python Specific

```python
# common/exceptions.py
class AppError(Exception):
    def __init__(self, status_code: int, error_code: str, message: str) -> None:
        self.status_code = status_code
        self.error_code = error_code
        self.message = message
        super().__init__(message)

class NotFoundError(AppError):
    def __init__(self, entity: str, entity_id: int | str) -> None:
        super().__init__(404, f"{entity.upper()}_NOT_FOUND", f"{entity} with id {entity_id} not found")

class ValidationError(AppError):
    def __init__(self, message: str) -> None:
        super().__init__(400, "VALIDATION_ERROR", message)

class LLMError(AppError):
    def __init__(self, message: str = "LLM processing failed") -> None:
        super().__init__(502, "LLM_ERROR", message)
```

- ✅ Custom exception hierarchy kế thừa `AppError`.
- ✅ `LLMError` cho LLM/RAG failures (502 Bad Gateway).
- ✅ Retry logic cho LLM calls: `tenacity` + exponential backoff.
- ❌ KHÔNG bare `except Exception` → specific catches.
- ❌ KHÔNG `print()` → dùng `logger`.

---

## §11. TYPE CHECKING & LINTING

### §11.1 mypy Strict

```ini
# pyproject.toml
[tool.mypy]
strict = true
plugins = ["pydantic.mypy", "sqlalchemy.ext.mypy.plugin"]
disallow_any_generics = true
disallow_untyped_defs = true
```

- ✅ `mypy --strict` PHẢI pass.
- ✅ Mọi function có type hint đầy đủ (params + return).
- ❌ KHÔNG `# type: ignore` trừ khi có comment giải thích.

### §11.2 Linting

```ini
# pyproject.toml
[tool.ruff]
line-length = 120
target-version = "py312"

[tool.ruff.lint]
select = ["E", "F", "I", "N", "W", "UP", "B", "SIM"]

[tool.black]
line-length = 120

[tool.isort]
profile = "black"
```

- ✅ `ruff` + `black` + `isort` — phải format trước commit.
- ✅ Import order: stdlib → third-party → local.

---

## §12. ASYNC EVERYWHERE

```python
# ✅ Async DB session
async with async_session() as session:
    result = await session.execute(query)

# ✅ Async LLM call
answer = await chain.ainvoke(question)

# ✅ Async HTTP client (httpx)
async with httpx.AsyncClient() as client:
    response = await client.get(url)
```

- ✅ `async def` cho mọi I/O function.
- ✅ `AsyncSession` (SQLAlchemy), `ainvoke` (LangChain), `httpx.AsyncClient`.
- ❌ KHÔNG `requests` library → dùng `httpx`.
- ❌ KHÔNG sync `session.execute()` trong async context.

---

## §13. CONFIGURATION — Pydantic Settings

```python
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    # Database
    database_url: str
    database_pool_size: int = 10

    # JWT
    jwt_secret: str
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 30

    # LLM
    openai_api_key: str
    llm_model: str = "gpt-4o-mini"
    llm_temperature: float = 0.0

settings = Settings()  # Load + validate at import time
```

- ✅ `BaseSettings` auto-load từ env + `.env` file.
- ✅ Validate at startup (fail fast).
- ❌ KHÔNG `os.environ.get()` rải rác — dùng `settings.x`.
- ❌ KHÔNG commit `.env`. Commit `.env.example`.

---

## §14. TESTING

```python
# conftest.py
import pytest
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession

@pytest.fixture
async def async_client(app: FastAPI) -> AsyncGenerator[AsyncClient, None]:
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        yield client

# Test
@pytest.mark.asyncio
async def test_create_trip(async_client: AsyncClient) -> None:
    response = await async_client.post("/api/v1/trips", json={...})
    assert response.status_code == 201
    data = response.json()
    assert data["data"]["id"] is not None
```

**Rules:**
- ✅ `pytest` + `pytest-asyncio`.
- ✅ `httpx.AsyncClient` với `ASGITransport` cho integration test.
- ✅ Fixtures cho DB session, client, mock LLM.
- ✅ LLM test: mock response, KHÔNG gọi real API trong test.
- ❌ KHÔNG `unittest.TestCase` — dùng pytest functions.

---

## §15. CHECKLIST TRƯỚC COMMIT

- [ ] Pydantic v2 models cho mọi request/response (không dict)
- [ ] `async def` cho mọi I/O function
- [ ] LLM config từ env (model, temperature, chunk_size, top_k)
- [ ] LCEL chains, KHÔNG legacy LLMChain/RetrievalQA
- [ ] Prompt templates trong file riêng
- [ ] Custom exceptions (AppError hierarchy)
- [ ] Type hints đầy đủ, `mypy --strict` pass
- [ ] `ruff` + `black` + `isort` format pass
- [ ] SQLAlchemy 2.0 style (`select()`, `Mapped[T]`)
- [ ] Alembic migration reviewed trước commit
- [ ] KHÔNG `print()`, KHÔNG `requests`, KHÔNG `os.environ.get()` rải rác
- [ ] Test: mock LLM, không gọi real API
