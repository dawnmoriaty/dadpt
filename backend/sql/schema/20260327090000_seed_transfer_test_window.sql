-- +goose Up
-- +goose StatementBegin

-- Seed dataset for transfer-payment testing window (2026-03-27 -> 2026-04-11)
-- Includes: locations, providers, bus types, buses, and many trips.
-- 4 trips are priced at 10,000 VND for bank transfer testing.

-- 1) Locations with images
INSERT INTO locations (name, city, address, keywords, image_url)
VALUES
  (
    'BX My Dinh Seed',
    'Ha Noi',
    '20 Pham Hung, Nam Tu Liem, Ha Noi',
    'seed-transfer-2026,my-dinh,ha-noi',
    'https://picsum.photos/seed/seed-mydinh/1280/720'
  ),
  (
    'BX Nuoc Ngam Seed',
    'Ha Noi',
    'Km 8 Giai Phong, Hoang Mai, Ha Noi',
    'seed-transfer-2026,nuoc-ngam,ha-noi',
    'https://picsum.photos/seed/seed-nuocngam/1280/720'
  ),
  (
    'BX Niem Nghia Seed',
    'Hai Phong',
    '8 Tran Nguyen Han, Le Chan, Hai Phong',
    'seed-transfer-2026,niem-nghia,hai-phong',
    'https://picsum.photos/seed/seed-niemnghia/1280/720'
  ),
  (
    'BX Ninh Binh Seed',
    'Ninh Binh',
    'Duong Le Dai Hanh, TP Ninh Binh',
    'seed-transfer-2026,ninh-binh',
    'https://picsum.photos/seed/seed-ninhbinh/1280/720'
  ),
  (
    'BX Bai Chay Seed',
    'Quang Ninh',
    'Ha Long, Quang Ninh',
    'seed-transfer-2026,bai-chay,ha-long',
    'https://picsum.photos/seed/seed-baichay/1280/720'
  ),
  (
    'BX Giap Bat Seed',
    'Ha Noi',
    'Km 6 Giai Phong, Hoang Mai, Ha Noi',
    'seed-transfer-2026,giap-bat,ha-noi',
    'https://picsum.photos/seed/seed-giapbat/1280/720'
  )
ON CONFLICT DO NOTHING;

-- 2) Providers with images
INSERT INTO providers (name, hotline, slug, policy_refund, is_active, image_url)
VALUES
  (
    'Seed Transfer Express',
    '1900 1027',
    'seed-transfer-express',
    'Cancel before 12h: 70% refund. Cancel before 3h: 30% refund.',
    true,
    'https://picsum.photos/seed/provider-transfer-express/900/600'
  ),
  (
    'Seed Transfer Limousine',
    '1900 0411',
    'seed-transfer-limousine',
    'Cancel before 24h: 80% refund. Cancel before 6h: 40% refund.',
    true,
    'https://picsum.photos/seed/provider-transfer-limo/900/600'
  )
ON CONFLICT (slug) DO NOTHING;

-- 3) Bus types
INSERT INTO bus_types (name, total_seats, seat_layout)
VALUES
  (
    'Seed Sleeper 34',
    34,
    '{
      "type": "sleeper",
      "rows": 9,
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
    }'::jsonb
  ),
  (
    'Seed Limousine 22',
    22,
    '{
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
    }'::jsonb
  )
ON CONFLICT DO NOTHING;

-- 4) Buses with images
INSERT INTO buses (provider_id, bus_type_id, license_plate, status, image_url)
SELECT p.id, bt.id, s.license_plate, 'active', s.image_url
FROM (
  VALUES
    ('seed-transfer-express', 'Seed Sleeper 34', '30S-102.27', 'https://picsum.photos/seed/bus-10227/1280/720'),
    ('seed-transfer-express', 'Seed Limousine 22', '30S-204.11', 'https://picsum.photos/seed/bus-20411/1280/720'),
    ('seed-transfer-limousine', 'Seed Sleeper 34', '15S-310.27', 'https://picsum.photos/seed/bus-31027/1280/720'),
    ('seed-transfer-limousine', 'Seed Limousine 22', '14S-411.27', 'https://picsum.photos/seed/bus-41127/1280/720')
) AS s(provider_slug, bus_type_name, license_plate, image_url)
JOIN providers p ON p.slug = s.provider_slug
JOIN bus_types bt ON bt.name = s.bus_type_name
WHERE NOT EXISTS (
  SELECT 1 FROM buses b WHERE b.license_plate = s.license_plate
);

