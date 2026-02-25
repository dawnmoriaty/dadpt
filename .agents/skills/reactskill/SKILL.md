---
name: reactskill
description: |
  Bộ luật React + TypeScript cho dự án Bus Ticketing Frontend. Kế thừa global SKILL.
  TanStack Router (file-based), TanStack Query, Zustand, Zod, shadcn/ui, Tailwind CSS v4, Vite.
  Tách biệt logic (hooks/api) và UI (components). UI dễ CSS, dễ responsive.
  Keywords: react, typescript, tanstack, zustand, zod, shadcn, tailwind, vite, module, hook.
---

# REACT + TYPESCRIPT ENGINEERING LAW

> Kế thừa: `global/SKILL.md`. Xung đột → file này thắng.

---

## §1. PROJECT LAYOUT

```
templateUi/src/
├── routes/                     # TanStack Router — file-based (DO NOT manual edit routeTree.gen.ts)
│   ├── __root.tsx              # Root layout: QueryClientProvider, ThemeProvider, Toaster, Devtools
│   ├── _auth.tsx               # Auth layout wrapper
│   ├── _public.tsx             # Public layout wrapper
│   ├── _public/                # Pages dưới public layout
│   ├── admin.tsx               # Admin guard: beforeLoad check auth + role
│   ├── admin/                  # Pages dưới admin layout
│   └── _auth/                  # Pages dưới auth layout
├── modules/<feature>/          # Feature modules (CORE PATTERN)
│   ├── api/index.ts            # API calls (axios wrapper)
│   ├── hooks/index.ts          # React Query hooks (useQuery/useMutation)
│   ├── types/index.ts          # TypeScript interfaces + type unions
│   ├── schemas/index.ts        # Zod schemas + inferred types (nếu có form)
│   ├── components/             # UI components của feature
│   └── index.ts                # Barrel export — public API duy nhất
├── modules/shared/             # Shared types (PaginatedResponse, PagingParams)
├── services/api/client.ts      # Axios instance + interceptors + token refresh
├── services/api/endpoints.ts   # API_ENDPOINTS constant
├── stores/                     # Zustand stores (global state only)
├── components/ui/              # shadcn/ui primitives (DO NOT EDIT — dùng CLI add)
├── components/common/          # Shared components (Header, Footer, etc.)
├── components/layout/          # Layout components (AdminLayout, PublicLayout)
├── config/                     # Env validation (Zod), query-client config
├── lib/                        # Utilities: cn(), constants
├── hooks/                      # Global custom hooks (cross-module)
└── types/                      # Global shared TypeScript types
```

---

## §2. MODULE PATTERN — Phải theo cấu trúc

### §2.1 Tạo feature module mới

```
modules/<feature>/
├── api/index.ts          # BẮT BUỘC
├── hooks/index.ts        # BẮT BUỘC
├── types/index.ts        # BẮT BUỘC
├── schemas/index.ts      # NẾU có form
├── components/           # UI components
└── index.ts              # BẮT BUỘC — barrel export
```

### §2.2 Barrel Export Rules

```typescript
// modules/<feature>/index.ts
export * from './types'
export * from './hooks'
export * from './api'        // nếu cần expose
export * from './schemas'    // nếu có
export { ComponentA } from './components/ComponentA'
```

- ✅ Import từ module khác: `import { Trip } from '@/modules/trip'` (qua barrel).
- ❌ KHÔNG import sâu: `import { Trip } from '@/modules/trip/types/index'`.
- ❌ KHÔNG cross-import component từ module khác trực tiếp (chỉ qua barrel).

---

## §3. TÁCH BIỆT LOGIC VÀ UI

### §3.1 Logic Layer (hooks + api)

```
api/index.ts     → Axios calls thuần (return typed data)
hooks/index.ts   → useQuery / useMutation wrappers (gọi api, handle cache, toast)
```

Component KHÔNG gọi axios trực tiếp. Component CHỈ gọi hook.

### §3.2 UI Layer (components)

```typescript
// ✅ ĐÚNG — Component chỉ dùng hooks
function TripsPage() {
    const { data, isLoading } = useTrips(params)
    const createMutation = useCreateTrip()
    // ... render UI
}

// ❌ SAI — Component gọi API trực tiếp
function TripsPage() {
    const [data, setData] = useState(null)
    useEffect(() => { api.get('/trips').then(setData) }, [])
}
```

### §3.3 Component Structure — Dễ CSS

