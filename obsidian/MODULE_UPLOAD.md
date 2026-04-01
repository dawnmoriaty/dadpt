---
tags:
  - module
  - upload
  - storage
created: 2026-04-01
updated: 2026-04-01
---

# MODULE UPLOAD

> [!abstract] Mục tiêu
> Quản lý upload tài nguyên tệp (ảnh xe/chuyến và dữ liệu liên quan), lưu trữ trên object storage và cung cấp URL truy cập an toàn cho frontend.

## 1. Bối cảnh nghiệp vụ

Module Upload hỗ trợ các module nghiệp vụ cần quản lý tệp đính kèm. Chất lượng kiểm soát upload ảnh hưởng đến hiệu năng hiển thị, tính hợp lệ dữ liệu và an toàn hệ thống.

## 2. Yêu cầu chức năng

| ID | Yêu cầu |
|---|---|
| UPL-01 | Upload file với giới hạn dung lượng/định dạng |
| UPL-02 | Trả URL truy cập để frontend hiển thị |
| UPL-03 | Bảo toàn metadata upload |

## 3. API Endpoints

| Method | Endpoint | Mô tả |
|---|---|---|
| POST | `/api/v1/upload` | Upload object |
| GET | `/api/v1/upload/:key` | Resolve/download object |

## 4. Quy tắc nghiệp vụ

- Validate mime type và kích thước tại boundary.
- Không ghi đè object ngoài chủ đích.
- Metadata tệp phải truy vết được theo khóa lưu trữ.

## 5. Tiêu chí chấp nhận

- File không hợp lệ trả `400 INVALID_FILE`.
- Upload thành công trả URL khả dụng cho frontend.
