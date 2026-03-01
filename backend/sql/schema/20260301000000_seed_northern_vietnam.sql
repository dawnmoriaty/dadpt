-- +goose Up
-- +goose StatementBegin

-- =============================================================================
-- SEED DATA: Northern Vietnam Bus Network
-- Realistic data based on popular Vietnamese bus operators & routes
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. LOCATIONS (~30 bến xe miền Bắc)
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO locations (name, city, address, keywords) VALUES
-- Hà Nội (5 bến xe chính)
('Bến xe Mỹ Đình',        'Hà Nội',      '20 Phạm Hùng, Nam Từ Liêm, Hà Nội',         'ha noi, my dinh, pham hung, nam tu liem, cau giay'),
('Bến xe Nước Ngầm',      'Hà Nội',      'Km 8 Giải Phóng, Hoàng Mai, Hà Nội',         'ha noi, nuoc ngam, giai phong, hoang mai'),
('Bến xe Giáp Bát',       'Hà Nội',      'Km 6 Giải Phóng, Hoàng Mai, Hà Nội',         'ha noi, giap bat, giai phong, hoang mai'),
('Bến xe Yên Nghĩa',      'Hà Nội',      'Quốc lộ 6, Hà Đông, Hà Nội',                 'ha noi, yen nghia, ha dong, quoc lo 6'),
('Bến xe Gia Lâm',        'Hà Nội',      'Ngô Gia Khảm, Long Biên, Hà Nội',            'ha noi, gia lam, long bien, ngo gia kham'),

-- Lào Cai / Sapa
('Bến xe Lào Cai',        'Lào Cai',     'Đường Trần Phú, TP Lào Cai',                  'lao cai, tran phu'),
('Bến xe Sapa',            'Lào Cai',     'Đường Điện Biên Phủ, TT Sa Pa, Lào Cai',     'sapa, sa pa, lao cai, dien bien phu'),

-- Hải Phòng
('Bến xe Niệm Nghĩa',    'Hải Phòng',   '8 Trần Nguyên Hãn, Lê Chân, Hải Phòng',     'hai phong, niem nghia, le chan, tran nguyen han'),
('Bến xe Lạc Long',       'Hải Phòng',   'Đường 5, An Dương, Hải Phòng',                'hai phong, lac long, an duong, duong 5'),

-- Quảng Ninh
('Bến xe Bãi Cháy',       'Quảng Ninh',  'Hạ Long, Quảng Ninh',                         'quang ninh, bai chay, ha long, vinh ha long'),
('Bến xe Móng Cái',       'Quảng Ninh',  'TP Móng Cái, Quảng Ninh',                     'quang ninh, mong cai, bien gioi, cua khau'),
('Bến xe Uông Bí',        'Quảng Ninh',  'TP Uông Bí, Quảng Ninh',                      'quang ninh, uong bi, yen tu'),

-- Ninh Bình
('Bến xe Ninh Bình',      'Ninh Bình',   'Đường Lê Đại Hành, TP Ninh Bình',            'ninh binh, le dai hanh, trang an, tam coc, bai dinh'),

-- Thanh Hóa
('Bến xe Thanh Hóa',      'Thanh Hóa',   'Đại lộ Lê Lợi, TP Thanh Hóa',               'thanh hoa, le loi, sam son'),

-- Nghệ An
('Bến xe Vinh',            'Nghệ An',     'Đường Lê Lợi, TP Vinh, Nghệ An',            'nghe an, vinh, le loi, cua lo'),

-- Thái Nguyên
('Bến xe Thái Nguyên',    'Thái Nguyên', 'Đường Cách Mạng Tháng 8, TP Thái Nguyên',    'thai nguyen, cach mang thang 8, ho nui coc'),

-- Hà Giang
('Bến xe Hà Giang',       'Hà Giang',    'Đường Nguyễn Trãi, TP Hà Giang',             'ha giang, nguyen trai, dong van, ma pi leng, cao nguyen da'),

-- Lạng Sơn
('Bến xe Lạng Sơn',       'Lạng Sơn',    'Đường Lê Lợi, TP Lạng Sơn',                  'lang son, le loi, dong dang, cua khau'),

-- Cao Bằng
('Bến xe Cao Bằng',       'Cao Bằng',    'Đường Kim Đồng, TP Cao Bằng',                'cao bang, kim dong, ban gioc, thac ban gioc'),

-- Bắc Giang
('Bến xe Bắc Giang',      'Bắc Giang',   'Đường Xương Giang, TP Bắc Giang',            'bac giang, xuong giang'),

-- Nam Định
('Bến xe Nam Định',        'Nam Định',    'Đường Trần Hưng Đạo, TP Nam Định',           'nam dinh, tran hung dao'),

-- Thái Bình
('Bến xe Thái Bình',      'Thái Bình',   'Đường Lý Bôn, TP Thái Bình',                 'thai binh, ly bon'),

-- Phú Thọ
('Bến xe Phú Thọ',        'Phú Thọ',     'Đường Hùng Vương, TP Việt Trì, Phú Thọ',    'phu tho, viet tri, hung vuong, den hung'),

-- Yên Bái
('Bến xe Yên Bái',        'Yên Bái',     'Đường Yên Ninh, TP Yên Bái',                  'yen bai, yen ninh, mu cang chai'),

-- Hòa Bình
('Bến xe Hòa Bình',       'Hòa Bình',    'Đường Cù Chính Lan, TP Hòa Bình',            'hoa binh, cu chinh lan, mai chau'),

-- Sơn La
('Bến xe Sơn La',         'Sơn La',      'Đường Tô Hiệu, TP Sơn La',                   'son la, to hieu, moc chau'),

-- Điện Biên
('Bến xe Điện Biên',      'Điện Biên',   'Đường 7 Tháng 5, TP Điện Biên Phủ',          'dien bien, dien bien phu, 7 thang 5'),

-- Hải Dương
('Bến xe Hải Dương',      'Hải Dương',   'Đường Thanh Niên, TP Hải Dương',              'hai duong, thanh nien'),

-- Hưng Yên
('Bến xe Hưng Yên',       'Hưng Yên',    'Đường Nguyễn Văn Linh, TP Hưng Yên',         'hung yen, nguyen van linh'),

-- Tuyên Quang
('Bến xe Tuyên Quang',    'Tuyên Quang', 'Đường 17 Tháng 8, TP Tuyên Quang',            'tuyen quang, 17 thang 8'),

-- Vĩnh Phúc
('Bến xe Vĩnh Yên',       'Vĩnh Phúc',  'Đường Mê Linh, TP Vĩnh Yên, Vĩnh Phúc',     'vinh phuc, vinh yen, me linh, tam dao');


