---
tags:
  - srs
  - system-design
  - auth
  - authentication
created: 2026-02-25
updated: 2026-02-25
---
d
# TÀI LIỆU ĐẶC TẢ VÀ THIẾT KẾ MODULE: AUTH (XÁC THỰC)

> [!abstract] TỔNG QUAN
> Module Auth (Authentication) đảm nhận chức năng xác thực và quản lý phiên đăng nhập của người dùng trong hệ thống đặt vé xe buýt. Module này cung cấp các dịch vụ đăng ký tài khoản, đăng nhập, đăng xuất và làm mới token. Hệ thống sử dụng cơ chế JWT (JSON Web Token) kết hợp với Redis để quản lý phiên và blacklist token, đảm bảo tính bảo mật cao. Module hỗ trợ ba vai trò người dùng: Customer (khách hàng), Operator (nhân viên vận hành), và Admin (quản trị viên).

---

## 1. ĐẶC TẢ YÊU CẦU (SOFTWARE REQUIREMENT SPECIFICATION)

### 1.1. Danh sách yêu cầu chức năng (Functional Requirements)

| ID | Tên chức năng | Mức độ ưu tiên | Độ phức tạp | Tác nhân (Actor) |
|-----|---------------|----------------|-------------|------------------|
| AUTH-01 | Đăng ký tài khoản | P1 | M | Guest |
| AUTH-02 | Đăng nhập hệ thống | P1 | M | Guest |
| AUTH-03 | Đăng xuất hệ thống | P1 | L | Authenticated User |
| AUTH-04 | Làm mới Access Token | P1 | M | Authenticated User |
| AUTH-05 | Xác thực số điện thoại | P2 | L | Guest |
| AUTH-06 | Quản lý vai trò người dùng (RBAC) | P2 | M | System |

### 1.2. Biểu đồ phân cấp chức năng (Functional Hierarchy)

```plantuml
@startwbs
* Quản lý Xác thực (Auth)
** Đăng ký tài khoản
*** Xác thực số điện thoại
*** Xác thực email (tùy chọn)
*** Xác thực username (tùy chọn)
*** Mã hóa mật khẩu (Bcrypt)
*** Tạo JWT tokens
** Đăng nhập hệ thống
*** Tìm kiếm người dùng (phone/email/username)
*** Kiểm tra mật khẩu
*** Kiểm tra trạng thái hoạt động
*** Tạo Access Token
*** Tạo Refresh Token
** Đăng xuất hệ thống
*** Xác thực token hiện tại
*** Thêm token vào blacklist (Redis)
*** Xóa cookie refresh token
** Làm mới token
*** Xác thực Refresh Token
*** Thu hồi Refresh Token cũ
*** Tạo cặp token mới
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

actor "Khách (Guest)" as Guest
actor "Người dùng đã xác thực" as AuthUser
actor "Quản trị viên" as Admin

package "Module Auth" {
    usecase "UC01: Đăng ký tài khoản" as UC1
    usecase "UC02: Đăng nhập hệ thống" as UC2
    usecase "UC03: Đăng xuất hệ thống" as UC3
    usecase "UC04: Làm mới Access Token" as UC4
    usecase "UC05: Xác thực số điện thoại" as UC5
    usecase "UC06: Mã hóa mật khẩu" as UC6
    usecase "UC07: Quản lý token blacklist" as UC7
}

Guest --> UC1
Guest --> UC2
UC1 ..> UC5 : <<include>>
UC1 ..> UC6 : <<include>>
UC2 ..> UC6 : <<include>>

AuthUser --> UC3
AuthUser --> UC4
UC3 ..> UC7 : <<include>>

Admin --|> AuthUser
@enduml
```

### 2.2. Đặc tả Use Case chi tiết: Đăng ký tài khoản (Register)

> [!info] Thông tin Use Case
> **Use Case ID:** UC-AUTH-01
> **Use Case Name:** Đăng ký tài khoản (Register)
> **Actor:** Guest (Khách chưa xác thực)
> **Trigger:** Người dùng gửi yêu cầu đăng ký với thông tin cá nhân

> [!note] Điều kiện tiên quyết (Pre-conditions)
> 1. Số điện thoại chưa tồn tại trong hệ thống
> 2. Email (nếu có) chưa được sử dụng
> 3. Username (nếu có) chưa được sử dụng

> [!success] Điều kiện hậu kỳ (Post-conditions)
> 1. Tài khoản mới được tạo trong database
> 2. Mật khẩu được mã hóa bằng bcrypt
> 3. Hệ thống trả về Access Token và Refresh Token

**Luồng xử lý chính (Normal Flow):**

