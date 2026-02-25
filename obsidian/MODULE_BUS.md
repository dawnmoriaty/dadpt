---
tags:
  - srs
  - system-design
  - bus
  - vehicle
created: 2026-02-25
updated: 2026-02-25
---

# TÀI LIỆU ĐẶC TẢ VÀ THIẾT KẾ MODULE: BUS (XE BUÝT)

> [!abstract] TỔNG QUAN
> Module Bus quản lý thông tin các xe buýt trong hệ thống đặt vé. Mỗi xe buýt thuộc về một nhà xe (Provider) và có một loại xe (BusType) xác định số ghế và cách bố trí. Module cung cấp CRUD đầy đủ cho quản trị viên để quản lý đội xe, bao gồm thông tin biển số, trạng thái hoạt động (active, maintenance, retired) và ảnh xe. Đây là module admin-only, không có public API.

---

## 1. ĐẶC TẢ YÊU CẦU (SOFTWARE REQUIREMENT SPECIFICATION)

### 1.1. Danh sách yêu cầu chức năng (Functional Requirements)

| ID | Tên chức năng | Mức độ ưu tiên | Độ phức tạp | Tác nhân (Actor) |
|-----|---------------|----------------|-------------|------------------|
| BUS-01 | Tạo xe buýt mới | P1 | L | Admin/Operator |
| BUS-02 | Xem danh sách xe buýt | P1 | M | Admin/Operator |
| BUS-03 | Xem chi tiết xe buýt | P2 | L | Admin/Operator |
| BUS-04 | Cập nhật thông tin xe | P2 | L | Admin/Operator |
| BUS-05 | Cập nhật trạng thái xe | P1 | L | Admin/Operator |
| BUS-06 | Xóa xe buýt | P3 | M | Admin |

### 1.2. Biểu đồ phân cấp chức năng (Functional Hierarchy)

```plantuml
@startwbs
* Quản lý Xe buýt (Bus)
** Tạo xe buýt mới
*** Chọn nhà xe (provider)
*** Chọn loại xe (bus_type)
*** Nhập biển số xe
*** Xác thực biển số duy nhất
** Xem danh sách xe
*** Phân trang
*** Lọc theo nhà xe (tùy chọn)
*** JOIN thông tin loại xe, nhà xe
** Xem chi tiết xe
** Cập nhật thông tin
*** Cập nhật loại xe
*** Cập nhật biển số
*** Cập nhật ảnh xe
** Quản lý trạng thái
*** active -> maintenance
*** maintenance -> active
*** active/maintenance -> retired
** Xóa xe buýt
*** Kiểm tra không có trip liên kết
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

actor "Admin" as Admin
actor "Operator" as Operator

package "Module Bus" {
    usecase "UC01: Tạo xe buýt mới" as UC1
    usecase "UC02: Xem danh sách xe" as UC2
    usecase "UC03: Xem chi tiết xe" as UC3
    usecase "UC04: Cập nhật thông tin" as UC4
    usecase "UC05: Cập nhật trạng thái" as UC5
    usecase "UC06: Xóa xe buýt" as UC6
    
    usecase "Xác thực biển số duy nhất" as UC_Plate
    usecase "Kiểm tra ràng buộc FK" as UC_Check
}

Admin --> UC1
Admin --> UC2
Admin --> UC3
Admin --> UC4
Admin --> UC5
Admin --> UC6

Operator --> UC1
Operator --> UC2
Operator --> UC3
Operator --> UC4
Operator --> UC5

UC1 ..> UC_Plate : <<include>>
UC4 ..> UC_Plate : <<include>>
UC6 ..> UC_Check : <<include>>
@enduml
```

### 2.2. Đặc tả Use Case: Cập nhật trạng thái xe (UpdateStatus)

> [!info] Thông tin Use Case
> **Use Case ID:** UC-BUS-05
> **Use Case Name:** Cập nhật trạng thái xe (UpdateStatus)
> **Actor:** Admin hoặc Operator
> **Trigger:** Người dùng chọn trạng thái mới cho xe