-- 5) Trips in date window 27/03 -> 11/04 (Asia/Ho_Chi_Minh +07)
-- 5.1 Four low-price trips for transfer testing (10,000 VND)
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
  1.0,
  true,
  t.pickup_points,
  t.dropoff_points,
  t.available_seats,
  'scheduled'
FROM (
  VALUES
    (
      'seed-transfer-express',
      '30S-102.27',
      'BX My Dinh Seed',
      'BX Niem Nghia Seed',
      TIMESTAMPTZ '2026-03-27 07:00:00+07',
      TIMESTAMPTZ '2026-03-27 09:15:00+07',
      '[{"name":"BX My Dinh Seed","time":"07:00","surcharge":0}]'::jsonb,
      '[{"name":"BX Niem Nghia Seed","time":"09:15","surcharge":0}]'::jsonb,
      34
    ),
    (
      'seed-transfer-express',
      '30S-204.11',
      'BX Nuoc Ngam Seed',
      'BX Ninh Binh Seed',
      TIMESTAMPTZ '2026-03-29 08:30:00+07',
      TIMESTAMPTZ '2026-03-29 10:45:00+07',
      '[{"name":"BX Nuoc Ngam Seed","time":"08:30","surcharge":0}]'::jsonb,
      '[{"name":"BX Ninh Binh Seed","time":"10:45","surcharge":0}]'::jsonb,
      22
    ),
    (
      'seed-transfer-limousine',
      '14S-411.27',
      'BX Giap Bat Seed',
      'BX Bai Chay Seed',
      TIMESTAMPTZ '2026-04-02 06:45:00+07',
      TIMESTAMPTZ '2026-04-02 10:30:00+07',
      '[{"name":"BX Giap Bat Seed","time":"06:45","surcharge":0}]'::jsonb,
      '[{"name":"BX Bai Chay Seed","time":"10:30","surcharge":0}]'::jsonb,
      22
    ),
    (
      'seed-transfer-limousine',
      '15S-310.27',
      'BX Niem Nghia Seed',
      'BX My Dinh Seed',
      TIMESTAMPTZ '2026-04-09 16:00:00+07',
      TIMESTAMPTZ '2026-04-09 18:15:00+07',
      '[{"name":"BX Niem Nghia Seed","time":"16:00","surcharge":0}]'::jsonb,
      '[{"name":"BX My Dinh Seed","time":"18:15","surcharge":0}]'::jsonb,
      34
    )
) AS t(
  provider_slug,
  license_plate,
  origin_name,
  destination_name,
  departure_time,
  arrival_time,
  pickup_points,
  dropoff_points,
  available_seats
)
JOIN providers p ON p.slug = t.provider_slug
JOIN buses b ON b.license_plate = t.license_plate
JOIN locations o ON o.name = t.origin_name
JOIN locations d ON d.name = t.destination_name;

-- 5.2 Additional scheduled trips (many trips in requested date range)
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
  t.base_price,
  t.price_modifier,
  t.is_hot_deal,
  t.pickup_points,
  t.dropoff_points,
  t.available_seats,
  'scheduled'
