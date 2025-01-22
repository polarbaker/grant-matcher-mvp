#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

echo "Starting Grant Matcher MVP User Journey Test"
echo "============================================"

# Test variables
EMAIL="test@example.com"
PASSWORD="testPassword123"
FIRST_NAME="John"
LAST_NAME="Doe"
AUTH_TOKEN=""

# Function to make HTTP requests and check response
check_response() {
    local response=$1
    local expected_status=$2
    local step_name=$3
    
    if echo "$response" | jq -e ". | has(\"$expected_status\")" > /dev/null; then
        echo -e "${GREEN}✓ $step_name succeeded${NC}"
        return 0
    else
        echo -e "${RED}✗ $step_name failed${NC}"
        echo "Response: $response"
        return 1
    fi
}

# Clean up existing test data
echo "Cleaning up test data..."
mongosh "mongodb://localhost:27017/grant-matcher" --eval 'db.users.deleteOne({"email": "test@example.com"})'

echo "1. User Registration"
echo "-------------------"
RESPONSE=$(curl -s -X POST http://localhost:3002/api/users/register \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\",\"firstName\":\"$FIRST_NAME\",\"lastName\":\"$LAST_NAME\"}")

if check_response "$RESPONSE" "token" "User registration"; then
    AUTH_TOKEN=$(echo "$RESPONSE" | jq -r '.token')
else
    exit 1
fi

echo -e "\n2. User Login"
echo "-------------"
RESPONSE=$(curl -s -X POST http://localhost:3002/api/users/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")

if check_response "$RESPONSE" "token" "User login"; then
    AUTH_TOKEN=$(echo "$RESPONSE" | jq -r '.token')
else
    exit 1
fi

echo -e "\n3. Update User Preferences"
echo "-------------------------"
RESPONSE=$(curl -s -X PUT http://localhost:3002/api/users/preferences \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -d '{
    "preferences": {
      "grantTypes": ["research", "development"],
      "fundingAmount": {
        "min": 10000,
        "max": 100000
      },
      "categories": ["technology", "education"],
      "locations": ["United States"]
    }
  }')
check_response "$RESPONSE" "success" "Update preferences"

echo -e "\n4. Get User Profile"
echo "-------------------"
RESPONSE=$(curl -s -X GET http://localhost:3002/api/users/me \
  -H "Authorization: Bearer $AUTH_TOKEN")
check_response "$RESPONSE" "_id" "Get profile"

echo -e "\n5. Get Recommendations"
echo "----------------------"
RESPONSE=$(curl -s -X GET http://localhost:3002/api/recommendations \
  -H "Authorization: Bearer $AUTH_TOKEN")
check_response "$RESPONSE" "items" "Get recommendations"

echo -e "\n✓ All tests completed successfully!"
