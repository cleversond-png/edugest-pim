#!/bin/bash

# Test ROPC flow for SharePoint integration
# Usage: bash scripts/test-ropc.sh

echo "🔐 ROPC Authentication Test"
echo "================================"
echo ""

# Check if .env exists
if [ ! -f "apps/api/.env" ]; then
  echo "❌ ERROR: apps/api/.env not found"
  echo "Create from .env.example first:"
  echo "  cp apps/api/.env.example apps/api/.env"
  exit 1
fi

# Load env variables
source apps/api/.env

# Validate required variables
echo "📋 Checking required variables..."
MISSING=0

if [ -z "$AZURE_TENANT_ID" ]; then
  echo "❌ AZURE_TENANT_ID is empty"
  MISSING=1
fi

if [ -z "$AZURE_CLIENT_ID" ]; then
  echo "❌ AZURE_CLIENT_ID is empty"
  MISSING=1
fi

if [ -z "$GRAPH_USERNAME" ]; then
  echo "❌ GRAPH_USERNAME is empty"
  MISSING=1
fi

if [ -z "$GRAPH_PASSWORD" ]; then
  echo "❌ GRAPH_PASSWORD is empty"
  MISSING=1
fi

if [ $MISSING -eq 1 ]; then
  echo ""
  echo "Please fill in the missing variables in apps/api/.env"
  exit 1
fi

echo "✅ All required variables found"
echo ""

# Test ROPC
echo "🔄 Testing ROPC flow..."
echo "URL: https://login.microsoftonline.com/$AZURE_TENANT_ID/oauth2/v2.0/token"
echo "Username: $GRAPH_USERNAME"
echo ""

RESPONSE=$(curl -s -X POST \
  "https://login.microsoftonline.com/$AZURE_TENANT_ID/oauth2/v2.0/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "client_id=$AZURE_CLIENT_ID" \
  -d "client_secret=$AZURE_CLIENT_SECRET" \
  -d "username=$GRAPH_USERNAME" \
  -d "password=$GRAPH_PASSWORD" \
  -d "grant_type=password" \
  -d "scope=https://graph.microsoft.com/.default")

echo "Response:"
echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"
echo ""

# Check for success
if echo "$RESPONSE" | grep -q "access_token"; then
  echo "✅ SUCCESS! ROPC authentication works"
  echo ""
  echo "Next steps:"
  echo "1. Update apps/api/.env:"
  echo "   PUBLISH_MODE=sharepoint"
  echo "2. Restart the server:"
  echo "   npm run dev"
  echo "3. Test SharePoint upload:"
  echo "   curl -X POST http://localhost:3000/api/publish \\"
  echo "     -H 'X-Api-Key: chave-local-teste-123' \\"
  echo "     -H 'Content-Type: application/json' \\"
  echo "     -d '{\"executionId\":\"test-001\",\"opportunityId\":\"opp-001\",\"solutionPack\":{}}'"
else
  echo "❌ FAILED! ROPC authentication did not work"
  echo ""

  if echo "$RESPONSE" | grep -q "AADSTS50076"; then
    echo "⚠️  Error: MFA is still required"
    echo "See docs/MFA-RESOLUTION.md for solutions"
  elif echo "$RESPONSE" | grep -q "AADSTS7000218"; then
    echo "⚠️  Error: Invalid credentials"
    echo "Check GRAPH_USERNAME and GRAPH_PASSWORD in .env"
  else
    echo "⚠️  Error: Check the response above"
  fi

  exit 1
fi
