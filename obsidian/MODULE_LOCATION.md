---
tags:
  - module
  - location
created: 2026-04-01
updated: 2026-04-01
---

# MODULE LOCATION

> [!abstract] M?c tiêu
> Qu?n lý d? li?u di?m di/di?m d?n và kh? nang tra c?u linh ho?t d? ph?c v? search trip, chat clarification và voice resolve trong môi tru?ng ngôn ng? t? nhiên.

## 1. B?i c?nh nghi?p v?

Location là n?n d? li?u d?nh danh hành trình. Ngu?i dùng có th? nh?p d?a danh theo nhi?u bi?n th?: tên d?y d?, tên t?t, bi?t danh vùng mi?n, ho?c phát âm g?n dúng qua voice. Backend du?c thi?t k? theo ki?n trúc Hexagonal d? d? b?o trì, d? thay d?i.

## 2. Yêu c?u ch?c nang và API Endpoints

H? th?ng cung c?p các API thông qua HTTP Handler, phân chia rõ public và dmin.

| ID | Ch?c nang | Phuong th?c & URL | Ð?i tu?ng | Phân h? (gin) |
|---|---|---|---|---|
| LOC-01 | Tìm ki?m location (autocomplete) | GET /api/v1/locations/search?q= | User/App | public |
| LOC-02 | T?o location m?i | POST /api/v1/admin/locations | Admin | dmin |
| LOC-03 | L?y danh sách location (Paging) | GET /api/v1/admin/locations?q=&city=&page= | Admin | dmin |
| LOC-04 | Xem chi ti?t location | GET /api/v1/admin/locations/:id | Admin | dmin |
| LOC-05 | Ch?nh s?a location | PUT /api/v1/admin/locations/:id | Admin | dmin |
| LOC-06 | Xóa location | DELETE /api/v1/admin/locations/:id | Admin | dmin |

## 3. Ki?n trúc lu?ng x? lý (Th?c t? Backend)

- **HTTP Handler:** Validate JSON, parse Query params (Paging, Query).
- **UseCase:** Ch?a logic nghi?p v? x? lý d? li?u và l?i c? th? (ví d?: ErrLocationNotFound, ErrLocationNameRequired, ErrLocationCityRequired).
- **Repository:** Ch?u trách nhi?m tuong tác v?i PostgreSQL qua sqlc, ph?c v? các query tìm ki?m, c?p nh?t.
- **DTOs:** Chuy?n d?i d? li?u Domain Entity (domain.Location) thành API Response (ví d?: dto.LocationResponse, dto.CreateLocationRequest).

## 4. Quy t?c nghi?p v? & B?t l?i

- **Name:** B?t bu?c có (ErrLocationNameRequired), không du?c quá ng?n (ErrLocationNameTooShort).
- **City:** B?t bu?c có c?p t?nh/thành (ErrLocationCityRequired), không du?c quá ng?n (ErrLocationCityTooShort).
- Tìm ki?m (Search): Yêu c?u trích xu?t query param. Phân bi?t du?c List (có phân trang) và Search (ph?c v? dropdown autocomplete nhanh mà không phân trang).

## 5. Tiêu chí ch?p nh?n

- Toàn b? flow tuân th? strict Hexagonal pattern (t? gin router d?n handler, usecase, repository, database).
- X? lý l?i m?ch l?c thông qua package pkgErrors d? tr? v? dúng format chung c?a h? th?ng.
