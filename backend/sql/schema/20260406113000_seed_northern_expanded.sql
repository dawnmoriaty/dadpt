-- +goose Up
-- +goose StatementBegin

-- =============================================================================
-- NORTHERN-FOCUSED FULL RESEED
-- - Heavy data for Northern routes (many trips, many providers, many stations)
-- - Includes several 10,000 VND trips for payment/booking testing
-- - Image URLs are temporary placeholders
-- =============================================================================

-- 0) Cleanup in FK-safe order
DELETE FROM payment_transactions;
DELETE FROM outbox_events;
DELETE FROM bookings;
DELETE FROM trips;
DELETE FROM buses;
DELETE FROM bus_types;
DELETE FROM providers;
DELETE FROM locations;

ALTER SEQUENCE IF EXISTS locations_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS providers_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS bus_types_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS buses_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS trips_id_seq RESTART WITH 1;

-- 1) Locations (priority North; includes key central/south hubs for long-haul)
INSERT INTO locations (name, city, address, keywords, image_url)
VALUES
  -- Ha Noi
  ('Bến xe Mỹ Đình', 'Hà Nội', '20 Phạm Hùng, Nam Từ Liêm, Hà Nội', 'seed-north-2026,ha-noi,my-dinh', 'https://picsum.photos/seed/bx-my-dinh/1280/720'),
  ('Bến xe Nước Ngầm', 'Hà Nội', 'Km 8 Giải Phóng, Hoàng Mai, Hà Nội', 'seed-north-2026,ha-noi,nuoc-ngam', 'https://picsum.photos/seed/bx-nuoc-ngam/1280/720'),
  ('Bến xe Giáp Bát', 'Hà Nội', 'Km 6 Giải Phóng, Hoàng Mai, Hà Nội', 'seed-north-2026,ha-noi,giap-bat', 'https://picsum.photos/seed/bx-giap-bat/1280/720'),
  ('Bến xe Gia Lâm', 'Hà Nội', 'Ngô Gia Khảm, Long Biên, Hà Nội', 'seed-north-2026,ha-noi,gia-lam', 'https://picsum.photos/seed/bx-gia-lam/1280/720'),
  ('Bến xe Yên Nghĩa', 'Hà Nội', 'QL6, Hà Đông, Hà Nội', 'seed-north-2026,ha-noi,yen-nghia', 'https://picsum.photos/seed/bx-yen-nghia/1280/720'),

  -- North key provinces
  ('Bến xe Sa Pa', 'Lào Cai', 'Điện Biên Phủ, Sa Pa, Lào Cai', 'seed-north-2026,sapa,lao-cai', 'https://picsum.photos/seed/bx-sapa/1280/720'),
  ('Bến xe Trung tâm Lào Cai', 'Lào Cai', 'Trần Phú, TP Lào Cai', 'seed-north-2026,lao-cai', 'https://picsum.photos/seed/bx-lao-cai/1280/720'),
  ('Bến xe Niệm Nghĩa', 'Hải Phòng', '8 Trần Nguyên Hãn, Lê Chân, Hải Phòng', 'seed-north-2026,hai-phong,niem-nghia', 'https://picsum.photos/seed/bx-niem-nghia/1280/720'),
  ('Bến xe Thượng Lý', 'Hải Phòng', 'Hồng Bàng, Hải Phòng', 'seed-north-2026,hai-phong,thuong-ly', 'https://picsum.photos/seed/bx-thuong-ly/1280/720'),
  ('Bến xe Bãi Cháy', 'Quảng Ninh', 'Bãi Cháy, Hạ Long, Quảng Ninh', 'seed-north-2026,quang-ninh,bai-chay', 'https://picsum.photos/seed/bx-bai-chay/1280/720'),
  ('Bến xe Cẩm Phả', 'Quảng Ninh', 'Cẩm Phả, Quảng Ninh', 'seed-north-2026,quang-ninh,cam-pha', 'https://picsum.photos/seed/bx-cam-pha/1280/720'),
  ('Bến xe Móng Cái', 'Quảng Ninh', 'Móng Cái, Quảng Ninh', 'seed-north-2026,quang-ninh,mong-cai', 'https://picsum.photos/seed/bx-mong-cai/1280/720'),
  ('Bến xe Uông Bí', 'Quảng Ninh', 'Uông Bí, Quảng Ninh', 'seed-north-2026,quang-ninh,uong-bi', 'https://picsum.photos/seed/bx-uong-bi/1280/720'),
  ('Bến xe Ninh Bình', 'Ninh Bình', 'Lê Đại Hành, TP Ninh Bình', 'seed-north-2026,ninh-binh', 'https://picsum.photos/seed/bx-ninh-binh/1280/720'),
  ('Bến xe Thanh Hóa', 'Thanh Hóa', 'Đại lộ Lê Lợi, TP Thanh Hóa', 'seed-north-2026,thanh-hoa', 'https://picsum.photos/seed/bx-thanh-hoa/1280/720'),
  ('Bến xe Bắc Vinh', 'Nghệ An', 'Nguyễn Trãi, TP Vinh', 'seed-north-2026,nghe-an,vinh', 'https://picsum.photos/seed/bx-vinh/1280/720'),
  ('Bến xe Thái Nguyên', 'Thái Nguyên', 'CMT8, TP Thái Nguyên', 'seed-north-2026,thai-nguyen', 'https://picsum.photos/seed/bx-thai-nguyen/1280/720'),
  ('Bến xe Hà Giang', 'Hà Giang', 'Nguyễn Trãi, TP Hà Giang', 'seed-north-2026,ha-giang', 'https://picsum.photos/seed/bx-ha-giang/1280/720'),
  ('Bến xe Lạng Sơn', 'Lạng Sơn', 'Lê Lợi, TP Lạng Sơn', 'seed-north-2026,lang-son', 'https://picsum.photos/seed/bx-lang-son/1280/720'),
  ('Bến xe Cao Bằng', 'Cao Bằng', 'Kim Đồng, TP Cao Bằng', 'seed-north-2026,cao-bang', 'https://picsum.photos/seed/bx-cao-bang/1280/720'),
  ('Bến xe Bắc Giang', 'Bắc Giang', 'Xương Giang, TP Bắc Giang', 'seed-north-2026,bac-giang', 'https://picsum.photos/seed/bx-bac-giang/1280/720'),
  ('Bến xe Bắc Ninh', 'Bắc Ninh', 'Lý Thái Tổ, TP Bắc Ninh', 'seed-north-2026,bac-ninh', 'https://picsum.photos/seed/bx-bac-ninh/1280/720'),
  ('Bến xe Nam Định', 'Nam Định', 'Giải Phóng, TP Nam Định', 'seed-north-2026,nam-dinh', 'https://picsum.photos/seed/bx-nam-dinh/1280/720'),
  ('Bến xe Thái Bình', 'Thái Bình', 'Lý Bôn, TP Thái Bình', 'seed-north-2026,thai-binh', 'https://picsum.photos/seed/bx-thai-binh/1280/720'),
  ('Bến xe Việt Trì', 'Phú Thọ', 'Hùng Vương, Việt Trì', 'seed-north-2026,phu-tho,viet-tri', 'https://picsum.photos/seed/bx-viet-tri/1280/720'),
  ('Bến xe Yên Bái', 'Yên Bái', 'Yên Ninh, TP Yên Bái', 'seed-north-2026,yen-bai', 'https://picsum.photos/seed/bx-yen-bai/1280/720'),
  ('Bến xe Hòa Bình', 'Hòa Bình', 'Cù Chính Lan, TP Hòa Bình', 'seed-north-2026,hoa-binh', 'https://picsum.photos/seed/bx-hoa-binh/1280/720'),
  ('Bến xe Sơn La', 'Sơn La', 'Tô Hiệu, TP Sơn La', 'seed-north-2026,son-la', 'https://picsum.photos/seed/bx-son-la/1280/720'),
  ('Bến xe Điện Biên', 'Điện Biên', '7 Tháng 5, Điện Biên Phủ', 'seed-north-2026,dien-bien', 'https://picsum.photos/seed/bx-dien-bien/1280/720'),
  ('Bến xe Hải Dương', 'Hải Dương', 'Thanh Niên, TP Hải Dương', 'seed-north-2026,hai-duong', 'https://picsum.photos/seed/bx-hai-duong/1280/720'),
  ('Bến xe Hưng Yên', 'Hưng Yên', 'Nguyễn Văn Linh, TP Hưng Yên', 'seed-north-2026,hung-yen', 'https://picsum.photos/seed/bx-hung-yen/1280/720'),
  ('Bến xe Tuyên Quang', 'Tuyên Quang', '17/8, TP Tuyên Quang', 'seed-north-2026,tuyen-quang', 'https://picsum.photos/seed/bx-tuyen-quang/1280/720'),
  ('Bến xe Vĩnh Yên', 'Vĩnh Phúc', 'Mê Linh, Vĩnh Yên', 'seed-north-2026,vinh-phuc,vinh-yen', 'https://picsum.photos/seed/bx-vinh-yen/1280/720'),
  ('Bến xe Hà Nam', 'Hà Nam', 'Phủ Lý, Hà Nam', 'seed-north-2026,ha-nam', 'https://picsum.photos/seed/bx-ha-nam/1280/720'),
  ('Bến xe Ninh Hiệp', 'Bắc Ninh', 'Yên Phong, Bắc Ninh', 'seed-north-2026,bac-ninh,ninh-hiep', 'https://picsum.photos/seed/bx-ninh-hiep/1280/720'),
  ('Bến xe Lai Châu', 'Lai Châu', 'Trần Phú, Lai Châu', 'seed-north-2026,lai-chau', 'https://picsum.photos/seed/bx-lai-chau/1280/720'),
  ('Bến xe Bắc Kạn', 'Bắc Kạn', 'Nguyễn Văn Tố, Bắc Kạn', 'seed-north-2026,bac-kan', 'https://picsum.photos/seed/bx-bac-kan/1280/720'),

  -- North-central connectors
  ('Bến xe Hà Tĩnh', 'Hà Tĩnh', 'Trần Phú, TP Hà Tĩnh', 'seed-north-2026,ha-tinh', 'https://picsum.photos/seed/bx-ha-tinh/1280/720'),
  ('Bến xe Đồng Hới', 'Quảng Bình', 'Lý Thường Kiệt, Đồng Hới', 'seed-north-2026,quang-binh,dong-hoi', 'https://picsum.photos/seed/bx-dong-hoi/1280/720'),
  ('Bến xe Đông Hà', 'Quảng Trị', 'Lê Duẩn, Đông Hà', 'seed-north-2026,quang-tri,dong-ha', 'https://picsum.photos/seed/bx-dong-ha/1280/720'),
  ('Bến xe phía Bắc Huế', 'Thừa Thiên Huế', 'Tố Hữu, Huế', 'seed-north-2026,hue', 'https://picsum.photos/seed/bx-hue/1280/720'),

  -- Long-haul hubs
  ('Bến xe Trung tâm Đà Nẵng', 'Đà Nẵng', 'Tôn Đức Thắng, Liên Chiểu', 'seed-north-2026,da-nang', 'https://picsum.photos/seed/bx-da-nang/1280/720'),
  ('Bến xe miền Đông mới', 'TP. Hồ Chí Minh', '501 Hoàng Hữu Nam, TP Thủ Đức', 'seed-north-2026,hcm,mien-dong', 'https://picsum.photos/seed/bx-mien-dong-moi/1280/720');

