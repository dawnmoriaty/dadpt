---
tags:
  - srs
  - system-design
  - provider
  - bus-company
created: 2026-02-25
updated: 2026-02-25
---

# TÀI LIỆU ĐẶC TẢ VÀ THIẾT KẾ MODULE: PROVIDER (NHÀ XE)

> [!abstract] TỔNG QUAN
> Module Provider quản lý thông tin các nhà xe (Bus Operators) trong hệ thống đặt vé xe buýt. Mỗi nhà xe có thể sở hữu nhiều xe buýt và cung cấp nhiều chuyến xe. Module cung cấp các chức năng CRUD đầy đủ cho quản trị viên và hiển thị danh sách nhà xe đang hoạt động cho khách hàng. Hệ thống hỗ trợ slug URL-friendly, số hotline, chính sách hoàn vé và trạng thái hoạt động (active/inactive).

---

## 1. ĐẶC TẢ YÊU CẦU (SOFTWARE REQUIREMENT SPECIFICATION)

### 1.1. Danh sách yêu cầu chức năng (Functional Requirements)

| ID | Tên chức năng | Mức độ ưu tiên | Độ phức tạp | Tác nhân (Actor) |
|-----|---------------|----------------|-------------|------------------|
| PRV-01 | Xem danh sách nhà xe hoạt động | P1 | L | Guest/Customer |
| PRV-02 | Tạo nhà xe mới | P1 | L | Admin |
| PRV-03 | Xem danh sách nhà xe (Admin) | P2 | L | Admin/Operator |
| PRV-04 | Xem chi tiết nhà xe | P2 | L | Admin/Operator |
| PRV-05 | Cập nhật thông tin nhà xe | P2 | L | Admin |
| PRV-06 | Bật/Tắt trạng thái hoạt động | P2 | L | Admin |
| PRV-07 | Xóa nhà xe | P3 | M | Admin |

### 1.2. Biểu đồ phân cấp chức năng (Functional Hierarchy)

```plantuml
@startwbs
* Quản lý Nhà xe (Provider)
** Public APIs
*** Danh sách nhà xe hoạt động
**** Lọc chỉ nhà xe is_active = true
**** Sắp xếp theo tên
** Admin APIs
*** Tạo nhà xe mới
**** Xác thực tên (bắt buộc)
**** Xác thực hotline (tùy chọn)
**** Tạo slug từ tên
*** Xem danh sách (phân trang)
*** Xem chi tiết
*** Cập nhật thông tin
**** Cập nhật từng trường (partial update)
**** Xác thực slug duy nhất
*** Bật/Tắt hoạt động (Toggle)
*** Xóa nhà xe
**** Kiểm tra không còn xe buýt liên kết
@endwbs
```

---

## 2. BIỂU ĐỒ USE CASE VÀ ĐẶC TẢ (USE CASE SPECIFICATIONS)

### 2.1. Biểu đồ Use Case

```plantuml
@startuml
left to right direction
skinparam actorStyle awesome
skinparam packageStyle rectangle

actor "Khách/Khách hàng" as Guest
actor "Admin" as Admin
actor "Operator" as Operator

package "Module Provider" {
    usecase "UC01: Xem danh sách nhà xe hoạt động" as UC1
    usecase "UC02: Tạo nhà xe mới" as UC2
    usecase "UC03: Xem danh sách nhà xe (Admin)" as UC3
    usecase "UC04: Xem chi tiết nhà xe" as UC4
    usecase "UC05: Cập nhật thông tin" as UC5
    usecase "UC06: Bật/Tắt hoạt động" as UC6
    usecase "UC07: Xóa nhà xe" as UC7
    
    usecase "Xác thực slug duy nhất" as UC_Slug
    usecase "Kiểm tra ràng buộc" as UC_Check
}

Guest --> UC1

Admin --> UC2
Admin --> UC3
Admin --> UC4
Admin --> UC5
Admin --> UC6
Admin --> UC7

Operator --> UC3
Operator --> UC4

UC2 ..> UC_Slug : <<include>>
UC5 ..> UC_Slug : <<include>>
UC7 ..> UC_Check : <<include>>
@enduml
```

### 2.2. Đặc tả Use Case chi tiết: Bật/Tắt trạng thái hoạt động (ToggleActive)