FROM (
  VALUES
    ('seed-transfer-express', '30S-102.27', 'BX My Dinh Seed', 'BX Bai Chay Seed', TIMESTAMPTZ '2026-03-28 07:15:00+07', TIMESTAMPTZ '2026-03-28 10:45:00+07', 150000, 1.00, false, '[{"name":"BX My Dinh Seed","time":"07:15","surcharge":0}]'::jsonb, '[{"name":"BX Bai Chay Seed","time":"10:45","surcharge":0}]'::jsonb, 34),
    ('seed-transfer-express', '30S-204.11', 'BX My Dinh Seed', 'BX Ninh Binh Seed', TIMESTAMPTZ '2026-03-30 06:30:00+07', TIMESTAMPTZ '2026-03-30 08:45:00+07', 120000, 1.00, false, '[{"name":"BX My Dinh Seed","time":"06:30","surcharge":0}]'::jsonb, '[{"name":"BX Ninh Binh Seed","time":"08:45","surcharge":0}]'::jsonb, 22),
    ('seed-transfer-limousine', '15S-310.27', 'BX Giap Bat Seed', 'BX Niem Nghia Seed', TIMESTAMPTZ '2026-03-31 14:00:00+07', TIMESTAMPTZ '2026-03-31 16:15:00+07', 135000, 1.00, false, '[{"name":"BX Giap Bat Seed","time":"14:00","surcharge":0}]'::jsonb, '[{"name":"BX Niem Nghia Seed","time":"16:15","surcharge":0}]'::jsonb, 34),
    ('seed-transfer-limousine', '14S-411.27', 'BX Nuoc Ngam Seed', 'BX Bai Chay Seed', TIMESTAMPTZ '2026-04-01 09:00:00+07', TIMESTAMPTZ '2026-04-01 12:40:00+07', 170000, 1.05, false, '[{"name":"BX Nuoc Ngam Seed","time":"09:00","surcharge":0}]'::jsonb, '[{"name":"BX Bai Chay Seed","time":"12:40","surcharge":0}]'::jsonb, 22),
    ('seed-transfer-express', '30S-102.27', 'BX Niem Nghia Seed', 'BX My Dinh Seed', TIMESTAMPTZ '2026-04-03 10:00:00+07', TIMESTAMPTZ '2026-04-03 12:15:00+07', 140000, 1.00, false, '[{"name":"BX Niem Nghia Seed","time":"10:00","surcharge":0}]'::jsonb, '[{"name":"BX My Dinh Seed","time":"12:15","surcharge":0}]'::jsonb, 34),
    ('seed-transfer-express', '30S-204.11', 'BX Ninh Binh Seed', 'BX Nuoc Ngam Seed', TIMESTAMPTZ '2026-04-04 15:15:00+07', TIMESTAMPTZ '2026-04-04 17:30:00+07', 110000, 0.95, true, '[{"name":"BX Ninh Binh Seed","time":"15:15","surcharge":0}]'::jsonb, '[{"name":"BX Nuoc Ngam Seed","time":"17:30","surcharge":0}]'::jsonb, 22),
    ('seed-transfer-limousine', '15S-310.27', 'BX Bai Chay Seed', 'BX Giap Bat Seed', TIMESTAMPTZ '2026-04-05 13:00:00+07', TIMESTAMPTZ '2026-04-05 16:40:00+07', 165000, 1.00, false, '[{"name":"BX Bai Chay Seed","time":"13:00","surcharge":0}]'::jsonb, '[{"name":"BX Giap Bat Seed","time":"16:40","surcharge":0}]'::jsonb, 34),
    ('seed-transfer-limousine', '14S-411.27', 'BX My Dinh Seed', 'BX Niem Nghia Seed', TIMESTAMPTZ '2026-04-06 06:50:00+07', TIMESTAMPTZ '2026-04-06 09:05:00+07', 130000, 1.00, false, '[{"name":"BX My Dinh Seed","time":"06:50","surcharge":0}]'::jsonb, '[{"name":"BX Niem Nghia Seed","time":"09:05","surcharge":0}]'::jsonb, 22),
    ('seed-transfer-express', '30S-102.27', 'BX Nuoc Ngam Seed', 'BX Ninh Binh Seed', TIMESTAMPTZ '2026-04-07 07:20:00+07', TIMESTAMPTZ '2026-04-07 09:35:00+07', 115000, 1.00, false, '[{"name":"BX Nuoc Ngam Seed","time":"07:20","surcharge":0}]'::jsonb, '[{"name":"BX Ninh Binh Seed","time":"09:35","surcharge":0}]'::jsonb, 34),
    ('seed-transfer-express', '30S-204.11', 'BX Giap Bat Seed', 'BX Bai Chay Seed', TIMESTAMPTZ '2026-04-08 11:30:00+07', TIMESTAMPTZ '2026-04-08 15:10:00+07', 160000, 1.00, false, '[{"name":"BX Giap Bat Seed","time":"11:30","surcharge":0}]'::jsonb, '[{"name":"BX Bai Chay Seed","time":"15:10","surcharge":0}]'::jsonb, 22),
    ('seed-transfer-limousine', '15S-310.27', 'BX Niem Nghia Seed', 'BX My Dinh Seed', TIMESTAMPTZ '2026-04-10 17:20:00+07', TIMESTAMPTZ '2026-04-10 19:35:00+07', 145000, 1.00, false, '[{"name":"BX Niem Nghia Seed","time":"17:20","surcharge":0}]'::jsonb, '[{"name":"BX My Dinh Seed","time":"19:35","surcharge":0}]'::jsonb, 34),
    ('seed-transfer-limousine', '14S-411.27', 'BX Bai Chay Seed', 'BX Nuoc Ngam Seed', TIMESTAMPTZ '2026-04-11 08:10:00+07', TIMESTAMPTZ '2026-04-11 11:50:00+07', 170000, 1.00, false, '[{"name":"BX Bai Chay Seed","time":"08:10","surcharge":0}]'::jsonb, '[{"name":"BX Nuoc Ngam Seed","time":"11:50","surcharge":0}]'::jsonb, 22)
) AS t(
  provider_slug,
  license_plate,
  origin_name,
  destination_name,
  departure_time,
  arrival_time,
  base_price,
  price_modifier,
  is_hot_deal,
  pickup_points,
  dropoff_points,
  available_seats
)
JOIN providers p ON p.slug = t.provider_slug
JOIN buses b ON b.license_plate = t.license_plate
JOIN locations o ON o.name = t.origin_name
JOIN locations d ON d.name = t.destination_name;

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin

