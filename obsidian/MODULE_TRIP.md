---
tags:
  - module
  - trip
created: 2026-04-01
updated: 2026-04-01
---

# MODULE TRIP

> [!abstract] M?c tiêu
> Qu?n lý chuy?n xe (Chuy?n Xe / Tuy?n / L?ch trình / Seats). Cho phép public tìm ki?m và Admin/Provider CRUD các chuy?n di d? m? bán vé.

## 1. B?i c?nh nghi?p v?

Trip là trung tâm c?a vi?c d?t vé trong h? th?ng. M?t chuy?n di quy d?nh Bus/Bus-Type dang ch?y, Route, Giá co b?n, Th?i gian Xu?t phát/Ð?n, và tr?ng thái Gh?. Thi?t k? theo Hexagonal d? tách bi?t logic Search ph?c t?p và CRUD phân quy?n.

## 2. API Endpoints

| Ch?c nang | Phuong th?c & URL | Ð?i tu?ng | Phân h? |
|---|---|---|---|
| Tìm ki?m chuy?n xe | GET /api/v1/trips/search | Public / User | public |
| L?y chi ti?t chuy?n di r?nh gh? | GET /api/v1/trips/:id | Public / User | public |
| T?o chuy?n xe m?i | POST /api/v1/admin/trips | Admin/Provider | dmin/provider |
| L?y danh sách | GET /api/v1/admin/trips | Admin/Provider | dmin/provider |
| Xem chi ti?t CRUD | GET /api/v1/admin/trips/:id | Admin | dmin |
| C?p nh?t | PUT /api/v1/admin/trips/:id | Admin/Provider | dmin |
| Xóa/H?y chuy?n | DELETE /api/v1/admin/trips/:id | Admin/Provider | dmin |

*(Note: Endpoint áp d?ng v?i dmin ho?c provider tu? middleware phân quy?n)*

## 3. Ki?n trúc Backend

- **Controller.HTTP:** Validate input (Search criteria: *departure_location, destination_location, date, etc.*).
- **UseCase:** X? lý logic search và matching. Validate business rules nhu DepartureTime < ArrivalTime, Giá vé > 0, và tính available seats hi?n t?i.
- **Repository:** Ch?y câu l?nh SQL sqlc tuong ?ng d? thao tác trên b?ng \	rips\. X? lý locking (Optimistic/Pessimistic) cho inventory gh? khi check avail.

## 4. Các logic và mã l?i quy d?nh

Các usecase ánh x? Domain l?i tr?c ti?p qua response (JSON): 
- **Thi?u query:** \ErrMissingLocation\, \ErrInvalidTime\.
- **Validation Errors:** \ErrBusAlreadyAssigned\, \ErrTripNotFound\.
- Booking: Ph? thu?c vào Inventory / Ticket (S? du?c x? lý giao thoa v?i Booking Module).

## 5. Tiêu chí ch?p nh?n

- Ðáp ?ng search hi?u nang cao.
- Không l? d? li?u Private c?a Provider A cho Provider B.
- Lu?ng tách d?i chu?n xác và tuân theo pattern Inject ITripUseCase vào TripHandler. 
