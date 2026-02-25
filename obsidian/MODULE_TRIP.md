---
tags:
  - srs
  - system-design
  - trip
  - schedule
created: 2026-02-25
updated: 2026-02-25
---

# TÀI LIỆU ĐẶC TẢ VÀ THIẾT KẾ MODULE: TRIP (CHUYẾN XE)

> [!abstract] TỔNG QUAN
> Module Trip quản lý thông tin các chuyến xe trong hệ thống đặt vé xe buýt. Đây là module trung tâm kết nối giữa nhà xe (Provider), xe buýt (Bus), địa điểm (Location) và đặt vé (Booking). Module cung cấp các chức năng tìm kiếm chuyến xe cho khách hàng và quản lý chuyến xe cho admin bao gồm: tạo mới, cập nhật, thay đổi trạng thái và xóa chuyến xe. Hệ thống sử dụng **state machine** để quản lý vòng đời chuyến xe từ "scheduled" -> "departed" -> "completed" hoặc "cancelled".

---

## 1. ĐẶC TẢ YÊU CẦU (SOFTWARE REQUIREMENT SPECIFICATION)

### 1.1. Danh sách yêu cầu chức năng (Functional Requirements)

| ID | Tên chức năng | Mức độ ưu tiên | Độ phức tạp | Tác nhân (Actor) |
|-----|---------------|----------------|-------------|------------------|
| TRIP-01 | Tìm kiếm chuyến xe | P1 | M | Guest/Customer |
| TRIP-02 | Xem chi tiết chuyến xe | P1 | L | Guest/Customer |
| TRIP-03 | Tạo chuyến xe mới | P1 | M | Admin/Operator |
| TRIP-04 | Cập nhật thông tin chuyến xe | P2 | M | Admin/Operator |
| TRIP-05 | Cập nhật trạng thái chuyến xe | P1 | M | Admin/Operator |
| TRIP-06 | Xóa chuyến xe | P2 | M | Admin/Operator |
| TRIP-07 | Danh sách chuyến xe (Admin) | P2 | M | Admin/Operator |
| TRIP-08 | Quản lý điểm đón/trả | P2 | L | Admin/Operator |

### 1.2. Biểu đồ phân cấp chức năng (Functional Hierarchy)

```plantuml
@startwbs
* Quản lý Chuyến xe (Trip)
** Tìm kiếm chuyến xe (Public)
*** Lọc theo điểm đi
*** Lọc theo điểm đến
*** Lọc theo ngày khởi hành
*** Lọc theo số ghế trống
*** Phân trang kết quả
** Xem chi tiết chuyến xe
*** Thông tin nhà xe
*** Thông tin tuyến đường
*** Danh sách điểm đón
*** Danh sách điểm trả
*** Số ghế trống/đã đặt
** Quản lý chuyến xe (Admin)
*** Tạo chuyến xe mới
**** Xác thực thời gian
**** Xác thực giá vé
*** Cập nhật chuyến xe
**** Kiểm tra trạng thái cho phép
*** Thay đổi trạng thái
**** scheduled -> departed
**** departed -> completed
**** scheduled -> cancelled
*** Xóa chuyến xe
**** Kiểm tra không có booking active
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
actor "Admin/Operator" as Admin

package "Module Trip" {
    usecase "UC01: Tìm kiếm chuyến xe" as UC1
    usecase "UC02: Xem chi tiết chuyến xe" as UC2
    usecase "UC03: Tạo chuyến xe mới" as UC3
    usecase "UC04: Cập nhật chuyến xe" as UC4
    usecase "UC05: Cập nhật trạng thái" as UC5
    usecase "UC06: Xóa chuyến xe" as UC6
    usecase "UC07: Danh sách chuyến xe" as UC7
    
    usecase "Xác thực thời gian" as UC_ValidateTime
    usecase "Kiểm tra booking active" as UC_CheckBooking
    usecase "State Machine" as UC_State
}

Guest --> UC1
Guest --> UC2

Admin --> UC3
Admin --> UC4
Admin --> UC5
Admin --> UC6
Admin --> UC7

UC3 ..> UC_ValidateTime : <<include>>
UC4 ..> UC_ValidateTime : <<include>>
UC5 ..> UC_State : <<include>>
UC6 ..> UC_CheckBooking : <<include>>
@enduml
```