| Bước | Tác nhân | Hành động |
|------|----------|-----------|
| 1 | Client | Gửi POST request đến `/api/v1/auth/register` với body `{phone, password, fullName, email?, username?}` |
| 2 | Controller | Nhận request, bind JSON vào `RegisterRequest` DTO, gọi `Validate()` |
| 3 | Controller | Chuyển đổi DTO sang `RegisterInput` domain, gọi `useCase.Register()` |
| 4 | UseCase | Gọi `domain.NewPhone(phone)` để validate và tạo value object |
| 5 | UseCase | Gọi `repository.ExistsByPhone(phone)` kiểm tra trùng lặp |
| 6 | UseCase | Gọi `hasher.Hash(password)` để mã hóa mật khẩu |
| 7 | UseCase | Tạo entity User mới với các thông tin đã validate |
| 8 | Repository | Thực thi SQL INSERT INTO users |
| 9 | UseCase | Tạo Access Token và Refresh Token |
| 10 | Controller | Thiết lập cookie `refresh_token`, trả về `AuthResponse` JSON |

**Luồng thay thế (Alternative Flow):**

| Flow ID | Điều kiện | Xử lý |
|---------|-----------|-------|
| AF-1 | Số điện thoại đã tồn tại | Bước 5: Repository trả về true, UseCase trả về `ErrPhoneAlreadyExists` |
| AF-2 | Email đã tồn tại | Bước 5: Repository trả về true, UseCase trả về `ErrEmailAlreadyExists` |
| AF-3 | Định dạng phone không hợp lệ | Bước 4: NewPhone trả về `ErrInvalidPhone` |

**Ngoại lệ (Exceptions):**

| Exception | Điều kiện | HTTP Status | Error Code |
|-----------|-----------|-------------|------------|
| ErrInvalidPhone | Số điện thoại không đúng định dạng | 400 | INVALID_PHONE |
| ErrPhoneAlreadyExists | Số điện thoại đã được đăng ký | 409 | PHONE_EXISTS |
| ErrEmailAlreadyExists | Email đã được sử dụng | 409 | EMAIL_EXISTS |
| ErrValidation | Request body không hợp lệ | 400 | VALIDATION_ERROR |

### 2.3. Đặc tả Use Case chi tiết: Đăng nhập hệ thống (Login)

> [!info] Thông tin Use Case
> **Use Case ID:** UC-AUTH-02
> **Use Case Name:** Đăng nhập hệ thống (Login)
> **Actor:** Guest (Khách chưa xác thực)
> **Trigger:** Người dùng gửi yêu cầu đăng nhập với thông tin xác thực

> [!note] Điều kiện tiên quyết (Pre-conditions)
> 1. Người dùng đã có tài khoản trong hệ thống
> 2. Tài khoản đang trong trạng thái hoạt động (IsActive = true)

> [!success] Điều kiện hậu kỳ (Post-conditions)
> 1. Hệ thống trả về Access Token và Refresh Token
> 2. Refresh Token được lưu vào Redis với TTL
> 3. Cookie refresh_token được thiết lập

**Luồng xử lý chính (Normal Flow):**

| Bước | Tác nhân | Hành động |
|------|----------|-----------|
| 1 | Client | Gửi POST request đến `/api/v1/auth/login` với body `{identifier, password}` |
| 2 | Controller | Nhận request, bind JSON vào `LoginRequest` DTO, gọi `Validate()` |
| 3 | Controller | Chuyển đổi DTO sang `LoginInput` domain, gọi `useCase.Login()` |
| 4 | UseCase | Gọi `repository.GetByIdentifier(identifier)` để tìm người dùng |
| 5 | Repository | Thực thi SQL query tìm kiếm theo phone/email/username |
| 6 | UseCase | Gọi `user.CanLogin()` kiểm tra trạng thái hoạt động |
| 7 | UseCase | Gọi `hasher.Compare(passwordHash, password)` so sánh mật khẩu |
| 8 | UseCase | Gọi `jwtProvider.GenerateToken(userID, role, duration)` tạo Access Token |
| 9 | UseCase | Tạo Refresh Token (UUID), lưu vào Redis với key `refresh_token:{uuid}` |
| 10 | Controller | Thiết lập cookie `refresh_token`, trả về `AuthResponse` JSON |

**Luồng thay thế (Alternative Flow):**

| Flow ID | Điều kiện | Xử lý |
|---------|-----------|-------|
| AF-1 | Người dùng không tồn tại | Bước 4: Repository trả về error, UseCase trả về `ErrInvalidCredentials` |
| AF-2 | Mật khẩu không khớp | Bước 7: Hasher trả về error, UseCase trả về `ErrInvalidCredentials` |
| AF-3 | Identifier là email | Bước 5: Query tìm kiếm theo trường email thay vì phone |