> [!info] Thông tin Use Case
> **Use Case ID:** UC-PRV-06
> **Use Case Name:** Bật/Tắt trạng thái hoạt động (ToggleActive)
> **Actor:** Admin
> **Trigger:** Admin nhấn nút toggle trạng thái của nhà xe

> [!note] Điều kiện tiên quyết (Pre-conditions)
> 1. Nhà xe tồn tại trong hệ thống
> 2. Admin đã đăng nhập và có quyền

> [!success] Điều kiện hậu kỳ (Post-conditions)
> Trạng thái is_active của nhà xe được đảo ngược (true -> false hoặc false -> true)

**Luồng xử lý chính (Normal Flow):**

| Bước | Tác nhân | Hành động |
|------|----------|-----------|
| 1 | Admin | Gửi PATCH request đến `/api/v1/admin/providers/:id/toggle` |
| 2 | Controller | Lấy provider ID từ URL params |
| 3 | UseCase | Gọi `repository.ToggleActive(ctx, id)` |
| 4 | Repository | Thực thi `UPDATE providers SET is_active = NOT is_active WHERE id = $1 RETURNING *` |
| 5 | Controller | Trả về thông tin nhà xe đã cập nhật |

### 2.3. Đặc tả Use Case: Tạo nhà xe mới (Create)

> [!info] Thông tin Use Case
> **Use Case ID:** UC-PRV-02
> **Use Case Name:** Tạo nhà xe mới
> **Actor:** Admin
> **Trigger:** Admin muốn thêm nhà xe mới vào hệ thống

**Luồng xử lý chính:**

| Bước | Tác nhân | Hành động |
|------|----------|-----------|
| 1 | Admin | Gửi POST `/api/v1/admin/providers` với body `{name, hotline, slug, policyRefund, imageUrl}` |
| 2 | UseCase | Validate: name >= 2 ký tự, hotline format, slug unique |
| 3 | Repository | INSERT INTO providers |
| 4 | Controller | Trả về 201 Created |

### 2.4. Đặc tả Use Case: Xóa nhà xe (Delete)

> [!info] Thông tin Use Case
> **Use Case ID:** UC-PRV-07
> **Use Case Name:** Xóa nhà xe
> **Actor:** Admin
> **Trigger:** Admin muốn xóa nhà xe không còn sử dụng

**Luồng xử lý chính:**

| Bước | Tác nhân | Hành động |
|------|----------|-----------|
| 1 | Admin | Gửi DELETE `/api/v1/admin/providers/:id` |
| 2 | UseCase | Kiểm tra provider.IsActive == false |
| 3 | UseCase | Kiểm tra không còn buses/trips liên kết |
| 4 | Repository | DELETE FROM providers WHERE id = $1 |
| 5 | Controller | Trả về 204 No Content |

---

## 3. THIẾT KẾ CƠ SỞ DỮ LIỆU (DATABASE DESIGN)

### 3.1. Sơ đồ thực thể liên kết (Entity Relationship Diagram - ERD)

```plantuml
@startuml
skinparam linetype ortho

entity "providers" as Provider {
    * id : SERIAL <<PK>>
    --
    * name : VARCHAR(100)
    hotline : VARCHAR(20)
    slug : VARCHAR(50) <<UNIQUE>>
    policy_refund : TEXT
    is_active : BOOLEAN <<DEFAULT true>>
    image_url : VARCHAR(255)
}

entity "buses" as Bus {
    * id : SERIAL <<PK>>
    --
    * provider_id : INT <<FK>>
    * bus_type_id : INT <<FK>>
    * license_plate : VARCHAR(20)
    status : VARCHAR(20)
}

entity "trips" as Trip {
    * id : BIGSERIAL <<PK>>
    --
    * provider_id : INT <<FK>>
    * bus_id : INT <<FK>>
    ...
}

Provider ||--o{ Bus : "1 nhà xe có nhiều xe buýt"
Provider ||--o{ Trip : "1 nhà xe có nhiều chuyến xe"
@enduml
```

### 3.2. Từ điển dữ liệu (Data Dictionary)

> [!abstract] Bảng: providers