### 2.2. Đặc tả Use Case chi tiết: Tìm kiếm chuyến xe (SearchTrips)

> [!info] Thông tin Use Case
> **Use Case ID:** UC-TRIP-01
> **Use Case Name:** Tìm kiếm chuyến xe (SearchTrips)
> **Actor:** Guest hoặc Customer
> **Trigger:** Người dùng nhập thông tin tìm kiếm và nhấn nút tìm

> [!note] Điều kiện tiên quyết (Pre-conditions)
> Không có

> [!success] Điều kiện hậu kỳ (Post-conditions)
> Danh sách chuyến xe phù hợp được trả về với phân trang

**Luồng xử lý chính (Normal Flow):**

| Bước | Tác nhân | Hành động |
|------|----------|-----------|
| 1 | Client | Gửi GET request đến `/api/v1/trips?originId=1&destinationId=2&date=2026-02-25&passengers=2&page=1&limit=10` |
| 2 | Controller | Parse query params, validate input, tạo `SearchTripsInput` |
| 3 | UseCase | Gọi `repository.Search(ctx, filter)` |
| 4 | Repository | Thực thi SQL query với JOIN providers, locations |
| 5 | Repository | Lọc theo: origin_id, destination_id, DATE(departure_time), available_seats >= passengers, status = 'scheduled' |
| 6 | Repository | Sắp xếp theo departure_time ASC |
| 7 | Repository | Áp dụng LIMIT và OFFSET cho phân trang |
| 8 | UseCase | Gọi `repository.CountSearch(ctx, filter)` để lấy tổng số |
| 9 | Controller | Chuyển đổi sang response DTOs, trả về với pagination metadata |

**Luồng thay thế (Alternative Flow):**

| Flow ID | Điều kiện | Xử lý |
|---------|-----------|-------|
| AF-1 | Không có kết quả | Trả về danh sách rỗng với total = 0 |
| AF-2 | Không truyền passengers | Mặc định passengers = 1 |
| AF-3 | Không truyền pagination | Mặc định page = 1, limit = 20 |

### 2.3. Đặc tả Use Case: Tạo chuyến xe mới (CreateTrip)

> [!info] Thông tin Use Case
> **Use Case ID:** UC-TRIP-03
> **Use Case Name:** Tạo chuyến xe mới (CreateTrip)
> **Actor:** Admin/Operator
> **Trigger:** Admin muốn tạo chuyến xe mới trong hệ thống

**Luồng xử lý chính:**

| Bước | Tác nhân | Hành động |
|------|----------|-----------|
| 1 | Admin | Gửi POST `/api/v1/admin/trips` với body chứa thông tin chuyến |
| 2 | UseCase | Validate thời gian: departure_time > now, arrival_time > departure_time |
| 3 | UseCase | Validate giá vé: base_price > 0 |
| 4 | UseCase | Lấy thông tin bus để xác định total_seats |
| 5 | UseCase | Tạo entity Trip với available_seats = total_seats |
| 6 | Repository | INSERT INTO trips |
| 7 | Controller | Trả về 201 Created |

### 2.4. Đặc tả Use Case: Cập nhật trạng thái (UpdateStatus)

> [!info] Thông tin Use Case
> **Use Case ID:** UC-TRIP-05
> **Use Case Name:** Cập nhật trạng thái chuyến xe
> **Actor:** Admin/Operator
> **Trigger:** Admin thay đổi trạng thái chuyến xe (xe đã khởi hành, hoàn thành, hủy)

**Luồng xử lý chính:**

| Bước | Tác nhân | Hành động |
|------|----------|-----------|
| 1 | Admin | Gửi PATCH `/api/v1/admin/trips/:id/status` với body `{status: "departed"}` |
| 2 | UseCase | Lấy chuyến xe hiện tại từ database |
| 3 | UseCase | Gọi `existing.CanTransitionTo(newStatus)` - kiểm tra state machine |
| 4 | UseCase | Nếu hợp lệ, cập nhật status |
| 5 | Controller | Trả về trip đã cập nhật |