**Ngoại lệ (Exceptions):**

| Exception | Điều kiện | HTTP Status | Error Code |
|-----------|-----------|-------------|------------|
| ErrInvalidCredentials | Sai thông tin đăng nhập | 401 | INVALID_CREDENTIALS |
| ErrUserInactive | Tài khoản bị vô hiệu hóa | 403 | USER_INACTIVE |
| ErrValidation | Request body không hợp lệ | 400 | VALIDATION_ERROR |
| ErrInternal | Lỗi hệ thống (DB, Redis) | 500 | INTERNAL_ERROR |

### 2.4. Đặc tả Use Case chi tiết: Đăng xuất hệ thống (Logout)

> [!info] Thông tin Use Case
> **Use Case ID:** UC-AUTH-03
> **Use Case Name:** Đăng xuất hệ thống (Logout)
> **Actor:** Authenticated User (Người dùng đã xác thực)
> **Trigger:** Người dùng gửi yêu cầu đăng xuất

> [!note] Điều kiện tiên quyết (Pre-conditions)
> 1. Người dùng đã đăng nhập và có Access Token hợp lệ

> [!success] Điều kiện hậu kỳ (Post-conditions)
> 1. Access Token hiện tại được thêm vào blacklist trong Redis
> 2. Cookie refresh_token bị xóa

**Luồng xử lý chính (Normal Flow):**

| Bước | Tác nhân | Hành động |
|------|----------|-----------|
| 1 | Client | Gửi POST request đến `/api/v1/auth/logout` với header `Authorization: Bearer {token}` |
| 2 | Controller | Trích xuất token từ header |
| 3 | Controller | Gọi `useCase.Logout(ctx, token)` |
| 4 | UseCase | Gọi `jwtProvider.ValidateToken(token)` để lấy claims |
| 5 | UseCase | Tính toán thời gian còn lại của token: `remainingTime = exp - now` |
| 6 | UseCase | Gọi Redis `SET blacklist:{token} "revoked" EX remainingTime` |
| 7 | Controller | Xóa cookie `refresh_token` bằng cách set MaxAge = -1 |
| 8 | Controller | Trả về response thành công |

### 2.5. Đặc tả Use Case chi tiết: Làm mới Access Token (Refresh)

> [!info] Thông tin Use Case
> **Use Case ID:** UC-AUTH-04
> **Use Case Name:** Làm mới Access Token (Refresh)
> **Actor:** Authenticated User (Người dùng đã xác thực)
> **Trigger:** Access Token hết hạn, client gửi yêu cầu refresh

> [!note] Điều kiện tiên quyết (Pre-conditions)
> 1. Refresh Token còn hạn và tồn tại trong Redis
> 2. Refresh Token chưa bị thu hồi

> [!success] Điều kiện hậu kỳ (Post-conditions)
> 1. Refresh Token cũ bị xóa khỏi Redis
> 2. Cặp Access Token và Refresh Token mới được tạo
> 3. Refresh Token mới được lưu vào Redis

**Luồng xử lý chính (Normal Flow):**

| Bước | Tác nhân | Hành động |
|------|----------|-----------|
| 1 | Client | Gửi POST request đến `/api/v1/auth/refresh` với cookie hoặc body chứa refresh token |
| 2 | Controller | Trích xuất refresh token từ cookie hoặc body |
| 3 | Controller | Gọi `useCase.RefreshToken(ctx, refreshToken)` |
| 4 | UseCase | Gọi Redis `GET refresh_token:{uuid}` để lấy user_id |
| 5 | UseCase | Gọi `repository.GetByID(userID)` để lấy thông tin user |
| 6 | UseCase | Xóa refresh token cũ: Redis `DEL refresh_token:{uuid}` |
| 7 | UseCase | Tạo Access Token mới và Refresh Token mới |
| 8 | UseCase | Lưu Refresh Token mới vào Redis |
| 9 | Controller | Thiết lập cookie mới, trả về `AuthResponse` JSON |

**Ngoại lệ (Exceptions):**

| Exception | Điều kiện | HTTP Status | Error Code |
|-----------|-----------|-------------|------------|
| ErrRefreshTokenInvalid | Token không tồn tại trong Redis | 401 | INVALID_REFRESH_TOKEN |
| ErrRefreshTokenExpired | Token đã hết hạn | 401 | REFRESH_TOKEN_EXPIRED |
| ErrUserNotFound | User không tồn tại | 404 | USER_NOT_FOUND |

---

## 3. THIẾT KẾ CƠ SỞ DỮ LIỆU (DATABASE DESIGN)

### 3.1. Sơ đồ thực thể liên kết (Entity Relationship Diagram - ERD)