| Tên trường | Kiểu dữ liệu | Ràng buộc | Mô tả |
|------------|--------------|-----------|-------|
| id | SERIAL | PK, NOT NULL | Khóa chính, tự động tăng |
| name | VARCHAR(100) | NOT NULL | Tên nhà xe (tối thiểu 2 ký tự) |
| hotline | VARCHAR(20) | NULL | Số điện thoại hotline (chỉ chứa số, dấu cách, gạch ngang) |
| slug | VARCHAR(50) | UNIQUE, NULL | Slug URL-friendly (a-z, 0-9, gạch ngang, 3-50 ký tự) |
| policy_refund | TEXT | NULL | Chính sách hoàn vé/đổi vé |
| is_active | BOOLEAN | DEFAULT true | Trạng thái hoạt động |
| image_url | VARCHAR(255) | NULL | URL ảnh logo nhà xe |

---

## 4. KIẾN TRÚC HỆ THỐNG VÀ LUỒNG XỬ LÝ (SYSTEM ARCHITECTURE)

### 4.1. Kiến trúc mã nguồn

| Lớp (Layer) | Thư mục | File | Trách nhiệm |
|-------------|---------|------|-------------|
| **Domain** | `domain/` | `entity.go` | Entity Provider; Validation methods; DTOs: CreateProviderInput, UpdateProviderInput |
| **Domain** | `domain/` | `ports.go` | Interface: Repository |
| **Repository** | `repository/` | `repository.go` | Implement Repository interface |
| **UseCase** | `usecase/` | `usecase.go` | Implement IProviderUseCase |
| **Controller** | `controller/http/` | `handler.go` | HTTP handlers |
| **Controller** | `controller/http/` | `routes.go` | Đăng ký routes |

### 4.2. Danh sách API Endpoints

| HTTP Method | Endpoint | Yêu cầu quyền | Mô tả chức năng |
|-------------|----------|---------------|-----------------|
| GET | `/api/v1/providers` | Public | Danh sách nhà xe hoạt động |
| POST | `/api/v1/admin/providers` | Admin | Tạo nhà xe mới |
| GET | `/api/v1/admin/providers` | Admin/Operator | Danh sách nhà xe (phân trang) |
| GET | `/api/v1/admin/providers/:id` | Admin/Operator | Chi tiết nhà xe |
| PUT | `/api/v1/admin/providers/:id` | Admin | Cập nhật nhà xe |
| PATCH | `/api/v1/admin/providers/:id/toggle` | Admin | Bật/tắt hoạt động |
| DELETE | `/api/v1/admin/providers/:id` | Admin | Xóa nhà xe |

---

## 5. BIỂU ĐỒ TUẦN TỰ (SEQUENCE DIAGRAMS)

### 5.1. Biểu đồ tuần tự: Tạo nhà xe mới

```plantuml
@startuml
skinparam responseMessageBelowArrow true
skinparam sequenceMessageAlign center

title Sequence Diagram: Tạo Nhà xe Mới

actor "Admin" as Admin
participant "ProviderHandler" as Handler
participant "ProviderUseCase" as UC
participant "ProviderRepository" as Repo
database "PostgreSQL" as DB

Admin -> Handler: POST /admin/providers\n{name, hotline, slug, policyRefund, imageUrl}
activate Handler

Handler -> Handler: Bind JSON to CreateRequest
Handler -> UC: Create(ctx, CreateProviderInput)
activate UC

UC -> UC: Tạo Provider entity
UC -> UC: provider.Validate()
note right
    **Quy tắc validation:**
    - Name: bắt buộc, >= 2 ký tự
    - Hotline: regex ^[0-9\s\-]+$
    - Slug: regex ^[a-z0-9\-]+$, 3-50 ký tự
end note

alt Validation thất bại
    UC --> Handler: ErrProviderNameRequired / ErrProviderSlugInvalid
    Handler --> Admin: 400 Bad Request
end

UC -> Repo: Create(ctx, provider)
activate Repo
Repo -> DB: INSERT INTO providers\n(name, hotline, slug, policy_refund, image_url)\nVALUES ($1, $2, $3, $4, $5)\nRETURNING *
DB --> Repo: provider row
Repo --> UC: *Provider
deactivate Repo

UC --> Handler: *Provider
deactivate UC

Handler --> Admin: 201 Created\n{provider data}
deactivate Handler

@enduml
```

### 5.2. Biểu đồ tuần tự: Bật/Tắt trạng thái hoạt động