```tsx
// Pattern: Container → Section → Element
export function TripsPage() {
    // 1. Hooks (data, mutations, state)
    const { data, isLoading } = useTrips()

    // 2. Early returns (loading, error, empty)
    if (isLoading) return <Skeleton />

    // 3. Main render — Tailwind classes, responsive
    return (
        <div className="space-y-6">                          {/* Page container */}
            <div className="flex items-center justify-between"> {/* Header row */}
                <h1 className="text-2xl font-bold">Trips</h1>
                <Button onClick={...}>Create</Button>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3"> {/* Grid */}
                {data.items.map(trip => <TripCard key={trip.id} trip={trip} />)}
            </div>
        </div>
    )
}
```

**Rules:**
- ✅ Hooks block ở trên cùng, render ở dưới.
- ✅ `className` dùng Tailwind utilities, responsive bằng `sm:`, `md:`, `lg:`.
- ✅ Conditional class dùng `cn()` từ `@/lib/utils`.
- ❌ KHÔNG inline style (`style={{...}}`). Dùng Tailwind.
- ❌ KHÔNG CSS modules. KHÔNG `styled-components`.
- ❌ KHÔNG tách file CSS riêng cho component.

---

## §4. API LAYER

### §4.1 API Object Pattern

```typescript
// modules/<feature>/api/index.ts
import { api } from '@/services/api/client'
import type { PaginatedResponse } from '@/modules/shared'
import type { Trip, CreateTripRequest, TripListParams } from '../types'

export const tripApi = {
    list: async (params?: TripListParams): Promise<PaginatedResponse<Trip>> => {
        const response = await api.get('/admin/trips', { params })
        return response.data.data
    },
    getById: async (id: number): Promise<Trip> => {
        const response = await api.get(`/trips/${id}`)
        return response.data.data
    },
    create: async (data: CreateTripRequest): Promise<Trip> => {
        const response = await api.post('/admin/trips', data)
        return response.data.data
    },
    delete: async (id: number): Promise<void> => {
        await api.delete(`/admin/trips/${id}`)
    },
}
```

**Rules:**
- ✅ Mỗi module 1 `api/index.ts`, export 1 object `<feature>Api`.
- ✅ Return `response.data.data` (unwrap backend response wrapper).
- ✅ Generic types trên method return.
- ❌ KHÔNG dùng `API_ENDPOINTS` constant nếu URL đã rõ — inline URL trực tiếp.
- ❌ KHÔNG try/catch trong api layer — để hook layer handle.

### §4.2 Axios Client

- Singleton `api` từ `@/services/api/client`.
- Token attach: interceptor tự lấy từ Zustand `getState()`.
- Refresh token: dùng instance riêng `refreshApi` (KHÔNG interceptors → tránh loop).
- Auth init: `initApiAuth(getter, setter, onExpired)` — gọi 1 lần từ store file.

---

## §5. HOOKS LAYER (React Query)

### §5.1 Query Key Factory

```typescript
// Mỗi module có QUERY_KEY constant
export const TRIPS_QUERY_KEY = ['admin-trips']

// Complex key: spread params
queryKey: [...TRIPS_QUERY_KEY, params]
queryKey: ['trips', id]
```

### §5.2 useQuery Hook

```typescript
export function useTrips(params?: TripListParams) {
    return useQuery({
        queryKey: [...TRIPS_QUERY_KEY, params],
        queryFn: () => tripApi.list(params),
    })
}

export function useTrip(id: number) {
    return useQuery({
        queryKey: ['trips', id],
        queryFn: () => tripApi.getById(id),
        enabled: !!id,       // ← conditional fetch
    })
}
```

### §5.3 useMutation Hook

```typescript
export function useCreateTrip() {
    const queryClient = useQueryClient()
    return useMutation<Trip, Error, CreateTripRequest>({
        mutationFn: (data) => tripApi.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: TRIPS_QUERY_KEY })
            toast.success('Trip created successfully')
        },
        onError: (error) => {
            console.error('Create trip failed:', error)
            toast.error('Failed to create trip')
        },
    })
}
```

**Rules:**
- ✅ Mutation PHẢI `invalidateQueries` on success.
- ✅ Toast: `toast.success()` on success, `toast.error()` on error.
- ✅ Type params: `useMutation<TData, TError, TVariables>`.
- ❌ KHÔNG `await` mutation — dùng `mutate()` hoặc `mutateAsync()`.
- ❌ KHÔNG setState trong component để cache data — dùng React Query cache.
- ❌ KHÔNG `useEffect` + `fetch` pattern.

---

## §6. TYPES LAYER

### §6.1 Module Types