```plantuml
@startuml
skinparam linetype ortho

entity "users" as User {
    * id : BIGSERIAL <<PK>>
    --
    * phone : VARCHAR(15) <<UNIQUE>>
    * password_hash : VARCHAR(255)
    * full_name : VARCHAR(100)
    email : VARCHAR(100) <<UNIQUE>>
    username : VARCHAR(50) <<UNIQUE>>
    role : VARCHAR(20) <<DEFAULT 'customer'>>
    is_active : BOOLEAN <<DEFAULT true>>
    * created_at : TIMESTAMPTZ
    updated_at : TIMESTAMPTZ
}

note right of User
    **Các vai trò (role):**
    - customer: Khách hàng
    - operator: Nhân viên vận hành
    - admin: Quản trị viên
end note

entity "refresh_tokens (Redis)" as RefreshToken {
    * key : STRING <<PK>>
    --
    * user_id : BIGINT
    * expires_at : TTL (7 ngày)
}

entity "token_blacklist (Redis)" as Blacklist {
    * key : STRING <<PK>>
    --
    * status : STRING
    * expires_at : TTL (thời gian còn lại của token)
}

User ||--o{ RefreshToken : "1 người dùng có nhiều refresh token"
User ||--o{ Blacklist : "1 người dùng có nhiều token bị thu hồi"
@enduml
```

### 3.2. Từ điển dữ liệu (Data Dictionary)

> [!abstract] Bảng: users

| Tên trường | Kiểu dữ liệu | Ràng buộc | Mô tả |
|------------|--------------|-----------|-------|
| id | BIGSERIAL | PK, NOT NULL | Khóa chính, tự động tăng |
| phone | VARCHAR(15) | UNIQUE, NOT NULL | Số điện thoại (định dạng VN: 0xxxxxxxxx hoặc +84xxxxxxxxx) |
| password_hash | VARCHAR(255) | NOT NULL | Mật khẩu đã mã hóa bcrypt |
| full_name | VARCHAR(100) | NOT NULL | Họ và tên đầy đủ (tối thiểu 2 ký tự) |
| email | VARCHAR(100) | UNIQUE, NULL | Địa chỉ email (tùy chọn) |
| username | VARCHAR(50) | UNIQUE, NULL | Tên đăng nhập (3-30 ký tự, a-z0-9_) |
| role | VARCHAR(20) | DEFAULT 'customer' | Vai trò: customer, operator, admin |
| is_active | BOOLEAN | DEFAULT true | Trạng thái hoạt động của tài khoản |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Thời điểm tạo tài khoản |
| updated_at | TIMESTAMPTZ | NULL | Thời điểm cập nhật gần nhất |

> [!abstract] Redis Keys

| Key Pattern | Kiểu | TTL | Mô tả |
|-------------|------|-----|-------|
| `refresh_token:{uuid}` | STRING | 7 ngày | Lưu user_id để xác thực refresh token |
| `blacklist:{jwt_token}` | STRING | Còn lại của token | Đánh dấu token đã thu hồi |

---

## 4. KIẾN TRÚC HỆ THỐNG VÀ LUỒNG XỬ LÝ (SYSTEM ARCHITECTURE)

### 4.1. Kiến trúc mã nguồn

> [!info] Clean Architecture (Hexagonal Architecture)
> Module Auth được triển khai theo mô hình Clean Architecture với các lớp rõ ràng:

| Lớp (Layer) | Thư mục | File | Trách nhiệm |
|-------------|---------|------|-------------|
| **Domain** | `domain/` | `entity.go` | Định nghĩa entity User, value objects (Phone, Email, Username, Role), validation rules |
| **Domain** | `domain/` | `dto.go` | Định nghĩa DTOs: RegisterInput, LoginInput, RefreshInput, AuthOutput |
| **Domain** | `domain/` | `ports.go` | Định nghĩa interfaces: Repository, PasswordHasher |
| **Repository** | `repository/` | `repository.go` | Implement Repository interface, tương tác PostgreSQL qua SQLC |
| **UseCase** | `usecase/` | `usecase.go` | Implement IAuthUseCase, xử lý logic nghiệp vụ |
| **Infrastructure** | `infrastructure/` | `bcrypt.go` | Implement PasswordHasher với bcrypt |
| **Controller** | `controller/http/` | `handler.go` | Xử lý HTTP request/response, error mapping |
| **Controller** | `controller/http/` | `routes.go` | Đăng ký routes với Gin router |
| **Controller** | `controller/dto/` | `auth.go` | DTOs cho HTTP layer: RegisterRequest, LoginRequest, AuthResponse |

### 4.2. Danh sách API Endpoints