-- 2) Providers (north-heavy)
INSERT INTO providers (name, hotline, slug, policy_refund, is_active, image_url)
VALUES
  ('Sao Việt', '1900 6746', 'sao-viet', 'Hủy trước 24h hoàn 80%. Hủy trước 6h hoàn 50%.', true, 'https://picsum.photos/seed/provider-sao-viet/900/600'),
  ('Inter Bus Lines', '1900 6294', 'inter-bus-lines', 'Hủy trước 24h hoàn 85%. Hủy trước 6h hoàn 50%.', true, 'https://picsum.photos/seed/provider-inter-bus-lines/900/600'),
  ('Hà Sơn Hải Vân', '1900 6776', 'ha-son-hai-van', 'Hủy trước 24h hoàn 80%. Hủy trước 12h hoàn 50%.', true, 'https://picsum.photos/seed/provider-ha-son-hai-van/900/600'),
  ('Hải Âu', '0225 3846789', 'hai-au', 'Hủy trước 24h hoàn 80%. Hủy trước 6h hoàn 50%.', true, 'https://picsum.photos/seed/provider-hai-au/900/600'),
  ('Hoàng Long', '1900 6772', 'hoang-long', 'Hủy trước 24h hoàn 85%. Hủy trước 6h hoàn 50%.', true, 'https://picsum.photos/seed/provider-hoang-long/900/600'),
  ('Kumho Việt Thanh', '1900 6259', 'kumho-viet-thanh', 'Hủy trước 24h hoàn 80%. Hủy trước 12h hoàn 60%.', true, 'https://picsum.photos/seed/provider-kumho-viet-thanh/900/600'),
  ('Phúc Xuyên', '1900 6799', 'phuc-xuyen', 'Hủy trước 24h hoàn 75%. Hủy trước 6h hoàn 40%.', true, 'https://picsum.photos/seed/provider-phuc-xuyen/900/600'),
  ('Ka Long', '0203 3625555', 'ka-long', 'Hủy trước 24h hoàn 80%. Hủy trước 12h hoàn 60%.', true, 'https://picsum.photos/seed/provider-ka-long/900/600'),
  ('Anh Huy Đất Cảng', '1900 299919', 'anh-huy-dat-cang', 'Hủy trước 24h hoàn 75%. Hủy trước 6h hoàn 40%.', true, 'https://picsum.photos/seed/provider-anh-huy-dat-cang/900/600'),
  ('Duy Khánh Limousine', '1900 266636', 'duy-khanh-limousine', 'Hủy trước 24h hoàn 80%. Hủy trước 6h hoàn 50%.', true, 'https://picsum.photos/seed/provider-duy-khanh/900/600'),
  ('Eco Sapa Limousine', '1900 777722', 'eco-sapa-limousine', 'Hủy trước 24h hoàn 80%. Hủy trước 6h hoàn 40%.', true, 'https://picsum.photos/seed/provider-eco-sapa/900/600'),
  ('Green Bus', '1900 888822', 'green-bus', 'Hủy trước 24h hoàn 70%. Hủy trước 6h hoàn 30%.', true, 'https://picsum.photos/seed/provider-green-bus/900/600'),
  ('Queen Cafe', '0243 8288188', 'queen-cafe', 'Hủy trước 24h hoàn 80%. Hủy trước 12h hoàn 50%.', true, 'https://picsum.photos/seed/provider-queen-cafe/900/600'),
  ('Sapa Express', '024 3921 5615', 'sapa-express', 'Hủy trước 24h hoàn 80%. Hủy trước 6h hoàn 50%.', true, 'https://picsum.photos/seed/provider-sapa-express/900/600'),
  ('Grouptour', '1900 633610', 'grouptour', 'Hủy trước 24h hoàn 75%. Hủy trước 6h hoàn 40%.', true, 'https://picsum.photos/seed/provider-grouptour/900/600'),
  ('Cúc Mừng', '1900 223344', 'cuc-mung', 'Hủy trước 24h hoàn 75%. Hủy trước 6h hoàn 40%.', true, 'https://picsum.photos/seed/provider-cuc-mung/900/600'),
  ('Đức Phúc', '0214 3833333', 'duc-phuc', 'Hủy trước 24h hoàn 75%. Hủy trước 12h hoàn 50%.', true, 'https://picsum.photos/seed/provider-duc-phuc/900/600'),
  ('Bằng Phấn', '1900 5222', 'bang-phan', 'Hủy trước 24h hoàn 75%. Hủy trước 6h hoàn 40%.', true, 'https://picsum.photos/seed/provider-bang-phan/900/600'),
  ('Futa Hà Nội', '1900 6067', 'futa-ha-noi', 'Hủy trước 24h hoàn 80%. Hủy trước 6h hoàn 50%.', true, 'https://picsum.photos/seed/provider-futa-ha-noi/900/600'),
  ('Mai Linh Bắc Bộ', '1900 6789', 'mai-linh-bac-bo', 'Hủy trước 24h hoàn 75%. Hủy trước 6h hoàn 40%.', true, 'https://picsum.photos/seed/provider-mai-linh-bac-bo/900/600');

