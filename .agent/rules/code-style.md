---
trigger: always_on
---

# WORKSPACE STANDARDS: Go + TypeScript React

## Ngăn xếp công nghệ: Go (Backend) + React TS (Frontend) với TanStack

---

### PHẦN A: GOLANG STANDARDS

#### A1. Quy trình Sinh mã Tự động (CRITICAL)

**Cấm kỵ**: Viết DAO, Repository, hoặc Migration thủ công.

**Workflow bắt buộc**:

```bash
# 1. Tạo migration (KHÔNG tạo tay)
make db-create-migration name=feature_x

# 2. Viết SQL schema trong file migration vừa sinh

# 3. Sinh Go code từ SQL
make db-generate  # sqlc generate

# 4. Kiểm tra migration
make db-migrate-up
Cấu hình sqlc.yaml bắt buộc:

schema: "db/migrations" (đọc trực tiếp từ goose migrations)
emit_interface: true (hỗ trợ mocking)
emit_json_tags: true
emit_result_struct_pointers: false (tránh pointer hell)
A2. Quản lý Lỗi (STANDARD)
Sentinel Errors Pattern:
package domain

var (
    ErrUserNotFound   = errors.New("user: resource not found")
    ErrDuplicateEntry = errors.New("user: duplicate entry")
)

// Wrapping bắt buộc khi truyền qua layers
return fmt.Errorf("service failed: %w", err)
Xử lý ở Handler:
if errors.Is(err, domain.ErrUserNotFound) {
    http.Error(w, "Not found", http.StatusNotFound)
    return
}
A3. Concurrency Control (CRITICAL)
Cấm: Sử dụng sync.WaitGroup trần trong request handlers.

Bắt buộc: Dùng errgroup.Group với Context:g, ctx := errgroup.WithContext(ctx)

g.Go(func() error {
    // task 1
})

if err := g.Wait(); err != nil {
    return err // Fail-fast với cancellation propagation
}
A4. Makefile Commands (Single Source of Truth)
.PHONY: db-migrate-up db-migrate-down db-generate db-create-migration lint run

DB_DSN?="postgres://user:password@localhost:5432/dbname?sslmode=disable"
MIGRATION_DIR?=db/migrations

db-generate:
	sqlc generate

db-create-migration:
	@if [ -z "$(name)" ]; then echo "Error: name is required"; exit 1; fi
	goose -dir $(MIGRATION_DIR) create $(name) sql

db-migrate-up:
	goose -dir $(MIGRATION_DIR) postgres $(DB_DSN) up

db-migrate-down:
	goose -dir $(MIGRATION_DIR) postgres $(DB_DSN) down

lint:
	golangci-lint run ./...

run: lint
	go run cmd/server/main.go
A5. Linter Configuration
Bắt buộc các linter: errcheck, gosimple, govet, ineffassign, staticcheck, unused, bodyclose, noctx, gosec.

Bật check-shadowing: true
Bật check-blank: true (cấm _ = func())
PHẦN B: TYPESCRIPT REACT STANDARDS
B1. TypeScript Strict Mode (CRITICAL)
ESLint Rules bắt buộc:
{
  "@typescript-eslint/strict-boolean-expressions": "error",
  "@typescript-eslint/no-explicit-any": "error",
  "@typescript-eslint/explicit-function-return-type": "error"
}
Workflow: Fix Lint trước khi sửa logic.

B2. TanStack Router - File-Based Routing (CRITICAL)
Quy trình "Create-Gen-Fix":

Create: Tạo file rỗng src/routes/dashboard/settings.tsx
Gen: Chờ Vite dev server tự động cập nhật routeTree.gen.ts
Fix: Sử dụng createFileRoute (đã có type definition):

Cấm: Tự viết cấu hình route thủ công (code-based routing).

B3. URL Search Params Validation (STANDARD)
Bắt buộc: Validate bằng Zod ngay tại tầng Route:
import { z } from 'zod'

const searchSchema = z.object({
  page: z.number().catch(1),
  filter: z.string().optional(),
  sort: z.enum(['newest', 'price']).catch('newest')
})

export const Route = createFileRoute('/shop')({
  validateSearch: (search) => searchSchema.parse(search),
})
B4. TanStack Query - Query Key Factory (STANDARD)
Cấm: Dùng magic string cho Query Key.

Pattern bắt buộc:
// lib/query-keys.ts
export const todoKeys = {
  all: ['todos'] as const,
  lists: () => [...todoKeys.all, 'list'] as const,
  list: (filters: string) => [...todoKeys.lists(), { filters }] as const,
  details: () => [...todoKeys.all, 'detail'] as const,
  detail: (id: number) => [...todoKeys.details(), id] as const,
}

// Sử dụng
useQuery({
  queryKey: todoKeys.detail(id),
  queryFn: fetchTodo
})
B5. Component Patterns
Ưu tiên Server Components (nếu dùng Next.js) hoặc tách logic fetching ra khỏi UI components.
Props interface phải explicit, không dùng any.
Event handlers phải có type cụ thể (React.MouseEvent, v.v.).
PHẦN C: INTEGRATION & WORKFLOW
C1. Pre-commit Hooks (CRITICAL)
Husky + lint-staged phải chạy:

golangci-lint run (cho file .go)
tsc --noEmit (type check TS)
eslint --fix (cho file .ts, .tsx)
C2. Environment Consistency
Sử dụng .env.example làm template.
Database connection string chỉ được inject qua environment variables (không hardcode).
C3. Build Pipeline Checks
Go: Build fail nếu có lỗi lint hoặc test fail.
Frontend: Build fail nếu có TypeScript error hoặc ESLint error.
```
