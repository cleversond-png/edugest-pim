# Phase 4 Test Plan — Redução Inteligente de Campos + IA Financeira

## Overview

This document describes the complete E2E test flow for Phase 4 implementation:
- ✅ Product form reduced from 77 → 18 fields
- ✅ AI-powered financial field generation (Claude Opus)
- ✅ Interactive FinancialEditPanel for review/edit
- ✅ Fire-and-forget async generation pattern

**Duration**: ~10 minutes total  
**Prerequisites**: Production deployment complete, API accessible

---

## Test Scenario 1: Create Product with Simplified Form

### Preconditions
- Frontend accessible: https://ca-edugest-pim-web-prod.../products/new
- Backend API operational: https://ca-edugest-pim-api...

### Steps

1. **Navigate to Product Creation**
   - URL: https://ca-edugest-pim-web-prod.purpleground-cde5672b.brazilsouth.azurecontainerapps.io/products/new
   - Verify: Form loads with 6 sections (Identidade, Comercial, Fiscal, Financeiro, Técnico, Suporte)
   - Verify: Exactly 18 input fields visible

2. **Fill Identidade Section** (4 fields)
   ```
   Nome Comercial: "Platform de Inteligência de Dados"
   Código Sankhya: "PLAT-DATA-2026"
   Tipo Produto: "SAAS_BB" (dropdown)
   Status: "RASCUNHO" (dropdown)
   ```

3. **Fill Comercial Section** (4 fields)
   ```
   Descrição Comercial: "Centraliza e analisa dados acadêmicos em tempo real"
   Dores Atendidas: Add 2-3 tags (ex: "fragmentação", "relatórios lentos")
   Público-Alvo: Select "ESCOLA_MEDIA" + "REDE_GRANDE"
   Diferenciais: Add 2-3 bullets (ex: "IA integrada", "customizável")
   ```

4. **Fill Fiscal Section** (3 fields)
   ```
   Código NBS: "6204100"
   Tem ISS?: "SIM" (dropdown)
   Alíquota ISS: "5" (number, auto-filled)
   ```

5. **Fill Financeiro Section** (2 fields)
   - Verify blue description: "IA gerará preços, margens, faixas automaticamente"
   ```
   Modelo Contratado: "SUBSCRICAO" (dropdown)
   Modelo Faturamento: "RECORRENTE" (dropdown)
   ```

6. **Fill Técnico Section** (3 fields)
   ```
   Modelo Deployment: "CLOUD" (dropdown)
   Requisitos Mínimos: Add 1-2 tags (ex: "navegador moderno")
   Tecnologias Base: Add 2-3 tags (ex: "Node.js", "React", "PostgreSQL")
   ```

7. **Fill Suporte Section** (2 fields)
   ```
   SLA Atendimento: "24h"
   KB Articles: "https://docs.example.com"
   ```

8. **Submit Form**
   - Click: "Salvar Produto"
   - Verify: Form validates (no empty required fields)
   - Verify: Shows loading spinner
   - Verify: Redirects to `/products/[slug]/edit-ai-content`

### Expected Result
- ✅ Product created with status RASCUNHO
- ✅ Slug auto-generated and in URL
- ✅ Response shows `_generating: true` indicating background generation started

---

## Test Scenario 2: Monitor Async AI Generation

### Preconditions
- Product created in Scenario 1
- On edit-ai-content page

### Steps

1. **Observe GenerationStatusBanner**
   - Banner at top of page shows: "Etapa 1/2: Gerando IA"
   - Loading spinner visible
   - Subtitle shows: "Gerando conteúdo de IA..."

2. **Wait for Banner Update** (~3-5 seconds)
   - Banner updates to: "Etapa 2/2: Publicando no SharePoint"
   - Different loading animation
   - Subtitle: "Publicando documentação..."

3. **Wait for Completion** (~2-3 seconds more)
   - Banner becomes green: "✅ Pronto!"
   - Subtitle: "Documentação indexada pelo Copilot"
   - No more spinner

4. **Verify Financial Fields Populated**
   - Scroll to FinancialEditPanel (amber background)
   - Verify all fields populated:
     - `precoBaseUnitario`: non-zero number (e.g., 5000)
     - `margemSugerida`: 15-40% range (e.g., 25)
     - `descontoMaximo`: appropriate for product type
     - `faixasPreco`: Array with 3 items (ESCOLA_PEQUENA, ESCOLA_MEDIA, REDE_GRANDE)