> [!note] Điều kiện tiên quyết (Pre-conditions)
> 1. Xe buýt tồn tại trong hệ thống
> 2. Trạng thái mới nằm trong danh sách hợp lệ

> [!success] Điều kiện hậu kỳ (Post-conditions)
> Trạng thái xe được cập nhật

**Luồng xử lý chính (Normal Flow):**

| Bước | Tác nhân | Hành động |
|------|----------|-----------|
| 1 | Admin | Gửi PATCH request đến `/api/v1/admin/buses/:id/status` với `{status: "maintenance"}` |
| 2 | Controller | Parse ID và status từ request |
| 3 | UseCase | Validate status value (active/maintenance/retired) |
| 4 | UseCase | Gọi `repository.UpdateStatus(ctx, id, status)` |
| 5 | Repository | Thực thi `UPDATE buses SET status = $2 WHERE id = $1 RETURNING *` |
| 6 | Controller | Trả về thông tin xe đã cập nhật |

### 2.3. Trạng thái hợp lệ

| Trạng thái | Mô tả | Transition cho phép |
|------------|-------|---------------------|
| active | Xe đang hoạt động | → maintenance, retired |
| maintenance | Xe đang bảo trì | → active, retired |
| retired | Xe đã ngừng hoạt động | (terminal state) |

---

## 3. THIẾT KẾ CƠ SỞ DỮ LIỆU (DATABASE DESIGN)

### 3.1. Sơ đồ thực thể liên kết (Entity Relationship Diagram - ERD)

```plantuml
@startuml
skinparam linetype ortho

entity "buses" as Bus {
    * id : SERIAL <<PK>>
    --
    * provider_id : INT <<FK>>
    * bus_type_id : INT <<FK>>
    * license_plate : VARCHAR(20) <<UNIQUE>>
    status : VARCHAR(20) <<DEFAULT 'active'>>
    image_url : VARCHAR(255)
}

entity "providers" as Provider {
    * id : SERIAL <<PK>>
    --
    * name : VARCHAR(100)
    is_active : BOOLEAN
}

entity "bus_types" as BusType {
    * id : SERIAL <<PK>>
    --
    * name : VARCHAR(100)
    * total_seats : INT
    * seat_layout : JSONB
}

entity "trips" as Trip {
    * id : BIGSERIAL <<PK>>
    --
    * provider_id : INT <<FK>>
    * bus_id : INT <<FK>>
    ...
}

Bus }o--|| Provider : "provider_id"
Bus }o--|| BusType : "bus_type_id"
Trip }o--|| Bus : "bus_id"
@enduml
```

### 3.2. Từ điển dữ liệu (Data Dictionary)

> [!abstract] Bảng: buses

| Tên trường | Kiểu dữ liệu | Ràng buộc | Mô tả |
|------------|--------------|-----------|-------|
| id | SERIAL | PK, NOT NULL | Khóa chính, tự động tăng |
| provider_id | INT | FK → providers.id, NOT NULL | ID nhà xe sở hữu |
| bus_type_id | INT | FK → bus_types.id, NOT NULL | ID loại xe |
| license_plate | VARCHAR(20) | UNIQUE, NOT NULL | Biển số xe (tối thiểu 5 ký tự) |
| status | VARCHAR(20) | DEFAULT 'active' | Trạng thái: active, maintenance, retired |
| image_url | VARCHAR(255) | NULL | URL ảnh xe |

### 3.3. Ví dụ dữ liệu

| id | provider_id | bus_type_id | license_plate | status | image_url |
|----|-------------|-------------|---------------|--------|-----------|
| 1 | 1 | 2 | 51B-12345 | active | https://cdn.example.com/buses/51b-12345.jpg |
| 2 | 1 | 2 | 51B-12346 | maintenance | |
| 3 | 2 | 1 | 50A-99999 | active | |

---

## 4. KIẾN TRÚC HỆ THỐNG VÀ LUỒNG XỬ LÝ (SYSTEM ARCHITECTURE)

