---
tags:
  - srs
  - system-design
  - provider
  - multi-tenant
created: 2026-04-06
updated: 2026-04-06
---

# TÀI LIỆU ĐẶC TẢ VÀ THIẾT KẾ MODULE: PROVIDER (NHÀ XE)

> [!abstract] TỔNG QUAN
> Module Provider quản lý thông tin các nhà xe (kinh doanh, đơn vị vận tải) trong hệ thống. Mỗi Provider là một đơn vị multi-tenant nắm giữ:
> - **Danh tính**: Tên, hotline, slug (dùng cho URL-friendly identity)
> - **Chính sách**: Chính sách hoàn tiền, điều khoản dịch vụ
> - **Tài nguyên**: Danh sách xe buýt (Buses), các chuyến đi (Trips)
> - **Trạng thái**: Active/Inactive (soft-delete alternative)
>
> Module cung cấp CRUD, search, active/inactive toggle. Chỉ **inactive providers** mới được xóa. Là _master data_ tối quan trọng trong hệ thống bookings.

---

## 1. ĐẶC TẢ YÊU CẦU (SOFTWARE REQUIREMENT SPECIFICATION)

### 1.1. Danh sách yêu cầu chức năng

| ID | Tên chức năng | Mô tả | Mức độ ưu tiên | Độ phức tạp | Tác nhân |
|-----|---------------|-------|----------------|-------------|----------|
| PROV-01 | Tạo nhà xe mới | Admin tạo nhà xe với tên, hotline, slug duy nhất, chính sách | P1 | M | Admin |
| PROV-02 | Xem danh sách nhà xe | Lấy danh sách tất cả nhà xe (active/inactive), phân trang, lọc | P1 | L | Admin/Public |
| PROV-03 | Xem chi tiết nhà xe | Lấy thông tin chi tiết một nhà xe | P2 | L | Admin/Public |
| PROV-04 | Cập nhật thông tin nhà xe | Chỉnh sửa tên, hotline, slug, chính sách hoàn tiền | P2 | M | Admin |
| PROV-05 | Bật/tắt trạng thái nhà xe | Toggle active/inactive (soft-delete) | P1 | L | Admin |
| PROV-06 | Xóa nhà xe | Xóa vĩnh viễn (chỉ nếu inactive và không có buses/trips) | P3 | M | Admin |

### 1.2. Biểu đồ phân cấp chức năng

```plantuml
@startwbs
* Quản lý Nhà xe (Provider)
** Tạo nhà xe
*** Nhập tên nhà xe
*** Nhập hotline (tuỳ chọn)
*** Nhập slug hoặc auto-generate
*** Xác thực slug duy nhất
*** Nhập chính sách hoàn tiền
** Xem danh sách nhà xe
*** Phân trang
*** Lọc active/inactive
*** Tìm kiếm theo tên/slug
** Xem chi tiết
** Cập nhật thông tin
*** Cập nhật tên
*** Cập nhật hotline
*** Cập nhật slug (validate duy nhất)
*** Cập nhật chính sách
** Toggle trạng thái
*** active → inactive
*** inactive → active
** Xóa nhà xe
*** Kiểm tra inactive
*** Kiểm tra không có buses
*** Kiểm tra không có trips
@endwbs
```

---

## 2. BIỂU ĐỒ USE CASE

```plantuml
@startuml
left to right direction
skinparam actorStyle awesome

actor "Admin" as Admin
actor "Public" as Public

package "Module Provider" {
    usecase "UC01: Tạo nhà xe" as UC1
    usecase "UC02: Xem danh sách" as UC2
    usecase "UC03: Xem chi tiết" as UC3
    usecase "UC04: Cập nhật" as UC4
    usecase "UC05: Toggle trạng thái" as UC5
    usecase "UC06: Xóa nhà xe" as UC6
    
    usecase "Validate slug duy nhất" as UC_Slug
    usecase "Check FK constraints" as UC_Check
}

Admin --> UC1
Admin --> UC2
Admin --> UC3
Admin --> UC4
Admin --> UC5
Admin --> UC6

Public --> UC2
Public --> UC3

UC1 ..> UC_Slug : <<include>>
UC4 ..> UC_Slug : <<include>>
UC6 ..> UC_Check : <<include>>

@enduml
```