### Expected Result
- ✅ AI generation completes within 10 seconds
- ✅ Financial fields auto-populated
- ✅ Pricing tiers created
- ✅ Copilot integration banner confirms completion

---

## Test Scenario 3: Review & Edit Financial Panel

### Preconditions
- Product from Scenario 1 with generation complete
- On edit-ai-content page

### Steps

1. **Review Read-Only View**
   - Panel has amber/yellow background
   - Shows: Preço Base (R$), Margem (%), Desconto Máximo (%)
   - Shows: 3 pricing tiers in collapsed/read-only format
   - Verify values look reasonable

2. **Enter Edit Mode**
   - Click: "Editar" button (top-right of panel)
   - Panel background remains amber
   - All fields become editable (input fields visible)
   - Button changes to "Salvar"

3. **Edit Pricing Tier**
   - Find: First tier (ESCOLA_PEQUENA)
   - Change: `precoUnitario` from (e.g., 5000) → 4500
   - Verify: Field accepts input and shows new value

4. **Edit Credit Package** (if model is CREDITO)
   - Find: Credit packages section below pricing tiers
   - Edit a package: change `horas` from (e.g., 10) → 12
   - Verify: Field accepts input

5. **Save Changes**
   - Click: "Salvar" button
   - Verify: Shows success toast "✅ Dados financeiros salvos"
   - Verify: Panel returns to read-only view with new values
   - Verify: Values persist after reload

### Expected Result
- ✅ Edit mode toggles correctly
- ✅ All financial fields editable
- ✅ Changes save via PUT request
- ✅ Toast notifications confirm actions

---

## Test Scenario 4: Regenerate Financial Data

### Preconditions
- Product from Scenario 1 with edited financial data
- On edit-ai-content page

### Steps

1. **Click Regenerate Button**
   - Locate: "🔄 Regenerar" button in FinancialEditPanel
   - Click: Button
   - Verify: Loading spinner appears
   - Verify: Button becomes disabled

2. **Wait for Regeneration** (~3-5 seconds)
   - AI recalculates financial fields based on product data
   - Button becomes enabled again
   - Shows toast: "✅ Financeiro regenerado"

3. **Verify New Values**
   - Pricing tiers may have changed (e.g., different percentages)
   - Preço base may be different
   - Check: Values are still in reasonable ranges (15-40% margin)

4. **Manual Edit Still Works**
   - Click "Editar" again
   - Change pricing manually
   - Click "Salvar"
   - Verify: Manual edits override AI values

### Expected Result
- ✅ Regenerate works independently
- ✅ Only financial fields refreshed, other product data unchanged
- ✅ Manual edits can still be applied after regeneration
- ✅ Can toggle between generated and manual values

---

## Test Scenario 5: Verify Onboarding/Marketing Auto-Generation

### Preconditions
- Product from Scenario 1 with generation complete
- Still on edit-ai-content page (scroll down)

### Steps

1. **Scroll to Onboarding Section**
   - Section header: "📝 Onboarding"
   - Fields visible:
     - Contexto Geral
     - Por Que Existe
     - Para Quem É
     - Não Confundir Com
     - Roadmap Público
   - Verify: All fields populated with text (not empty)

2. **Scroll to Marketing Section**
   - Section header: "💼 Marketing"
   - Fields visible:
     - Cases (array of case studies)
     - Script de Venda
   - Verify: At least one case study with cliente/desafio/solução/resultado
   - Verify: Script is detailed (multiple sentences)

3. **Scroll to Support Section**
   - Section header: "📞 Suporte"
   - Fields visible:
     - FAQ
     - Troubleshooting
   - Verify: FAQ items present with pergunta/resposta
   - Verify: Troubleshooting guide populated

### Expected Result
- ✅ Onboarding fields auto-generated from product data
- ✅ Marketing content created (cases, script)
- ✅ Support section with FAQ populated
- ✅ All content is readable and contextually relevant

---

## Test Scenario 6: Publish Product

### Preconditions
- Product from Scenario 1 fully reviewed
- On edit-ai-content page

### Steps

1. **Scroll to Action Buttons** (bottom of page)
   - Button 1: "✓ Publicar Produto" (blue/green)
   - Button 2: "← Voltar" (gray)

2. **Click Publish**
   - Click: "✓ Publicar Produto"
   - Verify: Navigates to `/products/[slug]` (product detail page)
   - Verify: Product shows status "ATIVO" (not RASCUNHO)