```plantuml
@startuml
skinparam responseMessageBelowArrow true
skinparam sequenceMessageAlign center

title Sequence Diagram: Bật/Tắt Trạng thái Hoạt động

actor "Admin" as Admin
participant "ProviderHandler" as Handler
participant "ProviderUseCase" as UC
participant "ProviderRepository" as Repo
database "PostgreSQL" as DB

Admin -> Handler: PATCH /admin/providers/123/toggle
activate Handler

Handler -> UC: ToggleActive(ctx, 123)
activate UC

UC -> Repo: ToggleActive(ctx, 123)
activate Repo
Repo -> DB: UPDATE providers\nSET is_active = NOT is_active\nWHERE id = $1\nRETURNING *
note right
    Atomic toggle operation
    true -> false
    false -> true
end note
DB --> Repo: provider row (updated)
Repo --> UC: *Provider
deactivate Repo

alt Không tìm thấy
    UC --> Handler: ErrProviderNotFound
    Handler --> Admin: 404 Not Found
end

UC --> Handler: *Provider
deactivate UC

Handler --> Admin: 200 OK\n{provider với is_active mới}
deactivate Handler

@enduml
```

### 5.3. Biểu đồ tuần tự: Xóa nhà xe

```plantuml
@startuml
skinparam responseMessageBelowArrow true
skinparam sequenceMessageAlign center

title Sequence Diagram: Xóa Nhà xe

actor "Admin" as Admin
participant "ProviderHandler" as Handler
participant "ProviderUseCase" as UC
participant "ProviderRepository" as Repo
database "PostgreSQL" as DB

Admin -> Handler: DELETE /admin/providers/123
activate Handler

Handler -> UC: Delete(ctx, 123)
activate UC

UC -> Repo: GetByID(ctx, 123)
activate Repo
Repo -> DB: SELECT * FROM providers WHERE id = $1
DB --> Repo: provider row
Repo --> UC: *Provider
deactivate Repo

UC -> UC: provider.CanBeDeleted()
note right
    **Quy tắc:**
    Chỉ xóa được nhà xe
    có is_active = false
end note

alt Provider đang active
    UC --> Handler: ErrProviderCannotDelete
    Handler --> Admin: 400 Bad Request\n{error: "Vô hiệu hóa nhà xe trước khi xóa"}
end

UC -> Repo: Delete(ctx, 123)
activate Repo
Repo -> DB: DELETE FROM providers WHERE id = $1
note right
    Có thể fail nếu còn FK
    từ buses hoặc trips
end note
DB --> Repo: OK
Repo --> UC: nil
deactivate Repo

UC --> Handler: nil
deactivate UC

Handler --> Admin: 204 No Content
deactivate Handler

@enduml
```

### 5.4. Biểu đồ tuần tự: Xem danh sách nhà xe hoạt động (Public)

```plantuml
@startuml
skinparam responseMessageBelowArrow true
skinparam sequenceMessageAlign center

title Sequence Diagram: Danh sách Nhà xe Hoạt động (Public)

actor "Client" as Client
participant "ProviderHandler" as Handler
participant "ProviderUseCase" as UC
participant "ProviderRepository" as Repo
database "PostgreSQL" as DB

Client -> Handler: GET /providers
activate Handler

Handler -> UC: ListActive(ctx)
activate UC

UC -> Repo: GetAllActive(ctx)
activate Repo
Repo -> DB: SELECT * FROM providers\nWHERE is_active = true\nORDER BY name ASC
DB --> Repo: []Provider rows
Repo --> UC: []*Provider
deactivate Repo

UC --> Handler: []*Provider
deactivate UC

Handler --> Client: 200 OK\n{data: [...]}
deactivate Handler

@enduml
```

### 5.5. Biểu đồ tuần tự: Cập nhật thông tin nhà xe