---

## 3. THIẾT KẾ CƠ SỞ DỮ LIỆU (DATABASE DESIGN)

### 3.1. ERD

```plantuml
@startuml
skinparam linetype ortho

entity "providers" as Provider {
    * id : SERIAL <<PK>>
    --
    * name : VARCHAR(100)
    hotline : VARCHAR(20)
    * slug : VARCHAR(100) <<UNIQUE>>
    policy_refund : TEXT
    * is_active : BOOLEAN <<DEFAULT TRUE>>
}

entity "buses" as Bus {
    * id : SERIAL <<PK>>
    --
    * provider_id : INT <<FK>>
    bus_type_id : INT <<FK>>
    license_plate : VARCHAR(20)
    status : VARCHAR(20)
}

entity "trips" as Trip {
    * id : BIGSERIAL <<PK>>
    --
    * provider_id : INT <<FK>>
    bus_id : INT <<FK>>
    ...
}

Provider ||--o{ Bus : "owns"
Provider ||--o{ Trip : "operates"
@enduml
```

### 3.2. Từ điển dữ liệu

| Tên trường | Kiểu dữ liệu | Ràng buộc | Mô tả |
|------------|--------------|-----------|-------|
| id | SERIAL | PK | Khóa chính nhà xe |
| name | VARCHAR(100) | NOT NULL, len >= 2 | Tên nhà xe (ví dụ: "Phương Trang") |
| hotline | VARCHAR(20) | NULL | Số điện thoại (regex: digits, spaces, dashes) |
| slug | VARCHAR(100) | UNIQUE, NOT NULL, len 3-50 | URL-friendly identifier (lowercase, dashes) |
| policy_refund | TEXT | NULL | Chính sách hoàn tiền (long text) |
| is_active | BOOLEAN | DEFAULT TRUE, NOT NULL | Trạng thái hoạt động (soft-delete) |

### 3.3. Ví dụ dữ liệu

| id | name | hotline | slug | is_active |
|----|------|---------|------|-----------|
| 1 | Phương Trang | 1900 6067 | phuong-trang | true |
| 2 | Thaco Bus | 1900 1110 | thaco-bus | true |
| 3 | Sapa Express | 1900 2222 | sapa-express | false |

---

## 4. KIẾN TRÚC HỆ THỐNG

### 4.1. Cấu trúc mã nguồn

| Lớp | Thư mục | File | Trách nhiệm |
|-----|---------|------|-------------|
| **Domain** | `domain/` | `entity.go` | Provider struct, Validate(), GenerateSlug(), CanBeDeleted() |
| **Domain** | `domain/` | `repository.go` | Repository interface (8 methods) |
| **UseCase** | `usecase/` | `usecase.go` | ProviderUseCase interface + logic, includes slug duplicate check |
| **Repository** | `repository/` | `repository.go` | SQL implementation |
| **Controller** | `controller/dto/` | `provider.go` | Request/Response DTOs |
| **Controller** | `controller/http/` | `handler.go` | HTTP handlers |

### 4.2. API Endpoints

| HTTP | Endpoint | Auth | Mô tả |
|------|----------|------|-------|
| **POST** | `/api/v1/admin/providers` | Admin | Tạo nhà xe |
| **GET** | `/api/v1/admin/providers` | Admin | Danh sách (admin) |
| **GET** | `/api/v1/providers` | Public | Danh sách (public - active only) |
| **GET** | `/api/v1/admin/providers/:id` | Admin | Chi tiết |
| **GET** | `/api/v1/providers/{slug}` | Public | Chi tiết by slug |
| **PUT** | `/api/v1/admin/providers/:id` | Admin | Cập nhật |
| **PATCH** | `/api/v1/admin/providers/:id/toggle-active` | Admin | Toggle active/inactive |
| **DELETE** | `/api/v1/admin/providers/:id` | Admin | Xóa |