### 4.1. Kiến trúc mã nguồn

| Lớp (Layer) | Thư mục | File | Trách nhiệm |
|-------------|---------|------|-------------|
| **Domain** | `domain/` | `entity.go` | Entity Bus; Validation methods; DTOs |
| **Domain** | `domain/` | `ports.go` | Interface: Repository |
| **Repository** | `repository/` | `repository.go` | Implement Repository interface |
| **UseCase** | `usecase/` | `usecase.go` | Implement IBusUseCase |
| **Controller** | `controller/http/` | `handler.go` | HTTP handlers |
| **Controller** | `controller/http/` | `routes.go` | Đăng ký routes |

### 4.2. Danh sách API Endpoints

| HTTP Method | Endpoint | Yêu cầu quyền | Mô tả chức năng |
|-------------|----------|---------------|-----------------|
| POST | `/api/v1/admin/buses` | Admin/Operator | Tạo xe buýt mới |
| GET | `/api/v1/admin/buses` | Admin/Operator | Danh sách xe (phân trang, filter) |
| GET | `/api/v1/admin/buses/:id` | Admin/Operator | Chi tiết xe buýt |
| PUT | `/api/v1/admin/buses/:id` | Admin/Operator | Cập nhật thông tin xe |
| PATCH | `/api/v1/admin/buses/:id/status` | Admin/Operator | Cập nhật trạng thái |
| DELETE | `/api/v1/admin/buses/:id` | Admin | Xóa xe buýt |

---

## 5. BIỂU ĐỒ TUẦN TỰ (SEQUENCE DIAGRAMS)

### 5.1. Biểu đồ tuần tự: Tạo xe buýt mới

```plantuml
@startuml
skinparam responseMessageBelowArrow true
skinparam sequenceMessageAlign center

title Sequence Diagram: Tạo Xe Buýt Mới

actor "Admin" as Admin
participant "BusHandler" as Handler
participant "BusUseCase" as UC
participant "BusRepository" as Repo
database "PostgreSQL" as DB

Admin -> Handler: POST /admin/buses\n{providerId, busTypeId, licensePlate, imageUrl}
activate Handler

Handler -> Handler: Bind JSON to CreateRequest
Handler -> UC: Create(ctx, CreateBusInput)
activate UC

UC -> UC: Tạo Bus entity
UC -> UC: bus.Validate()
note right
    **Quy tắc validation:**
    - providerId: bắt buộc, > 0
    - busTypeId: bắt buộc, > 0
    - licensePlate: bắt buộc, >= 5 ký tự
end note

alt Validation thất bại
    UC --> Handler: ErrBusProviderIDRequired / etc.
    Handler --> Admin: 400 Bad Request
end

UC -> Repo: ExistsByLicensePlate(ctx, licensePlate)
activate Repo
Repo -> DB: SELECT EXISTS(\n  SELECT 1 FROM buses\n  WHERE license_plate = $1\n)
DB --> Repo: bool
Repo --> UC: bool
deactivate Repo

alt Biển số đã tồn tại
    UC --> Handler: ErrBusLicensePlateAlreadyExists
    Handler --> Admin: 409 Conflict
end

UC -> Repo: Create(ctx, bus)
activate Repo
Repo -> DB: INSERT INTO buses\n(provider_id, bus_type_id, license_plate, status, image_url)\nVALUES ($1, $2, $3, $4, $5)\nRETURNING *
DB --> Repo: bus row
Repo --> UC: *Bus
deactivate Repo

UC --> Handler: *Bus
deactivate UC

Handler --> Admin: 201 Created\n{bus data with joined fields}
deactivate Handler

@enduml
```

### 5.2. Biểu đồ tuần tự: Xem danh sách xe buýt (với JOIN)