-- ─────────────────────────────────────────────────────────────────────────────
-- 2. PROVIDERS (12 nhà xe nổi tiếng miền Bắc)
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO providers (name, hotline, slug, policy_refund, is_active) VALUES
('Hoàng Long',          '1900 6772',  'hoang-long',          'Hủy trước 24h hoàn 85%. Hủy trước 6h hoàn 50%.', true),
('Kumho Việt Thanh',    '1900 6259',  'kumho-viet-thanh',    'Hủy trước 24h hoàn 80%. Hủy trước 12h hoàn 60%.', true),
('Sao Việt',            '1900 1177',  'sao-viet',            'Hủy trước 24h hoàn 70%. Không hoàn trong 12h.', true),
('Hải Âu',              '0225 3846789','hai-au',              'Hủy trước 24h hoàn 80%. Hủy trước 6h hoàn 50%.', true),
('Group Tour',          '1900 6446',  'group-tour',          'Hủy trước 48h hoàn 90%. Hủy trước 24h hoàn 70%.', true),
('Cúc Phương Express',  '0229 3848888','cuc-phuong-express', 'Hủy trước 24h hoàn 75%. Không hoàn trong 6h.', true),
('Hà Sơn Hải Vân',     '1900 6228',  'ha-son-hai-van',      'Hủy trước 24h hoàn 80%. Hủy trước 12h hoàn 50%.', true),
('Đức Phúc',            '0214 3833333','duc-phuc',            'Hủy trước 24h hoàn 75%. Không hoàn dưới 12h.', true),
('Camel Travel',        '024 3926 1568','camel-travel',       'Hủy trước 48h hoàn 90%. Hủy trước 24h hoàn 60%.', true),
('Queen Café',          '0243 8275288','queen-cafe',          'Hủy trước 24h hoàn 80%. Hủy trước 12h hoàn 50%.', true),
('Inter Bus Line',      '1900 6886',  'inter-bus-line',      'Hủy trước 24h hoàn 85%. Hủy trước 6h hoàn 50%.', true),
('Ka Long',             '0203 3625555','ka-long',             'Hủy trước 24h hoàn 80%. Hủy trước 12h hoàn 60%.', true);


-- ─────────────────────────────────────────────────────────────────────────────
-- 3. BUS TYPES (7 loại xe phổ biến) với seat_layout JSONB
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO bus_types (name, total_seats, seat_layout) VALUES

-- 1. Ghế ngồi 29 chỗ
('Ghế ngồi 29 chỗ', 29, '{
  "type": "seater",
  "rows": 8,
  "columns": ["A","B","","C","D"],
  "seats": [
    "A01","B01","C01","D01",
    "A02","B02","C02","D02",
    "A03","B03","C03","D03",
    "A04","B04","C04","D04",
    "A05","B05","C05","D05",
    "A06","B06","C06","D06",
    "A07","B07","C07","D07",
    "A08","B08","C08"
  ]
}'::jsonb),

-- 2. Ghế ngồi 45 chỗ
('Ghế ngồi 45 chỗ', 45, '{
  "type": "seater",
  "rows": 12,
  "columns": ["A","B","","C","D"],
  "seats": [
    "A01","B01","C01","D01",
    "A02","B02","C02","D02",
    "A03","B03","C03","D03",
    "A04","B04","C04","D04",
    "A05","B05","C05","D05",
    "A06","B06","C06","D06",
    "A07","B07","C07","D07",
    "A08","B08","C08","D08",
    "A09","B09","C09","D09",
    "A10","B10","C10","D10",
    "A11","B11","C11","D11",
    "A12"
  ]
}'::jsonb),

-- 3. Giường nằm 34 chỗ (2 tầng)
('Giường nằm 34 chỗ', 34, '{
  "type": "sleeper",
  "rows": 9,
  "floors": 2,
  "columns": ["A","B","","C","D"],
  "seats": [
    "A01","B01","C01","D01",
    "A02","B02","C02","D02",
    "A03","B03","C03","D03",
    "A04","B04","C04","D04",
    "A05","B05","C05","D05",
    "A06","B06","C06","D06",
    "A07","B07","C07","D07",
    "A08","B08","C08","D08",
    "A09","B09"
  ]
}'::jsonb),

-- 4. Giường nằm 40 chỗ
('Giường nằm 40 chỗ', 40, '{
  "type": "sleeper",
  "rows": 10,
  "floors": 2,
  "columns": ["A","B","","C","D"],
  "seats": [
    "A01","B01","C01","D01",
    "A02","B02","C02","D02",
    "A03","B03","C03","D03",
    "A04","B04","C04","D04",
    "A05","B05","C05","D05",
    "A06","B06","C06","D06",
    "A07","B07","C07","D07",
    "A08","B08","C08","D08",
    "A09","B09","C09","D09",
    "A10","B10","C10","D10"
  ]
}'::jsonb),

-- 5. Giường nằm 44 chỗ
('Giường nằm 44 chỗ', 44, '{
  "type": "sleeper",
  "rows": 11,
  "floors": 2,
  "columns": ["A","B","","C","D"],
  "seats": [
    "A01","B01","C01","D01",
    "A02","B02","C02","D02",
    "A03","B03","C03","D03",
    "A04","B04","C04","D04",
    "A05","B05","C05","D05",
    "A06","B06","C06","D06",
    "A07","B07","C07","D07",
    "A08","B08","C08","D08",
    "A09","B09","C09","D09",
    "A10","B10","C10","D10",
    "A11","B11","C11","D11"
  ]
}'::jsonb),

-- 6. Limousine 22 phòng (VIP)
('Limousine 22 phòng', 22, '{
  "type": "limousine",
  "rows": 6,
  "columns": ["A","B","","C","D"],
  "seats": [
    "A01","B01","C01","D01",
    "A02","B02","C02","D02",
    "A03","B03","C03","D03",
    "A04","B04","C04","D04",
    "A05","B05","C05","D05",
    "A06","B06"
  ]
}'::jsonb),

-- 7. Limousine 34 cabin
('Limousine 34 cabin', 34, '{
  "type": "limousine_cabin",
  "rows": 9,
  "floors": 2,
  "columns": ["A","B","","C","D"],
  "seats": [
    "A01","B01","C01","D01",
    "A02","B02","C02","D02",
    "A03","B03","C03","D03",
    "A04","B04","C04","D04",
    "A05","B05","C05","D05",
    "A06","B06","C06","D06",
    "A07","B07","C07","D07",
    "A08","B08","C08","D08",
    "A09","B09"
  ]
}'::jsonb);


-- ─────────────────────────────────────────────────────────────────────────────
-- 4. BUSES (~30 xe, phân bổ cho các nhà xe, biển số miền Bắc)
-- ─────────────────────────────────────────────────────────────────────────────
-- Provider IDs: Hoàng Long=1, Kumho=2, Sao Việt=3, Hải Âu=4, Group Tour=5,
--   CúcPhương=6, HàSơn=7, ĐứcPhúc=8, Camel=9, Queen=10, InterBus=11, KaLong=12
-- BusType IDs: Ghế29=1, Ghế45=2, Giường34=3, Giường40=4, Giường44=5, Limo22=6, Limo34=7

INSERT INTO buses (provider_id, bus_type_id, license_plate, status) VALUES
-- Hoàng Long (3 xe)
(1, 4, '29A-123.45', 'active'),
(1, 5, '29A-234.56', 'active'),
(1, 6, '29A-345.67', 'active'),

-- Kumho Việt Thanh (3 xe)
(2, 5, '30A-111.22', 'active'),
(2, 4, '30A-222.33', 'active'),
(2, 2, '30A-333.44', 'active'),

-- Sao Việt (2 xe)
(3, 4, '29B-444.55', 'active'),
(3, 3, '29B-555.66', 'active'),

-- Hải Âu (2 xe)
(4, 2, '15A-666.77', 'active'),
(4, 1, '15A-777.88', 'active'),

-- Group Tour (3 xe)
(5, 6, '29A-888.99', 'active'),
(5, 7, '29A-999.00', 'active'),
(5, 3, '29A-100.11', 'active'),

-- Cúc Phương Express (2 xe)
(6, 4, '35A-200.22', 'active'),
(6, 3, '35A-300.33', 'active'),