### 4.3. Response Structure

**ProviderResponse:**
```json
{
    "id": 1,
    "name": "Phương Trang",
    "hotline": "1900 6067",
    "slug": "phuong-trang",
    "policyRefund": "Hủy >= 24h: 100%...",
    "isActive": true
}
```

---

## 5. BIỂU ĐỒ TUẦN TỰ

### 5.1. Tạo nhà xe

```plantuml
@startuml
title Sequence: Tạo Nhà Xe

actor Admin
participant Handler
participant UseCase
participant Repository
database DB

Admin -> Handler: POST /providers {name, slug, ...}
Handler -> UseCase: Create(input)
UseCase -> UseCase: Validate slug format
UseCase -> Repository: GetBySlug(slug)
Repository -> DB: SELECT * WHERE slug = $1
alt Slug exists
    DB --> Repository: row
    Repository --> UseCase: error
    UseCase --> Handler: ErrDuplicateSlug
    Handler --> Admin: 409 Conflict
end
DB --> Repository: nil
Repository --> UseCase: nil
UseCase -> UseCase: provider.Validate()
UseCase -> Repository: Create(provider)
Repository -> DB: INSERT INTO providers ...
DB --> Repository: *Provider
Repository --> UseCase: *Provider
UseCase --> Handler: *Provider
Handler --> Admin: 201 Created
@enduml
```

### 5.2. Danh sách nhà xe

```plantuml
@startuml
title Sequence: Xem Danh Sách Nhà Xe

actor Admin
participant Handler
participant UseCase
participant Repository
database DB

Admin -> Handler: GET /admin/providers?page=1&limit=20&isActive=true
Handler -> UseCase: List(filter)
UseCase -> Repository: List(filter)
Repository -> DB: SELECT * FROM providers\nWHERE is_active = $1\nORDER BY name\nLIMIT $2 OFFSET $3
DB --> Repository: []*Provider
Repository --> UseCase: []*Provider
UseCase -> Repository: Count(filter)
Repository -> DB: SELECT COUNT(*) FROM providers\nWHERE is_active = $1
DB --> Repository: int64
Repository --> UseCase: int64
UseCase --> Handler: ([]*Provider, total)
Handler --> Admin: 200 OK {data, pagination}
@enduml
```

### 5.3. Toggle trạng thái

```plantuml
@startuml
title Sequence: Toggle Active/Inactive

actor Admin
participant Handler
participant UseCase
participant Repository
database DB

Admin -> Handler: PATCH /providers/1/toggle-active
Handler -> UseCase: ToggleActive(1)
UseCase -> Repository: GetByID(1)
Repository -> DB: SELECT * FROM providers WHERE id = $1
DB --> Repository: *Provider
Repository --> UseCase: *Provider
UseCase -> Repository: ToggleActive(1)\n(UPDATE is_active = NOT is_active)
Repository -> DB: UPDATE providers\nSET is_active = NOT is_active\nWHERE id = $1\nRETURNING *
DB --> Repository: *Provider
Repository --> UseCase: *Provider
UseCase --> Handler: *Provider
Handler --> Admin: 200 OK {updated}
@enduml
```

---

## 6. MÁY TRẠNG THÁI

```plantuml
@startuml
state "ACTIVE" as active {
    active : Nhà xe đang hoạt động
    active : Có thể tạo trips/buses
}

state "INACTIVE" as inactive {
    inactive : Nhà xe tạm ngưng
    inactive : Có thể kích hoạt lại
    inactive : Có thể xóa nếu không có FK
}

[*] --> active : new Provider

active --> inactive : ToggleActive()
inactive --> active : ToggleActive()

inactive --> [*] : Delete (if no FK refs)
@enduml
```