-- 3) Bus types
INSERT INTO bus_types (name, total_seats, seat_layout)
VALUES
  ('Ghế ngồi 29 chỗ', 29, '{"type":"seater","rows":8,"columns":["A","B","","C","D"],"seats":["A01","B01","C01","D01","A02","B02","C02","D02","A03","B03","C03","D03","A04","B04","C04","D04","A05","B05","C05","D05","A06","B06","C06","D06","A07","B07","C07","D07","A08"]}'::jsonb),
  ('Ghế ngồi 45 chỗ', 45, '{"type":"seater","rows":12,"columns":["A","B","","C","D"],"seats":["A01","B01","C01","D01","A02","B02","C02","D02","A03","B03","C03","D03","A04","B04","C04","D04","A05","B05","C05","D05","A06","B06","C06","D06","A07","B07","C07","D07","A08","B08","C08","D08","A09","B09","C09","D09","A10","B10","C10","D10","A11","B11","C11","D11","A12"]}'::jsonb),
  ('Giường nằm 34 chỗ', 34, '{"type":"sleeper","rows":9,"floors":2,"columns":["A","B","","C","D"],"seats":["A01","B01","C01","D01","A02","B02","C02","D02","A03","B03","C03","D03","A04","B04","C04","D04","A05","B05","C05","D05","A06","B06","C06","D06","A07","B07","C07","D07","A08","B08","C08","D08","A09","B09"]}'::jsonb),
  ('Giường nằm 40 chỗ', 40, '{"type":"sleeper","rows":10,"floors":2,"columns":["A","B","","C","D"],"seats":["A01","B01","C01","D01","A02","B02","C02","D02","A03","B03","C03","D03","A04","B04","C04","D04","A05","B05","C05","D05","A06","B06","C06","D06","A07","B07","C07","D07","A08","B08","C08","D08","A09","B09","C09","D09","A10","B10","C10","D10"]}'::jsonb),
  ('Giường nằm 44 chỗ', 44, '{"type":"sleeper","rows":11,"floors":2,"columns":["A","B","","C","D"],"seats":["A01","B01","C01","D01","A02","B02","C02","D02","A03","B03","C03","D03","A04","B04","C04","D04","A05","B05","C05","D05","A06","B06","C06","D06","A07","B07","C07","D07","A08","B08","C08","D08","A09","B09","C09","D09","A10","B10","C10","D10","A11","B11","C11","D11"]}'::jsonb),
  ('Limousine 22 phòng', 22, '{"type":"limousine","rows":6,"columns":["A","B","","C","D"],"seats":["A01","B01","C01","D01","A02","B02","C02","D02","A03","B03","C03","D03","A04","B04","C04","D04","A05","B05","C05","D05","A06","B06"]}'::jsonb),
  ('Limousine 34 cabin', 34, '{"type":"limousine_cabin","rows":9,"floors":2,"columns":["A","B","","C","D"],"seats":["A01","B01","C01","D01","A02","B02","C02","D02","A03","B03","C03","D03","A04","B04","C04","D04","A05","B05","C05","D05","A06","B06","C06","D06","A07","B07","C07","D07","A08","B08","C08","D08","A09","B09"]}'::jsonb);

