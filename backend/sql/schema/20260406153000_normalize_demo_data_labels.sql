-- +goose Up
-- +goose StatementBegin

UPDATE locations
SET keywords = REPLACE(REPLACE(COALESCE(keywords, ''), 'seed-north-2026,', ''), 'seed-transfer-2026,', '')
WHERE COALESCE(keywords, '') ILIKE '%seed-%';

UPDATE locations
SET name = 'Bến xe Mỹ Đình',
    city = 'Hà Nội',
    address = '20 Phạm Hùng, Nam Từ Liêm, Hà Nội',
    keywords = 'my-dinh,ha-noi'
WHERE LOWER(name) = 'bx my dinh seed';

UPDATE locations
SET name = 'Bến xe Nước Ngầm',
    city = 'Hà Nội',
    address = 'Km 8 Giải Phóng, Hoàng Mai, Hà Nội',
    keywords = 'nuoc-ngam,ha-noi'
WHERE LOWER(name) = 'bx nuoc ngam seed';

UPDATE locations
SET name = 'Bến xe Niệm Nghĩa',
    city = 'Hải Phòng',
    address = '8 Trần Nguyên Hãn, Lê Chân, Hải Phòng',
    keywords = 'niem-nghia,hai-phong'
WHERE LOWER(name) = 'bx niem nghia seed';

UPDATE locations
SET name = 'Bến xe Ninh Bình',
    city = 'Ninh Bình',
    address = 'Lê Đại Hành, TP Ninh Bình',
    keywords = 'ninh-binh'
WHERE LOWER(name) = 'bx ninh binh seed';

UPDATE locations
SET name = 'Bến xe Bãi Cháy',
    city = 'Quảng Ninh',
    address = 'Bãi Cháy, Hạ Long, Quảng Ninh',
    keywords = 'bai-chay,quang-ninh'
WHERE LOWER(name) = 'bx bai chay seed';

UPDATE locations
SET name = 'Bến xe Giáp Bát',
    city = 'Hà Nội',
    address = 'Km 6 Giải Phóng, Hoàng Mai, Hà Nội',
    keywords = 'giap-bat,ha-noi'
WHERE LOWER(name) = 'bx giap bat seed';

UPDATE locations
SET city = 'Hà Nội',
    address = 'Yên Viên, Gia Lâm, Hà Nội',
    keywords = 'ninh-hiep,gia-lam,ha-noi'
WHERE name = 'Bến xe Ninh Hiệp';

UPDATE providers
SET name = 'Transfer Express',
    slug = 'transfer-express'
WHERE slug = 'seed-transfer-express';

UPDATE providers
SET name = 'Transfer Limousine',
    slug = 'transfer-limousine'
WHERE slug = 'seed-transfer-limousine';

UPDATE providers
SET name = 'Queen Café'
WHERE slug = 'queen-cafe';

UPDATE providers
SET name = 'Group Tour'
WHERE slug = 'grouptour';

UPDATE bus_types
SET name = 'Giường nằm 34 chỗ'
WHERE name = 'Seed Sleeper 34';

UPDATE bus_types
SET name = 'Limousine 22 chỗ'
WHERE name = 'Seed Limousine 22';

UPDATE trips
SET base_price = 70000,
    price_modifier = 1.00,
    is_hot_deal = false
WHERE base_price = 10000;

UPDATE bookings
SET guest_info = jsonb_set(
        jsonb_set(
            guest_info,
            '{name}',
            to_jsonb(REPLACE(COALESCE(guest_info->>'name', 'Khách lẻ'), 'Guest', 'Khách lẻ')),
            true
        ),
        '{email}',
        to_jsonb(REGEXP_REPLACE(COALESCE(guest_info->>'email', ''), '@seed\\.local$', '@example.com')),
        true
    )
WHERE COALESCE(guest_info->>'name', '') ILIKE 'Guest %'
   OR COALESCE(guest_info->>'email', '') ILIKE '%@seed.local';

UPDATE bookings
SET refund_note = 'Hoàn vé theo yêu cầu khách hàng'
WHERE refund_note = 'Seed refund test data';

UPDATE payment_transactions
SET checkout_url = REPLACE(checkout_url, 'pay.seed.local', 'pay.local')
WHERE COALESCE(checkout_url, '') LIKE '%pay.seed.local%';

UPDATE payment_transactions
SET webhook_data = webhook_data - 'seed'
WHERE webhook_data ? 'seed';

UPDATE outbox_events
SET payload = payload - 'seed'
WHERE payload ? 'seed';

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin

SELECT 1;

-- +goose StatementEnd
