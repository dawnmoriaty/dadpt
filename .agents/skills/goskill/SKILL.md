---
name: goskill
description: |
  Bộ luật Golang cho dự án Bus Ticketing Backend. Kế thừa global SKILL.
  Hexagonal Architecture, Schema-First (goose + sqlc), Gin, pgx/v5, uber/dig.
  Bất kỳ AI nào gặp task Go trong workspace này đều follow file này.
  Keywords: golang, go, gin, sqlc, goose, pgx, migration, repository, usecase, handler, domain.
---

# GOLANG ENGINEERING LAW

> Kế thừa: `global/SKILL.md`. Xung đột → file này thắng.

---

## §1. PROJECT LAYOUT

```
backend/
├── cmd/app/main.go              # DI bootstrap + graceful shutdown
├── configs/                     # Viper config from .env
├── db/                          # pgxpool wrapper
├── di/container.go              # uber/dig — ALL providers here
├── internals/<module>/          # Feature modules
│   ├── controller/dto/          # HTTP Request/Response + Mapper
│   ├── controller/http/         # Gin handler + routes.go
│   ├── domain/                  # entity.go, dto.go, ports.go
│   ├── infrastructure/          # Adapter impls (optional)
│   ├── repository/              # sqlc-backed impl of domain.Repository
│   └── usecase/                 # Business logic, interface defined here
├── pkgs/                        # Shared utilities (ZERO business logic)
├── sql/schema/                  # Goose migrations (IMMUTABLE)
├── sql/queries/                 # SQL files for sqlc
├── sql/models/                  # sqlc-generated (DO NOT EDIT)
├── sqlc.yaml                    # Sacred config
└── Makefile
```

---

## §2. WORKFLOW — PHẢI theo thứ tự

```
1. make new_migration   → Viết SQL schema
2. Viết sql/queries/    → SQL queries cho sqlc
3. make sqlc            → Generate Go code
4. make migrate         → Apply DB
5. Implement: domain/ → repository/ → usecase/ → controller/dto/ → controller/http/
6. Register: server.go hoặc di/container.go
7. make lint            → PHẢI pass trước khi chạy
```

❌ KHÔNG viết Go code xử lý DB trước khi có migration + query SQL.
❌ KHÔNG `go run` trực tiếp — phải `make lint` → `make build` → `make run`.

---

## §3. DOMAIN LAYER

### §3.1 entity.go

```go
// Sentinel Errors — bắt đầu bằng Err
var (
    ErrTripNotFound  = errors.New("trip not found")
    ErrInvalidInput  = errors.New("invalid input")
)

// Value Object — self-validating, immutable
type TripStatus string
const (
    TripStatusScheduled TripStatus = "scheduled"
    TripStatusDeparted  TripStatus = "departed"
)
func (s TripStatus) IsValid() bool { ... }

// Entity — có business methods
type Trip struct { ... }
func (t *Trip) CanTransitionTo(target TripStatus) bool { ... }
```

### §3.2 dto.go

```go
// Input DTO — primitive types, pointer cho optional
type CreateTripInput struct {
    ProviderID int32
    BasePrice  float64
}
type UpdateTripInput struct {
    BasePrice *float64  // pointer = optional
}
// Filter
type TripFilter struct { Limit, Offset int32 }
```

### §3.3 ports.go

```go
type Repository interface {
    Create(ctx context.Context, trip *Trip) (*Trip, error)
    GetByID(ctx context.Context, id int64) (*Trip, error)
    List(ctx context.Context, filter *TripFilter) ([]*Trip, int64, error)
    Update(ctx context.Context, trip *Trip) (*Trip, error)
    Delete(ctx context.Context, id int64) error
}
```

**Rules:**
- ✅ Mọi method nhận `context.Context` đầu tiên.
- ✅ List trả `([]*Entity, totalCount, error)`.
- ❌ Domain KHÔNG import: `pgx`, `gin`, `redis`, `sql/models`.

---

## §4. REPOSITORY LAYER