-- 4) Buses: 6 buses/provider = 120 buses
INSERT INTO buses (provider_id, bus_type_id, license_plate, status, image_url)
SELECT
  p.id,
  ((g.n + p.id - 1) % 7) + 1 AS bus_type_id,
  lpad((11 + p.id)::text, 2, '0') || 'B-' || lpad((p.id * 17 + g.n)::text, 3, '0') || '.' || lpad(((p.id * 9 + g.n * 7) % 100)::text, 2, '0') AS license_plate,
  'active',
  'https://picsum.photos/seed/bus-' || p.slug || '-' || g.n || '/1280/720'
FROM providers p
CROSS JOIN generate_series(1, 6) AS g(n);

-- 5) 10k test trips (explicit)
INSERT INTO trips (
  provider_id,
  bus_id,
  origin_id,
  destination_id,
  departure_time,
  arrival_time,
  base_price,
  price_modifier,
  is_hot_deal,
  pickup_points,
  dropoff_points,
  available_seats,
  status
)
SELECT
  p.id,
  b.id,
  o.id,
  d.id,
  t.departure_time,
  t.arrival_time,
  10000,
  1.00,
  true,
  jsonb_build_array(jsonb_build_object('name', o.name, 'time', to_char(t.departure_time, 'HH24:MI'), 'surcharge', 0)),
  jsonb_build_array(jsonb_build_object('name', d.name, 'time', to_char(t.arrival_time, 'HH24:MI'), 'surcharge', 0)),
  GREATEST(1, bt.total_seats - 2),
  'scheduled'