### 2.5. Đặc tả Use Case: Xóa chuyến xe (DeleteTrip)

> [!info] Thông tin Use Case
> **Use Case ID:** UC-TRIP-06
> **Use Case Name:** Xóa chuyến xe
> **Actor:** Admin/Operator
> **Trigger:** Admin muốn xóa chuyến xe chưa có booking

**Luồng xử lý chính:**

| Bước | Tác nhân | Hành động |
|------|----------|-----------|
| 1 | Admin | Gửi DELETE `/api/v1/admin/trips/:id` |
| 2 | UseCase | Kiểm tra trip.Status == "scheduled" |
| 3 | UseCase | Đếm số booking active (pending/paid) |
| 4 | UseCase | Nếu có booking active, trả về lỗi |
| 5 | Repository | DELETE FROM trips WHERE id = $1 |
| 6 | Controller | Trả về 204 No Content |

---

## 3. THIẾT KẾ CƠ SỞ DỮ LIỆU (DATABASE DESIGN)

### 3.1. Sơ đồ thực thể liên kết (Entity Relationship Diagram - ERD)

```plantuml
@startuml
skinparam linetype ortho

entity "trips" as Trip {
    * id : BIGSERIAL <<PK>>
    --
    * provider_id : INT <<FK>>
    * bus_id : INT <<FK>>
    * origin_id : INT <<FK>>
    * destination_id : INT <<FK>>
    * departure_time : TIMESTAMPTZ
    * arrival_time : TIMESTAMPTZ
    * base_price : NUMERIC(12,2)
    price_modifier : NUMERIC(4,2) <<DEFAULT 1.0>>
    is_hot_deal : BOOLEAN <<DEFAULT false>>
    pickup_points : JSONB
    dropoff_points : JSONB
    booked_seats : TEXT[]
    * available_seats : INT
    status : VARCHAR(20) <<DEFAULT 'scheduled'>>
    * created_at : TIMESTAMPTZ
    * version : INT <<DEFAULT 1>>
}

entity "providers" as Provider {
    * id : SERIAL <<PK>>
    --
    * name : VARCHAR(100)
    hotline : VARCHAR(20)
}

entity "buses" as Bus {
    * id : SERIAL <<PK>>
    --
    * provider_id : INT <<FK>>
    * bus_type_id : INT <<FK>>
    * license_plate : VARCHAR(20)
}

entity "bus_types" as BusType {
    * id : SERIAL <<PK>>
    --
    * name : VARCHAR(100)
    * total_seats : INT
    * seat_layout : JSONB
}

entity "locations" as Location {
    * id : SERIAL <<PK>>
    --
    * name : VARCHAR(100)
    * city : VARCHAR(50)
}

entity "bookings" as Booking {
    * id : BIGSERIAL <<PK>>
    --
    * trip_id : BIGINT <<FK>>
    * seat_codes : TEXT[]
    * status : VARCHAR(20)
}

Trip }o--|| Provider : "provider_id"
Trip }o--|| Bus : "bus_id"
Trip }o--|| Location : "origin_id"
Trip }o--|| Location : "destination_id"
Bus }o--|| Provider : "provider_id"
Bus }o--|| BusType : "bus_type_id"
Booking }o--|| Trip : "trip_id"
@enduml
```

### 3.2. Từ điển dữ liệu (Data Dictionary)

> [!abstract] Bảng: trips

