-- +goose Up
-- +goose StatementBegin

-- 1. USERS (Khách hàng)
CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    phone VARCHAR(20) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100),
    role VARCHAR(20) DEFAULT 'customer', -- 'customer', 'admin', 'provider'
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. PROVIDERS (Nhà xe - Multi-tenant)
CREATE TABLE providers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,     -- "Phương Trang"
    hotline VARCHAR(20),            -- "1900 6067"
    slug VARCHAR(100) UNIQUE,       -- "phuong-trang"
    policy_refund TEXT,             -- "Hủy trước 24h hoàn 70%..."
    is_active BOOLEAN DEFAULT TRUE
);

-- 3. BUS TYPES (Loại xe & Sơ đồ ghế)
CREATE TABLE bus_types (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,     -- "Giường nằm 40 chỗ", "Limousine 24 phòng"
    total_seats INT NOT NULL,
    -- JSON chứa cấu trúc vẽ ghế cho FE
    seat_layout JSONB NOT NULL
);

-- 4. BUSES (Xe cụ thể)
CREATE TABLE buses (
    id SERIAL PRIMARY KEY,
    provider_id INT NOT NULL REFERENCES providers(id),
    bus_type_id INT NOT NULL REFERENCES bus_types(id),
    license_plate VARCHAR(20) UNIQUE NOT NULL, -- "51B-123.45"
    status VARCHAR(20) DEFAULT 'active'
);

-- 5. LOCATIONS (Địa điểm/Bến xe)
CREATE TABLE locations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL, -- "Bến xe Miền Đông Mới"
    city VARCHAR(100) NOT NULL, -- "Hồ Chí Minh"
    address VARCHAR(255),
    keywords TEXT               -- "sai gon, hcm, quan 9" (Hỗ trợ Search)
);

-- 6. TRIPS (Chuyến xe - Core Logic)
CREATE TABLE trips (
    id BIGSERIAL PRIMARY KEY,
    provider_id INT NOT NULL REFERENCES providers(id),
    bus_id INT NOT NULL REFERENCES buses(id),
    
    -- Tuyến đường
    origin_id INT NOT NULL REFERENCES locations(id),
    destination_id INT NOT NULL REFERENCES locations(id),
    
    departure_time TIMESTAMPTZ NOT NULL,
    arrival_time TIMESTAMPTZ NOT NULL,
    
    -- GIÁ VÉ & AI PRICING
    base_price DECIMAL(10, 2) NOT NULL,        -- Giá gốc: 300.000
    price_modifier DECIMAL(3, 2) DEFAULT 1.0,  -- Hệ số AI: 1.2 (Cao điểm), 0.9 (Thấp điểm)
    is_hot_deal BOOLEAN DEFAULT FALSE,         -- Cờ để FE hiển thị icon 🔥
    
    -- ĐIỂM ĐÓN TRẢ LINH HOẠT (Đặc sản VN)
    pickup_points JSONB NOT NULL DEFAULT '[]',
    dropoff_points JSONB NOT NULL DEFAULT '[]',
    
    -- QUẢN LÝ GHẾ (Performance Hack)
    booked_seats TEXT[] DEFAULT '{}', -- Mảng các ghế đã bán: ['A01', 'B02']
    available_seats INT NOT NULL,     -- Cache số lượng ghế trống để filter nhanh
    
    status VARCHAR(20) DEFAULT 'scheduled', -- scheduled, running, completed, cancelled
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. BOOKINGS (Đơn hàng)
CREATE TABLE bookings (
    id BIGSERIAL PRIMARY KEY,
    code VARCHAR(12) UNIQUE NOT NULL, -- "VX123456" (Mã vé)
    
    trip_id BIGINT NOT NULL REFERENCES trips(id),
    user_id BIGINT REFERENCES users(id), -- Nullable (Cho phép khách vãng lai)
    
    -- Thông tin khách đi (Lưu snapshot để không cần join User)
    guest_info JSONB NOT NULL,
    
    -- Điểm đón/trả khách chọn
    pickup_info JSONB NOT NULL,
    dropoff_info JSONB NOT NULL,
    
    seat_codes TEXT[] NOT NULL, -- ['A01', 'A02']
    
    total_amount DECIMAL(10, 2) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending', -- pending -> paid -> cancelled
    payment_method VARCHAR(20),           -- vnpay, momo
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. OUTBOX (Event Driven cho RabbitMQ)
CREATE TABLE outbox_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    topic VARCHAR(100) NOT NULL, -- "booking.created", "booking.paid"
    payload JSONB NOT NULL,
    status VARCHAR(20) DEFAULT 'pending', -- pending, processed, failed
    retry_count INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_trips_search ON trips(origin_id, destination_id, departure_time);
CREATE INDEX idx_trips_provider ON trips(provider_id);
CREATE INDEX idx_bookings_trip ON bookings(trip_id);
CREATE INDEX idx_bookings_user ON bookings(user_id);
CREATE INDEX idx_outbox_pending ON outbox_events(status) WHERE status = 'pending';

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin

DROP INDEX IF EXISTS idx_outbox_pending;
DROP INDEX IF EXISTS idx_bookings_user;
DROP INDEX IF EXISTS idx_bookings_trip;
DROP INDEX IF EXISTS idx_trips_provider;
DROP INDEX IF EXISTS idx_trips_search;

DROP TABLE IF EXISTS outbox_events;
DROP TABLE IF EXISTS bookings;
DROP TABLE IF EXISTS trips;
DROP TABLE IF EXISTS locations;
DROP TABLE IF EXISTS buses;
DROP TABLE IF EXISTS bus_types;
DROP TABLE IF EXISTS providers;
DROP TABLE IF EXISTS users;

-- +goose StatementEnd