FROM (
  VALUES
    ('sao-viet', 'Bến xe Mỹ Đình', 'Bến xe Sa Pa', date_trunc('day', NOW()) + INTERVAL '1 day' + INTERVAL '06:30', date_trunc('day', NOW()) + INTERVAL '1 day' + INTERVAL '12:30'),
    ('inter-bus-lines', 'Bến xe Mỹ Đình', 'Bến xe Sa Pa', date_trunc('day', NOW()) + INTERVAL '1 day' + INTERVAL '21:00', date_trunc('day', NOW()) + INTERVAL '2 day' + INTERVAL '03:00'),
    ('phuc-xuyen', 'Bến xe Mỹ Đình', 'Bến xe Bãi Cháy', date_trunc('day', NOW()) + INTERVAL '2 day' + INTERVAL '07:00', date_trunc('day', NOW()) + INTERVAL '2 day' + INTERVAL '10:30'),
    ('hai-au', 'Bến xe Gia Lâm', 'Bến xe Niệm Nghĩa', date_trunc('day', NOW()) + INTERVAL '2 day' + INTERVAL '08:00', date_trunc('day', NOW()) + INTERVAL '2 day' + INTERVAL '10:15'),
    ('ha-son-hai-van', 'Bến xe Mỹ Đình', 'Bến xe Hà Giang', date_trunc('day', NOW()) + INTERVAL '3 day' + INTERVAL '20:00', date_trunc('day', NOW()) + INTERVAL '4 day' + INTERVAL '02:30'),
    ('duc-phuc', 'Bến xe Mỹ Đình', 'Bến xe Yên Bái', date_trunc('day', NOW()) + INTERVAL '3 day' + INTERVAL '06:30', date_trunc('day', NOW()) + INTERVAL '3 day' + INTERVAL '10:00'),
    ('kumho-viet-thanh', 'Bến xe Nước Ngầm', 'Bến xe Thanh Hóa', date_trunc('day', NOW()) + INTERVAL '4 day' + INTERVAL '09:00', date_trunc('day', NOW()) + INTERVAL '4 day' + INTERVAL '12:00'),
    ('hoang-long', 'Bến xe Nước Ngầm', 'Bến xe Bắc Vinh', date_trunc('day', NOW()) + INTERVAL '4 day' + INTERVAL '21:00', date_trunc('day', NOW()) + INTERVAL '5 day' + INTERVAL '03:00')
) AS t(provider_slug, origin_name, destination_name, departure_time, arrival_time)
JOIN providers p ON p.slug = t.provider_slug
JOIN LATERAL (
  SELECT id, bus_type_id
  FROM buses
  WHERE provider_id = p.id
  ORDER BY id
  LIMIT 1
) b ON true
JOIN locations o ON o.name = t.origin_name
JOIN locations d ON d.name = t.destination_name
JOIN bus_types bt ON bt.id = b.bus_type_id;