```go
func NewTripRepository(db *db.Database) domain.Repository {
    return &tripRepo{q: models.New(db.GetPool()), db: db}
}

func (r *tripRepo) GetByID(ctx context.Context, id int64) (*domain.Trip, error) {
    row, err := r.q.GetTripByID(ctx, id)
    if errors.Is(err, pgx.ErrNoRows) {
        return nil, domain.ErrTripNotFound          // translate
    }
    if err != nil {
        return nil, fmt.Errorf("repo.GetByID: %w", err) // wrap
    }
    return mapToDomain(row), nil                        // private mapper
}
```

**Rules:**
- ✅ Constructor return **interface** (`domain.Repository`), KHÔNG concrete.
- ✅ `pgx.ErrNoRows` → domain sentinel. KHÔNG để pgx error leak.
- ✅ Unique violation: check `pgconn.PgError.Code == "23505"` → domain error.
- ✅ Mapper: private function `mapToDomain()`.
- ❌ KHÔNG return `models.*` struct lên usecase.

---

## §5. USECASE LAYER

```go
// Interface ở TOP of file
type ITripUseCase interface {
    Create(ctx context.Context, input *domain.CreateTripInput) (*domain.Trip, error)
    ...
}

func NewTripUseCase(repo domain.Repository) ITripUseCase {
    return &tripUC{repo: repo}
}

func (uc *tripUC) Create(ctx context.Context, input *domain.CreateTripInput) (*domain.Trip, error) {
    // 1. Validate (Value Object construction)
    // 2. Build entity
    // 3. Call repo
    result, err := uc.repo.Create(ctx, entity)
    if err != nil {
        return nil, fmt.Errorf("uc.Create: %w", err)
    }
    return result, nil
}
```

**Rules:**
- ✅ Constructor return **interface**.
- ✅ Business validation ở đây (VO construction, state check).
- ❌ KHÔNG import `pgx`, `gin`, `sql/models`.
- ❌ KHÔNG dùng `sync.WaitGroup` trần → dùng `errgroup.WithContext`.

---

## §6. CONTROLLER LAYER

### §6.1 DTO (`controller/dto/`)

```go
// Request — có binding tags
type CreateTripRequest struct {
    ProviderID int `json:"providerId" binding:"required"`
    BasePrice  float64 `json:"basePrice" binding:"required,gt=0"`
}
func (r *CreateTripRequest) ToInput() *domain.CreateTripInput { ... }

// Response
type TripResponse struct { ID int64 `json:"id"` ... }
func ToTripResponse(t *domain.Trip) *TripResponse { ... }
func ToTripListResponse(items []*domain.Trip) []*TripResponse { ... }
```

### §6.2 Handler (`controller/http/handler.go`)

**Pattern bắt buộc 5 bước:**
```go
func (h *Handler) Create(c *gin.Context) {
    // 1. Bind & Validate
    var req dto.CreateTripRequest
    if err := c.ShouldBindJSON(&req); err != nil {
        response.HandleError(c, pkgErrors.ValidationError(err.Error()))
        return
    }
    // 2. Map → Domain input
    // 3. Call usecase với c.Request.Context()
    result, err := h.uc.Create(c.Request.Context(), req.ToInput())
    if err != nil {
        // 4. Map domain error → AppError
        response.HandleError(c, mapDomainError(err))
        return
    }
    // 5. Map → Response
    response.Created(c, dto.ToTripResponse(result))
}
```

### §6.3 Error Mapper (mỗi module 1 cái)

```go
func mapDomainError(err error) *pkgErrors.AppError {
    switch {
    case errors.Is(err, domain.ErrTripNotFound):
        return pkgErrors.ErrTripNotFound
    case errors.Is(err, domain.ErrInvalidInput):
        return pkgErrors.Wrap(err, 400, pkgErrors.ErrCodeBadRequest, err.Error())
    default:
        return pkgErrors.Wrap(err, 500, pkgErrors.ErrCodeInternal, "Lỗi hệ thống")
    }
}
```

### §6.4 Routes (`controller/http/routes.go`)

