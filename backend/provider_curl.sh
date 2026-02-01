#!/bin/bash
# Provider API Test Script
# Usage: ./provider_curl.sh

BASE_URL="${BASE_URL:-http://localhost:8080/api/v1}"

echo "=== Provider API Tests ==="

# 1. Create Provider
echo -e "\n--- Create Provider ---"
curl -X POST "$BASE_URL/admin/providers" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Phương Trang",
    "hotline": "1900 6067",
    "slug": "phuong-trang",
    "policyRefund": "Hoàn tiền 100% nếu hủy trước 24h"
  }'

echo -e "\n\n--- Create Provider 2 ---"
curl -X POST "$BASE_URL/admin/providers" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Thành Bưởi",
    "hotline": "1900 1088",
    "slug": "thanh-buoi",
    "policyRefund": "Hoàn tiền 50% nếu hủy trước 12h"
  }'

# 2. List Providers (Admin)
echo -e "\n\n--- List Providers (Admin) ---"
curl -X GET "$BASE_URL/admin/providers?page=1&limit=10"

# 3. List Active Providers (Public)
echo -e "\n\n--- List Active Providers (Public) ---"
curl -X GET "$BASE_URL/providers"

# 4. Get Provider by ID
echo -e "\n\n--- Get Provider by ID ---"
curl -X GET "$BASE_URL/admin/providers/1"

# 5. Update Provider
echo -e "\n\n--- Update Provider ---"
curl -X PUT "$BASE_URL/admin/providers/1" \
  -H "Content-Type: application/json" \
  -d '{
    "hotline": "1900 6067 - 1900 8888"
  }'

# 6. Toggle Active
echo -e "\n\n--- Toggle Provider Active ---"
curl -X PATCH "$BASE_URL/admin/providers/2/toggle"

# 7. Delete Provider (optional - uncomment to test)
# echo -e "\n\n--- Delete Provider ---"
# curl -X DELETE "$BASE_URL/admin/providers/2"

echo -e "\n\n=== Provider Tests Complete ==="