| HTTP Method | Endpoint | Yêu cầu quyền | Mô tả chức năng |
|-------------|----------|---------------|-----------------|
| POST | `/api/v1/auth/register` | Public | Đăng ký tài khoản mới |
| POST | `/api/v1/auth/login` | Public | Đăng nhập, nhận JWT tokens |
| POST | `/api/v1/auth/logout` | Bearer Token | Đăng xuất, thu hồi token |
| POST | `/api/v1/auth/refresh` | Cookie/Body | Làm mới Access Token |

---

## 5. BIỂU ĐỒ TUẦN TỰ (SEQUENCE DIAGRAMS)

### 5.1. Biểu đồ tuần tự: Quá trình Đăng ký (Register)

```plantuml
@startuml
skinparam responseMessageBelowArrow true
skinparam sequenceMessageAlign center

title Sequence Diagram: Đăng ký tài khoản (Register)

actor "Client" as Client
participant "AuthHandler" as Handler
participant "AuthUseCase" as UC
participant "AuthRepository" as Repo
participant "BcryptHasher" as Hasher
participant "JWTProvider" as JWT
database "PostgreSQL" as DB
database "Redis" as Redis

Client -> Handler: POST /auth/register\n{phone, password, fullName, email?, username?}
activate Handler

Handler -> Handler: Bind JSON to RegisterRequest
Handler -> Handler: Validate() - kiểm tra định dạng

alt Validation thất bại
    Handler --> Client: 400 Bad Request\n{error: "VALIDATION_ERROR"}
end

Handler -> UC: Register(ctx, RegisterInput)
activate UC

UC -> UC: domain.NewPhone(phone)
alt Phone không hợp lệ
    UC --> Handler: ErrInvalidPhone
    Handler --> Client: 400 Bad Request
end

UC -> Repo: ExistsByPhone(ctx, phone)
activate Repo
Repo -> DB: SELECT EXISTS(SELECT 1 FROM users WHERE phone = $1)
DB --> Repo: true/false
Repo --> UC: bool
deactivate Repo

alt Phone đã tồn tại
    UC --> Handler: ErrPhoneAlreadyExists
    Handler --> Client: 409 Conflict
end

opt Email được cung cấp
    UC -> Repo: ExistsByEmail(ctx, email)
    activate Repo
    Repo -> DB: SELECT EXISTS(SELECT 1 FROM users WHERE email = $1)
    DB --> Repo: true/false
    Repo --> UC: bool
    deactivate Repo
    
    alt Email đã tồn tại
        UC --> Handler: ErrEmailAlreadyExists
        Handler --> Client: 409 Conflict
    end
end

UC -> Hasher: Hash(password)
activate Hasher
Hasher -> Hasher: bcrypt.GenerateFromPassword(password, cost=10)
Hasher --> UC: passwordHash
deactivate Hasher

UC -> UC: Tạo domain.User entity

UC -> Repo: Create(ctx, user)
activate Repo
Repo -> DB: INSERT INTO users\n(phone, password_hash, full_name, email, username, role)\nVALUES ($1, $2, $3, $4, $5, $6)\nRETURNING id, created_at
DB --> Repo: User row với id
Repo --> UC: *domain.User
deactivate Repo

UC -> JWT: GenerateToken(userID, role, duration)
activate JWT
JWT -> JWT: jwt.NewWithClaims(HS256, claims)
JWT --> UC: TokenDetails{AccessToken, ExpiresAt}
deactivate JWT

UC -> UC: Generate UUID cho RefreshToken

UC -> Redis: SET refresh_token:{uuid} userID EX 604800
activate Redis
Redis --> UC: OK
deactivate Redis

UC --> Handler: *AuthOutput{AccessToken, RefreshToken, User}
deactivate UC

Handler -> Handler: SetCookie("refresh_token", token, 7d, HttpOnly)
Handler --> Client: 201 Created\n{accessToken, refreshToken, expiresIn, user}
deactivate Handler

@enduml
```

### 5.2. Biểu đồ tuần tự: Quá trình Đăng nhập (Login)