| Tên trường | Kiểu dữ liệu | Ràng buộc | Mô tả |
|------------|--------------|-----------|-------|
| id | BIGSERIAL | PK, NOT NULL | Khóa chính, tự động tăng |
| provider_id | INT | FK -> providers.id, NOT NULL | ID nhà xe |
| bus_id | INT | FK -> buses.id, NOT NULL | ID xe buýt |
| origin_id | INT | FK -> locations.id, NOT NULL | ID điểm xuất phát |
| destination_id | INT | FK -> locations.id, NOT NULL | ID điểm đến |
| departure_time | TIMESTAMPTZ | NOT NULL | Thời gian khởi hành |
| arrival_time | TIMESTAMPTZ | NOT NULL | Thời gian dự kiến đến |
| base_price | NUMERIC(12,2) | NOT NULL | Giá vé cơ bản (VND) |
| price_modifier | NUMERIC(4,2) | DEFAULT 1.0 | Hệ số điều chỉnh giá (vd: 1.2 = tăng 20%) |
| is_hot_deal | BOOLEAN | DEFAULT false | Đánh dấu khuyến mãi |
| pickup_points | JSONB | NULL | Danh sách điểm đón `[{name, time, surcharge}, ...]` |
| dropoff_points | JSONB | NULL | Danh sách điểm trả `[{name, time, surcharge}, ...]` |
| booked_seats | TEXT[] | DEFAULT '{}' | Mảng mã ghế đã đặt |
| available_seats | INT | NOT NULL | Số ghế còn trống |
| status | VARCHAR(20) | DEFAULT 'scheduled' | Trạng thái: scheduled, departed, completed, cancelled |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Thời điểm tạo |
| version | INT | DEFAULT 1 | Phiên bản cho optimistic locking |

**Cấu trúc pickup_points/dropoff_points:**

```json
[
    {
        "name": "Bến xe Miền Đông",
        "time": "06:00",
        "surcharge": 0
    },
    {
        "name": "Ngã tư Bình Phước",
        "time": "06:30",
        "surcharge": 10000
    }
]
```

---

## 4. KIẾN TRÚC HỆ THỐNG VÀ LUỒNG XỬ LÝ (SYSTEM ARCHITECTURE)

### 4.1. Kiến trúc mã nguồn

| Lớp (Layer) | Thư mục | File | Trách nhiệm |
|-------------|---------|------|-------------|
| **Domain** | `domain/` | `entity.go` | Entity Trip; Value objects: TripStatus, Point; Validation methods; State machine logic |
| **Domain** | `domain/` | `dto.go` | DTOs: SearchTripsInput, CreateTripInput, UpdateTripInput, AdminListInput |
| **Domain** | `domain/` | `ports.go` | Interface: Repository |
| **Repository** | `repository/` | `repository.go` | Implement Repository interface, SQLC queries |
| **UseCase** | `usecase/` | `usecase.go` | Implement ITripUseCase |
| **Controller** | `controller/http/` | `handler.go` | HTTP handlers |
| **Controller** | `controller/http/` | `routes.go` | Đăng ký routes (public + admin) |

### 4.2. Danh sách API Endpoints

| HTTP Method | Endpoint | Yêu cầu quyền | Mô tả chức năng |
|-------------|----------|---------------|-----------------|
| GET | `/api/v1/trips` | Public | Tìm kiếm chuyến xe |
| GET | `/api/v1/trips/:id` | Public | Xem chi tiết chuyến xe |
| POST | `/api/v1/admin/trips` | Admin/Operator | Tạo chuyến xe mới |
| GET | `/api/v1/admin/trips` | Admin/Operator | Danh sách chuyến xe (có filter) |
| PUT | `/api/v1/admin/trips/:id` | Admin/Operator | Cập nhật chuyến xe |
| PATCH | `/api/v1/admin/trips/:id/status` | Admin/Operator | Thay đổi trạng thái |
| DELETE | `/api/v1/admin/trips/:id` | Admin/Operator | Xóa chuyến xe |

---

## 5. BIỂU ĐỒ TUẦN TỰ (SEQUENCE DIAGRAMS)

### 5.1. Biểu đồ tuần tự: Tìm kiếm chuyến xe (Search)

