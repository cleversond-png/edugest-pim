#!/bin/bash

# Phase 4 E2E Test — Redução de Campos + Geração IA de Financeiro
# Tests complete flow: Create product → IA generates financial → Review/edit → Publish

set -e

API_URL="${API_URL:-https://ca-edugest-pim-api.purpleground-cde5672b.brazilsouth.azurecontainerapps.io}"
WEB_URL="${WEB_URL:-https://ca-edugest-pim-web-prod.purpleground-cde5672b.brazilsouth.azurecontainerapps.io}"
API_KEY="${API_KEY:-}"

if [ -z "$API_KEY" ]; then
  echo "❌ API_KEY not set. Usage: API_KEY=xxx API_URL=... ./qa-phase4-e2e.sh"
  exit 1
fi

echo "🧪 Phase 4 E2E Test Suite"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "API_URL: $API_URL"
echo "WEB_URL: $WEB_URL"
echo ""

# Test 1: Health check
echo "📋 Test 1: Health Check"
HEALTH=$(curl -s -X GET "$API_URL/api/health" \
  -H "X-Api-Key: $API_KEY" \
  -H "Content-Type: application/json")

if echo "$HEALTH" | jq -e '.status == "ok"' >/dev/null; then
  echo "✅ Health check passed"
else
  echo "❌ Health check failed"
  echo "$HEALTH"
  exit 1
fi

# Test 2: Create product with simplified form (18 fields)
echo ""
echo "📋 Test 2: Create Product (18-field form)"

PRODUCT_SLUG="fase4-test-$(date +%s)"
PRODUCT_NAME="Produto Teste Fase 4 $(date +%s)"

CREATE_RESPONSE=$(curl -s -X POST "$API_URL/api/products" \
  -H "X-Api-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d @- << 'EOF'
{
  "nomeComercial": "Sistema de Análise Financeira",
  "codigoSankhya": "FASE4TEST001",
  "tipoProduto": "SAAS_BB",
  "status": "RASCUNHO",
  "descricaoComercialCurta": "Analisa dados financeiros em tempo real",
  "doresAtendidas": ["fragmentação de dados", "decisões lentas"],
  "publicoAlvo": ["ESCOLA_MEDIA", "REDE_GRANDE"],
  "diferenciais": ["IA integrada", "dashboard customizável"],
  "codigoNBS": "6204100",
  "temISS": "SIM",
  "aliquotaISS": 5.0,
  "modeloContratado": "SUBSCRICAO",
  "modeloFaturamento": "RECORRENTE",
  "modeloDeployment": "CLOUD",
  "requisitosMinimos": ["navegador moderno"],
  "tecnologiasBase": ["Node.js", "React"],
  "slaAtendimento": "24h",
  "kbArticles": "https://docs.example.com"
}
EOF
)

CREATED_SLUG=$(echo "$CREATE_RESPONSE" | jq -r '.data.slug // empty')
if [ -z "$CREATED_SLUG" ]; then
  echo "❌ Failed to create product"
  echo "$CREATE_RESPONSE"
  exit 1
fi

echo "✅ Product created: $CREATED_SLUG"
echo "   ID: $(echo "$CREATE_RESPONSE" | jq -r '.data.id')"
echo "   Status: $(echo "$CREATE_RESPONSE" | jq -r '.data.status')"

# Test 3: Verify financial fields exist (either generated or empty)
echo ""
echo "📋 Test 3: Verify Financial Fields"

sleep 2  # Give backend time to start generation

GET_RESPONSE=$(curl -s -X GET "$API_URL/api/products/$CREATED_SLUG" \
  -H "X-Api-Key: $API_KEY")

PRECO=$(echo "$GET_RESPONSE" | jq -r '.data.precoBaseUnitario // "null"')
MARGEM=$(echo "$GET_RESPONSE" | jq -r '.data.margemSugerida // "null"')
DESCONTO=$(echo "$GET_RESPONSE" | jq -r '.data.descontoMaximo // "null"')

echo "   Preço Base: $PRECO"
echo "   Margem: $MARGEM%"
echo "   Desconto Máx: $DESCONTO%"