```plantuml
@startuml
skinparam responseMessageBelowArrow true
skinparam sequenceMessageAlign center

title Sequence Diagram: Xem Danh Sách Xe Buýt

actor "Admin" as Admin
participant "BusHandler" as Handler
participant "BusUseCase" as UC
participant "BusRepository" as Repo
database "PostgreSQL" as DB

Admin -> Handler: GET /admin/buses?page=1&limit=20&providerId=1
activate Handler

Handler -> Handler: Parse query params
Handler -> UC: List(ctx, ListBusInput)
activate UC

UC -> Repo: List(ctx, filter)
activate Repo

Repo -> DB: SELECT b.*, \n  bt.name as bus_type_name,\n  bt.total_seats,\n  p.name as provider_name\nFROM buses b\nJOIN bus_types bt ON b.bus_type_id = bt.id\nJOIN providers p ON b.provider_id = p.id\nWHERE ($1::int IS NULL OR b.provider_id = $1)\nORDER BY p.name, b.license_plate\nLIMIT $2 OFFSET $3

DB --> Repo: []Bus rows với joined fields
Repo --> UC: []*Bus
deactivate Repo

UC -> Repo: Count(ctx, filter)
activate Repo
Repo -> DB: SELECT COUNT(*) FROM buses\nWHERE ...
DB --> Repo: total count
Repo --> UC: int64
deactivate Repo

UC --> Handler: ([]*Bus, total)
deactivate UC

Handler --> Admin: 200 OK\n{data: [...], pagination: {...}}
deactivate Handler

@enduml
```

### 5.3. Biểu đồ tuần tự: Cập nhật trạng thái xe

```plantuml
@startuml
skinparam responseMessageBelowArrow true
skinparam sequenceMessageAlign center

title Sequence Diagram: Cập nhật Trạng Thái Xe

actor "Admin" as Admin
participant "BusHandler" as Handler
participant "BusUseCase" as UC
participant "BusRepository" as Repo
database "PostgreSQL" as DB

Admin -> Handler: PATCH /admin/buses/123/status\n{status: "maintenance"}
activate Handler

Handler -> Handler: Parse ID và status
Handler -> UC: UpdateStatus(ctx, 123, "maintenance")
activate UC

UC -> UC: Validate status value
note right
    Trạng thái hợp lệ:
    - active
    - maintenance
    - retired
end note

alt Trạng thái không hợp lệ
    UC --> Handler: ErrBusStatusInvalid
    Handler --> Admin: 400 Bad Request
end

UC -> Repo: GetByID(ctx, 123)
activate Repo
Repo -> DB: SELECT * FROM buses WHERE id = $1
DB --> Repo: bus row
Repo --> UC: *Bus
deactivate Repo

alt Xe không tồn tại
    UC --> Handler: ErrBusNotFound
    Handler --> Admin: 404 Not Found
end

UC -> Repo: UpdateStatus(ctx, 123, "maintenance")
activate Repo
Repo -> DB: UPDATE buses\nSET status = $2\nWHERE id = $1\nRETURNING *
DB --> Repo: updated bus
Repo --> UC: *Bus
deactivate Repo

UC --> Handler: *Bus
deactivate UC

Handler --> Admin: 200 OK\n{updated bus}
deactivate Handler

@enduml
```

### 5.4. Biểu đồ tuần tự: Xóa xe buýt

```plantuml
@startuml
skinparam responseMessageBelowArrow true
skinparam sequenceMessageAlign center

title Sequence Diagram: Xóa Xe Buýt

actor "Admin" as Admin
participant "BusHandler" as Handler
participant "BusUseCase" as UC
participant "BusRepository" as Repo
database "PostgreSQL" as DB

Admin -> Handler: DELETE /admin/buses/123
activate Handler

Handler -> UC: Delete(ctx, 123)
activate UC

UC -> Repo: GetByID(ctx, 123)
activate Repo
Repo -> DB: SELECT * FROM buses WHERE id = $1
DB --> Repo: bus row
Repo --> UC: *Bus
deactivate Repo

alt Không tìm thấy xe
    UC --> Handler: ErrBusNotFound
    Handler --> Admin: 404 Not Found
end

UC -> Repo: Delete(ctx, 123)
activate Repo
Repo -> DB: DELETE FROM buses WHERE id = $1

alt Vi phạm FK constraint (còn trip sử dụng)
    DB --> Repo: ERROR: violates foreign key constraint
    Repo --> UC: error
    UC --> Handler: ErrBusHasTrips
    Handler --> Admin: 409 Conflict\n{error: "Xe còn chuyến đi liên kết"}
end

DB --> Repo: OK
Repo --> UC: nil
deactivate Repo

UC --> Handler: nil
deactivate UC

Handler --> Admin: 204 No Content
deactivate Handler

@enduml
```

