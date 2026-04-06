---
tags:
  - module
  - auth
created: 2026-04-01
updated: 2026-04-01
---

# MODULE AUTH

> [!abstract] M?c tiêu
> Qu?n lý xác th?c và phân quy?n ngu?i dùng trong h? th?ng (c? admin, provider, và user). 

## 1. B?i c?nh nghi?p v?

H? th?ng yêu c?u authentication d?a trên JWT token (Access Token & Refresh Token). Các endpoint yêu c?u ki?m tra tính h?p l? c?a thông tin (phone, email, password) tru?c khi dang ký ho?c dang nh?p. Token h?p l? m?i du?c s? d?ng ? các module khác thông qua middleware (VD: API d?t vé...). Ki?n trúc du?c thi?t k? theo d?ng Hexagonal Architecture v?i Dependency Injection rõ ràng.

## 2. Yêu c?u ch?c nang và API Endpoints

H? th?ng authentication cung c?p danh sách HTTP handlers trên nhóm \/auth\.

| ID | Ch?c nang | Phuong th?c & URL | Ð?i tu?ng | Module / Dependencies |
|---|---|---|---|---|
| AUTH-01 | Ðang ký thành viên | \POST /api/v1/auth/register\ | User / System | db, hasher, jwt, redis |
| AUTH-02 | Ðang nh?p | \POST /api/v1/auth/login\ | User | db, hasher, jwt, redis |
| AUTH-03 | L?y token m?i | \POST /api/v1/auth/refresh\ | App/Browser | Cookie \efresh_token\ ho?c JSON body |
| AUTH-04 | Ðang xu?t | \POST /api/v1/auth/logout\ | App/Browser | G?n JWT Auth, xóa token |

## 3. Ki?n trúc lu?ng x? lý (Th?c t? Backend)

- **HTTP Handler:** X? lý request, Bind JSON và tr? v? JWT token ho?c set Cookie \efresh_token\.
- **Infrastructure (Adapters):** 
  - \epository\: Tuong tác v?i Database b?ng sqlc/PostgreSQL.
  - \infrastructure.NewBcryptHasher()\: S? d?ng thu?t toán Bcrypt bam m?t kh?u.
  - \edis\: Qu?n lý session / token cache.
  - \jwtProvider\: Qu?n lý sinh và d?nh d?ng ch? ký s? cho token.
- **UseCase (\IAuthUseCase\):** X? lý nghi?p v? xác th?c m?t kh?u, ki?m tra trùng l?p SDT/email và qu?n lý lu?ng dang xu?t. 

## 4. Quy t?c nghi?p v? & B?t l?i

Module Auth qu?n lý m?t b? mapping l?i t? \domain error\ sang \pkgErrors\. 
- **Validation Errors (400):** \ErrInvalidPhone\, \ErrInvalidEmail\, \ErrInvalidFullName\, \ErrInvalidUsername\, \ErrInvalidPassword\, \ErrInvalidRole\.
- **Conflict Errors (409):** \ErrPhoneAlreadyExists\, \ErrEmailAlreadyExists\.
- **Auth Errors (401-403):** \ErrInvalidCredentials\, \ErrTokenInvalid\, \ErrTokenExpired\, \ErrUserInactive\.

## 5. Tiêu chí ch?p nh?n

- Tuân th? Hexagonal pattern.
- Dependencies du?c tiêm (\Inject\) ngoài \Routes()\ và phân tách UseCase (Application) v?i Repository (Infrastructure).
- Qu?n lý JWT Token qua Response API cho App, d?ng th?i set Cookie an toàn cho phiên dang nh?p t? Frontend/Browser.