```plantuml
@startuml
skinparam responseMessageBelowArrow true
skinparam sequenceMessageAlign center

title Sequence Diagram: Tìm kiếm Chuyến xe

actor "Client" as Client
participant "TripHandler" as Handler
participant "TripUseCase" as UC
participant "TripRepository" as Repo
database "PostgreSQL" as DB

Client -> Handler: GET /trips?originId=1&destinationId=2\n&date=2026-02-25&passengers=2&page=1&limit=10
activate Handler

Handler -> Handler: Parse query params\nValidate input
Handler -> UC: Search(ctx, SearchTripsInput)
activate UC

UC -> Repo: Search(ctx, filter)
activate Repo

Repo -> DB: SELECT t.*, p.name as provider_name,\n  o.name as origin_name, o.city as origin_city,\n  d.name as destination_name, d.city as destination_city\nFROM trips t\nJOIN providers p ON t.provider_id = p.id\nJOIN locations o ON t.origin_id = o.id\nJOIN locations d ON t.destination_id = d.id\nWHERE t.origin_id = $1\n  AND t.destination_id = $2\n  AND DATE(t.departure_time) = $3\n  AND t.available_seats >= $4\n  AND t.status = 'scheduled'\nORDER BY t.departure_time\nLIMIT $5 OFFSET $6

DB --> Repo: []Trip rows
Repo --> UC: []*Trip
deactivate Repo

UC -> Repo: CountSearch(ctx, filter)
activate Repo
Repo -> DB: SELECT COUNT(*) FROM trips WHERE ...
DB --> Repo: total count
Repo --> UC: int64
deactivate Repo

UC --> Handler: ([]*Trip, total, nil)
deactivate UC

Handler -> Handler: Convert to TripResponse DTOs
Handler --> Client: 200 OK\n{data: [...], pagination: {page, limit, total, totalPages}}
deactivate Handler

@enduml
```

### 5.2. Biểu đồ tuần tự: Tạo chuyến xe mới (Create)

```plantuml
@startuml
skinparam responseMessageBelowArrow true
skinparam sequenceMessageAlign center

title Sequence Diagram: Tạo Chuyến xe Mới

actor "Admin" as Admin
participant "TripHandler" as Handler
participant "TripUseCase" as UC
participant "TripRepository" as Repo
participant "BusRepository" as BusRepo
database "PostgreSQL" as DB

Admin -> Handler: POST /admin/trips\n{providerId, busId, originId, destinationId,\ndepartureTime, arrivalTime, basePrice, ...}
activate Handler

Handler -> Handler: Bind JSON, Validate
Handler -> UC: Create(ctx, CreateTripInput)
activate UC

UC -> UC: Validate thời gian:\ndepartureTime > now\narrivalTime > departureTime

alt Thời gian không hợp lệ
    UC --> Handler: ErrTripDepartureInPast / ErrArrivalBeforeDeparture
    Handler --> Admin: 400 Bad Request
end

UC -> UC: Validate giá: basePrice > 0

UC -> BusRepo: GetByID(ctx, busId)
activate BusRepo
BusRepo -> DB: SELECT b.*, bt.total_seats, bt.seat_layout\nFROM buses b\nJOIN bus_types bt ON b.bus_type_id = bt.id\nWHERE b.id = $1
DB --> BusRepo: Bus với BusType
BusRepo --> UC: *Bus
deactivate BusRepo

UC -> UC: Tạo Trip entity\navailable_seats = bus.BusType.TotalSeats

UC -> Repo: Create(ctx, trip)
activate Repo
Repo -> DB: INSERT INTO trips (...)\nVALUES (...)\nRETURNING *
DB --> Repo: Trip row
Repo --> UC: *Trip
deactivate Repo

UC --> Handler: *Trip
deactivate UC

Handler --> Admin: 201 Created\n{trip data}
deactivate Handler

@enduml
```

### 5.3. Biểu đồ tuần tự: Cập nhật trạng thái chuyến xe