```typescript
// modules/<feature>/types/index.ts
export type TripStatus = 'scheduled' | 'departed' | 'completed' | 'cancelled'

export interface Trip {
    id: number
    providerName: string
    departureTime: string
    status: TripStatus
    // ... fields match API response
}

export interface CreateTripRequest { ... }  // Match API request body
export interface UpdateTripRequest { ... }  // Partial fields → optional
export interface TripListParams { ... }     // Query params
```

### §6.2 Shared Types

```typescript
// modules/shared/types/index.ts
export interface PaginatedResponse<T> {
    total: number
    page: number
    items: T[]
    loadMoreAble: boolean
}
export interface PagingParams { page?: number; pageSize?: number }
export interface ApiError { code: string; message: string }
```

**Rules:**
- ✅ `interface` cho object shapes, `type` cho unions/intersections.
- ✅ Update request: optional fields (tất cả `?`).
- ❌ KHÔNG dùng `any` hoặc `as any`. Dùng `unknown` rồi narrow.
- ❌ KHÔNG dùng `enum` — dùng `type` union: `type Status = 'a' | 'b'`.

---

## §7. ZOD VALIDATION (Forms)

```typescript
// modules/<feature>/schemas/index.ts
import { z } from 'zod'

export const createTripSchema = z.object({
    providerId: z.number().min(1, 'Provider is required'),
    basePrice: z.number().gt(0, 'Price must be positive'),
    departureTime: z.string().min(1, 'Departure time is required'),
})

export type CreateTripFormData = z.infer<typeof createTripSchema>
```

### Form Integration

```tsx
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { createTripSchema, type CreateTripFormData } from '../schemas'

const form = useForm<CreateTripFormData>({
    resolver: zodResolver(createTripSchema),
    defaultValues: { ... },
})
```

**Rules:**
- ✅ Zod schema → `z.infer<typeof schema>` cho form type.
- ✅ `zodResolver` cho react-hook-form.
- ✅ Validation messages tiếng Anh, user-friendly.
- ❌ KHÔNG define form types thủ công khi đã có Zod schema.
- ❌ KHÔNG validate bằng tay trong `onSubmit`.

---

## §8. ZUSTAND STORE — Global State Only

```typescript
// stores/use-<name>-store.ts
import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'

interface AuthState {
    token: string | null
    user: User | null
    setAuth: (token: string, user: User) => void
    logout: () => void
}

export const useAuthStore = create<AuthState>()(
    devtools(
        persist(
            (set) => ({
                token: null,
                user: null,
                setAuth: (token, user) => set({ token, user, isAuthenticated: true }, false, 'setAuth'),
                logout: () => { set({ token: null, user: null }, false, 'logout') },
            }),
            { name: 'auth-storage', partialize: (state) => ({ token: state.token, user: state.user }) }
        ),
        { name: 'AuthStore' }
    )
)
```

**Rules:**
- ✅ File naming: `use-<name>-store.ts`.
- ✅ Middleware order: `devtools(persist(...))` — devtools ngoài cùng.
- ✅ `partialize` để chọn fields persist.
- ✅ Action names trong set: `set({...}, false, 'actionName')` cho devtools.
- ✅ Zustand CHỈ cho global state (auth, theme, UI state). KHÔNG cho server state.
- ❌ KHÔNG dùng Zustand thay React Query cho API data.
- ❌ KHÔNG dùng `useContext` + Redux pattern. Zustand là global store duy nhất.

---

## §9. ROUTING — TanStack Router

### §9.1 Layout Routes

```
__root.tsx     → Root (providers, toaster, devtools)
_auth.tsx      → Auth layout (outlet only)
_public.tsx    → Public layout (header + outlet)
admin.tsx      → Admin guard (beforeLoad check) + admin layout
```

### §9.2 Route Guard

```typescript
// admin.tsx
export const Route = createFileRoute('/admin')({
    beforeLoad: () => {
        const { isAuthenticated, isAdmin } = useAuthStore.getState()
        if (!isAuthenticated) throw redirect({ to: '/login' })
        if (!isAdmin) throw redirect({ to: '/' })
    },
    component: AdminLayout,
})
```

### §9.3 Route File Rules

- ✅ File = Route. `routes/admin/trips.tsx` → `/admin/trips`.
- ✅ Auto code-splitting qua `tsr.config.json` + Vite plugin.
- ❌ KHÔNG edit `routeTree.gen.ts` — auto-generated bởi `tsr generate`.
- ❌ KHÔNG dùng `react-router-dom`. TanStack Router là router duy nhất.
- ✅ Route search params validate bằng Zod: `validateSearch: zodSearchValidator(schema)`.

---

## §10. UI / STYLING LAW

### §10.1 shadcn/ui Primitives