-- 6) Bulk trips (Northern heavy, many departures)
WITH
  route_base AS (
    SELECT *
    FROM (
      VALUES
        ('sao-viet', 'Bến xe Mỹ Đình', 'Bến xe Sa Pa', 6, 320000),
        ('inter-bus-lines', 'Bến xe Mỹ Đình', 'Bến xe Sa Pa', 6, 360000),
        ('queen-cafe', 'Bến xe Mỹ Đình', 'Bến xe Sa Pa', 6, 380000),
        ('sapa-express', 'Bến xe Mỹ Đình', 'Bến xe Sa Pa', 6, 390000),
        ('hoang-long', 'Bến xe Mỹ Đình', 'Bến xe Trung tâm Lào Cai', 6, 300000),
        ('green-bus', 'Bến xe Mỹ Đình', 'Bến xe Trung tâm Lào Cai', 6, 310000),
        ('hai-au', 'Bến xe Gia Lâm', 'Bến xe Niệm Nghĩa', 2, 120000),
        ('anh-huy-dat-cang', 'Bến xe Giáp Bát', 'Bến xe Niệm Nghĩa', 2, 110000),
        ('kumho-viet-thanh', 'Bến xe Nước Ngầm', 'Bến xe Niệm Nghĩa', 2, 115000),
        ('phuc-xuyen', 'Bến xe Mỹ Đình', 'Bến xe Bãi Cháy', 4, 170000),
        ('ka-long', 'Bến xe Mỹ Đình', 'Bến xe Bãi Cháy', 4, 160000),
        ('phuc-xuyen', 'Bến xe Mỹ Đình', 'Bến xe Móng Cái', 7, 280000),
        ('ka-long', 'Bến xe Mỹ Đình', 'Bến xe Móng Cái', 7, 270000),
        ('futa-ha-noi', 'Bến xe Giáp Bát', 'Bến xe Ninh Bình', 2, 120000),
        ('mai-linh-bac-bo', 'Bến xe Nước Ngầm', 'Bến xe Ninh Bình', 2, 110000),
        ('hoang-long', 'Bến xe Giáp Bát', 'Bến xe Thanh Hóa', 3, 170000),
        ('inter-bus-lines', 'Bến xe Nước Ngầm', 'Bến xe Thanh Hóa', 3, 160000),
        ('hoang-long', 'Bến xe Nước Ngầm', 'Bến xe Bắc Vinh', 6, 300000),
        ('kumho-viet-thanh', 'Bến xe Nước Ngầm', 'Bến xe Bắc Vinh', 6, 290000),
        ('ha-son-hai-van', 'Bến xe Mỹ Đình', 'Bến xe Hà Giang', 6, 320000),
        ('duc-phuc', 'Bến xe Mỹ Đình', 'Bến xe Hà Giang', 6, 300000),
        ('ha-son-hai-van', 'Bến xe Mỹ Đình', 'Bến xe Sơn La', 7, 300000),
        ('ha-son-hai-van', 'Bến xe Mỹ Đình', 'Bến xe Điện Biên', 11, 420000),
        ('bang-phan', 'Bến xe Mỹ Đình', 'Bến xe Cao Bằng', 8, 330000),
        ('bang-phan', 'Bến xe Mỹ Đình', 'Bến xe Lạng Sơn', 3, 170000),
        ('duc-phuc', 'Bến xe Mỹ Đình', 'Bến xe Yên Bái', 4, 210000),
        ('duc-phuc', 'Bến xe Mỹ Đình', 'Bến xe Lai Châu', 9, 380000),
        ('grouptour', 'Bến xe Mỹ Đình', 'Bến xe Tuyên Quang', 3, 150000),
        ('grouptour', 'Bến xe Mỹ Đình', 'Bến xe Việt Trì', 2, 120000),
        ('cuc-mung', 'Bến xe Mỹ Đình', 'Bến xe Thái Nguyên', 2, 90000),
        ('cuc-mung', 'Bến xe Gia Lâm', 'Bến xe Bắc Giang', 2, 80000),
        ('mai-linh-bac-bo', 'Bến xe Gia Lâm', 'Bến xe Bắc Ninh', 2, 70000),
        ('mai-linh-bac-bo', 'Bến xe Giáp Bát', 'Bến xe Nam Định', 2, 95000),
        ('sao-viet', 'Bến xe Nước Ngầm', 'Bến xe Thái Bình', 2, 100000),
        ('anh-huy-dat-cang', 'Bến xe Gia Lâm', 'Bến xe Hải Dương', 1, 70000),
        ('mai-linh-bac-bo', 'Bến xe Giáp Bát', 'Bến xe Hà Nam', 1, 60000),
        ('grouptour', 'Bến xe Yên Nghĩa', 'Bến xe Hòa Bình', 2, 85000),
        ('phuc-xuyen', 'Bến xe Bãi Cháy', 'Bến xe Mỹ Đình', 4, 170000),
        ('hai-au', 'Bến xe Niệm Nghĩa', 'Bến xe Gia Lâm', 2, 120000),
        ('hoang-long', 'Bến xe Trung tâm Lào Cai', 'Bến xe Mỹ Đình', 6, 300000),
        ('sao-viet', 'Bến xe Sa Pa', 'Bến xe Mỹ Đình', 6, 320000),
        ('ha-son-hai-van', 'Bến xe Hà Giang', 'Bến xe Mỹ Đình', 6, 320000),
        ('bang-phan', 'Bến xe Cao Bằng', 'Bến xe Mỹ Đình', 8, 330000),
        ('hoang-long', 'Bến xe Bắc Vinh', 'Bến xe Nước Ngầm', 6, 300000),
        ('inter-bus-lines', 'Bến xe Thanh Hóa', 'Bến xe Nước Ngầm', 3, 160000),
        ('futa-ha-noi', 'Bến xe Ninh Bình', 'Bến xe Giáp Bát', 2, 120000),

        -- Long-haul additional inventory from North
        ('futa-ha-noi', 'Bến xe Nước Ngầm', 'Bến xe Trung tâm Đà Nẵng', 14, 520000),
        ('inter-bus-lines', 'Bến xe Nước Ngầm', 'Bến xe miền Đông mới', 34, 980000),
        ('hoang-long', 'Bến xe Mỹ Đình', 'Bến xe miền Đông mới', 36, 1050000),
        ('mai-linh-bac-bo', 'Bến xe Giáp Bát', 'Bến xe phía Bắc Huế', 15, 550000),
        ('mai-linh-bac-bo', 'Bến xe phía Bắc Huế', 'Bến xe Giáp Bát', 15, 550000),
        ('futa-ha-noi', 'Bến xe Trung tâm Đà Nẵng', 'Bến xe Nước Ngầm', 14, 520000),
        ('inter-bus-lines', 'Bến xe miền Đông mới', 'Bến xe Nước Ngầm', 34, 980000)
    ) AS t(provider_slug, origin_name, destination_name, duration_hours, base_price)
  ),
  day_slots AS (
    SELECT
      d AS day_no,
      s AS slot_no,
      CASE
        WHEN s = 1 THEN INTERVAL '06:00'
        WHEN s = 2 THEN INTERVAL '13:00'
        ELSE INTERVAL '21:00'
      END AS dep_clock
    FROM generate_series(0, 19) AS d
    CROSS JOIN generate_series(1, 3) AS s
  ),
  expanded AS (
    SELECT
      rb.provider_slug,
      rb.origin_name,
      rb.destination_name,
      rb.duration_hours,
      rb.base_price,
      ds.day_no,
      ds.slot_no,
      (date_trunc('day', NOW()) + (ds.day_no || ' day')::interval + ds.dep_clock)::timestamptz AS departure_time,
      ROW_NUMBER() OVER (ORDER BY rb.provider_slug, rb.origin_name, rb.destination_name, ds.day_no, ds.slot_no) AS seq
    FROM route_base rb
    CROSS JOIN day_slots ds
  ),
  bus_pool AS (
    SELECT
      b.id,
      b.provider_id,
      b.bus_type_id,
      ROW_NUMBER() OVER (PARTITION BY b.provider_id ORDER BY b.id) AS rn,
      COUNT(*) OVER (PARTITION BY b.provider_id) AS cnt
    FROM buses b
  )