```plantuml
@startuml
skinparam responseMessageBelowArrow true
skinparam sequenceMessageAlign center

title Sequence Diagram: Cập nhật Trạng thái Chuyến xe

actor "Admin" as Admin
participant "TripHandler" as Handler
participant "TripUseCase" as UC
participant "TripRepository" as Repo
database "PostgreSQL" as DB

Admin -> Handler: PATCH /admin/trips/123/status\n{status: "departed"}
activate Handler

Handler -> Handler: Validate status value
Handler -> UC: UpdateStatus(ctx, id, "departed")
activate UC

UC -> Repo: GetByID(ctx, 123)
activate Repo
Repo -> DB: SELECT * FROM trips WHERE id = $1
DB --> Repo: Trip row
Repo --> UC: *Trip
deactivate Repo

UC -> UC: existing.CanTransitionTo(TripStatusDeparted)
note right
    **State Machine Rules:**
    - scheduled -> departed (OK)
    - scheduled -> cancelled (OK)
    - departed -> completed (OK)
    - completed -> * (NOT OK)
    - cancelled -> * (NOT OK)
end note

alt Chuyển trạng thái không hợp lệ
    UC --> Handler: ErrTripTransitionInvalid
    Handler --> Admin: 400 Bad Request\n{error: "Chuyển trạng thái không hợp lệ"}
end

UC -> Repo: UpdateStatus(ctx, 123, "departed")
activate Repo
Repo -> DB: UPDATE trips SET status = $2,\n  updated_at = NOW()\nWHERE id = $1\nRETURNING *
DB --> Repo: Updated trip
Repo --> UC: *Trip
deactivate Repo

UC --> Handler: *Trip
deactivate UC

Handler --> Admin: 200 OK\n{trip data}
deactivate Handler

@enduml
```

### 5.4. Biểu đồ tuần tự: Xóa chuyến xe

```plantuml
@startuml
skinparam responseMessageBelowArrow true
skinparam sequenceMessageAlign center

title Sequence Diagram: Xóa Chuyến xe

actor "Admin" as Admin
participant "TripHandler" as Handler
participant "TripUseCase" as UC
participant "TripRepository" as Repo
database "PostgreSQL" as DB

Admin -> Handler: DELETE /admin/trips/123
activate Handler

Handler -> UC: Delete(ctx, 123)
activate UC

UC -> Repo: GetByID(ctx, 123)
activate Repo
Repo -> DB: SELECT * FROM trips WHERE id = $1
DB --> Repo: Trip row
Repo --> UC: *Trip
deactivate Repo

UC -> UC: existing.CanBeDeleted()
note right
    **Quy tắc:**
    Chỉ xóa được chuyến xe
    có status = 'scheduled'
end note

alt Không thể xóa (sai trạng thái)
    UC --> Handler: ErrTripCannotDelete
    Handler --> Admin: 400 Bad Request
end

UC -> Repo: CountActiveBookings(ctx, 123)
activate Repo
Repo -> DB: SELECT COUNT(*) FROM bookings\nWHERE trip_id = $1\n  AND status IN ('pending', 'paid')
DB --> Repo: count
Repo --> UC: int64
deactivate Repo

alt Có booking đang hoạt động
    UC --> Handler: ErrTripHasActiveBookings
    Handler --> Admin: 409 Conflict\n{error: "Chuyến xe còn booking hoạt động"}
end

UC -> Repo: Delete(ctx, 123)
activate Repo
Repo -> DB: DELETE FROM trips WHERE id = $1
DB --> Repo: OK
Repo --> UC: nil
deactivate Repo

UC --> Handler: nil
deactivate UC

Handler --> Admin: 204 No Content
deactivate Handler

@enduml
```

### 5.5. Biểu đồ tuần tự: Xem chi tiết chuyến xe

```plantuml
@startuml
skinparam responseMessageBelowArrow true
skinparam sequenceMessageAlign center

title Sequence Diagram: Xem Chi tiết Chuyến xe

actor "Client" as Client
participant "TripHandler" as Handler
participant "TripUseCase" as UC
participant "TripRepository" as Repo
database "PostgreSQL" as DB

Client -> Handler: GET /trips/123
activate Handler

Handler -> UC: GetByID(ctx, 123)
activate UC

UC -> Repo: GetDetailByID(ctx, 123)
activate Repo

Repo -> DB: SELECT t.*,\n  p.id as provider_id, p.name as provider_name, p.hotline,\n  o.id as origin_id, o.name as origin_name, o.city as origin_city,\n  d.id as dest_id, d.name as dest_name, d.city as dest_city,\n  b.license_plate,\n  bt.name as bus_type_name, bt.total_seats, bt.seat_layout\nFROM trips t\nJOIN providers p ON t.provider_id = p.id\nJOIN locations o ON t.origin_id = o.id\nJOIN locations d ON t.destination_id = d.id\nJOIN buses b ON t.bus_id = b.id\nJOIN bus_types bt ON b.bus_type_id = bt.id\nWHERE t.id = $1

DB --> Repo: Trip with relations
Repo --> UC: *TripDetail
deactivate Repo

alt Không tìm thấy
    UC --> Handler: ErrTripNotFound
    Handler --> Client: 404 Not Found
end

UC --> Handler: *TripDetail
deactivate UC

Handler -> Handler: Convert to TripDetailResponse
Handler --> Client: 200 OK\n{trip với thông tin nhà xe, tuyến đường, sơ đồ ghế}
deactivate Handler

@enduml
```

