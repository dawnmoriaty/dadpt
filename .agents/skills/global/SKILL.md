---
name: global
description: |
  Bộ luật kỹ thuật phần mềm toàn cục. Áp dụng cho MỌI ngôn ngữ, MỌI framework.
  Bất kỳ AI agent nào coding đều PHẢI tuân thủ file này TRƯỚC, sau đó mới đọc skill theo ngôn ngữ cụ thể.
  Keywords: global, rules, architecture, error, naming, file, pojo, dto, entity, testing, git.
---

# GLOBAL ENGINEERING LAW — Áp dụng cho mọi ngôn ngữ

> Mọi skill ngôn ngữ cụ thể (Go, React, Java, Python) đều KẾ THỪA bộ luật này.
> Nếu xung đột, luật ngôn ngữ cụ thể THẮNG luật global.

---

## §1. ARCHITECTURE — Layered Boundary

### §1.1 Layer Direction (BẮT BUỘC)

```
Controller/Handler → UseCase/Service → Repository/Gateway → Database/External
```

- Dependency luôn chảy **MỘT CHIỀU** từ ngoài vào trong.
- Layer trong KHÔNG ĐƯỢC import layer ngoài.
- Layer trong KHÔNG ĐƯỢC biết đến framework HTTP, ORM cụ thể.

### §1.2 Domain Purity

- **Domain layer** (entity, value object, business rule) = **ZERO external dependency**.
- Domain KHÔNG import: HTTP framework, ORM, driver DB, logging lib.
- Domain chỉ import: standard library + domain types khác trong cùng module.

### §1.3 Interface Boundary

- Mỗi layer giao tiếp qua **interface/protocol/abstract**, KHÔNG qua concrete class.
- Repository: domain định nghĩa interface → infra layer implement.
- UseCase: expose interface → handler/controller depend on interface.

---

## §2. POJO / DTO / ENTITY — Data Object Law

### §2.1 Ba loại object, KHÔNG trộn lẫn

| Loại | Vị trí | Mục đích | Ràng buộc |
|------|--------|----------|-----------|
| **Entity** | Domain | Business state + behavior | Có business methods, self-validate |
| **DTO** (Input/Output) | Domain hoặc Controller | Transfer data giữa layers | Chỉ chứa data, KHÔNG có logic |
| **Request/Response** | Controller | HTTP serialization | Có JSON tags, binding/validation tags |

### §2.2 Mapping Rules

```
HTTP Request → [Controller Mapper] → Domain Input DTO
Domain Output → [Controller Mapper] → HTTP Response
DB Row/Model → [Repository Mapper] → Domain Entity
Domain Entity → [Repository Mapper] → DB Params
```

- ❌ KHÔNG return DB model/ORM entity lên controller.
- ❌ KHÔNG return domain entity trực tiếp làm HTTP response.
- ❌ KHÔNG dùng 1 struct/class cho cả request lẫn response.
- ✅ Mỗi layer có mapper riêng, convert tường minh.

### §2.3 Naming Convention

| Type | Pattern | Example |
|------|---------|---------|
| Create input | `Create<Entity>Input` | `CreateTripInput` |
| Update input | `Update<Entity>Input` | `UpdateTripInput` |
| Filter/Query | `<Entity>Filter` | `TripFilter` |
| HTTP Request | `Create<Entity>Request` | `CreateTripRequest` |
| HTTP Response | `<Entity>Response` | `TripResponse` |
| List Response | `<Entity>ListResponse` | `TripListResponse` |

---

## §3. ERROR HANDLING — Error Flow Law

### §3.1 Error Origin

- **Domain layer**: Định nghĩa tất cả business errors (sentinel error / custom exception).
- LỖI domain = LỖI dự đoán được (not found, duplicate, invalid state, permission).
- LỖI infra = LỖI không dự đoán (DB timeout, network, I/O).

### §3.2 Error Propagation

```
Repository: infra error → domain error (translate)    + wrap context
UseCase:    domain error → propagate                   + wrap context
Handler:    domain error → HTTP error (translate)      + log nếu 5xx
```

### §3.3 Error Rules

- ✅ Wrap error với context khi cross boundary: `"usecase.CreateTrip: <original>"`.
- ✅ Dùng error comparison (errors.Is / isinstance / instanceof), KHÔNG string match.
- ❌ KHÔNG log rồi return error (double reporting). Chọn 1: log HOẶC return.
- ❌ KHÔNG swallow error (catch rồi không làm gì).
- ❌ KHÔNG return null/nil khi có lỗi logic mà không kèm error.

### §3.4 HTTP Error Response Format (CHUẨN)

```json
{
  "code": 400,
  "status": "error",
  "message": "Human-readable message",
  "error_code": "MACHINE_READABLE_CODE"
}
```

- 4xx: Trả message rõ ràng cho client.
- 5xx: Trả message generic ("Internal Server Error"), log chi tiết server-side.

---

## §4. NAMING — Universal Naming Law

### §4.1 File Naming

| Language | Convention | Example |
|----------|-----------|---------|
| Go | `snake_case.go` | `trip_repository.go` |
| TypeScript/React | `kebab-case.tsx` hoặc `PascalCase.tsx` cho component | `trip-card.tsx`, `TripCard.tsx` |
| Java | `PascalCase.java` | `TripRepository.java` |
| Python | `snake_case.py` | `trip_repository.py` |

### §4.2 Variable/Function Naming

| Language | Variable | Function | Constant | Type/Class |
|----------|----------|----------|----------|------------|
| Go | `camelCase` | `PascalCase` (export) / `camelCase` (private) | `PascalCase` | `PascalCase` |
| TypeScript | `camelCase` | `camelCase` | `SCREAMING_SNAKE` | `PascalCase` |
| Java | `camelCase` | `camelCase` | `SCREAMING_SNAKE` | `PascalCase` |
| Python | `snake_case` | `snake_case` | `SCREAMING_SNAKE` | `PascalCase` |

