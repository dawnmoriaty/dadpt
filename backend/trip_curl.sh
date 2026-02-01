#!/bin/bash
# Trip API Test Script
# Usage: ./trip_curl.sh

BASE_URL="${BASE_URL:-http://localhost:8080/api/v1}"

echo "=== Trip API Tests ==="

# 1. Create Trip
echo -e "\n--- Create Trip ---"
curl -X POST "$BASE_URL/admin/trips" \
  -H "Content-Type: application/json" \
  -d '{
    "providerId": 1,
    "busId": 1,
    "originId": 1,
    "destinationId": 2,
    "departureTime": "2026-02-05T08:00:00+07:00",
    "arrivalTime": "2026-02-05T14:00:00+07:00",
    "basePrice": 250000,
    "availableSeats": 45,
    "pickupPoints": [
      {"name": "Bến xe Miền Đông", "time": "08:00", "surcharge": 0}
    ],
    "dropoffPoints": [
      {"name": "Bến xe Đà Lạt", "time": "14:00", "surcharge": 0}
    ]
  }'

# 2. List Trips (Admin)
echo -e "\n\n--- List Trips (Admin) ---"
curl -X GET "$BASE_URL/admin/trips?page=1&limit=10"

# 3. List Trips by Provider
echo -e "\n\n--- List Trips by Provider ---"
curl -X GET "$BASE_URL/admin/trips?providerId=1"

# 4. Get Trip by ID
echo -e "\n\n--- Get Trip by ID ---"
curl -X GET "$BASE_URL/trips/1"

# 5. Update Trip
echo -e "\n\n--- Update Trip ---"
curl -X PUT "$BASE_URL/admin/trips/1" \
  -H "Content-Type: application/json" \
  -d '{
    "basePrice": 280000,
    "isHotDeal": true
  }'

# 6. Update Trip Status
echo -e "\n\n--- Update Trip Status ---"
curl -X PATCH "$BASE_URL/admin/trips/1/status" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "departed"
  }'

# 7. Search Trips (Public)
echo -e "\n\n--- Search Trips (Public) ---"
curl -X GET "$BASE_URL/trips?originId=1&destinationId=2&departureDate=2026-02-05&minSeats=1"

# 8. Delete Trip (optional - uncomment to test)
# echo -e "\n\n--- Delete Trip ---"
# curl -X DELETE "$BASE_URL/admin/trips/2"

echo -e "\n\n=== Trip Tests Complete ==="