```plantuml
@startuml
skinparam responseMessageBelowArrow true
skinparam sequenceMessageAlign center

title Sequence Diagram: Đăng nhập hệ thống (Login)

actor "Client" as Client
participant "AuthHandler" as Handler
participant "AuthUseCase" as UC
participant "AuthRepository" as Repo
participant "BcryptHasher" as Hasher
participant "JWTProvider" as JWT
database "PostgreSQL" as DB
database "Redis" as Redis

Client -> Handler: POST /auth/login\n{identifier, password}
activate Handler

Handler -> Handler: Bind JSON to LoginRequest
Handler -> Handler: Validate()

Handler -> UC: Login(ctx, LoginInput)
activate UC

UC -> Repo: GetByIdentifier(ctx, identifier)
activate Repo
Repo -> DB: SELECT * FROM users\nWHERE phone = $1\n   OR email = $1\n   OR username = $1\nLIMIT 1
DB --> Repo: User row hoặc nil
Repo --> UC: *domain.User hoặc error
deactivate Repo

alt Người dùng không tồn tại
    UC --> Handler: ErrInvalidCredentials
    Handler --> Client: 401 Unauthorized\n{error: "INVALID_CREDENTIALS"}
end

UC -> UC: user.CanLogin()
note right: Kiểm tra is_active == true

alt Tài khoản bị vô hiệu hóa
    UC --> Handler: ErrUserInactive
    Handler --> Client: 403 Forbidden\n{error: "USER_INACTIVE"}
end

UC -> Hasher: Compare(passwordHash, password)
activate Hasher
Hasher -> Hasher: bcrypt.CompareHashAndPassword()
Hasher --> UC: nil (thành công) hoặc error
deactivate Hasher

alt Mật khẩu không khớp
    UC --> Handler: ErrInvalidCredentials
    Handler --> Client: 401 Unauthorized\n{error: "INVALID_CREDENTIALS"}
end

UC -> JWT: GenerateToken(userID, role, duration)
activate JWT
JWT -> JWT: jwt.NewWithClaims(HS256, Claims{sub, role, exp, iat})
JWT -> JWT: token.SignedString(secretKey)
JWT --> UC: TokenDetails{AccessToken, ExpiresAt}
deactivate JWT

UC -> UC: uuid.New() cho RefreshToken

UC -> Redis: SET refresh_token:{uuid} userID EX 604800
activate Redis
note right: TTL = 7 ngày = 604800 giây
Redis --> UC: OK
deactivate Redis

UC --> Handler: *AuthOutput{AccessToken, RefreshToken, User}
deactivate UC

Handler -> Handler: SetCookie("refresh_token", uuid, 7d, HttpOnly, Secure)
Handler --> Client: 200 OK\n{accessToken, refreshToken, expiresIn, user}
deactivate Handler

@enduml
```

### 5.3. Biểu đồ tuần tự: Quá trình Đăng xuất (Logout)

```plantuml
@startuml
skinparam responseMessageBelowArrow true
skinparam sequenceMessageAlign center

title Sequence Diagram: Đăng xuất hệ thống (Logout)

actor "Client" as Client
participant "AuthMiddleware" as Middleware
participant "AuthHandler" as Handler
participant "AuthUseCase" as UC
participant "JWTProvider" as JWT
database "Redis" as Redis

Client -> Middleware: POST /auth/logout\nAuthorization: Bearer {accessToken}
activate Middleware

Middleware -> Middleware: Trích xuất token từ header
Middleware -> JWT: ValidateToken(token)
activate JWT
JWT -> JWT: jwt.Parse(token, keyFunc)
JWT -> JWT: Verify signature + expiration
JWT --> Middleware: *Claims{sub, role, exp, iat}
deactivate JWT

alt Token không hợp lệ hoặc hết hạn
    Middleware --> Client: 401 Unauthorized
end

Middleware -> Redis: GET blacklist:{token}
activate Redis
Redis --> Middleware: nil (không tồn tại) hoặc "revoked"
deactivate Redis

alt Token đã bị thu hồi (trong blacklist)
    Middleware --> Client: 401 Unauthorized\n{error: "TOKEN_REVOKED"}
end

Middleware -> Handler: Forward request với user context
deactivate Middleware
activate Handler

Handler -> Handler: Lấy token từ Authorization header
Handler -> UC: Logout(ctx, accessToken)
activate UC

UC -> JWT: ParseToken(token)
activate JWT
JWT --> UC: *Claims{exp, sub, role}
deactivate JWT

UC -> UC: remainingTime = exp - time.Now().Unix()

alt Token đã hết hạn (remainingTime <= 0)
    UC --> Handler: nil (không cần làm gì)
end

UC -> Redis: SET blacklist:{token} "revoked" EX remainingTime
activate Redis
note right: TTL = thời gian còn lại của token
Redis --> UC: OK
deactivate Redis

UC --> Handler: nil
deactivate UC

Handler -> Handler: SetCookie("refresh_token", "", MaxAge=-1)
note right: Xóa cookie bằng cách set MaxAge âm

Handler --> Client: 200 OK\n{message: "Đăng xuất thành công"}
deactivate Handler

@enduml
```

### 5.4. Biểu đồ tuần tự: Quá trình Làm mới Token (Refresh)