```go
func Routes(public, admin *gin.RouterGroup, db *db.Database) {
    repo := repository.NewTripRepository(db)
    uc := usecase.NewTripUseCase(repo)
    h := NewTripHandler(uc)

    public.Group("/trips").GET("", h.Search).GET("/:id", h.GetByID)
    admin.Group("/trips").POST("", h.Create).PUT("/:id", h.Update).DELETE("/:id", h.Delete)
}
// Rồi đăng ký trong server.go: tripHttp.Routes(v1, admin, s.db)
```

---

## §7. ERROR HANDLING — Go Specific

```
Repository: pgx.ErrNoRows → domain.ErrNotFound          (translate)
            other error   → fmt.Errorf("repo.X: %w", err)  (wrap)
UseCase:    any error     → fmt.Errorf("uc.X: %w", err)    (wrap)
Handler:    errors.Is()   → *pkgErrors.AppError             (translate)
```

- ✅ Sentinel errors: `var ErrX = errors.New(...)` ở domain.
- ✅ Error wrapping: `fmt.Errorf("context: %w", err)` — giữ chain cho `errors.Is`.
- ❌ KHÔNG `fmt.Errorf("failed")` không wrap (mất original error).
- ❌ KHÔNG log + return error. Log ở response layer.

---

## §8. SQLC — Sacred Config

```yaml
# sqlc.yaml — KHÔNG thay đổi các fields này:
emit_json_tags: true          # camelCase JSON
emit_interface: true          # Mockable Querier
emit_empty_slices: true       # [] not null
emit_pointers_for_null_types: true
sql_package: "pgx/v5"
```

### SQL Query Naming

| Annotation | Prefix | Example |
|------------|--------|---------|
| `:one` | `Get`, `Create`, `Update` | `GetTripByID :one` |
| `:many` | `List`, `Search` | `ListTrips :many` |
| `:exec` | `Delete` | `DeleteTrip :exec` |
| `:execrows` | `Update` (need count) | `UpdateStatus :execrows` |

---

## §9. DATABASE PATTERNS

### Transaction

```go
tx, _ := db.GetPool().Begin(ctx)
defer tx.Rollback(ctx)
qtx := r.q.WithTx(tx)
// ... operations with qtx ...
return tx.Commit(ctx)
```

### Constraint Detection

```go
func isUniqueViolation(err error) bool {
    var pgErr *pgconn.PgError
    return errors.As(err, &pgErr) && pgErr.Code == "23505"
}
```

### Context Timeout

```go
ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
defer cancel()
```

---

## §10. CONCURRENCY

```go
// ✅ BẮT BUỘC dùng errgroup
g, ctx := errgroup.WithContext(ctx)
g.Go(func() error { ... })
g.Go(func() error { ... })
if err := g.Wait(); err != nil { ... }

// ❌ CẤM sync.WaitGroup trần trong request handler
```

---

## §11. RESPONSE HELPERS

```go
response.Success(c, data)                     // 200
response.Created(c, data)                     // 201
response.SuccessWithPagination(c, data, meta) // 200 + meta
response.HandleError(c, appErr)               // auto status
```

❌ KHÔNG dùng `c.JSON()` trực tiếp.

---

## §12. MAKEFILE REFERENCE

| Command | When |
|---------|------|
| `make new_migration` | Schema change |
| `make migrate` | Apply migration |
| `make sqlc` | After query change |
| `make lint` | TRƯỚC mọi lần run/build |
| `make build` | Compile check |
| `make run` | Dev (Air hot reload) |
| `make dev` | up + tidy + run |

---

## §13. CHECKLIST TRƯỚC COMMIT

- [ ] Migration immutable (không sửa file cũ)
- [ ] `sql/models/` không sửa tay
- [ ] Domain không import infra
- [ ] Repository mapper: sqlc → domain (không leak)
- [ ] UseCase return interface, depend on domain interface
- [ ] Handler dùng `c.Request.Context()`
- [ ] Error chain intact (`%w` ở mọi layer)
- [ ] `mapDomainError()` cover hết sentinel errors
- [ ] Response dùng `pkgs/response` helpers
- [ ] `make lint` pass
- [ ] Không `sync.WaitGroup` trần
- [ ] Không hardcode config