-- Hà Sơn Hải Vân (3 xe)
(7, 5, '29C-400.44', 'active'),
(7, 7, '29C-500.55', 'active'),
(7, 4, '29C-600.66', 'active'),

-- Đức Phúc (2 xe)
(8, 4, '20A-700.77', 'active'),
(8, 3, '20A-800.88', 'active'),

-- Camel Travel (2 xe)
(9, 6, '29D-900.99', 'active'),
(9, 7, '29D-011.12', 'active'),

-- Queen Café (2 xe)
(10, 6, '29E-122.23', 'active'),
(10, 3, '29E-233.34', 'active'),

-- Inter Bus Line (3 xe)
(11, 5, '30B-344.45', 'active'),
(11, 4, '30B-455.56', 'active'),
(11, 6, '30B-566.67', 'active'),

-- Ka Long (3 xe)
(12, 2, '14A-677.78', 'active'),
(12, 1, '14A-788.89', 'active'),
(12, 4, '14A-899.90', 'active');


-- ─────────────────────────────────────────────────────────────────────────────
-- 5. TRIPS (~100 chuyến xe, departure_time tương đối từ NOW)
-- Sử dụng ID tương ứng với thứ tự INSERT ở trên
-- Location IDs (theo thứ tự insert):
--   1=Mỹ Đình, 2=Nước Ngầm, 3=Giáp Bát, 4=Yên Nghĩa, 5=Gia Lâm
--   6=Lào Cai, 7=Sapa, 8=Niệm Nghĩa HP, 9=Lạc Long HP
--   10=Bãi Cháy, 11=Móng Cái, 12=Uông Bí
--   13=Ninh Bình, 14=Thanh Hóa, 15=Vinh
--   16=Thái Nguyên, 17=Hà Giang, 18=Lạng Sơn
--   19=Cao Bằng, 20=Bắc Giang, 21=Nam Định, 22=Thái Bình
--   23=Phú Thọ, 24=Yên Bái, 25=Hòa Bình, 26=Sơn La
--   27=Điện Biên, 28=Hải Dương, 29=Hưng Yên, 30=Tuyên Quang, 31=Vĩnh Yên
-- Bus IDs: 1-30 (theo thứ tự insert)
-- ─────────────────────────────────────────────────────────────────────────────

-- === HÀ NỘI (Mỹ Đình) → LÀO CAI / SAPA ===
INSERT INTO trips (provider_id, bus_id, origin_id, destination_id, departure_time, arrival_time, base_price, price_modifier, is_hot_deal, pickup_points, dropoff_points, available_seats, status) VALUES
-- Hoàng Long: Mỹ Đình → Lào Cai
(1, 1,  1, 6,  NOW() + INTERVAL '1 day' + TIME '06:00', NOW() + INTERVAL '1 day' + TIME '12:00', 280000, 1.0, false,
 '[{"name":"VP Hoàng Long Mỹ Đình","time":"06:00","surcharge":0},{"name":"Trung Kính","time":"06:15","surcharge":0}]',
 '[{"name":"Bến xe Lào Cai","time":"12:00","surcharge":0}]', 40, 'scheduled'),

(1, 2,  1, 7,  NOW() + INTERVAL '1 day' + TIME '21:00', NOW() + INTERVAL '2 days' + TIME '03:30', 320000, 1.0, false,
 '[{"name":"VP Hoàng Long Mỹ Đình","time":"21:00","surcharge":0},{"name":"Phạm Văn Đồng","time":"21:20","surcharge":0}]',
 '[{"name":"TT Sa Pa","time":"03:00","surcharge":0},{"name":"Bến xe Sapa","time":"03:30","surcharge":0}]', 44, 'scheduled'),

-- Sao Việt: Mỹ Đình → Sapa (HOT DEAL)
(3, 7,  1, 7,  NOW() + INTERVAL '2 days' + TIME '20:30', NOW() + INTERVAL '3 days' + TIME '03:00', 350000, 0.85, true,
 '[{"name":"VP Sao Việt Mỹ Đình","time":"20:30","surcharge":0},{"name":"Cầu Giấy","time":"20:45","surcharge":0}]',
 '[{"name":"Bến xe Sapa","time":"03:00","surcharge":0}]', 40, 'scheduled'),

-- Group Tour Limousine: Mỹ Đình → Sapa
(5, 11, 1, 7,  NOW() + INTERVAL '1 day' + TIME '07:00', NOW() + INTERVAL '1 day' + TIME '12:30', 450000, 1.0, false,
 '[{"name":"VP Group Tour Mỹ Đình","time":"07:00","surcharge":0}]',
 '[{"name":"TT Sa Pa","time":"12:30","surcharge":0}]', 22, 'scheduled'),

-- Inter Bus Line: Nước Ngầm → Lào Cai
(11, 25, 2, 6,  NOW() + INTERVAL '3 days' + TIME '19:00', NOW() + INTERVAL '4 days' + TIME '01:30', 290000, 1.0, false,
 '[{"name":"Bến xe Nước Ngầm","time":"19:00","surcharge":0}]',
 '[{"name":"Bến xe Lào Cai","time":"01:30","surcharge":0}]', 40, 'scheduled'),

-- Camel Travel Limousine: Mỹ Đình → Sapa
(9, 21, 1, 7,  NOW() + INTERVAL '2 days' + TIME '22:00', NOW() + INTERVAL '3 days' + TIME '04:00', 480000, 1.0, false,
 '[{"name":"VP Camel Travel 38 Trần Phú","time":"22:00","surcharge":0}]',
 '[{"name":"Trung tâm Sapa","time":"04:00","surcharge":0}]', 22, 'scheduled'),

-- Queen Café: Mỹ Đình → Sapa
(10, 23, 1, 7,  NOW() + INTERVAL '4 days' + TIME '22:30', NOW() + INTERVAL '5 days' + TIME '04:30', 420000, 0.90, true,
 '[{"name":"VP Queen Café 86 Lý Thường Kiệt","time":"22:30","surcharge":0}]',
 '[{"name":"Trung tâm Sapa","time":"04:30","surcharge":0}]', 22, 'scheduled'),


-- === HÀ NỘI → HẢI PHÒNG ===
-- Hoàng Long: Gia Lâm → Hải Phòng
(1, 3,  5, 8,  NOW() + INTERVAL '1 day' + TIME '08:00', NOW() + INTERVAL '1 day' + TIME '10:00', 120000, 1.0, false,
 '[{"name":"Bến xe Gia Lâm","time":"08:00","surcharge":0}]',
 '[{"name":"Bến xe Niệm Nghĩa","time":"10:00","surcharge":0}]', 22, 'scheduled'),

-- Kumho: Nước Ngầm → Hải Phòng 
(2, 6,  2, 8,  NOW() + INTERVAL '1 day' + TIME '09:30', NOW() + INTERVAL '1 day' + TIME '11:45', 110000, 1.0, false,
 '[{"name":"Bến xe Nước Ngầm","time":"09:30","surcharge":0},{"name":"Ngã tư Sở","time":"09:50","surcharge":0}]',
 '[{"name":"Bến xe Niệm Nghĩa","time":"11:45","surcharge":0}]', 45, 'scheduled'),

-- Hải Âu: Gia Lâm → Hải Phòng (HOT DEAL)
(4, 9,  5, 8,  NOW() + INTERVAL '2 days' + TIME '07:00', NOW() + INTERVAL '2 days' + TIME '09:15', 100000, 0.90, true,
 '[{"name":"Bến xe Gia Lâm","time":"07:00","surcharge":0}]',
 '[{"name":"Bến xe Niệm Nghĩa","time":"09:15","surcharge":0}]', 45, 'scheduled'),