-- Remove dependent payment transactions + bookings for seeded trips first.
DELETE FROM payment_transactions
WHERE booking_id IN (
  SELECT b.id
  FROM bookings b
  JOIN trips t ON t.id = b.trip_id
  JOIN providers p ON p.id = t.provider_id
  WHERE p.slug IN ('seed-transfer-express', 'seed-transfer-limousine')
    AND t.departure_time >= TIMESTAMPTZ '2026-03-27 00:00:00+07'
    AND t.departure_time <= TIMESTAMPTZ '2026-04-11 23:59:59+07'
);

DELETE FROM bookings
WHERE trip_id IN (
  SELECT t.id
  FROM trips t
  JOIN providers p ON p.id = t.provider_id
  WHERE p.slug IN ('seed-transfer-express', 'seed-transfer-limousine')
    AND t.departure_time >= TIMESTAMPTZ '2026-03-27 00:00:00+07'
    AND t.departure_time <= TIMESTAMPTZ '2026-04-11 23:59:59+07'
);

DELETE FROM trips
WHERE provider_id IN (
  SELECT id FROM providers WHERE slug IN ('seed-transfer-express', 'seed-transfer-limousine')
)
AND departure_time >= TIMESTAMPTZ '2026-03-27 00:00:00+07'
AND departure_time <= TIMESTAMPTZ '2026-04-11 23:59:59+07';

DELETE FROM buses
WHERE license_plate IN ('30S-102.27', '30S-204.11', '15S-310.27', '14S-411.27');

DELETE FROM bus_types
WHERE name IN ('Seed Sleeper 34', 'Seed Limousine 22');

DELETE FROM providers
WHERE slug IN ('seed-transfer-express', 'seed-transfer-limousine');

DELETE FROM locations
WHERE keywords ILIKE '%seed-transfer-2026%';

-- +goose StatementEnd