```plantuml
@startuml
skinparam responseMessageBelowArrow true
skinparam sequenceMessageAlign center

title Sequence Diagram: Làm mới Access Token (Refresh)

actor "Client" as Client
participant "AuthHandler" as Handler
participant "AuthUseCase" as UC
participant "AuthRepository" as Repo
participant "JWTProvider" as JWT
database "PostgreSQL" as DB
database "Redis" as Redis

Client -> Handler: POST /auth/refresh\nCookie: refresh_token={uuid}
activate Handler

Handler -> Handler: Trích xuất refresh token từ cookie
alt Không có cookie
    Handler -> Handler: Đọc từ request body
end

alt Refresh token trống
    Handler --> Client: 400 Bad Request\n{error: "REFRESH_TOKEN_REQUIRED"}
end

Handler -> UC: RefreshToken(ctx, refreshToken)
activate UC

UC -> Redis: GET refresh_token:{uuid}
activate Redis
Redis --> UC: userID hoặc nil
deactivate Redis

alt Refresh token không tồn tại trong Redis
    UC --> Handler: ErrRefreshTokenInvalid
    Handler --> Client: 401 Unauthorized\n{error: "INVALID_REFRESH_TOKEN"}
end

UC -> Repo: GetByID(ctx, userID)
activate Repo
Repo -> DB: SELECT * FROM users WHERE id = $1
DB --> Repo: User row
Repo --> UC: *domain.User
deactivate Repo

alt Người dùng không tồn tại
    UC --> Handler: ErrUserNotFound
    Handler --> Client: 404 Not Found\n{error: "USER_NOT_FOUND"}
end

UC -> UC: user.CanLogin()
alt Tài khoản bị vô hiệu hóa
    UC --> Handler: ErrUserInactive
    Handler --> Client: 403 Forbidden
end

UC -> Redis: DEL refresh_token:{uuid}
activate Redis
note right: Xóa refresh token cũ (Token Rotation)
Redis --> UC: OK
deactivate Redis

UC -> JWT: GenerateToken(userID, role, duration)
activate JWT
JWT -> JWT: jwt.NewWithClaims()
JWT --> UC: TokenDetails{AccessToken, ExpiresAt}
deactivate JWT

UC -> UC: newRefreshToken = uuid.New()

UC -> Redis: SET refresh_token:{newUUID} userID EX 604800
activate Redis
Redis --> UC: OK
deactivate Redis

UC --> Handler: *AuthOutput{AccessToken, newRefreshToken, User}
deactivate UC

Handler -> Handler: SetCookie("refresh_token", newUUID, 7d, HttpOnly, Secure)
Handler --> Client: 200 OK\n{accessToken, refreshToken, expiresIn, user}
deactivate Handler

@enduml
```

### 5.5. Biểu đồ tuần tự: Middleware xác thực (Auth Middleware)

```plantuml
@startuml
skinparam responseMessageBelowArrow true
skinparam sequenceMessageAlign center

title Sequence Diagram: Auth Middleware - Xác thực Request

actor "Client" as Client
participant "AuthMiddleware" as Middleware
participant "JWTProvider" as JWT
database "Redis" as Redis
participant "Next Handler" as Next

Client -> Middleware: Request với header\nAuthorization: Bearer {token}
activate Middleware

Middleware -> Middleware: Trích xuất token từ header

alt Header không có hoặc không đúng định dạng
    Middleware --> Client: 401 Unauthorized\n{error: "MISSING_TOKEN"}
end

Middleware -> JWT: ValidateToken(token)
activate JWT

JWT -> JWT: jwt.Parse(token, keyFunc)
JWT -> JWT: Kiểm tra algorithm (HS256)
JWT -> JWT: Verify signature với secret key
JWT -> JWT: Kiểm tra exp claim

alt Token hết hạn
    JWT --> Middleware: ErrTokenExpired
    Middleware --> Client: 401 Unauthorized\n{error: "TOKEN_EXPIRED"}
end

alt Signature không hợp lệ
    JWT --> Middleware: ErrTokenInvalid
    Middleware --> Client: 401 Unauthorized\n{error: "INVALID_TOKEN"}
end

JWT --> Middleware: *Claims{sub, role, exp, iat}
deactivate JWT

Middleware -> Redis: GET blacklist:{token}
activate Redis
Redis --> Middleware: nil hoặc "revoked"
deactivate Redis

alt Token đã bị thu hồi
    Middleware --> Client: 401 Unauthorized\n{error: "TOKEN_REVOKED"}
end

Middleware -> Middleware: ctx.Set("userID", claims.sub)
Middleware -> Middleware: ctx.Set("role", claims.role)

Middleware -> Next: ctx.Next()
activate Next
Next --> Middleware: Response
deactivate Next

Middleware --> Client: Response từ handler
deactivate Middleware

@enduml
```

---

## 6. CÁC QUY TẮC NGHIỆP VỤ (BUSINESS RULES)