(4, 10, 5, 8,  NOW() + INTERVAL '3 days' + TIME '13:30', NOW() + INTERVAL '3 days' + TIME '15:30', 95000, 1.0, false,
 '[{"name":"Bến xe Gia Lâm","time":"13:30","surcharge":0}]',
 '[{"name":"Bến xe Niệm Nghĩa","time":"15:30","surcharge":0}]', 29, 'scheduled'),

-- Kumho: Mỹ Đình → Hải Phòng
(2, 5,  1, 8,  NOW() + INTERVAL '2 days' + TIME '14:00', NOW() + INTERVAL '2 days' + TIME '16:15', 120000, 1.0, false,
 '[{"name":"Bến xe Mỹ Đình","time":"14:00","surcharge":0}]',
 '[{"name":"Bến xe Niệm Nghĩa","time":"16:15","surcharge":0}]', 40, 'scheduled'),


-- === HÀ NỘI → QUẢNG NINH (HẠ LONG / MÓNG CÁI) ===
-- Ka Long: Mỹ Đình → Bãi Cháy
(12, 28, 1, 10, NOW() + INTERVAL '1 day' + TIME '06:30', NOW() + INTERVAL '1 day' + TIME '10:00', 150000, 1.0, false,
 '[{"name":"Bến xe Mỹ Đình","time":"06:30","surcharge":0},{"name":"Cổ Nhuế","time":"06:45","surcharge":0}]',
 '[{"name":"Bến xe Bãi Cháy","time":"10:00","surcharge":0}]', 45, 'scheduled'),

(12, 29, 1, 10, NOW() + INTERVAL '2 days' + TIME '08:00', NOW() + INTERVAL '2 days' + TIME '11:30', 130000, 1.0, false,
 '[{"name":"Bến xe Mỹ Đình","time":"08:00","surcharge":0}]',
 '[{"name":"Bến xe Bãi Cháy","time":"11:30","surcharge":0}]', 29, 'scheduled'),

-- Ka Long: Mỹ Đình → Móng Cái (dài)
(12, 30, 1, 11, NOW() + INTERVAL '3 days' + TIME '07:00', NOW() + INTERVAL '3 days' + TIME '14:00', 250000, 1.0, false,
 '[{"name":"Bến xe Mỹ Đình","time":"07:00","surcharge":0}]',
 '[{"name":"Bến xe Móng Cái","time":"14:00","surcharge":0}]', 40, 'scheduled'),

-- Kumho: Gia Lâm → Bãi Cháy
(2, 4,  5, 10, NOW() + INTERVAL '1 day' + TIME '07:30', NOW() + INTERVAL '1 day' + TIME '11:00', 140000, 1.0, false,
 '[{"name":"Bến xe Gia Lâm","time":"07:30","surcharge":0}]',
 '[{"name":"Bến xe Bãi Cháy","time":"11:00","surcharge":0}]', 40, 'scheduled'),

-- Group Tour Limo: Mỹ Đình → Bãi Cháy (HOT DEAL)
(5, 11, 1, 10, NOW() + INTERVAL '4 days' + TIME '08:30', NOW() + INTERVAL '4 days' + TIME '12:00', 350000, 0.80, true,
 '[{"name":"VP Group Tour","time":"08:30","surcharge":0}]',
 '[{"name":"Bãi Cháy","time":"12:00","surcharge":0}]', 22, 'scheduled'),


-- === HÀ NỘI → NINH BÌNH ===
-- Hoàng Long: Giáp Bát → Ninh Bình
(1, 1,  3, 13, NOW() + INTERVAL '1 day' + TIME '08:00', NOW() + INTERVAL '1 day' + TIME '10:00', 100000, 1.0, false,
 '[{"name":"Bến xe Giáp Bát","time":"08:00","surcharge":0}]',
 '[{"name":"Bến xe Ninh Bình","time":"10:00","surcharge":0}]', 40, 'scheduled'),

-- Cúc Phương: Nước Ngầm → Ninh Bình
(6, 14, 2, 13, NOW() + INTERVAL '2 days' + TIME '10:00', NOW() + INTERVAL '2 days' + TIME '12:00', 90000, 1.0, false,
 '[{"name":"Bến xe Nước Ngầm","time":"10:00","surcharge":0}]',
 '[{"name":"Bến xe Ninh Bình","time":"12:00","surcharge":0}]', 40, 'scheduled'),

(6, 15, 2, 13, NOW() + INTERVAL '3 days' + TIME '14:00', NOW() + INTERVAL '3 days' + TIME '16:00', 85000, 0.90, true,
 '[{"name":"Bến xe Nước Ngầm","time":"14:00","surcharge":0}]',
 '[{"name":"Bến xe Ninh Bình","time":"16:00","surcharge":0}]', 34, 'scheduled'),


-- === HÀ NỘI → THANH HÓA ===
-- Hoàng Long: Giáp Bát → Thanh Hóa
(1, 2,  3, 14, NOW() + INTERVAL '1 day' + TIME '07:30', NOW() + INTERVAL '1 day' + TIME '10:30', 150000, 1.0, false,
 '[{"name":"Bến xe Giáp Bát","time":"07:30","surcharge":0}]',
 '[{"name":"Bến xe Thanh Hóa","time":"10:30","surcharge":0}]', 44, 'scheduled'),

-- Inter Bus Line: Nước Ngầm → Thanh Hóa
(11, 26, 2, 14, NOW() + INTERVAL '2 days' + TIME '09:00', NOW() + INTERVAL '2 days' + TIME '12:00', 140000, 1.0, false,
 '[{"name":"Bến xe Nước Ngầm","time":"09:00","surcharge":0}]',
 '[{"name":"Bến xe Thanh Hóa","time":"12:00","surcharge":0}]', 40, 'scheduled'),

(11, 27, 2, 14, NOW() + INTERVAL '4 days' + TIME '16:00', NOW() + INTERVAL '4 days' + TIME '19:00', 160000, 1.15, false,
 '[{"name":"Bến xe Nước Ngầm","time":"16:00","surcharge":0}]',
 '[{"name":"Bến xe Thanh Hóa","time":"19:00","surcharge":0}]', 22, 'scheduled'),


-- === HÀ NỘI → VINH (NGHỆ AN) ===
-- Hoàng Long: Nước Ngầm → Vinh
(1, 1,  2, 15, NOW() + INTERVAL '1 day' + TIME '06:00', NOW() + INTERVAL '1 day' + TIME '11:30', 250000, 1.0, false,
 '[{"name":"Bến xe Nước Ngầm","time":"06:00","surcharge":0}]',
 '[{"name":"Bến xe Vinh","time":"11:30","surcharge":0}]', 40, 'scheduled'),

(1, 2,  2, 15, NOW() + INTERVAL '2 days' + TIME '20:00', NOW() + INTERVAL '3 days' + TIME '02:00', 280000, 1.0, false,
 '[{"name":"Bến xe Nước Ngầm","time":"20:00","surcharge":0}]',
 '[{"name":"Bến xe Vinh","time":"02:00","surcharge":0}]', 44, 'scheduled'),

-- Kumho: Nước Ngầm → Vinh (HOT DEAL)
(2, 5,  2, 15, NOW() + INTERVAL '3 days' + TIME '21:00', NOW() + INTERVAL '4 days' + TIME '03:00', 270000, 0.85, true,
 '[{"name":"Bến xe Nước Ngầm","time":"21:00","surcharge":0}]',
 '[{"name":"Bến xe Vinh","time":"03:00","surcharge":0}]', 40, 'scheduled'),