- UI components từ `@/components/ui/` — cài bằng CLI: `npx shadcn@latest add <component>`.
- ❌ KHÔNG edit file trong `components/ui/` trực tiếp.
- ✅ Customize qua `className` prop + `cn()`.
- ✅ Variants qua `variant`, `size` props.

### §10.2 Tailwind CSS v4 Rules

```tsx
// ✅ Responsive: mobile-first
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

// ✅ Conditional class
<div className={cn("p-4 rounded-lg", isActive && "bg-primary text-primary-foreground")}>

// ✅ Spacing: space-y, gap (KHÔNG margin hack)
<div className="space-y-4">

// ✅ Dark mode: class-based
<div className="bg-background text-foreground dark:bg-slate-900">
```

- ✅ `cn()` = `twMerge(clsx(...))` — merge + dedupe Tailwind classes.
- ✅ CSS Variables cho theming: `bg-background`, `text-foreground`, `text-primary`.
- ✅ Mobile-first: viết base → `sm:` → `md:` → `lg:`.
- ❌ KHÔNG `@apply` trong CSS files (trừ `index.css` global).
- ❌ KHÔNG `!important`.
- ❌ KHÔNG custom CSS class names. Dùng Tailwind utilities.

### §10.3 Icons

- ✅ Dùng `lucide-react` — import named: `import { Bus, MapPin } from 'lucide-react'`.
- ✅ Size: `className="h-4 w-4"`, `className="h-5 w-5"`.
- ❌ KHÔNG dùng icon library khác (heroicons, fontawesome, etc.).

### §10.4 Toast / Notification

```typescript
import { toast } from 'sonner'
toast.success('Trip created successfully')
toast.error('Failed to create trip')
toast.loading('Creating trip...')
```

- ✅ Dùng `sonner` — config trong `__root.tsx`: `<Toaster richColors position="top-right" />`.
- ❌ KHÔNG `alert()` hoặc `window.confirm()`.

---

## §11. COMPONENT PATTERNS

### §11.1 Component File Structure

```tsx
// 1. Imports — grouped: react/lib → @/ → relative
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import type { Trip } from '../types'

// 2. Props interface (nếu có)
interface TripCardProps {
    trip: Trip
    onSelect?: (id: number) => void
}

// 3. Named export — KHÔNG default export
export function TripCard({ trip, onSelect }: TripCardProps) {
    return (...)
}
```

**Rules:**
- ✅ Named export: `export function Component()`.
- ❌ KHÔNG `export default`.
- ✅ Props interface: `<Component>Props`.
- ✅ Destructure props trong params.
- ❌ KHÔNG `React.FC<Props>`. Dùng function declaration.

### §11.2 Import Order (auto-sorted)

```
1. React / external libs (@tanstack, zod, lucide-react, sonner)
2. @/ aliases (@/components, @/modules, @/stores, @/lib)
3. Relative imports (../, ./)
```

Blank line giữa mỗi group.

---

## §12. CONFIGURATION

### §12.1 Environment Variables

```typescript
// config/env.ts — validate tại startup
import { z } from 'zod'
const envSchema = z.object({
    VITE_API_BASE_URL: z.string().url(),
    VITE_APP_NAME: z.string().default('App'),
})
export const env = envSchema.parse(import.meta.env)
```

- ✅ Prefix `VITE_` cho client-side env vars.
- ✅ Validate bằng Zod khi app start.
- ❌ KHÔNG `import.meta.env.VITE_X` rải rác — dùng `env.VITE_X` từ config.

### §12.2 Path Aliases

```json
// tsconfig.app.json
"paths": { "@/*": ["./src/*"] }
```

- ✅ `@/` = `src/`. Dùng cho mọi import.
- ❌ KHÔNG relative path dài: `../../../components/...`.

---

## §13. CHECKLIST TRƯỚC COMMIT

- [ ] Module structure đủ: `api/`, `hooks/`, `types/`, `index.ts`
- [ ] Component KHÔNG gọi axios trực tiếp — chỉ dùng hooks
- [ ] Mutation hook CÓ `invalidateQueries` + toast
- [ ] Zod schema cho mọi form
- [ ] `routeTree.gen.ts` KHÔNG edit tay
- [ ] `components/ui/` KHÔNG edit tay
- [ ] KHÔNG `any`, `as any`, `@ts-ignore`
- [ ] KHÔNG `useEffect` + `fetch` pattern
- [ ] KHÔNG inline style — chỉ Tailwind
- [ ] KHÔNG `export default`
- [ ] Import order đúng nhóm
- [ ] `pnpm lint` pass
- [ ] `tsc --noEmit` pass
