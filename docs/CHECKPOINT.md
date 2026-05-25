# 📌 CHECKPOINT — EDUGEST PIM
## Estado atual: 2026-05-25

---

## 🔄 PIVOT — O que mudou

O projeto foi reorientado em 2026-05-25. O **cadastro de produto** passa a ser o coração do sistema.

**Antes**: motor de análise de transcrição de reunião → SolutionPack
**Agora**: Central do Produto → fonte única de verdade → alimenta análise, apresentações, exports

O `POST /api/analyze` **continua funcionando** e coexiste — mas é funcionalidade secundária.

---

## ✅ O que está pronto e NÃO deve ser alterado

| Módulo | Status | Localização |
|--------|--------|-------------|
| FallbackOrchestrator + agentes | ✅ Completo | `packages/core/` |
| Tipos SolutionPackV4 | ✅ Completo | `packages/core/src/types/` |
| Fastify server + middleware | ✅ Completo | `apps/api/src/server.ts` |
| POST /api/analyze | ✅ Completo | `apps/api/src/routes/analyze.ts` |
| POST /api/publish | ✅ Completo | `apps/api/src/routes/publish.ts` |
| GET /api/health | ✅ Completo | `apps/api/src/routes/health.ts` |
| Suite de testes (102 testes, 76%) | ✅ Completo | `apps/api/__tests__/` |
| Graph client (SharePoint) | ✅ Configurado | `apps/api/src/services/graph.ts` |
| Next.js estrutura base | ✅ Funcional | `apps/web/` |

---

## 🚧 O que será construído agora (ordem obrigatória)

### Módulo 1 — Prisma Schema (Product)
**Spec**: `SPEC-PRODUTO.md`
**Arquivo**: `schema.prisma`
**O que fazer**: adicionar modelo `Product` com todos os blocos (identidade, comercial, financeiro, fiscal, técnico, suporte, marketing, onboarding, origem, precificação). Sem remover modelos existentes.
**DoD**: `prisma generate` e `prisma migrate` sem erros.

### Módulo 2 — Seed de produtos
**Spec**: `SPEC-PRODUTO.md` seção 4 (catálogo inicial)
**Arquivo**: `seed.ts` (atualizar)
**O que fazer**: migrar os 20 produtos do `SANKHYA_CATALOG` (matchingAgentV3.ts) para o banco via Prisma seed.
**DoD**: `prisma db seed` insere 20 produtos sem erros.

### Módulo 3 — API CRUD de produtos
**Spec**: `SPEC-PRODUTO.md` seção 6
**Arquivos**: `apps/api/src/routes/products.ts`
**O que fazer**: `POST /api/products`, `GET /api/products`, `GET /api/products/:slug`, `PUT /api/products/:slug`
**DoD**: testes unitários cobrindo cada endpoint.

### Módulo 4 — Geração de documentos
**Spec**: `SPEC-GERACAO-DOCS.md`
**Arquivos**: `apps/api/src/routes/generateDocs.ts`, `apps/api/src/services/docGenerator.ts`
**O que fazer**: `POST /api/products/:slug/generate-docs` → gera MASTER.md + 6 visões + 3 exports → publica no SharePoint
**DoD**: dado um slug, gera todos os arquivos e publica em `Central do Produto/{slug}/`.

### Módulo 5 — Banco de slides
**Spec**: `SPEC-APRESENTACAO.md` seção 6
**Arquivos**: `apps/api/src/routes/slides.ts`
**O que fazer**: CRUD de slides por produto (`ProductSlide` no Prisma)
**DoD**: marketing consegue cadastrar slides com upload de `.pptx`.

### Módulo 6 — Geração de apresentação
**Spec**: `SPEC-APRESENTACAO.md`
**Arquivos**: `apps/api/src/routes/apresentacoes.ts`, `apps/api/src/services/pptxGenerator.ts`
**O que fazer**: `POST /api/apresentacoes/gerar` → seleciona slides por perfil → gera `.pptx` → salva no SharePoint
**DoD**: dado nome do cliente e perfil, retorna `.pptx` válido para download.

### Módulo 7 — UI Cadastro de produto
**Spec**: `SPEC-PRODUTO.md` + `SPEC-PRECIFICACAO.md`
**Arquivos**: `apps/web/app/products/new/page.tsx`, `apps/web/components/product/`
**O que fazer**: formulário multi-bloco com todos os campos do produto
**DoD**: comercial/marketing consegue cadastrar um produto completo.

### Módulo 8 — UI Catálogo e apresentação
**Spec**: `SPEC-APRESENTACAO.md` seção 7
**Arquivos**: `apps/web/app/catalogo/`, `apps/web/app/apresentacoes/`
**O que fazer**: listagem de produtos + formulário de geração de apresentação
**DoD**: comercial seleciona perfil, ajusta produtos, gera e baixa o `.pptx`.

---

## ⚠️ Decisões críticas

| Decisão | Motivo |
|---------|--------|
| `POST /api/analyze` preservado | Coexiste com o novo foco — não remover |
| `SANKHYA_CATALOG` em `matchingAgentV3.ts` mantido | Continua alimentando o agente de análise |
| Prisma schema — additive only | Nunca remover campos/modelos existentes |
| `BB-SERV-SUP-001` obrigatório em propostas | Regra de negócio inviolável |
| `fiscalStatus = A_VALIDAR` bloqueia export ERP | Regra de negócio inviolável |
| `codigo` do produto imutável após criação | Integridade do ERP |

---

## 🔑 SharePoint (configurado)

```
SHAREPOINT_SITE_ID=eduproms.sharepoint.com,1765f30c-f095-456f-8c72-f6493f4f6ce3,40279f9a-77e8-49af-b7ae-a85f78a553d5
SHAREPOINT_DRIVE_ID=b!DPNlF5Xwb0WMcvZJP09s45qfJ0Dod69Jt66oX3ilU9VslJOAf9OVToHJQ5dEGorE
SHAREPOINT_BASE_FOLDER=EduGest-PIM
```

> ⚠️ Permissão do Service Principal no SharePoint ainda pendente (403).
> Solução: adicionar via Graph API com body JSON correto (ver DECISOES.md).

---

## 🧩 Riscos ativos

| Risco | Mitigação |
|-------|-----------|
| Prisma schema sem modelo Product | Criar additive — não quebra o existente |
| `pptxgenjs` não está no package.json | Adicionar em `apps/api` antes do Módulo 6 |
| Permissão Graph 403 | Resolver antes do Módulo 4 (geração de docs) |
| Hub Docente e Insights sem slides | Aviso no sistema — não bloqueia |

---

## 📦 Dependências a adicionar

```bash
# apps/api
npm install pptxgenjs

# já presentes (verificar versão)
# @azure/identity, @microsoft/microsoft-graph-client, @anthropic-ai/sdk
```