-- Inter Bus Line: Giáp Bát → Vinh
(11, 25, 3, 15, NOW() + INTERVAL '5 days' + TIME '07:00', NOW() + INTERVAL '5 days' + TIME '12:30', 240000, 1.0, false,
 '[{"name":"Bến xe Giáp Bát","time":"07:00","surcharge":0}]',
 '[{"name":"Bến xe Vinh","time":"12:30","surcharge":0}]', 40, 'scheduled'),


-- === HÀ NỘI → THÁI NGUYÊN ===
-- Kumho: Mỹ Đình → Thái Nguyên
(2, 6,  1, 16, NOW() + INTERVAL '1 day' + TIME '08:00', NOW() + INTERVAL '1 day' + TIME '09:30', 80000, 1.0, false,
 '[{"name":"Bến xe Mỹ Đình","time":"08:00","surcharge":0}]',
 '[{"name":"Bến xe Thái Nguyên","time":"09:30","surcharge":0}]', 45, 'scheduled'),

(2, 4,  1, 16, NOW() + INTERVAL '3 days' + TIME '10:00', NOW() + INTERVAL '3 days' + TIME '11:30', 85000, 1.0, false,
 '[{"name":"Bến xe Mỹ Đình","time":"10:00","surcharge":0}]',
 '[{"name":"Bến xe Thái Nguyên","time":"11:30","surcharge":0}]', 40, 'scheduled'),


-- === HÀ NỘI → HÀ GIANG ===
-- Hà Sơn Hải Vân: Mỹ Đình → Hà Giang
(7, 16, 1, 17, NOW() + INTERVAL '1 day' + TIME '20:00', NOW() + INTERVAL '2 days' + TIME '02:30', 280000, 1.0, false,
 '[{"name":"Bến xe Mỹ Đình","time":"20:00","surcharge":0},{"name":"Phạm Văn Đồng","time":"20:15","surcharge":0}]',
 '[{"name":"Bến xe Hà Giang","time":"02:30","surcharge":0}]', 44, 'scheduled'),

(7, 17, 1, 17, NOW() + INTERVAL '3 days' + TIME '06:00', NOW() + INTERVAL '3 days' + TIME '12:30', 320000, 1.0, false,
 '[{"name":"Bến xe Mỹ Đình","time":"06:00","surcharge":0}]',
 '[{"name":"Bến xe Hà Giang","time":"12:30","surcharge":0}]', 34, 'scheduled'),

-- Đức Phúc: Mỹ Đình → Hà Giang
(8, 19, 1, 17, NOW() + INTERVAL '2 days' + TIME '21:00', NOW() + INTERVAL '3 days' + TIME '03:30', 260000, 0.90, true,
 '[{"name":"VP Đức Phúc Mỹ Đình","time":"21:00","surcharge":0}]',
 '[{"name":"Bến xe Hà Giang","time":"03:30","surcharge":0}]', 40, 'scheduled'),


-- === HÀ NỘI → LẠNG SƠN ===
-- Hoàng Long: Gia Lâm → Lạng Sơn
(1, 1,  5, 18, NOW() + INTERVAL '1 day' + TIME '07:00', NOW() + INTERVAL '1 day' + TIME '10:00', 130000, 1.0, false,
 '[{"name":"Bến xe Gia Lâm","time":"07:00","surcharge":0}]',
 '[{"name":"Bến xe Lạng Sơn","time":"10:00","surcharge":0}]', 40, 'scheduled'),

(1, 2,  5, 18, NOW() + INTERVAL '4 days' + TIME '12:00', NOW() + INTERVAL '4 days' + TIME '15:00', 140000, 1.0, false,
 '[{"name":"Bến xe Gia Lâm","time":"12:00","surcharge":0}]',
 '[{"name":"Bến xe Lạng Sơn","time":"15:00","surcharge":0}]', 44, 'scheduled'),


-- === HÀ NỘI → SƠN LA / ĐIỆN BIÊN ===
-- Hà Sơn Hải Vân: Mỹ Đình → Sơn La
(7, 18, 1, 26, NOW() + INTERVAL '1 day' + TIME '20:00', NOW() + INTERVAL '2 days' + TIME '02:30', 250000, 1.0, false,
 '[{"name":"Bến xe Mỹ Đình","time":"20:00","surcharge":0}]',
 '[{"name":"Bến xe Sơn La","time":"02:30","surcharge":0}]', 40, 'scheduled'),

-- Hà Sơn Hải Vân: Mỹ Đình → Điện Biên
(7, 16, 1, 27, NOW() + INTERVAL '2 days' + TIME '18:00', NOW() + INTERVAL '3 days' + TIME '05:00', 350000, 1.0, false,
 '[{"name":"Bến xe Mỹ Đình","time":"18:00","surcharge":0}]',
 '[{"name":"Bến xe Điện Biên","time":"05:00","surcharge":0}]', 44, 'scheduled'),

-- Đức Phúc: Mỹ Đình → Sơn La (HOT DEAL)
(8, 20, 1, 26, NOW() + INTERVAL '5 days' + TIME '21:00', NOW() + INTERVAL '6 days' + TIME '04:00', 230000, 0.85, true,
 '[{"name":"VP Đức Phúc","time":"21:00","surcharge":0}]',
 '[{"name":"Bến xe Sơn La","time":"04:00","surcharge":0}]', 34, 'scheduled'),


-- === HÀ NỘI → HÒA BÌNH ===
-- Hoàng Long: Yên Nghĩa → Hòa Bình
(1, 3,  4, 25, NOW() + INTERVAL '1 day' + TIME '09:00', NOW() + INTERVAL '1 day' + TIME '11:00', 80000, 1.0, false,
 '[{"name":"Bến xe Yên Nghĩa","time":"09:00","surcharge":0}]',
 '[{"name":"Bến xe Hòa Bình","time":"11:00","surcharge":0}]', 22, 'scheduled'),

(1, 1,  4, 25, NOW() + INTERVAL '2 days' + TIME '14:00', NOW() + INTERVAL '2 days' + TIME '16:00', 75000, 1.0, false,
 '[{"name":"Bến xe Yên Nghĩa","time":"14:00","surcharge":0}]',
 '[{"name":"Bến xe Hòa Bình","time":"16:00","surcharge":0}]', 40, 'scheduled'),


-- === HÀ NỘI → NAM ĐỊNH ===
-- Sao Việt: Giáp Bát → Nam Định
(3, 7,  3, 21, NOW() + INTERVAL '1 day' + TIME '08:30', NOW() + INTERVAL '1 day' + TIME '10:15', 90000, 1.0, false,
 '[{"name":"Bến xe Giáp Bát","time":"08:30","surcharge":0}]',
 '[{"name":"Bến xe Nam Định","time":"10:15","surcharge":0}]', 40, 'scheduled'),

(3, 8,  3, 21, NOW() + INTERVAL '3 days' + TIME '15:00', NOW() + INTERVAL '3 days' + TIME '16:45', 85000, 1.0, false,
 '[{"name":"Bến xe Giáp Bát","time":"15:00","surcharge":0}]',
 '[{"name":"Bến xe Nam Định","time":"16:45","surcharge":0}]', 34, 'scheduled'),