```plantuml
@startuml
skinparam responseMessageBelowArrow true
skinparam sequenceMessageAlign center

title Sequence Diagram: Cập nhật Thông tin Nhà xe

actor "Admin" as Admin
participant "ProviderHandler" as Handler
participant "ProviderUseCase" as UC
participant "ProviderRepository" as Repo
database "PostgreSQL" as DB

Admin -> Handler: PUT /admin/providers/123\n{name, hotline, slug, policyRefund, imageUrl}
activate Handler

Handler -> Handler: Bind JSON, Validate
Handler -> UC: Update(ctx, 123, UpdateProviderInput)
activate UC

UC -> Repo: GetByID(ctx, 123)
activate Repo
Repo -> DB: SELECT * FROM providers WHERE id = $1
DB --> Repo: provider row
Repo --> UC: *Provider
deactivate Repo

alt Không tìm thấy
    UC --> Handler: ErrProviderNotFound
    Handler --> Admin: 404 Not Found
end

UC -> UC: Validate input fields
alt Slug đã thay đổi
    UC -> Repo: ExistsBySlug(ctx, newSlug)
    Repo -> DB: SELECT EXISTS(...)
    DB --> Repo: bool
    Repo --> UC: bool
    
    alt Slug đã tồn tại
        UC --> Handler: ErrDuplicateSlug
        Handler --> Admin: 409 Conflict
    end
end

UC -> Repo: Update(ctx, 123, updates)
activate Repo
Repo -> DB: UPDATE providers SET\n  name = $2, hotline = $3, slug = $4,\n  policy_refund = $5, image_url = $6\nWHERE id = $1\nRETURNING *
DB --> Repo: Updated provider
Repo --> UC: *Provider
deactivate Repo

UC --> Handler: *Provider
deactivate UC

Handler --> Admin: 200 OK\n{updated provider}
deactivate Handler

@enduml
```

---

## 6. CÁC QUY TẮC NGHIỆP VỤ (BUSINESS RULES)

### 6.1. Quy tắc xác thực

| Trường | Quy tắc | Regex/Điều kiện |
|--------|---------|-----------------|
| name | Bắt buộc, tối thiểu 2 ký tự | `len(name) >= 2` |
| hotline | Tùy chọn, chỉ chứa số, dấu cách, gạch ngang | `^[0-9\s\-]+$` |
| slug | Tùy chọn, chỉ chứa a-z, 0-9, gạch ngang, 3-50 ký tự | `^[a-z0-9\-]+$`, `3 <= len <= 50` |

### 6.2. Quy tắc xóa nhà xe

| Quy tắc | Mô tả |
|---------|-------|
| BR-DEL-01 | Chỉ xóa được nhà xe đã được vô hiệu hóa (is_active = false) |
| BR-DEL-02 | Không xóa được nếu còn xe buýt (buses) liên kết |
| BR-DEL-03 | Không xóa được nếu còn chuyến xe (trips) liên kết |

### 6.3. Quy tắc hiển thị public

| Quy tắc | Mô tả |
|---------|-------|
| BR-PUB-01 | Chỉ hiển thị nhà xe có is_active = true |
| BR-PUB-02 | Sắp xếp theo tên A-Z |

---

## 7. XỬ LÝ LỖI (ERROR HANDLING)

| Domain Error | HTTP Status | Error Code | Mô tả |
|--------------|-------------|------------|-------|
| ErrProviderNotFound | 404 | PROVIDER_NOT_FOUND | Không tìm thấy nhà xe |
| ErrProviderNameRequired | 400 | PROVIDER_NAME_REQUIRED | Thiếu tên nhà xe |
| ErrProviderNameTooShort | 400 | PROVIDER_NAME_TOO_SHORT | Tên quá ngắn |
| ErrProviderHotlineInvalid | 400 | PROVIDER_HOTLINE_INVALID | Số hotline không hợp lệ |
| ErrProviderSlugInvalid | 400 | PROVIDER_SLUG_INVALID | Slug không hợp lệ |
| ErrProviderSlugTooShort | 400 | PROVIDER_SLUG_TOO_SHORT | Slug quá ngắn |
| ErrProviderSlugTooLong | 400 | PROVIDER_SLUG_TOO_LONG | Slug quá dài |
| ErrDuplicateSlug | 409 | DUPLICATE_SLUG | Slug đã tồn tại |
| ErrProviderCannotDelete | 400 | PROVIDER_CANNOT_DELETE | Không thể xóa nhà xe |

---

## 8. CẤU TRÚC DỮ LIỆU RESPONSE

### 8.1. ProviderResponse

```json
{
    "id": 1,
    "name": "Phương Trang",
    "hotline": "1900 6067",
    "slug": "phuong-trang",
    "policyRefund": "Hoàn 100% nếu hủy trước 24h...",
    "isActive": true,
    "imageUrl": "https://cdn.example.com/providers/phuong-trang.png"
}
```

### 8.2. ListProvidersResponse (Admin)

```json
{
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
