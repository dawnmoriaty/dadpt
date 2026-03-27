-- +goose Up
-- +goose StatementBegin

UPDATE trips AS t
SET pickup_points = COALESCE(
    (
        SELECT jsonb_agg(
            CASE
                WHEN COALESCE(NULLIF(BTRIM(point->>'name'), ''), '') = ''
                    THEN jsonb_set(point, '{name}', to_jsonb(o.name), true)
                ELSE point
            END
        )
        FROM jsonb_array_elements(COALESCE(t.pickup_points, '[]'::jsonb)) AS point
    ),
    '[]'::jsonb
)
FROM locations AS o
WHERE o.id = t.origin_id
  AND EXISTS (
      SELECT 1
      FROM jsonb_array_elements(COALESCE(t.pickup_points, '[]'::jsonb)) AS point
      WHERE COALESCE(NULLIF(BTRIM(point->>'name'), ''), '') = ''
  );

UPDATE trips AS t
SET dropoff_points = COALESCE(
    (
        SELECT jsonb_agg(
            CASE
                WHEN COALESCE(NULLIF(BTRIM(point->>'name'), ''), '') = ''
                    THEN jsonb_set(point, '{name}', to_jsonb(d.name), true)
                ELSE point
            END
        )
        FROM jsonb_array_elements(COALESCE(t.dropoff_points, '[]'::jsonb)) AS point
    ),
    '[]'::jsonb
)
FROM locations AS d
WHERE d.id = t.destination_id
  AND EXISTS (
      SELECT 1
      FROM jsonb_array_elements(COALESCE(t.dropoff_points, '[]'::jsonb)) AS point
      WHERE COALESCE(NULLIF(BTRIM(point->>'name'), ''), '') = ''
  );

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
SELECT 1;
-- +goose StatementEnd
