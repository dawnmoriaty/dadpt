---
tags:
  - module
  - bus-type
created: 2026-04-01
updated: 2026-04-01
---

# MODULE BUS TYPE

> [!abstract] Mục tiêu
> Quản lý loại xe và mô hình ghế chuẩn để bảo đảm tính hợp lệ dữ liệu seat layout, làm nền cho kiểm tra seat code trong booking và hiển thị sơ đồ ghế trên giao diện.

## 1. Bối cảnh nghiệp vụ

Bus type đại diện cấu trúc phương tiện ở mức lớp (class-level), không phải cá thể xe. Việc chuẩn hóa bus type giúp hệ thống tránh lặp cấu hình ghế và giảm lỗi map ghế giữa frontend và backend.

## 2. Yêu cầu chức năng

| ID | Yêu cầu |
|---|---|
| BST-01 | Admin CRUD bus type |
| BST-02 | Validate `total_seats > 0` |
| BST-03 | Lưu `seat_layout` dạng JSONB |

## 3. Mô hình dữ liệu

- `bus_types(id, name, total_seats, seat_layout)`

## 4. API Endpoints

| Method | Endpoint | Mô tả |
|---|---|---|
| GET | `/api/v1/bus-types` | Danh sách bus type |
| POST | `/api/v1/admin/bus-types` | Tạo mới |
| PUT | `/api/v1/admin/bus-types/:id` | Cập nhật |
| DELETE | `/api/v1/admin/bus-types/:id` | Xóa |

## 5. Quy tắc nghiệp vụ

- `total_seats` phải tương thích với số ghế trong `seat_layout`.
- Mã ghế trong seat layout không được trùng.
- Không xóa bus type đang tham chiếu bởi bus active.

## 6. Yêu cầu phi chức năng

- Validate schema seat layout ở thời điểm ghi dữ liệu.
- Hỗ trợ mở rộng định dạng layout cho nhiều cấu trúc xe.
- Bảo đảm backward compatibility ở mức hợp lý khi thay đổi layout.

## 7. Tiêu chí chấp nhận

- Bus type không hợp lệ bị từ chối trước khi ghi DB.
- Xóa bus type đang sử dụng trả lỗi conflict.