### 5.5. Biểu đồ tuần tự: Cập nhật thông tin xe

```plantuml
@startuml
skinparam responseMessageBelowArrow true
skinparam sequenceMessageAlign center

title Sequence Diagram: Cập nhật Thông Tin Xe

actor "Admin" as Admin
participant "BusHandler" as Handler
participant "BusUseCase" as UC
participant "BusRepository" as Repo
database "PostgreSQL" as DB

Admin -> Handler: PUT /admin/buses/123\n{busTypeId, licensePlate, imageUrl}
activate Handler

Handler -> Handler: Bind JSON, Validate
Handler -> UC: Update(ctx, 123, UpdateBusInput)
activate UC

UC -> Repo: GetByID(ctx, 123)
activate Repo
Repo -> DB: SELECT * FROM buses WHERE id = $1
DB --> Repo: bus row
Repo --> UC: *Bus
deactivate Repo

alt Không tìm thấy xe
    UC --> Handler: ErrBusNotFound
    Handler --> Admin: 404 Not Found
end

UC -> UC: Validate input fields

alt LicensePlate thay đổi
    UC -> Repo: ExistsByLicensePlate(ctx, newPlate)
    activate Repo
    Repo -> DB: SELECT EXISTS(...) WHERE license_plate = $1 AND id != $2
    DB --> Repo: bool
    Repo --> UC: bool
    deactivate Repo
    
    alt Biển số đã tồn tại (xe khác)
        UC --> Handler: ErrBusLicensePlateAlreadyExists
        Handler --> Admin: 409 Conflict
    end
end

UC -> Repo: Update(ctx, 123, updates)
activate Repo
Repo -> DB: UPDATE buses SET\n  bus_type_id = $2,\n  license_plate = $3,\n  image_url = $4\nWHERE id = $1\nRETURNING *
DB --> Repo: updated bus
Repo --> UC: *Bus
deactivate Repo

UC --> Handler: *Bus
deactivate UC

Handler --> Admin: 200 OK\n{updated bus}
deactivate Handler

@enduml
```

---

## 6. MÁY TRẠNG THÁI (STATE MACHINE)

### 6.1. Biểu đồ máy trạng thái của Bus

```plantuml
@startuml
skinparam stateBackgroundColor #f5f5f5
skinparam stateBorderColor #333

[*] --> active : Tạo xe mới

state "active" as active {
    active : Xe đang hoạt động
    active : Có thể gán cho trip
}

state "maintenance" as maintenance {
    maintenance : Xe đang bảo trì
    maintenance : Không thể gán cho trip mới
}

state "retired" as retired {
    retired : Xe đã ngừng hoạt động
    retired : Trạng thái cuối cùng
}

active --> maintenance : UpdateStatus("maintenance")
active --> retired : UpdateStatus("retired")
maintenance --> active : UpdateStatus("active")
maintenance --> retired : UpdateStatus("retired")
retired --> [*]

note right of active
    **Trạng thái mặc định**
    khi tạo xe mới
end note

note right of retired
    **Terminal State**
    Không thể chuyển sang
    trạng thái khác
end note

@enduml
```

---

## 7. CÁC QUY TẮC NGHIỆP VỤ (BUSINESS RULES)

### 7.1. Quy tắc xác thực