### 6.1. Quy tắc xác thực dữ liệu

| Trường | Quy tắc | Regex/Điều kiện |
|--------|---------|-----------------|
| phone | Số điện thoại Việt Nam | `^(0\|\+84)[0-9]{9,10}$` |
| email | Định dạng email hợp lệ (tùy chọn) | `^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$` |
| username | 3-30 ký tự, chỉ chứa a-z, 0-9, _ (tùy chọn) | `^[a-zA-Z0-9_]{3,30}$` |
| password | Tối thiểu 6 ký tự | `len >= 6` |
| full_name | Tối thiểu 2 ký tự (sau khi trim) | `len(trim(name)) >= 2` |

### 6.2. Quy tắc phân quyền (RBAC)

| Vai trò | Quyền hạn |
|---------|-----------|
| customer | Đặt vé, xem lịch sử đặt vé, cập nhật thông tin cá nhân |
| operator | Tất cả quyền customer + Quản lý chuyến xe, xe buýt |
| admin | Tất cả quyền operator + Quản lý người dùng, nhà xe, cấu hình hệ thống |

### 6.3. Cấu hình token

| Loại Token | Thời hạn | Lưu trữ |
|------------|----------|---------|
| Access Token (JWT) | Cấu hình (mặc định: 15 phút) | Client memory/localStorage |
| Refresh Token (UUID) | 7 ngày | Redis + HttpOnly Cookie |

### 6.4. Chiến lược bảo mật

> [!warning] Token Rotation
> Khi refresh token được sử dụng, token cũ sẽ bị xóa và token mới được tạo. Điều này giúp phát hiện token bị đánh cắp.

> [!warning] Token Blacklist
> Access token bị thu hồi sẽ được lưu trong Redis với TTL bằng thời gian còn lại của token.

---

## 7. XỬ LÝ LỖI (ERROR HANDLING)

| Domain Error | HTTP Status | Error Code | Message (i18n key) |
|--------------|-------------|------------|-------------------|
| ErrInvalidPhone | 400 | INVALID_PHONE | error.invalid_phone |
| ErrInvalidEmail | 400 | INVALID_EMAIL | error.invalid_email |
| ErrInvalidPassword | 400 | INVALID_PASSWORD | error.invalid_password |
| ErrPhoneAlreadyExists | 409 | PHONE_EXISTS | error.phone_exists |
| ErrEmailAlreadyExists | 409 | EMAIL_EXISTS | error.email_exists |
| ErrUsernameAlreadyExists | 409 | USERNAME_EXISTS | error.username_exists |
| ErrInvalidCredentials | 401 | INVALID_CREDENTIALS | error.invalid_credentials |
| ErrTokenInvalid | 401 | INVALID_TOKEN | error.invalid_token |
| ErrTokenExpired | 401 | TOKEN_EXPIRED | error.token_expired |
| ErrTokenRevoked | 401 | TOKEN_REVOKED | error.token_revoked |
| ErrRefreshTokenInvalid | 401 | INVALID_REFRESH_TOKEN | error.invalid_refresh_token |
| ErrUserInactive | 403 | USER_INACTIVE | error.user_inactive |
| ErrUserNotFound | 404 | USER_NOT_FOUND | error.user_not_found |

---

## 8. PHỤ LỤC

### 8.1. Cấu trúc Response JSON

```json
// Success Response - Register/Login
{
    "success": true,
    "data": {
        "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
        "refreshToken": "550e8400-e29b-41d4-a716-446655440000",
        "expiresIn": 900,
        "user": {
            "id": 1,
            "phone": "0912345678",
            "fullName": "Nguyễn Văn A",
            "email": "a@example.com",
            "role": "customer"
        }
    }
}

// Error Response
{
    "success": false,
    "error": {
        "code": "INVALID_CREDENTIALS",
        "message": "Thông tin đăng nhập không chính xác"
    }
}
```

### 8.2. Biểu đồ trạng thái Token

```plantuml
@startuml
skinparam state {
    BackgroundColor LightBlue
    BorderColor DarkBlue
}

title State Diagram: Vòng đời Token

[*] --> Created : Tạo token mới

state "Access Token" as AT {
    Created --> Valid : Token được cấp
    Valid --> Expired : Hết thời hạn (15 phút)
    Valid --> Revoked : Logout / Thu hồi
    Expired --> [*]
    Revoked --> [*]
}

state "Refresh Token" as RT {
    Created --> Active : Lưu vào Redis
    Active --> Used : Được sử dụng để refresh
    Used --> Rotated : Token mới thay thế
    Active --> Expired : Hết hạn (7 ngày)
    Rotated --> [*]
    Expired --> [*]
}

@enduml
```