INSERT INTO trips (
  provider_id,
  bus_id,
  origin_id,
  destination_id,
  departure_time,
  arrival_time,
  base_price,
  price_modifier,
  is_hot_deal,
  pickup_points,
  dropoff_points,
  available_seats,
  status
)
SELECT
  p.id,
  bp.id AS bus_id,
  o.id,
  d.id,
  e.departure_time,
  e.departure_time + make_interval(hours => e.duration_hours),
  e.base_price::numeric(10, 2),
  CASE
    WHEN e.seq % 11 = 0 THEN 0.85
    WHEN e.seq % 7 = 0 THEN 1.10
    ELSE 1.00
  END::numeric(3, 2),
  (e.seq % 11 = 0),
  jsonb_build_array(jsonb_build_object('name', e.origin_name, 'time', to_char(e.departure_time, 'HH24:MI'), 'surcharge', 0)),
  jsonb_build_array(jsonb_build_object('name', e.destination_name, 'time', to_char(e.departure_time + make_interval(hours => e.duration_hours), 'HH24:MI'), 'surcharge', 0)),
  GREATEST(1, bt.total_seats - (e.seq % 9)),
  'scheduled'
FROM expanded e
JOIN providers p ON p.slug = e.provider_slug
JOIN locations o ON o.name = e.origin_name
JOIN locations d ON d.name = e.destination_name
JOIN bus_pool bp
  ON bp.provider_id = p.id
 AND bp.rn = ((e.seq - 1) % bp.cnt) + 1
JOIN bus_types bt ON bt.id = bp.bus_type_id
WHERE o.id <> d.id;