-- === HÀ NỘI → THÁI BÌNH ===
-- Sao Việt: Nước Ngầm → Thái Bình
(3, 7,  2, 22, NOW() + INTERVAL '2 days' + TIME '07:00', NOW() + INTERVAL '2 days' + TIME '09:00', 95000, 1.0, false,
 '[{"name":"Bến xe Nước Ngầm","time":"07:00","surcharge":0}]',
 '[{"name":"Bến xe Thái Bình","time":"09:00","surcharge":0}]', 40, 'scheduled'),


-- === HÀ NỘI → BẮC GIANG ===
-- Kumho: Gia Lâm → Bắc Giang
(2, 6,  5, 20, NOW() + INTERVAL '1 day' + TIME '09:00', NOW() + INTERVAL '1 day' + TIME '10:15', 65000, 1.0, false,
 '[{"name":"Bến xe Gia Lâm","time":"09:00","surcharge":0}]',
 '[{"name":"Bến xe Bắc Giang","time":"10:15","surcharge":0}]', 45, 'scheduled'),


-- === HÀ NỘI → PHÚ THỌ ===
-- Hoàng Long: Mỹ Đình → Phú Thọ
(1, 1,  1, 23, NOW() + INTERVAL '1 day' + TIME '08:00', NOW() + INTERVAL '1 day' + TIME '10:00', 85000, 1.0, false,
 '[{"name":"Bến xe Mỹ Đình","time":"08:00","surcharge":0}]',
 '[{"name":"Bến xe Phú Thọ","time":"10:00","surcharge":0}]', 40, 'scheduled'),


-- === HÀ NỘI → YÊN BÁI ===
-- Đức Phúc: Mỹ Đình → Yên Bái
(8, 19, 1, 24, NOW() + INTERVAL '2 days' + TIME '07:00', NOW() + INTERVAL '2 days' + TIME '10:30', 150000, 1.0, false,
 '[{"name":"Bến xe Mỹ Đình","time":"07:00","surcharge":0}]',
 '[{"name":"Bến xe Yên Bái","time":"10:30","surcharge":0}]', 40, 'scheduled'),


-- === HÀ NỘI → CAO BẰNG ===
-- Hà Sơn Hải Vân: Mỹ Đình → Cao Bằng
(7, 16, 1, 19, NOW() + INTERVAL '3 days' + TIME '20:00', NOW() + INTERVAL '4 days' + TIME '04:30', 280000, 1.0, false,
 '[{"name":"Bến xe Mỹ Đình","time":"20:00","surcharge":0}]',
 '[{"name":"Bến xe Cao Bằng","time":"04:30","surcharge":0}]', 44, 'scheduled'),


-- === HÀ NỘI → TUYÊN QUANG ===
-- Group Tour: Mỹ Đình → Tuyên Quang
(5, 13, 1, 30, NOW() + INTERVAL '2 days' + TIME '06:30', NOW() + INTERVAL '2 days' + TIME '09:30', 120000, 1.0, false,
 '[{"name":"Bến xe Mỹ Đình","time":"06:30","surcharge":0}]',
 '[{"name":"Bến xe Tuyên Quang","time":"09:30","surcharge":0}]', 34, 'scheduled'),


-- === HÀ NỘI → HẢI DƯƠNG ===
-- Kumho: Gia Lâm → Hải Dương
(2, 6,  5, 28, NOW() + INTERVAL '1 day' + TIME '10:00', NOW() + INTERVAL '1 day' + TIME '11:00', 60000, 1.0, false,
 '[{"name":"Bến xe Gia Lâm","time":"10:00","surcharge":0}]',
 '[{"name":"Bến xe Hải Dương","time":"11:00","surcharge":0}]', 45, 'scheduled'),


-- === HÀ NỘI → VĨNH PHÚC ===
-- Hoàng Long: Mỹ Đình → Vĩnh Yên
(1, 3,  1, 31, NOW() + INTERVAL '1 day' + TIME '08:30', NOW() + INTERVAL '1 day' + TIME '09:45', 55000, 1.0, false,
 '[{"name":"Bến xe Mỹ Đình","time":"08:30","surcharge":0}]',
 '[{"name":"Bến xe Vĩnh Yên","time":"09:45","surcharge":0}]', 22, 'scheduled'),


-- ═══════════════════════════════════════════════════════════════════════════
-- CHIỀU NGƯỢC LẠI (Return trips) — phổ biến nhất
-- ═══════════════════════════════════════════════════════════════════════════

-- === SAPA / LÀO CAI → HÀ NỘI ===
(1, 1,  6, 1,  NOW() + INTERVAL '2 days' + TIME '06:00', NOW() + INTERVAL '2 days' + TIME '12:00', 280000, 1.0, false,
 '[{"name":"Bến xe Lào Cai","time":"06:00","surcharge":0}]',
 '[{"name":"Bến xe Mỹ Đình","time":"12:00","surcharge":0}]', 40, 'scheduled'),

(3, 8,  7, 1,  NOW() + INTERVAL '2 days' + TIME '20:00', NOW() + INTERVAL '3 days' + TIME '02:30', 350000, 1.0, false,
 '[{"name":"Bến xe Sapa","time":"20:00","surcharge":0}]',
 '[{"name":"Bến xe Mỹ Đình","time":"02:30","surcharge":0}]', 34, 'scheduled'),

(9, 22, 7, 1,  NOW() + INTERVAL '3 days' + TIME '19:00', NOW() + INTERVAL '4 days' + TIME '01:00', 480000, 1.0, false,
 '[{"name":"Trung tâm Sapa","time":"19:00","surcharge":0}]',
 '[{"name":"VP Camel Travel Hà Nội","time":"01:00","surcharge":0}]', 34, 'scheduled'),

(5, 12, 7, 1,  NOW() + INTERVAL '5 days' + TIME '14:00', NOW() + INTERVAL '5 days' + TIME '19:30', 450000, 0.85, true,
 '[{"name":"Trung tâm Sapa","time":"14:00","surcharge":0}]',
 '[{"name":"Bến xe Mỹ Đình","time":"19:30","surcharge":0}]', 34, 'scheduled'),


-- === HẢI PHÒNG → HÀ NỘI ===
(4, 9,  8, 5,  NOW() + INTERVAL '1 day' + TIME '14:00', NOW() + INTERVAL '1 day' + TIME '16:00', 100000, 1.0, false,
 '[{"name":"Bến xe Niệm Nghĩa","time":"14:00","surcharge":0}]',
 '[{"name":"Bến xe Gia Lâm","time":"16:00","surcharge":0}]', 45, 'scheduled'),

(2, 5,  8, 1,  NOW() + INTERVAL '3 days' + TIME '17:00', NOW() + INTERVAL '3 days' + TIME '19:15', 120000, 1.0, false,
 '[{"name":"Bến xe Niệm Nghĩa","time":"17:00","surcharge":0}]',
 '[{"name":"Bến xe Mỹ Đình","time":"19:15","surcharge":0}]', 40, 'scheduled'),


-- === QUẢNG NINH → HÀ NỘI ===
(12, 28, 10, 1, NOW() + INTERVAL '2 days' + TIME '13:00', NOW() + INTERVAL '2 days' + TIME '16:30', 150000, 1.0, false,
 '[{"name":"Bến xe Bãi Cháy","time":"13:00","surcharge":0}]',
 '[{"name":"Bến xe Mỹ Đình","time":"16:30","surcharge":0}]', 45, 'scheduled'),