### 5.6. Biểu đồ tuần tự: Cập nhật thông tin chuyến xe

```plantuml
@startuml
skinparam responseMessageBelowArrow true
skinparam sequenceMessageAlign center

title Sequence Diagram: Cập nhật Thông tin Chuyến xe

actor "Admin" as Admin
participant "TripHandler" as Handler
participant "TripUseCase" as UC
participant "TripRepository" as Repo
database "PostgreSQL" as DB

Admin -> Handler: PUT /admin/trips/123\n{basePrice, priceModifier, pickupPoints, dropoffPoints, ...}
activate Handler

Handler -> Handler: Bind JSON, Validate
Handler -> UC: Update(ctx, 123, UpdateTripInput)
activate UC

UC -> Repo: GetByID(ctx, 123)
activate Repo
Repo -> DB: SELECT * FROM trips WHERE id = $1
DB --> Repo: Trip row
Repo --> UC: *Trip
deactivate Repo

UC -> UC: existing.CanBeModified()
note right
    Chỉ cập nhật được
    trip có status = 'scheduled'
end note

alt Không thể cập nhật
    UC --> Handler: ErrTripCannotModify
    Handler --> Admin: 400 Bad Request
end

UC -> UC: Validate input:\n- basePrice > 0\n- priceModifier trong [0.5, 2.0]\n- departureTime > now (nếu thay đổi)

UC -> Repo: Update(ctx, 123, updates)
activate Repo
Repo -> DB: UPDATE trips SET\n  base_price = $2,\n  price_modifier = $3,\n  pickup_points = $4,\n  dropoff_points = $5,\n  updated_at = NOW()\nWHERE id = $1\nRETURNING *
DB --> Repo: Updated trip
Repo --> UC: *Trip
deactivate Repo

UC --> Handler: *Trip
deactivate UC

Handler --> Admin: 200 OK\n{updated trip}
deactivate Handler

@enduml
```

---

## 6. CÁC QUY TẮC NGHIỆP VỤ (BUSINESS RULES)

### 6.1. Quy tắc xác thực thời gian

| Quy tắc | Mô tả |
|---------|-------|
| BR-TIME-01 | Thời gian khởi hành phải lớn hơn thời gian hiện tại |
| BR-TIME-02 | Thời gian đến phải lớn hơn thời gian khởi hành |

### 6.2. Quy tắc trạng thái (State Machine)

```plantuml
@startuml
skinparam state {
    BackgroundColor LightBlue
    BorderColor DarkBlue
}

title State Diagram: Vòng đời Chuyến xe

[*] --> scheduled : Tạo chuyến xe

state "scheduled" as S : Đã lên lịch\n(Trạng thái mặc định)
state "departed" as D : Đã khởi hành
state "completed" as C : Hoàn thành\n(Terminal)
state "cancelled" as X : Đã hủy\n(Terminal)

S --> D : UpdateStatus("departed")\nXe đã khởi hành
S --> X : UpdateStatus("cancelled")\nHủy chuyến
D --> C : UpdateStatus("completed")\nĐến nơi

C --> [*]
X --> [*]

note right of S
    Có thể:
    - Cập nhật thông tin
    - Xóa (nếu không có booking)
end note

note right of D
    Không thể:
    - Cập nhật thông tin
    - Xóa
    - Quay lại scheduled
end note

@enduml
```