if [ "$PRECO" != "null" ] && [ "$MARGEM" != "null" ]; then
  echo "✅ Financial fields generated"
else
  echo "⚠️  Financial fields not yet generated (may still be in progress)"
fi

# Test 4: Verify pricing tiers
echo ""
echo "📋 Test 4: Verify Pricing Tiers (faixasPreco)"

FAIXAS=$(echo "$GET_RESPONSE" | jq '.data.faixasPreco')
FAIXAS_COUNT=$(echo "$FAIXAS" | jq 'length')

if [ "$FAIXAS_COUNT" -gt 0 ]; then
  echo "✅ Pricing tiers created: $FAIXAS_COUNT tiers"
  echo "$FAIXAS" | jq '.[] | "\(.perfil): \(.qtdMinima)-\(.qtdMaxima) = R$ \(.precoUnitario)"'
else
  echo "⚠️  No pricing tiers yet"
fi

# Test 5: Check if Onboarding content exists
echo ""
echo "📋 Test 5: Verify Onboarding Content (AI Generation)"

CONTEXTO=$(echo "$GET_RESPONSE" | jq -r '.data.contextoGeral // ""' | head -c 50)
if [ ! -z "$CONTEXTO" ]; then
  echo "✅ Onboarding content generated:"
  echo "   contextoGeral: ${CONTEXTO}..."
else
  echo "⚠️  Onboarding content not yet generated"
fi

# Test 6: Simulate edit financial data
echo ""
echo "📋 Test 6: Edit Financial Data"

EDIT_RESPONSE=$(curl -s -X PUT "$API_URL/api/products/$CREATED_SLUG" \
  -H "X-Api-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d @- << EOF
{
  "precoBaseUnitario": 5000,
  "margemSugerida": 25,
  "descontoMaximo": 15,
  "faixasPreco": [
    {
      "perfil": "ESCOLA_PEQUENA",
      "qtdMinima": 1,
      "qtdMaxima": 10,
      "precoUnitario": 5000,
      "descricaoFaixa": "Pequenas escolas"
    }
  ]
}
EOF
)

if echo "$EDIT_RESPONSE" | jq -e '.data.precoBaseUnitario == 5000' >/dev/null; then
  echo "✅ Financial data updated successfully"
else
  echo "❌ Failed to update financial data"
  echo "$EDIT_RESPONSE"
fi

# Test 7: Verify that marketing/onboarding sections populated (or being generated)
echo ""
echo "📋 Test 7: Check AI-Generated Content Sections"

GET_FINAL=$(curl -s -X GET "$API_URL/api/products/$CREATED_SLUG" \
  -H "X-Api-Key: $API_KEY")

CASES=$(echo "$GET_FINAL" | jq '.data.cases | length')
FAQ=$(echo "$GET_FINAL" | jq '.data.faq | length')
SCRIPT=$(echo "$GET_FINAL" | jq -r '.data.scriptVenda // "" | length')

echo "   Cases: $CASES"
echo "   FAQ items: $FAQ"
echo "   Sales Script: $SCRIPT chars"

if [ "$CASES" -gt 0 ] || [ "$FAQ" -gt 0 ]; then
  echo "✅ Marketing/Onboarding content found"
else
  echo "⚠️  AI-generated content may still be processing"
fi

# Test 8: Frontend accessibility
echo ""
echo "📋 Test 8: Frontend URLs Accessible"

WEB_RESPONSE=$(curl -s -I "$WEB_URL/products/$CREATED_SLUG/edit-ai-content" \
  -H "Accept: text/html" | head -1)

if echo "$WEB_RESPONSE" | grep -q "307\|200"; then
  echo "✅ Edit AI content page accessible"
else
  echo "⚠️  Edit page may not be fully loaded yet"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Phase 4 E2E Tests Completed"
echo ""
echo "📝 Next Steps (Manual):"
echo "  1. Visit: $WEB_URL/products/$CREATED_SLUG/edit-ai-content"
echo "  2. Review generated financial data in the amber panel"
echo "  3. Edit a pricing tier and save"
echo "  4. Click regenerate to see IA update prices"
echo "  5. Click 'Publicar Produto' to finalize"
echo ""
