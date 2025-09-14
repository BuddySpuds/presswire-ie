#!/bin/bash

# PressWire.ie Local Testing Script
# Tests all API endpoints and functionality

echo "🧪 PressWire.ie API Testing Suite"
echo "================================="

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# API Base URL (change for production)
API_URL="http://localhost:4000"

# Test variables
TEST_EMAIL="john@testcompany.ie"
TEST_CRO="123456"
TEST_COMPANY="Test Company Ltd"

echo ""
echo "1️⃣  Testing Domain Verification API"
echo "-----------------------------------"

# Test sending verification code
echo -n "Testing send verification code... "
RESPONSE=$(curl -s -X POST "$API_URL/api/verify-domain" \
  -H "Content-Type: application/json" \
  -d "{\"action\":\"send-code\",\"email\":\"$TEST_EMAIL\"}")

if echo "$RESPONSE" | grep -q "success"; then
  echo -e "${GREEN}✓ PASSED${NC}"
  # Extract demo code for testing
  DEMO_CODE=$(echo "$RESPONSE" | grep -o '"demoCode":"[0-9]*"' | cut -d'"' -f4)
  echo "   Demo code: $DEMO_CODE"
else
  echo -e "${RED}✗ FAILED${NC}"
  echo "   Response: $RESPONSE"
fi

# Test verifying code
echo -n "Testing verify code... "
RESPONSE=$(curl -s -X POST "$API_URL/api/verify-domain" \
  -H "Content-Type: application/json" \
  -d "{\"action\":\"verify-code\",\"email\":\"$TEST_EMAIL\",\"code\":\"$DEMO_CODE\"}")

if echo "$RESPONSE" | grep -q "token"; then
  echo -e "${GREEN}✓ PASSED${NC}"
  TOKEN=$(echo "$RESPONSE" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
  echo "   Token: ${TOKEN:0:20}..."
else
  echo -e "${RED}✗ FAILED${NC}"
  echo "   Response: $RESPONSE"
fi

echo ""
echo "2️⃣  Testing CRO Lookup API"
echo "-------------------------"

echo -n "Testing CRO lookup... "
RESPONSE=$(curl -s -X POST "$API_URL/api/lookup-company" \
  -H "Content-Type: application/json" \
  -d "{\"croNumber\":\"$TEST_CRO\",\"companyName\":\"$TEST_COMPANY\"}")

if echo "$RESPONSE" | grep -q "success\|company"; then
  echo -e "${GREEN}✓ PASSED${NC}"
  echo "   Company verified: $TEST_COMPANY"
else
  echo -e "${RED}✗ FAILED${NC}"
  echo "   Response: $RESPONSE"
fi

echo ""
echo "3️⃣  Testing PR Generation API"
echo "----------------------------"

echo -n "Testing PR generation... "
RESPONSE=$(curl -s -X POST "$API_URL/api/generate-pr" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "company": {
      "name": "Test Company Ltd",
      "croNumber": "123456",
      "status": "Active"
    },
    "headline": "Test Company Announces Major Milestone",
    "summary": "This is a test press release summary.",
    "keyPoints": "• Point 1\n• Point 2\n• Point 3",
    "contact": "test@testcompany.ie",
    "package": "starter"
  }')

if echo "$RESPONSE" | grep -q "success"; then
  echo -e "${GREEN}✓ PASSED${NC}"
  PR_URL=$(echo "$RESPONSE" | grep -o '"url":"[^"]*"' | cut -d'"' -f4)
  echo "   PR URL: $PR_URL"
else
  echo -e "${RED}✗ FAILED${NC}"
  echo "   Response: $RESPONSE"
fi

echo ""
echo "4️⃣  Testing Static Files"
echo "-----------------------"

# Test homepage
echo -n "Testing homepage... "
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/")
if [ "$HTTP_CODE" = "200" ]; then
  echo -e "${GREEN}✓ PASSED${NC}"
else
  echo -e "${RED}✗ FAILED (HTTP $HTTP_CODE)${NC}"
fi

# Test generate page
echo -n "Testing generate page... "
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/generate.html")
if [ "$HTTP_CODE" = "200" ]; then
  echo -e "${GREEN}✓ PASSED${NC}"
else
  echo -e "${RED}✗ FAILED (HTTP $HTTP_CODE)${NC}"
fi

echo ""
echo "5️⃣  Testing Free Email Blocking"
echo "-------------------------------"

echo -n "Testing Gmail blocking... "
RESPONSE=$(curl -s -X POST "$API_URL/api/verify-domain" \
  -H "Content-Type: application/json" \
  -d '{"action":"send-code","email":"test@gmail.com"}')

if echo "$RESPONSE" | grep -q "Free email providers not allowed"; then
  echo -e "${GREEN}✓ PASSED${NC}"
else
  echo -e "${RED}✗ FAILED${NC}"
  echo "   Response: $RESPONSE"
fi

echo ""
echo "================================="
echo "📊 Test Summary"
echo "================================="
echo ""
echo "Run this script with Docker:"
echo "  docker-compose up -d"
echo "  ./test-local.sh"
echo ""
echo "Or without Docker:"
echo "  npm install"
echo "  npm run dev"
echo "  ./test-local.sh"
echo ""