-- === NINH BÌNH → HÀ NỘI ===
(6, 14, 13, 2, NOW() + INTERVAL '2 days' + TIME '15:00', NOW() + INTERVAL '2 days' + TIME '17:00', 90000, 1.0, false,
 '[{"name":"Bến xe Ninh Bình","time":"15:00","surcharge":0}]',
 '[{"name":"Bến xe Nước Ngầm","time":"17:00","surcharge":0}]', 40, 'scheduled'),


-- === VINH → HÀ NỘI ===
(1, 2,  15, 2, NOW() + INTERVAL '3 days' + TIME '20:00', NOW() + INTERVAL '4 days' + TIME '02:00', 250000, 1.0, false,
 '[{"name":"Bến xe Vinh","time":"20:00","surcharge":0}]',
 '[{"name":"Bến xe Nước Ngầm","time":"02:00","surcharge":0}]', 44, 'scheduled'),

(11, 26, 15, 3, NOW() + INTERVAL '4 days' + TIME '06:00', NOW() + INTERVAL '4 days' + TIME '11:30', 240000, 1.0, false,
 '[{"name":"Bến xe Vinh","time":"06:00","surcharge":0}]',
 '[{"name":"Bến xe Giáp Bát","time":"11:30","surcharge":0}]', 40, 'scheduled'),


-- === HÀ GIANG → HÀ NỘI ===
(7, 17, 17, 1, NOW() + INTERVAL '4 days' + TIME '05:30', NOW() + INTERVAL '4 days' + TIME '12:00', 280000, 1.0, false,
 '[{"name":"Bến xe Hà Giang","time":"05:30","surcharge":0}]',
 '[{"name":"Bến xe Mỹ Đình","time":"12:00","surcharge":0}]', 34, 'scheduled'),

(8, 20, 17, 1, NOW() + INTERVAL '5 days' + TIME '20:00', NOW() + INTERVAL '6 days' + TIME '02:30', 260000, 1.0, false,
 '[{"name":"Bến xe Hà Giang","time":"20:00","surcharge":0}]',
 '[{"name":"Bến xe Mỹ Đình","time":"02:30","surcharge":0}]', 34, 'scheduled'),


-- === SƠN LA → HÀ NỘI ===
(7, 18, 26, 1, NOW() + INTERVAL '3 days' + TIME '19:00', NOW() + INTERVAL '4 days' + TIME '02:00', 250000, 1.0, false,
 '[{"name":"Bến xe Sơn La","time":"19:00","surcharge":0}]',
 '[{"name":"Bến xe Mỹ Đình","time":"02:00","surcharge":0}]', 40, 'scheduled'),


-- ═══════════════════════════════════════════════════════════════════════════
-- THÊM TRIPS NHIỀU NGÀY (ngày 6-15) để tổng ~100 trips
-- ═══════════════════════════════════════════════════════════════════════════

-- Mỹ Đình → Sapa (nhiều ngày)
(1, 1,  1, 7,  NOW() + INTERVAL '6 days' + TIME '06:30', NOW() + INTERVAL '6 days' + TIME '12:30', 300000, 1.0, false,
 '[{"name":"Bến xe Mỹ Đình","time":"06:30","surcharge":0}]',
 '[{"name":"Bến xe Sapa","time":"12:30","surcharge":0}]', 40, 'scheduled'),

(1, 2,  1, 7,  NOW() + INTERVAL '7 days' + TIME '21:00', NOW() + INTERVAL '8 days' + TIME '03:30', 320000, 1.10, false,
 '[{"name":"Bến xe Mỹ Đình","time":"21:00","surcharge":0}]',
 '[{"name":"Bến xe Sapa","time":"03:30","surcharge":0}]', 44, 'scheduled'),

(10, 23, 1, 7, NOW() + INTERVAL '8 days' + TIME '22:00', NOW() + INTERVAL '9 days' + TIME '04:00', 400000, 1.0, false,
 '[{"name":"VP Queen Café","time":"22:00","surcharge":0}]',
 '[{"name":"Trung tâm Sapa","time":"04:00","surcharge":0}]', 22, 'scheduled'),

(9, 21, 1, 7,  NOW() + INTERVAL '9 days' + TIME '22:00', NOW() + INTERVAL '10 days' + TIME '04:00', 480000, 0.90, true,
 '[{"name":"VP Camel Travel","time":"22:00","surcharge":0}]',
 '[{"name":"Trung tâm Sapa","time":"04:00","surcharge":0}]', 22, 'scheduled'),

-- Mỹ Đình → Hải Phòng (nhiều ngày)
(4, 9,  1, 8,  NOW() + INTERVAL '6 days' + TIME '07:00', NOW() + INTERVAL '6 days' + TIME '09:15', 110000, 1.0, false,
 '[{"name":"Bến xe Mỹ Đình","time":"07:00","surcharge":0}]',
 '[{"name":"Bến xe Niệm Nghĩa","time":"09:15","surcharge":0}]', 45, 'scheduled'),

(2, 4,  1, 8,  NOW() + INTERVAL '7 days' + TIME '10:00', NOW() + INTERVAL '7 days' + TIME '12:15', 115000, 1.0, false,
 '[{"name":"Bến xe Mỹ Đình","time":"10:00","surcharge":0}]',
 '[{"name":"Bến xe Niệm Nghĩa","time":"12:15","surcharge":0}]', 40, 'scheduled'),

(4, 10, 5, 8,  NOW() + INTERVAL '8 days' + TIME '13:00', NOW() + INTERVAL '8 days' + TIME '15:00', 95000, 0.85, true,
 '[{"name":"Bến xe Gia Lâm","time":"13:00","surcharge":0}]',
 '[{"name":"Bến xe Niệm Nghĩa","time":"15:00","surcharge":0}]', 29, 'scheduled'),

-- Mỹ Đình → Hạ Long (nhiều ngày)
(12, 28, 1, 10, NOW() + INTERVAL '6 days' + TIME '06:30', NOW() + INTERVAL '6 days' + TIME '10:00', 150000, 1.0, false,
 '[{"name":"Bến xe Mỹ Đình","time":"06:30","surcharge":0}]',
 '[{"name":"Bến xe Bãi Cháy","time":"10:00","surcharge":0}]', 45, 'scheduled'),

(12, 30, 1, 10, NOW() + INTERVAL '7 days' + TIME '08:30', NOW() + INTERVAL '7 days' + TIME '12:00', 160000, 1.0, false,
 '[{"name":"Bến xe Mỹ Đình","time":"08:30","surcharge":0}]',
 '[{"name":"Bến xe Bãi Cháy","time":"12:00","surcharge":0}]', 40, 'scheduled'),

-- Giáp Bát → Vinh (nhiều ngày)
(11, 25, 3, 15, NOW() + INTERVAL '8 days' + TIME '07:00', NOW() + INTERVAL '8 days' + TIME '12:30', 240000, 1.0, false,
 '[{"name":"Bến xe Giáp Bát","time":"07:00","surcharge":0}]',
 '[{"name":"Bến xe Vinh","time":"12:30","surcharge":0}]', 40, 'scheduled'),

(1, 1,  2, 15, NOW() + INTERVAL '10 days' + TIME '20:00', NOW() + INTERVAL '11 days' + TIME '02:00', 260000, 1.0, false,
 '[{"name":"Bến xe Nước Ngầm","time":"20:00","surcharge":0}]',
 '[{"name":"Bến xe Vinh","time":"02:00","surcharge":0}]', 40, 'scheduled'),