3. **Verify Product Visible in Catalog**
   - Navigate: https://ca-edugest-pim-web-prod.../products
   - Search or scroll: Find newly created product by name
   - Verify: Shows in list with "ATIVO" badge
   - Verify: Clicking opens detail page

### Expected Result
- ✅ Publish changes status from RASCUNHO → ATIVO
- ✅ Product appears in catalog
- ✅ Product detail page accessible
- ✅ All data persisted

---

## Test Scenario 7: API Contract Validation

### Prerequisites
- Postman or curl available
- API_KEY configured

### Steps

1. **Create Product via API**
   ```bash
   curl -X POST https://ca-edugest-pim-api.../api/products \
     -H "X-Api-Key: $API_KEY" \
     -H "Content-Type: application/json" \
     -d '{...18 required fields...}'
   ```
   - Verify: HTTP 201 Created
   - Verify: Response includes `data.id`, `data.slug`
   - Verify: `data._status` shows "GENERATING_CONTENT"

2. **Poll Product Until Generated**
   ```bash
   for i in {1..10}; do
     curl https://ca-edugest-pim-api.../api/products/$SLUG \
       -H "X-Api-Key: $API_KEY" | jq '.data.faixasPreco'
     sleep 2
   done
   ```
   - Verify: After 2-3 polls, `faixasPreco` array populated
   - Verify: Each item has: perfil, qtdMinima, qtdMaxima, precoUnitario, descricaoFaixa

3. **Edit Financial Data**
   ```bash
   curl -X PUT https://ca-edugest-pim-api.../api/products/$SLUG \
     -H "X-Api-Key: $API_KEY" \
     -H "Content-Type: application/json" \
     -d '{"precoBaseUnitario": 6000, ...}'
   ```
   - Verify: HTTP 200 OK
   - Verify: GET returns updated precoBaseUnitario

4. **Regenerate Financial**
   ```bash
   curl -X POST https://ca-edugest-pim-api.../api/products/$SLUG/regenerate-financial \
     -H "X-Api-Key: $API_KEY"
   ```
   - Verify: HTTP 200 OK
   - Verify: faixasPreco regenerated (values may differ from manual edit)

### Expected Result
- ✅ API contracts honored
- ✅ All endpoints return correct status codes
- ✅ Generated fields populated asynchronously
- ✅ Regeneration endpoint functional

---

## Regression Tests (Existing Features)

### Scenario: Existing /api/analyze Should Still Work
- Product creation via simplified form should NOT break existing POST /api/analyze
- Test: POST /api/analyze with transcript → SolutionPack V4 still generated
- Verify: No regression in analysis flow

### Scenario: Existing Product Catalog Features
- GET /api/products should return all products (including legacy ones)
- Filters (type, status, perfil) should still work
- Verify: No break in list/search functionality

---

## Validation Checklist

- [ ] Form loads with exactly 18 fields
- [ ] All 6 sections visible and organized
- [ ] Financial fields auto-populate after 3-5 seconds
- [ ] Pricing tiers have 3 entries (PE, Média, Grande)
- [ ] FinancialEditPanel has amber background
- [ ] Edit mode works (click Editar → fields editable)
- [ ] Save persists changes
- [ ] Regenerate updates pricing independently
- [ ] Onboarding, Marketing, Support sections auto-populated
- [ ] Publish button changes status to ATIVO
- [ ] Product appears in catalog after publish
- [ ] API contract tests pass (POST, GET, PUT, POST regenerate)
- [ ] No regression in existing /api/analyze flow

---

## Known Limitations & Notes

1. **First generation takes 3-5 seconds**: This is expected (AI call to Claude). Subsequent regenerations faster if cached.

2. **Pricing may be conservative**: Claude generates 15-40% margins for SaaS. If you need different ranges, that's a future tuning task.

3. **Credit packages only for CREDITO model**: If modelo is SUBSCRICAO, pacotesCredito won't appear. This is by design.

4. **SharePoint integration**: Docs are published in background. Verify by checking EduGest-PIM folder in SharePoint (not tested in this scenario but should work if Azure creds configured).

---

## Test Artifacts

- Run script: `bash scripts/qa-phase4-e2e.sh`
- Check logs: `gh run view [RUN_ID]`
- Monitor status: https://github.com/cleversond-png/edugest-pim/actions

---

**Test Date**: 2026-05-27  
**Tester**: 
**Environment**: Production (Azure)  
**Result**: PASS / FAIL  