-- 7) Bookings seed (no users, guest flow only)
WITH trip_pool AS (
  SELECT
    t.id,
    t.departure_time,
    t.base_price,
    t.price_modifier,
    t.pickup_points,
    t.dropoff_points,
    ROW_NUMBER() OVER (ORDER BY t.id) AS rn
  FROM trips t
  ORDER BY t.departure_time, t.id
  LIMIT 900
)
INSERT INTO bookings (
  code,
  trip_id,
  user_id,
  guest_info,
  pickup_info,
  dropoff_info,
  seat_codes,
  total_amount,
  status,
  payment_method,
  expires_at,
  refunded_at,
  refund_reference,
  refund_note,
  created_at,
  updated_at
)
SELECT
  'BK' || lpad(tp.rn::text, 10, '0') AS code,
  tp.id AS trip_id,
  NULL::bigint AS user_id,
  jsonb_build_object(
    'name', 'Guest ' || tp.rn,
    'phone', '09' || lpad((10000000 + tp.rn)::text, 8, '0'),
    'email', 'guest' || tp.rn || '@seed.local'
  ) AS guest_info,
  COALESCE(
    tp.pickup_points -> 0,
    jsonb_build_object('name', 'Điểm đón mặc định', 'time', '00:00', 'surcharge', 0)
  ) AS pickup_info,
  COALESCE(
    tp.dropoff_points -> 0,
    jsonb_build_object('name', 'Điểm trả mặc định', 'time', '00:00', 'surcharge', 0)
  ) AS dropoff_info,
  CASE
    WHEN tp.rn % 3 = 0 THEN ARRAY['A01', 'A02']::text[]
    WHEN tp.rn % 2 = 0 THEN ARRAY['B01']::text[]
    ELSE ARRAY['C01']::text[]
  END AS seat_codes,
  (
    (tp.base_price * tp.price_modifier) *
    CASE WHEN tp.rn % 3 = 0 THEN 2 ELSE 1 END
  )::numeric(10, 2) AS total_amount,
  CASE
    WHEN tp.rn % 10 = 0 THEN 'cancelled'
    WHEN tp.rn % 4 = 0 THEN 'paid'
    ELSE 'pending'
  END AS status,
  CASE
    WHEN tp.rn % 2 = 0 THEN 'vnpay'
    ELSE 'momo'
  END AS payment_method,
  CASE
    WHEN tp.rn % 10 = 0 THEN NULL
    WHEN tp.rn % 4 = 0 THEN NULL
    ELSE tp.departure_time - INTERVAL '2 hours'
  END AS expires_at,
  CASE
    WHEN tp.rn % 10 = 0 THEN NOW() - INTERVAL '1 day'
    ELSE NULL
  END AS refunded_at,
  CASE
    WHEN tp.rn % 10 = 0 THEN 'RF' || lpad(tp.rn::text, 8, '0')
    ELSE NULL
  END AS refund_reference,
  CASE
    WHEN tp.rn % 10 = 0 THEN 'Seed refund test data'
    ELSE NULL
  END AS refund_note,
  NOW() - ((tp.rn % 48) || ' hours')::interval AS created_at,
  NOW() - ((tp.rn % 24) || ' hours')::interval AS updated_at
FROM trip_pool tp;

-- 8) Payment transactions seed
WITH booking_pool AS (
  SELECT
    b.id,
    b.code,
    b.total_amount,
    b.status,
    b.payment_method,
    ROW_NUMBER() OVER (ORDER BY b.id) AS rn
  FROM bookings b
)
INSERT INTO payment_transactions (
  booking_id,
  order_code,
  amount,
  status,
  payment_method,
  webhook_data,
  created_at,
  paid_at,
  refunded_at,
  checkout_url,
  qr_code
)
SELECT
  bp.id,
  'ORD' || lpad(bp.rn::text, 9, '0') AS order_code,
  bp.total_amount,
  CASE
    WHEN bp.status = 'paid' THEN 'success'
    WHEN bp.status = 'cancelled' THEN 'cancelled'
    ELSE 'pending'
  END AS status,
  bp.payment_method,
  jsonb_build_object(
    'booking_code', bp.code,
    'seed', true,
    'source', 'northern-expanded'
  ) AS webhook_data,
  NOW() - ((bp.rn % 72) || ' hours')::interval AS created_at,
  CASE
    WHEN bp.status = 'paid' THEN NOW() - ((bp.rn % 36) || ' hours')::interval
    ELSE NULL
  END AS paid_at,
  CASE
    WHEN bp.status = 'cancelled' THEN NOW() - ((bp.rn % 20) || ' hours')::interval
    ELSE NULL
  END AS refunded_at,
  CASE
    WHEN bp.status = 'pending' THEN 'https://pay.seed.local/checkout/' || bp.code
    ELSE NULL
  END AS checkout_url,
  CASE
    WHEN bp.status = 'pending' THEN 'QR-SEED-' || bp.code
    ELSE NULL
  END AS qr_code
FROM booking_pool bp;

-- 9) Outbox events seed
WITH booking_pool AS (
  SELECT
    b.id,
    b.code,
    b.status,
    b.total_amount,
    ROW_NUMBER() OVER (ORDER BY b.id) AS rn
  FROM bookings b
)
INSERT INTO outbox_events (
  topic,
  payload,
  status,
  retry_count,
  created_at,
  processed_at
)
SELECT
  CASE
    WHEN bp.status = 'paid' THEN 'booking.paid'
    WHEN bp.status = 'cancelled' THEN 'booking.cancelled'
    ELSE 'booking.created'
  END AS topic,
  jsonb_build_object(
    'bookingId', bp.id,
    'bookingCode', bp.code,
    'amount', bp.total_amount,
    'seed', true
  ) AS payload,
  CASE
    WHEN bp.status = 'pending' THEN 'pending'
    ELSE 'processed'
  END AS status,
  CASE
    WHEN bp.status = 'pending' THEN (bp.rn % 3)
    ELSE 0
  END AS retry_count,
  NOW() - ((bp.rn % 96) || ' hours')::interval AS created_at,
  CASE
    WHEN bp.status = 'pending' THEN NULL
    ELSE NOW() - ((bp.rn % 48) || ' hours')::interval
  END AS processed_at
FROM booking_pool bp;

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin

DELETE FROM payment_transactions;
DELETE FROM outbox_events;
DELETE FROM bookings;
DELETE FROM trips;
DELETE FROM buses;
DELETE FROM bus_types;
DELETE FROM providers;
DELETE FROM locations;

-- +goose StatementEnd
