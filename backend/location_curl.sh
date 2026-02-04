  #!/bin/bash
# Location API Test Script
# Usage: ./location_curl.sh

BASE_URL="${BASE_URL:-http://localhost:8080/api/v1}"

echo "=== Location API Tests ==="

# 1. Create Location
echo -e "\n--- Create Location ---"
curl -X POST "$BASE_URL/admin/locations" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Bến xe Miền Đông",
    "city": "Hồ Chí Minh",
    "address": "292 Đinh Bộ Lĩnh, Bình Thạnh",
    "keywords": "ben xe, mien dong, hcm"
  }'

echo -e "\n\n--- Create Location 2 ---"
curl -X POST "$BASE_URL/admin/locations" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Bến xe Miền Tây",
    "city": "Hồ Chí Minh",
    "address": "395 Kinh Dương Vương, Q. Bình Tân",
    "keywords": "ben xe, mien tay, hcm"
  }'

# 2. List Locations
echo -e "\n\n--- List Locations ---"
curl -X GET "$BASE_URL/admin/locations?page=1&limit=10"

# 3. Get Location by ID
echo -e "\n\n--- Get Location by ID ---"
curl -X GET "$BASE_URL/admin/locations/1"

# 4. Update Location
echo -e "\n\n--- Update Location ---"
curl -X PUT "$BASE_URL/admin/locations/1" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Bến xe Miền Đông Mới"
  }'

# 5. Search Locations (public)
echo -e "\n\n--- Search Locations ---"
curl -X GET "$BASE_URL/locations/search?q=mien"

# 6. Delete Location
echo -e "\n\n--- Delete Location (ID=2) ---"
curl -X DELETE "$BASE_URL/admin/locations/2"

echo -e "\n\n=== Location Tests Complete ==="