---

## 7. QUY TẮC NGHIỆP VỤ

### 7.1. Validation Rules

| Trường | Quy tắc | Error |
|--------|---------|-------|
| name | Bắt buộc, >= 2 ký tự | ErrProviderNameRequired, ErrProviderNameTooShort |
| hotline | Tuỳ chọn, chỉ digits/spaces/dashes | ErrProviderHotlineInvalid |
| slug | Bắt buộc, 3-50 ký tự, lowercase+dashes, duy nhất | ErrProviderSlugInvalid, ErrProviderSlugTooShort/Long, ErrDuplicateSlug |
| policy_refund | Tuỳ chọn, long text | (no validation) |

### 7.2. Quy tắc tạo

| BR-CREATE-01 | Nhà xe mới được tạo với `is_active = TRUE` |
|---|---|
| BR-CREATE-02 | Slug phải duy nhất, không được trùng nhà xe khác |
| BR-CREATE-03 | Nếu không cung cấp slug, có thể auto-generate từ tên |

### 7.3. Quy tắc xóa

| BR-DELETE-01 | Chỉ xóa được nếu `is_active = FALSE` |
|---|---|
| BR-DELETE-02 | Không xóa được nếu còn buses FK (foreign key) |
| BR-DELETE-03 | Không xóa được nếu còn trips FK |
| BR-DELETE-04 | Khuyên: Toggle inactive thay vì xóa hard |

### 7.4. Quy tắc toggle

| BR-TOGGLE-01 | Toggle từ active → inactive, hoặc vice versa |
|---|---|
| BR-TOGGLE-02 | Khi toggle inactive: trips sắp tới nên bị hủy (hệ thống) |

---

## 8. XỬ LÝ LỖI

| Domain Error | HTTP Status | Code | Mô tả |
|--------------|-------------|------|-------|
| ErrProviderNotFound | 404 | PROVIDER_NOT_FOUND | Không tìm thấy nhà xe |
| ErrProviderNameRequired | 400 | NAME_REQUIRED | Thiếu tên nhà xe |
| ErrProviderNameTooShort | 400 | NAME_TOO_SHORT | Tên quá ngắn |
| ErrProviderHotlineInvalid | 400 | HOTLINE_INVALID | Hotline không hợp lệ |
| ErrProviderSlugInvalid | 400 | SLUG_INVALID | Slug không hợp lệ (format) |
| ErrProviderSlugTooShort/Long | 400 | SLUG_LEN_INVALID | Slug quá ngắn/dài |
| ErrDuplicateSlug | 409 | SLUG_EXISTS | Slug này đã tồn tại |
| ErrProviderCannotDelete | 409 | CANNOT_DELETE | Nhà xe còn active hoặc có FK refs |

---

## 9. CẤU TRÚC REQUEST/RESPONSE

**CreateProviderRequest:**
```json
{
    "name": "Phương Trang",
    "hotline": "1900 6067",
    "slug": "phuong-trang",
    "policyRefund": "Hủy >= 24h: 100%, 6-24h: 70%..."
}
```

**ListProvidersResponse:**
```json
{
    "success": true,
    "data": [
        {
            "id": 1,
            "name": "Phương Trang",
            "hotline": "1900 6067",
            "slug": "phuong-trang",
            "isActive": true
        }
    ],
    "pagination": {
        "page": 1,
        "limit": 20,
        "total": 50,
        "totalPages": 3
    }
}
```

---

## 10. TỐI ƯU QUERY

**Recommended Indexes:**
```sql
CREATE INDEX idx_providers_slug ON providers (slug);
CREATE INDEX idx_providers_is_active ON providers (is_active) WHERE is_active = TRUE;
CREATE INDEX idx_providers_name ON providers (name);
```

---