### 6.3. Quy tắc xóa chuyến xe

| Quy tắc | Mô tả |
|---------|-------|
| BR-DEL-01 | Chỉ xóa được chuyến xe có status = 'scheduled' |
| BR-DEL-02 | Không xóa được nếu có booking pending hoặc paid |

### 6.4. Quy tắc cập nhật

| Quy tắc | Mô tả |
|---------|-------|
| BR-UPD-01 | Chỉ cập nhật được chuyến xe có status = 'scheduled' |
| BR-UPD-02 | Không cập nhật được departure_time nếu đã có booking |

### 6.5. Quy tắc giá vé

| Quy tắc | Mô tả |
|---------|-------|
| BR-PRICE-01 | base_price > 0 |
| BR-PRICE-02 | price_modifier thường trong khoảng [0.5, 2.0] |
| BR-PRICE-03 | Giá cuối = base_price * price_modifier |

---

## 7. XỬ LÝ LỖI (ERROR HANDLING)

| Domain Error | HTTP Status | Error Code | Mô tả |
|--------------|-------------|------------|-------|
| ErrTripNotFound | 404 | TRIP_NOT_FOUND | Không tìm thấy chuyến xe |
| ErrInvalidInput | 400 | VALIDATION_ERROR | Dữ liệu đầu vào không hợp lệ |
| ErrTripStatusInvalid | 400 | TRIP_STATUS_INVALID | Trạng thái không hợp lệ |
| ErrTripTransitionInvalid | 400 | TRIP_TRANSITION_INVALID | Chuyển trạng thái không hợp lệ |
| ErrTripDepartureInPast | 400 | TRIP_DEPARTURE_IN_PAST | Thời gian khởi hành đã qua |
| ErrArrivalBeforeDeparture | 400 | ARRIVAL_BEFORE_DEPARTURE | Thời gian đến trước khởi hành |
| ErrTripProviderRequired | 400 | TRIP_PROVIDER_REQUIRED | Thiếu nhà xe |
| ErrTripOriginRequired | 400 | TRIP_ORIGIN_REQUIRED | Thiếu điểm đi |
| ErrTripDestinationRequired | 400 | TRIP_DESTINATION_REQUIRED | Thiếu điểm đến |
| ErrTripPriceInvalid | 400 | TRIP_PRICE_INVALID | Giá vé không hợp lệ |
| ErrTripCannotModify | 400 | TRIP_CANNOT_MODIFY | Không thể cập nhật chuyến xe |
| ErrTripCannotDelete | 400 | TRIP_CANNOT_DELETE | Không thể xóa chuyến xe |
| ErrTripHasActiveBookings | 409 | TRIP_HAS_ACTIVE_BOOKINGS | Chuyến xe còn booking hoạt động |

---

## 8. TỐI ƯU HÓA TRUY VẤN (QUERY OPTIMIZATION)

### 8.1. Đề xuất Index

```sql
-- Index cho tìm kiếm chuyến xe
CREATE INDEX idx_trips_search ON trips (
    origin_id, 
    destination_id, 
    departure_time, 
    status
) WHERE status = 'scheduled';

-- Index cho admin list
CREATE INDEX idx_trips_admin ON trips (
    provider_id, 
    status, 
    created_at DESC
);

-- Index cho booking count
CREATE INDEX idx_bookings_trip_status ON bookings (
    trip_id, 
    status
) WHERE status IN ('pending', 'paid');
```

### 8.2. Ví dụ Joined Query

```sql
SELECT t.*, 
       p.name as provider_name,
       o.name as origin_name, o.city as origin_city,
       d.name as destination_name, d.city as destination_city
FROM trips t
JOIN providers p ON t.provider_id = p.id
JOIN locations o ON t.origin_id = o.id
JOIN locations d ON t.destination_id = d.id
WHERE t.origin_id = $1
  AND t.destination_id = $2
  AND DATE(t.departure_time) = $3::date
  AND t.available_seats >= $4
  AND t.status = 'scheduled'
ORDER BY t.departure_time
LIMIT $5 OFFSET $6;
```