| Trường | Quy tắc | Điều kiện |
|--------|---------|-----------|
| provider_id | Bắt buộc, phải tồn tại | `provider_id > 0`, FK constraint |
| bus_type_id | Bắt buộc, phải tồn tại | `bus_type_id > 0`, FK constraint |
| license_plate | Bắt buộc, duy nhất, tối thiểu 5 ký tự | `len(plate) >= 5`, UNIQUE constraint |
| status | Hợp lệ | `IN ('active', 'maintenance', 'retired')` |

### 7.2. Quy tắc xóa xe

| Quy tắc | Mô tả |
|---------|-------|
| BR-DEL-01 | Không xóa được nếu còn trip sử dụng xe này |
| BR-DEL-02 | Nên chuyển sang "retired" thay vì xóa |

### 7.3. Quy tắc sử dụng trong trip

| Quy tắc | Mô tả |
|---------|-------|
| BR-TRIP-01 | Chỉ xe có status = 'active' mới được gán cho trip |
| BR-TRIP-02 | Xe phải thuộc cùng provider với trip |

---

## 8. XỬ LÝ LỖI (ERROR HANDLING)

| Domain Error | HTTP Status | Error Code | Mô tả |
|--------------|-------------|------------|-------|
| ErrBusNotFound | 404 | BUS_NOT_FOUND | Không tìm thấy xe |
| ErrBusProviderIDRequired | 400 | BUS_PROVIDER_REQUIRED | Thiếu nhà xe |
| ErrBusBusTypeIDRequired | 400 | BUS_TYPE_REQUIRED | Thiếu loại xe |
| ErrBusLicensePlateRequired | 400 | LICENSE_PLATE_REQUIRED | Thiếu biển số |
| ErrBusLicensePlateTooShort | 400 | LICENSE_PLATE_TOO_SHORT | Biển số quá ngắn |
| ErrBusStatusInvalid | 400 | BUS_STATUS_INVALID | Trạng thái không hợp lệ |
| ErrBusLicensePlateAlreadyExists | 409 | LICENSE_PLATE_EXISTS | Biển số đã tồn tại |
| ErrBusHasTrips | 409 | BUS_HAS_TRIPS | Xe còn chuyến đi liên kết |

---

## 9. CẤU TRÚC DỮ LIỆU RESPONSE

### 9.1. BusResponse

```json
{
    "id": 1,
    "providerId": 1,
    "providerName": "Phương Trang",
    "busTypeId": 2,
    "busTypeName": "Giường nằm 40 chỗ",
    "totalSeats": 40,
    "licensePlate": "51B-12345",
    "status": "active",
    "imageUrl": "https://cdn.example.com/buses/51b-12345.jpg"
}
```

### 9.2. ListBusesResponse

```json
{
    "data": [
        {
            "id": 1,
            "providerName": "Phương Trang",
            "busTypeName": "Giường nằm 40 chỗ",
            "totalSeats": 40,
            "licensePlate": "51B-12345",
            "status": "active"
        }
    ],
    "pagination": {
        "page": 1,
        "limit": 20,
        "total": 100,
        "totalPages": 5
    }
}
```

---

## 10. TỐI ƯU QUERY

### 10.1. Khuyến nghị Index

```sql
-- Index cho tìm kiếm theo nhà xe
CREATE INDEX idx_buses_provider ON buses (provider_id);

-- Index cho tìm kiếm theo loại xe
CREATE INDEX idx_buses_bus_type ON buses (bus_type_id);

-- Index cho lọc theo trạng thái
CREATE INDEX idx_buses_status ON buses (status) WHERE status = 'active';

-- UNIQUE constraint tự động tạo index cho license_plate
```

### 10.2. Joined Query Example

```sql
SELECT b.*, 
       bt.name AS bus_type_name, 
       bt.total_seats, 
       p.name AS provider_name
FROM buses b
JOIN bus_types bt ON b.bus_type_id = bt.id
JOIN providers p ON b.provider_id = p.id
WHERE b.provider_id = $1
ORDER BY p.name, b.license_plate
LIMIT $2 OFFSET $3;
```