### §4.3 Cấm

- ❌ Abbreviation không rõ nghĩa: `usr`, `mgr`, `svc` → dùng `user`, `manager`, `service`.
- ❌ Magic number/string: hardcode giá trị trực tiếp → dùng constant/config.
- ❌ Hungarian notation: `strName`, `iCount` → dùng `name`, `count`.

---

## §5. VALIDATION — Input Validation Law

### §5.1 Validate at Boundary

- HTTP layer: validate format (required, min/max, regex) bằng framework (binding tags, Zod, Bean Validation).
- UseCase layer: validate business rule (unique check, state transition, permission).
- Domain layer: Value Object tự validate trong constructor/factory.

### §5.2 Never Trust Input

- ✅ Trim whitespace trước khi validate.
- ✅ Sanitize HTML/SQL nếu hiển thị hoặc query.
- ❌ KHÔNG tin client-side validation là đủ — server PHẢI validate lại.

---

## §6. API DESIGN — RESTful Convention

### §6.1 URL Pattern

```
GET    /resources              → List (paginated)
GET    /resources/:id          → Get by ID
POST   /resources              → Create
PUT    /resources/:id          → Full/Partial update
PATCH  /resources/:id/status   → Status transition
DELETE /resources/:id          → Delete
```

### §6.2 Pagination Response

```json
{
  "code": 200,
  "data": [...],
  "meta": {
    "total": 100,
    "page": 1,
    "limit": 20,
    "totalPages": 5
  }
}
```

### §6.3 Status Codes

| Code | When |
|------|------|
| 200 | Success (GET, PUT, PATCH) |
| 201 | Created (POST) |
| 204 | No Content (DELETE) |
| 400 | Validation error |
| 401 | Unauthenticated |
| 403 | Forbidden (insufficient role) |
| 404 | Not found |
| 409 | Conflict (duplicate) |
| 500 | Internal server error |

---

## §7. DATABASE — Schema & Migration Law

### §7.1 Schema-First

- Viết schema/migration SQL TRƯỚC, rồi mới generate hoặc viết code access.
- KHÔNG viết ORM model rồi auto-generate migration ngược (trừ Python Alembic autogenerate).

### §7.2 Migration Immutability

- ❌ KHÔNG SỬA migration đã commit/merge vào main.
- ✅ Thay đổi = tạo migration MỚI.
- ✅ Migration phải có UP và DOWN.
- ✅ Dùng `IF NOT EXISTS` / `IF EXISTS` khi có thể.

### §7.3 Transaction

- Write operations liên quan nhiều bảng PHẢI trong transaction.
- Read-only queries KHÔNG cần transaction.
- Transaction scope càng nhỏ càng tốt.

---

## §8. TESTING — Minimum Testing Law

### §8.1 What to Test

| Layer | Test Type | Mock |
|-------|-----------|------|
| Domain (Entity, VO) | Unit test, table-driven | Không mock |
| UseCase | Unit test | Mock repository + external |
| Repository | Integration test | Real DB (testcontainers) |
| Handler | Integration / E2E | Mock usecase hoặc real |

### §8.2 Test Naming

```
Test<Method>_<Scenario>
test_create_success
test_create_duplicate_name_returns_conflict
```

### §8.3 Test Rules

- ✅ Test cả happy path + error path.
- ✅ Assert error type, KHÔNG assert error message string.
- ❌ KHÔNG test private/internal methods trực tiếp.
- ❌ KHÔNG test generated code (sqlc, protobuf, openapi).

---

## §9. SECURITY — Baseline Security Law

- ✅ Validate + sanitize ALL external input.
- ✅ Parameterized queries (KHÔNG string concat SQL).
- ✅ JWT: validate signature + expiry + issuer. Blacklist on logout.
- ✅ CORS: whitelist origins, KHÔNG wildcard `*` cho production.
- ✅ Rate limiting cho auth endpoints.
- ✅ 5xx errors: trả generic message, log chi tiết server-side.
- ❌ KHÔNG log credentials, tokens, passwords.
- ❌ KHÔNG commit secrets vào git (dùng .env + .gitignore).

---

## §10. GIT & WORKFLOW

### §10.1 Commit Convention

```
<type>(<scope>): <description>

feat(trip): add search by departure date
fix(auth): handle expired refresh token
refactor(booking): extract payment logic to service
```

### §10.2 Branch Naming

```
feature/<ticket>-<short-desc>
fix/<ticket>-<short-desc>
refactor/<scope>-<short-desc>
```

### §10.3 Pre-commit Checklist (Universal)

1. Lint pass (zero warnings).
2. Type check pass.
3. Tests pass.
4. No TODO without ticket reference.
5. No `console.log` / `fmt.Println` debug statements.

---

## §11. LOGGING

- Dùng structured logging (JSON cho prod, pretty cho dev).
- Log levels: `DEBUG` < `INFO` < `WARN` < `ERROR` < `FATAL`.
- ✅ Log: request ID, user ID, operation, duration, error.
- ❌ KHÔNG log: passwords, tokens, PII (email/phone trừ khi masked).
- ❌ KHÔNG log AND return error. Chọn 1.

---

## §12. CONFIGURATION

- Tất cả config từ environment variables hoặc `.env` file.
- ✅ Validate config khi app khởi động (fail fast nếu thiếu).
- ❌ KHÔNG hardcode: URLs, ports, secrets, model names, thresholds.
- ❌ KHÔNG commit `.env` — chỉ commit `.env.example`.