-- Giáp Bát → Thanh Hóa (nhiều ngày)  
(1, 2,  3, 14, NOW() + INTERVAL '7 days' + TIME '07:30', NOW() + INTERVAL '7 days' + TIME '10:30', 150000, 1.0, false,
 '[{"name":"Bến xe Giáp Bát","time":"07:30","surcharge":0}]',
 '[{"name":"Bến xe Thanh Hóa","time":"10:30","surcharge":0}]', 44, 'scheduled'),

(11, 26, 3, 14, NOW() + INTERVAL '9 days' + TIME '09:00', NOW() + INTERVAL '9 days' + TIME '12:00', 140000, 1.0, false,
 '[{"name":"Bến xe Giáp Bát","time":"09:00","surcharge":0}]',
 '[{"name":"Bến xe Thanh Hóa","time":"12:00","surcharge":0}]', 40, 'scheduled'),

-- Mỹ Đình → Hà Giang (ngày 8-12)
(7, 16, 1, 17, NOW() + INTERVAL '8 days' + TIME '20:00', NOW() + INTERVAL '9 days' + TIME '02:30', 280000, 1.0, false,
 '[{"name":"Bến xe Mỹ Đình","time":"20:00","surcharge":0}]',
 '[{"name":"Bến xe Hà Giang","time":"02:30","surcharge":0}]', 44, 'scheduled'),

(8, 19, 1, 17, NOW() + INTERVAL '10 days' + TIME '06:00', NOW() + INTERVAL '10 days' + TIME '12:30', 270000, 0.90, true,
 '[{"name":"VP Đức Phúc","time":"06:00","surcharge":0}]',
 '[{"name":"Bến xe Hà Giang","time":"12:30","surcharge":0}]', 40, 'scheduled'),

-- Mỹ Đình → Sơn La (ngày 7-12)
(7, 18, 1, 26, NOW() + INTERVAL '7 days' + TIME '20:00', NOW() + INTERVAL '8 days' + TIME '02:30', 250000, 1.0, false,
 '[{"name":"Bến xe Mỹ Đình","time":"20:00","surcharge":0}]',
 '[{"name":"Bến xe Sơn La","time":"02:30","surcharge":0}]', 40, 'scheduled'),

(7, 16, 1, 27, NOW() + INTERVAL '10 days' + TIME '18:00', NOW() + INTERVAL '11 days' + TIME '05:00', 350000, 1.0, false,
 '[{"name":"Bến xe Mỹ Đình","time":"18:00","surcharge":0}]',
 '[{"name":"Bến xe Điện Biên","time":"05:00","surcharge":0}]', 44, 'scheduled'),

-- Giáp Bát → Ninh Bình (ngày 6-10)
(6, 14, 2, 13, NOW() + INTERVAL '6 days' + TIME '10:00', NOW() + INTERVAL '6 days' + TIME '12:00', 90000, 1.0, false,
 '[{"name":"Bến xe Nước Ngầm","time":"10:00","surcharge":0}]',
 '[{"name":"Bến xe Ninh Bình","time":"12:00","surcharge":0}]', 40, 'scheduled'),

(6, 15, 2, 13, NOW() + INTERVAL '8 days' + TIME '07:00', NOW() + INTERVAL '8 days' + TIME '09:00', 85000, 1.0, false,
 '[{"name":"Bến xe Nước Ngầm","time":"07:00","surcharge":0}]',
 '[{"name":"Bến xe Ninh Bình","time":"09:00","surcharge":0}]', 34, 'scheduled'),

-- Return: Sapa → Mỹ Đình (ngày 6-12)
(1, 1,  7, 1,  NOW() + INTERVAL '7 days' + TIME '14:00', NOW() + INTERVAL '7 days' + TIME '20:00', 300000, 1.0, false,
 '[{"name":"Bến xe Sapa","time":"14:00","surcharge":0}]',
 '[{"name":"Bến xe Mỹ Đình","time":"20:00","surcharge":0}]', 40, 'scheduled'),

(10, 24, 7, 1, NOW() + INTERVAL '9 days' + TIME '20:00', NOW() + INTERVAL '10 days' + TIME '02:30', 420000, 1.0, false,
 '[{"name":"Trung tâm Sapa","time":"20:00","surcharge":0}]',
 '[{"name":"VP Queen Café Hà Nội","time":"02:30","surcharge":0}]', 34, 'scheduled'),

-- Return: Hải Phòng → Gia Lâm (ngày 7-10)
(4, 9,  8, 5,  NOW() + INTERVAL '7 days' + TIME '14:00', NOW() + INTERVAL '7 days' + TIME '16:00', 100000, 1.0, false,
 '[{"name":"Bến xe Niệm Nghĩa","time":"14:00","surcharge":0}]',
 '[{"name":"Bến xe Gia Lâm","time":"16:00","surcharge":0}]', 45, 'scheduled'),

-- Return: Hạ Long → Mỹ Đình (ngày 7-10)
(12, 28, 10, 1, NOW() + INTERVAL '7 days' + TIME '13:00', NOW() + INTERVAL '7 days' + TIME '16:30', 150000, 1.0, false,
 '[{"name":"Bến xe Bãi Cháy","time":"13:00","surcharge":0}]',
 '[{"name":"Bến xe Mỹ Đình","time":"16:30","surcharge":0}]', 45, 'scheduled'),

-- Thêm vài chuyến cuối tuần đa dạng (ngày 12-15)
(5, 11, 1, 7,  NOW() + INTERVAL '12 days' + TIME '07:00', NOW() + INTERVAL '12 days' + TIME '12:30', 450000, 1.0, false,
 '[{"name":"VP Group Tour","time":"07:00","surcharge":0}]',
 '[{"name":"Trung tâm Sapa","time":"12:30","surcharge":0}]', 22, 'scheduled'),

(5, 12, 1, 10, NOW() + INTERVAL '12 days' + TIME '08:00', NOW() + INTERVAL '12 days' + TIME '11:30', 380000, 0.85, true,
 '[{"name":"VP Group Tour","time":"08:00","surcharge":0}]',
 '[{"name":"Bãi Cháy","time":"11:30","surcharge":0}]', 34, 'scheduled'),

(2, 5,  1, 15, NOW() + INTERVAL '14 days' + TIME '21:00', NOW() + INTERVAL '15 days' + TIME '03:00', 270000, 1.0, false,
 '[{"name":"Bến xe Mỹ Đình","time":"21:00","surcharge":0}]',
 '[{"name":"Bến xe Vinh","time":"03:00","surcharge":0}]', 40, 'scheduled'),

(7, 16, 1, 17, NOW() + INTERVAL '14 days' + TIME '20:00', NOW() + INTERVAL '15 days' + TIME '02:30', 290000, 1.15, false,
 '[{"name":"Bến xe Mỹ Đình","time":"20:00","surcharge":0}]',
 '[{"name":"Bến xe Hà Giang","time":"02:30","surcharge":0}]', 44, 'scheduled'),

(8, 20, 1, 26, NOW() + INTERVAL '13 days' + TIME '21:00', NOW() + INTERVAL '14 days' + TIME '04:00', 240000, 1.0, false,
 '[{"name":"VP Đức Phúc","time":"21:00","surcharge":0}]',
 '[{"name":"Bến xe Sơn La","time":"04:00","surcharge":0}]', 34, 'scheduled');


-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin

-- Delete in reverse order to respect FK constraints
DELETE FROM trips WHERE id IN (SELECT id FROM trips ORDER BY id DESC);
DELETE FROM buses;
DELETE FROM bus_types;
DELETE FROM providers;
DELETE FROM locations;

-- +goose StatementEnd
