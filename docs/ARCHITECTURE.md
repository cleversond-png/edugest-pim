# Arquitetura — EduGest-PIM

Mapeamento de 2026-10-29, feito a partir do código e das specs que estão no repositório. Onde um documento e o código discordam, a evidência citada é o arquivo. Este texto não altera contratos.

Fontes de estado usadas: `STATE.json` (`last_updated` 2026-06-24), `CHECKPOINT.md` (o arquivo para na infra dedicada de 2026-05-27), `schema.prisma`, `apps/`, `packages/core` e `.github/workflows/deploy.yml`. Produção não foi consultada de novo neste mapeamento.

## 1. Stack e runtime

Monorepo npm workspaces (`package.json` na raiz: `apps/*`, `packages/*`).

| Camada | O que o código usa | Onde |
|---|---|---|
| Runtime | Node.js 20 | `.github/workflows/deploy.yml`, `Dockerfile`, `apps/web/Dockerfile` |
| API | Fastify 4, Pino, AJV 8 | `apps/api/package.json`, `apps/api/src/server.ts` |
| Web | Next.js 16.2.6, React 19.2.4, Tailwind CSS 4, App Router | `apps/web/package.json` |
| Núcleo | TypeScript, orquestrador e agentes | `packages/core` |
| Banco | PostgreSQL via Prisma 5.21 | `schema.prisma` |
| Documentos de produto e PPTX | Azure Blob Storage (`@azure/storage-blob`) | `apps/api/src/services/blobStorage.ts` |
| Solution pack (oportunidade) | Arquivo local ou SharePoint, conforme `PUBLISH_MODE` | `apps/api/src/services/publisherFactory.ts` |
| IA | `@anthropic-ai/sdk`; modelo padrão `claude-opus-4-7`; sem chave, mock | `apps/api/src/services/aiClientWrapper.ts`, `apps/api/src/services/productAiCompleter.ts` |
| PPTX | `pptxgenjs` | `apps/api/package.json`, `apps/api/src/services/pptxGenerator.ts` |
| Auth da API | Header `X-Api-Key` comparado com `API_KEY` | `apps/api/src/middleware/auth.ts` |
| Auth do browser | A chave fica no servidor Next e segue no proxy | `apps/web/lib/server-api.ts` |

O `README.md` da raiz ainda descreve Next.js 14, banco “Prisma + SharePoint” e deploy em Azure App Service. O workflow atual publica dois Container Apps (API e web) em `rg-edugest-pim-prod`.

TypeScript aparece em três `package.json`: raiz `^6.0.3` (devDependency), API `^5.4.0`, web `^5`. O SDK da Anthropic está na raiz e em `packages/core`; a API importa o pacote sem declará-lo no próprio `apps/api/package.json` (resolve pelo workspace na instalação da raiz).

Variáveis que o código lê (nomes, sem valores):

- API: `PORT`, `HOST`, `API_KEY`, `DATABASE_URL`, `NODE_ENV`
- Blob: `AZURE_STORAGE_CONNECTION_STRING`, `AZURE_STORAGE_CONTAINER` (padrão `pim-docs` em `blobStorage.ts`)
- IA: `ANTHROPIC_API_KEY`
- Graph / SharePoint, opcionais: `AZURE_TENANT_ID`, `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET` ou `GRAPH_USERNAME` + `GRAPH_PASSWORD`, `SHAREPOINT_SITE_ID`, `SHAREPOINT_DRIVE_ID`, `PUBLISH_MODE`
- Web no deploy: `API_URL`, `NEXT_PUBLIC_API_URL`, `API_KEY` como `secretref:api-key` (`.github/workflows/deploy.yml`)

## 2. Estrutura do repositório

```
edugest-pim/
├── apps/api/                 Fastify. Rotas, serviços, testes Jest
│   ├── src/routes/           health, analyze, publish, products, slides, apresentacoes, company
│   ├── src/services/         orquestrador da API, V4, blob, graph, publishers, docs, pptx, IA
│   ├── src/middleware/       auth, errorHandler
│   ├── src/__tests__/        produtos, slides, docs, apresentações
│   └── __tests__/            pipeline V4, auth, publish, graph
├── apps/web/                 Next.js. Catálogo, cadastro, detalhe, análise, apresentações
│   └── app/api/              proxies server-side para a API
├── packages/core/            agentes, FallbackOrchestrator, guardrails, tipos V4
├── schema.prisma             modelo único na raiz
├── seed.ts                   carga idempotente do catálogo (15 produtos)
├── schemas/                  JSON Schema do Solution Pack, opportunity context, render result
├── start.js                  boot do container da API (db push + seed + server)
├── Dockerfile                imagem da API
├── apps/web/Dockerfile       imagem do frontend (output standalone)
├── .github/workflows/deploy.yml
└── docs/                     specs de produto e notas de fase; specs de API/agente ainda na raiz
```

Specs na raiz (fase do motor de oportunidade, várias marcadas como arquivadas em `STATE.json` → `specs.arquivados`): `SPEC-API.md`, `SPEC-AGENT-RUNTIME.md`, `SPEC-DATA-MODEL.md`, `SPEC-EVALS.md`, `SPEC-GRAPH.md`, `SPEC-RENDERER.md`, `SPEC-SEED.md`, `SPEC-SOLUTION-PACK-V4.md`, `SPEC-UI.md`.

Specs do cadastro, em `docs/specs/`: `SPEC-PRODUTO.md`, `SPEC-GERACAO-DOCS.md`, `SPEC-APRESENTACAO.md`, `SPEC-PRECIFICACAO.md`.

Há cópia dos JSON Schemas em `apps/api/src/schemas/` e outra em `schemas/`. Os guardrails resolvem `schemas/` a partir do cwd (`packages/core/src/orchestrator/guardrails.ts`).

## 3. Módulos e como se conectam

Dois fluxos convivem. O foco registrado em `STATE.json` (`pivot_note`, 2026-05-25) é o cadastro de produto. `POST /api/analyze` continua no servidor.

### 3.1 Cadastro, documentos e apresentação

```
Browser (Next)
  /products, /products/new, /products/[slug], /apresentacoes
        │  proxies em apps/web/app/api  (X-Api-Key no servidor)
        ▼
Fastify  apps/api/src/server.ts
  products.ts  slides.ts  apresentacoes.ts  company.ts
        │
        ├── Prisma / PostgreSQL  (schema.prisma)
        ├── productAiCompleter.ts + aiClientWrapper.ts  (preço e visões)
        ├── docGenerator.ts  (MASTER + 6 visões + 3 JSON)
        └── blobStorage.ts   (container privado, SAS de leitura no PPTX)
```

`POST /api/products` dispara `generateProductContentInBackground` sem esperar o fim (`apps/api/src/routes/products.ts`). O passo 1 chama `completeProductWithAI`, que hoje grava só campos financeiros. O passo 2 gera os 11 arquivos e chama `publishProductDocuments`. Os logs desse passo ainda dizem “SharePoint”; a função importada é a do Blob.

Arquivos gerados por produto (nomes no código, não os da spec):

- `{slug}-MASTER.md` e `{slug}-MASTER.html`
- `visoes/{slug}-{FINANCEIRO|COMERCIAL|PRE_VENDA|MARKETING|SUPORTE|ONBOARDING}.md`
- `exports/{slug}-ERP.json`, `{slug}-CRM.json`, `{slug}-Partner.json`

`SPEC-GERACAO-DOCS.md` ainda descreve a árvore `SharePoint/Central do Produto/{slug}/` com nomes de visão em português (`Financeiro.md`). O código grava no Blob, prefixo `{container}/{slug}/`, com o nome do público em maiúsculas.

Apresentação:

- `POST /api/apresentacoes/gerar` — gera PPTX e guarda o buffer em um `Map` em memória (`apresentacoes.ts`)
- `GET /api/apresentacoes/download/:fileName` — lê esse `Map` (some se o processo reiniciar)
- `POST /api/apresentacoes/gerar-e-publicar` — sobe o PPTX para `_apresentacoes/{fileName}` no Blob e devolve URL SAS (365 dias, `blobStorage.ts`). Se o upload falha, a rota responde 200 com `status: PARTIAL_SUCCESS`

O formulário web trava o slug `suporte-m365` (`apps/web/components/forms/ApresentacaoForm.tsx`). `SPEC-APRESENTACAO.md` e `SPEC-PRODUTO.md` ainda mandam travar o código `BB-SERV-SUP-001`.

### 3.2 Oportunidade (transcrição → Solution Pack)

```
POST /api/analyze
  AJV opportunity context  (apps/api/src/schemas/validators.ts)
  executeOrchestrator → FallbackOrchestrator + stepRegistry
  transformToV4
  AJV solution pack
        │
POST /api/publish
  publisherFactory: PUBLISH_MODE=local (padrão) ou sharepoint
  arquivos: solutionPack.json, erp_payload.json, summary.md, recommendation.md
```

Etapas em `packages/core/src/orchestrator/stepRegistry.ts`:

| Etapa | Implementação |
|---|---|
| `DiagnosisAgent` | `diagnosisAgent.ts` (determinístico) |
| `MatchingAgent` | `matchingAgentV3` sobre `SANKHYA_CATALOG` |
| `ERPSankhyaMapperAgent` | `erpSankhyaMapperV2.ts` |
| `ContextAssembly`, `SolutionArchitectAgent`, `SalesNarrativeAgent`, `MarketingDeckAgent`, `PartnerCenterMapperAgent`, `DocsPublisherAgent`, `PersistSolutionPack` | retorno fixo (stub) |

`PersistSolutionPack` devolve `true` e não grava Prisma. `POST /api/analyze` não importa o client Prisma. Os models `Opportunity`, `Transcript` e `SolutionPack` existem em `schema.prisma` e não são escritos por essa rota.

A UI de análise permanece em `apps/web/app/analyze/page.tsx` e `apps/web/app/result/`. A home (`apps/web/app/page.tsx`) redireciona para `/products`.

### 3.3 Rotas registradas

Públicas (sem `X-Api-Key`), em `server.ts` e `auth.ts`:

| Método | Caminho | Arquivo |
|---|---|---|
| GET | `/api/health` | `routes/health.ts` |
| POST | `/api/analyze` | isenção explícita em `middleware/auth.ts` |
| POST | `/api/publish` | isenção explícita em `middleware/auth.ts` |

Protegidas pelo hook de `auth.ts` (401 se a chave falta ou difere; 500 se `API_KEY` não está configurada):

| Método | Caminho |
|---|---|
| GET | `/api/status` |
| GET, POST | `/api/products` |
| GET, PUT, DELETE | `/api/products/:slug` |
| POST | `/api/products/:slug/regenerate-financial` |
| GET | `/api/products/:slug/export/erp` |
| POST | `/api/products/:slug/generate-docs` |
| PUT | `/api/products/:slug/generate-ai-content` |
| GET, POST | `/api/products/:slug/slides` |
| GET, PUT, DELETE | `/api/products/:slug/slides/:id` |
| POST | `/api/products/:slug/slides/reorder` |
| POST | `/api/apresentacoes/gerar` |
| POST | `/api/apresentacoes/gerar-e-publicar` |
| GET | `/api/apresentacoes/download/:fileName` |
| GET, POST | `/api/company` |
| PUT | `/api/company/:id` |

`SPEC-API.md` pede `POST /api/publish/sharepoint` e exige API key em toda rota exceto health. O código expõe `POST /api/publish` e deixa analyze e publish sem chave. `GET /api/opportunities/:id/solution-pack` está na spec como pós-MVP e não existe no `server.ts`.

Proxies Next (a chave não vai no HTML; o smoke `scripts/qa-frontend-production.sh` procura marcadores de chave na página): `app/api/products`, `app/api/products/[slug]`, `app/api/products/[slug]/regenerate-financial`, `app/api/apresentacoes/gerar`.

### 3.4 Catálogo

Há duas listas de 15 itens, com identificadores diferentes:

- Matching: `SANKHYA_CATALOG` em `packages/core/src/agents/matchingAgentV3.ts`. Chave é slug (`integrador-provisionador`, `suporte-m365`, …). `erp_code` é numérico (`105101`, `109101`, …).
- Banco: `upsertProducts()` em `seed.ts`. Os mesmos slugs e os mesmos códigos numéricos no campo `Product.codigo`.

`generateNextProductCode()` em `products.ts` procura `codigo` com prefixo `BB-` e, se não achar, devolve `BB-SAAS-PRD-001`. O seed não usa esse prefixo. `SPEC-PRODUTO.md` define `codigo` como `BB-[TIPO]-[GRUPO]-[SEQ]` e o produto obrigatório como `BB-SERV-SUP-001`. Esse código não aparece no catálogo em TypeScript.

`STATE.json` → `notes` pede manter `SANKHYA_CATALOG` sincronizado com o banco. Não há teste que compare os dois.

## 4. Modelo de dados

Fonte: `schema.prisma`. Provider PostgreSQL. `binaryTargets`: `native` e `linux-musl-openssl-3.0.x`.

`Product` é o agregado do PIM. Blocos presentes no model: identidade (`codigo`, `nomeComercial`, `slug`, `tipoProduto`, `natureza`, `status`), comercial, financeiro/ERP, fiscal (`fiscalStatus` default `A_VALIDAR`, `temISS` default `A_VALIDAR`), técnico, suporte, marketing, onboarding, origem e precificação (`precificacaoStatus`, `precoBaseUnitario`, `margemSugerida`, `descontoMaximo`, `faixasPreco`, `pacotesCredito`). `status` inclui `DESCONTINUADO`, além de `RASCUNHO`, `ATIVO` e `INATIVO`.

Não existe campo `cadastroStatus`. A regra escrita em `CLAUDE.md` (“`fiscalStatus` ou `cadastroStatus = A_VALIDAR`”) não tem coluna correspondente.

`SPEC-PRODUTO.md` ainda lista campos que o model não tem: `nomeInterno`, `categoria`, `subcategoria`, `produtoCore`, `integraJornada`, `versao`, `shortPitch`, `observacoesComerciais`, `geraARR`, `centroResultado`, `grupoCodigo`, `grupoDescricao`. `STATE.json` registra a remoção de parte desses campos na Phase 4. A spec não foi atualizada.

Outros models no mesmo schema (existem como tabela; uso em rota não foi assumido além do que as rotas importam): `CompanyProfile` (rota `/api/company`), `ProductSlide` (rota de slides), `ProductVersion`, `Capability`, `ProductCapability`, `ProductDimensionDoc`, `ProductKit`, `PricingPolicy`, `PricingVersion`, `PricingTier`, `PricingAdjustment`, `DependencyRule`, `ERPMappingSankhya` (incluído no export ERP), `PartnerCenterMapping`, `SharePointConfig`, `DocTemplate`, `DocBuildRun`, `Asset`, `Opportunity`, `Transcript`, `SolutionPack`.

O contrato de saída do analyze é o JSON Schema `schemas/solution_pack.schema.json` (`title`: `OpportunitySolutionPack`, `additionalProperties: false`). Campos obrigatórios: `diagnosis`, `recommendation`, `exports`, `telemetry`, `executionId`, `opportunityId`, `status` (`SUCCESS` | `PARTIAL_SUCCESS` | `FAILED`), `durationMs`, `createdAt`. Tipo TypeScript espelhado em `packages/core/src/types/solutionPackV4.ts`. `SPEC-SOLUTION-PACK-V4.md` descreve o mesmo contrato e declara o schema como fonte de verdade.

Bloqueio de ERP, três comportamentos diferentes no código:

1. `GET /api/products/:slug/export/erp` responde 400 `BLOCKED_EXPORT` quando `fiscalStatus === 'A_VALIDAR'` e não envia payload (`products.ts`).
2. `generateErpExport` (`docGenerator.ts`) marca `blocked: true` pelo mesmo motivo, mas o JSON publicado ainda traz o objeto `produto` (não há campo `payload: null`).
3. No fluxo de oportunidade, `erpSankhyaMapperV2` marca `blocked` se o JSON dos itens contém o texto `A VALIDAR` (com espaço). O adapter devolve `payload` mesmo bloqueado. `transformToV4` em `solutionPackV4.ts` zera: `payload: blocked ? null : ...`. Esse caminho não lê `Product.fiscalStatus` do Prisma.

## 5. Build, teste e deploy

Comandos que os `package.json` e o workflow declaram:

```bash
npm ci
npm run build --workspace=@edugest-pim/core
npm run check --workspace=@edugest-pim/api    # tsc --noEmit
npm run build --workspace=@edugest-pim/api
npm run test --workspace=@edugest-pim/api
npm run build --workspace=web
npm run lint --workspace=web
```

Jest (`apps/api/jest.config.js`): `testMatch` `**/__tests__/**/*.test.ts`, limiar global de 70% (branches, functions, lines, statements). Há 143 chamadas `it(` ou `test(` nesses arquivos (102 em `apps/api/__tests__/`, 41 em `apps/api/src/__tests__/`). `STATE.json` cita “102 testes, 76% cobertura” num item antigo de `completed_tasks`. A cobertura não foi remedida neste mapeamento.

O job `build-and-deploy` roda em pull request e em push. Lint e teste usam `|| true`, então falha neles não quebra o job. Build de API e web não tem esse sufixo. Login Azure, build de imagem, `az containerapp update` e o smoke só rodam em push na `main`.

Imagens: `linux/amd64`. API pelo `Dockerfile` da raiz (`node start.js`, porta 3000, healthcheck em `/api/health`). Web por `apps/web/Dockerfile` (Next standalone, porta 3001 no deploy).

`start.js`, se `DATABASE_URL` existe: `npx prisma db push --schema=./schema.prisma --skip-generate --accept-data-loss` e, se `product.count()` é 0, `node ./seed-dist/seed.js`. Não há pasta `prisma/migrations` neste checkout. `STATE.json` → `risks` diz que o firewall do Postgres deixa apps Azure passarem e o runner do GitHub não; por isso o push/seed ficam no boot.

Alvo declarado no workflow (não reverificado ao vivo):

| Peça | Valor em `.github/workflows/deploy.yml` |
|---|---|
| Resource group | `rg-edugest-pim-prod` |
| ACR | `acredgestpimedu.azurecr.io` |
| API | `ca-edugest-pim-api` |
| Web | `ca-edugest-pim-web-prod` |
| URL da API | `https://ca-edugest-pim-api.kindcliff-5c939250.brazilsouth.azurecontainerapps.io` |

`docs/INFRA-PIM-PROD.md` e o trecho final de `CHECKPOINT.md` ainda citam `acredgestpimprod` e o host `purpleground-cde5672b`. O default de `scripts/qa-frontend-production.sh` também é o host `purpleground`. O workflow passa o host `kindcliff` como argumento. `STATE.json` (`pivot_note`, 2026-06-24) concorda com o workflow, incluindo PostgreSQL Flexible `psql-edugest-pim` (database `edugest_pim`) e a troca de SharePoint por Blob (`stedugestpim`, container `pim-docs`).

Smoke: `bash scripts/qa-frontend-production.sh [url-do-frontend]`. Também existe `scripts/qa-phase4-e2e.sh`. Nenhum dos dois foi executado neste mapeamento.

`GET /api/health` devolve `version: 1.0.0` e `services.database` / `services.storage`. `database` fica `ok` se `DATABASE_URL` está definida e `unreachable` se não está; não há query. `storage` fica `not_configured` sem connection string, ou o resultado de `checkBlobHealth()` (`getProperties` no container). Não há mais o campo `graph` nesse tipo (`HealthResponse` em `health.ts`). Trechos antigos do `CHECKPOINT.md` ainda mostram `"graph": "not_configured"`.

## 6. Estado atual

Implementado no código (rota ou módulo existe e está registrado):

- Núcleo do pipeline de oportunidade, com três agentes reais e o restante em stub (`packages/core`)
- `POST /api/analyze` com validação de entrada e de Solution Pack; status `PARTIAL_SUCCESS` previsto no tipo da resposta
- `POST /api/publish` local ou SharePoint
- CRUD de produto, slides, company, geração de docs, geração de PPTX, regeneração financeira
- Formulário reduzido em `/products/new` (`ProductFormSimplified`). `ProductForm.tsx` e `ProductFormV2.tsx` continuam no repositório e não são a página de criação
- Catálogo, detalhe, edição de conteúdo de IA, apresentações, análise
- Seed de 15 produtos alinhados por slug aos ids de `SANKHYA_CATALOG`
- Deploy descrito para Container Apps na subscription registrada no `STATE.json` de 2026-06-24
- Publicação de documentos de produto e de PPTX no Blob

Especificado e ainda não encontrado no código, ou encontrado de outro jeito:

| Spec / estado | O que pede | O que o código faz |
|---|---|---|
| `SPEC-API.md` | `POST /api/publish/sharepoint`; API key exceto health; persistir Solution Pack se houver `DATABASE_URL` | `POST /api/publish`; analyze e publish sem chave; sem insert em `SolutionPack` |
| `SPEC-API.md` §2.4 | `GET /api/opportunities/:id/solution-pack` (pós-MVP) | rota ausente |
| `SPEC-GERACAO-DOCS.md`, `SPEC-GRAPH.md`, `SPEC-RENDERER.md` | publicar docs no SharePoint, árvore `Central do Produto` | docs de produto vão para o Blob; Graph permanece para o publish do solution pack e para init opcional em `server.ts` |
| `SPEC-PRODUTO.md`, `SPEC-APRESENTACAO.md` | códigos `BB-*`, obrigatório `BB-SERV-SUP-001` | slugs e `erp_code` numérico; obrigatório na UI é `suporte-m365` |
| `SPEC-AGENT-RUNTIME.md`, `SPEC-EVALS.md` | pipeline completo com telemetria e evals | etapas stub; `SPEC-EVALS.md` está em `specs.arquivados` |
| `SPEC-PRECIFICACAO.md` fase 2 | calculadora para preço variável (Azure/SQL) | campos de fase 1 no `Product`; sem calculadora |
| `SPEC-UI.md` | fluxo transcrição → publicar no SharePoint | home é o catálogo; análise ainda existe |
| `CLAUDE.md` ordem de implementação | fase “Backend API + SharePoint”, próximo passo mover `packages/core` | `STATE.json` e o código já passaram disso |
| `CHECKPOINT.md` “próximas fases” | Postgres, testes e deploy ainda por fazer | os três existem; o arquivo não incorpora o Blob nem o host `kindcliff` |
| `STATE.json` → `next_tasks` | “geração automática de Marketing/Onboarding (Fase 4.2)” | visões `.md` de `MARKETING` e `ONBOARDING` são geradas; `completeProductWithAI` não preenche os blocos de campo desses públicos |

`new_modules_to_build` em `STATE.json` lista módulos que já têm arquivo (`products.ts`, `docGenerator.ts`, `pptxGenerator.ts`, páginas web). Tratar essa lista como pendência contradiz o próprio `completed_tasks`.

## 7. Lacunas e riscos

Cada item aponta para um arquivo.

1. **Dois destinos de publicação.** Documentos de produto: Blob (`blobStorage.ts`, `STATE.json` risco de 2026-06-24). Solution pack: local ou SharePoint (`publisherFactory.ts`). Specs de docs e Graph não acompanharam a troca. Logs em `products.ts` ainda dizem SharePoint.
2. **Identidade do produto dividida.** Specs `BB-*` (`SPEC-PRODUTO.md`) versus slug + código numérico (`seed.ts`, `matchingAgentV3.ts`) versus gerador `BB-SAAS-PRD-001` (`products.ts`). Matching e apresentação podem travar um produto que o cadastro novo não usa.
3. **Bloqueio ERP incompleto e inconsistente.** HTTP de export bloqueia `fiscalStatus` (`products.ts`). O JSON de docs bloqueia o flag e mesmo assim publica `produto` (`docGenerator.ts`). O mapper da oportunidade procura a string `A VALIDAR` e não o enum `A_VALIDAR` (`erpSankhyaMapperV2.ts`). `cadastroStatus` não existe no schema.
4. **Analyze e publish sem API key.** `auth.ts` isenta esses prefixos. A spec e a regra “API key no servidor” cobrem o browser (`server-api.ts`); não cobrem essas duas rotas se a API estiver exposta.
5. **Health não prova o banco.** `health.ts` só testa se a variável existe. Um `DATABASE_URL` inválido ainda pode aparecer como `database: ok`.
6. **Schema aplicado com `--accept-data-loss` em todo boot.** `start.js`. Não há migrations versionadas no checkout.
7. **CI não segura teste nem lint.** `deploy.yml` (`|| true`). `STATE.json` → `risks` já registra débito de lint no web.
8. **Stubs no caminho de sucesso do analyze.** `stepRegistry.ts`. Falha parcial depende de o orquestrador marcar erro; o stub em si não falha.
9. **Solution Pack não é persistido.** Models em `schema.prisma`; `PersistSolutionPack` não grava; `analyze.ts` não usa Prisma. `SPEC-API.md` pede persistência quando há `DATABASE_URL`.
10. **Download de PPTX em memória.** `apresentacoes.ts`. Reinício perde o arquivo, salvo o caminho `gerar-e-publicar` que usa Blob.
11. **Documentos de infra desencontrados.** Workflow e `STATE.json` (2026-06-24): ACR `acredgestpimedu`, host `kindcliff`. `docs/INFRA-PIM-PROD.md`, default do smoke e o fim do `CHECKPOINT.md`: ACR `acredgestpimprod`, host `purpleground`. Qual URL responde hoje não foi checada aqui.
12. **Prompt de preço fora do domínio das specs.** `productAiCompleter.ts` pede precificação “no contexto do Banco do Brasil”. `SPEC-PRECIFICACAO.md` fala de escola, rede e SaaS educacional. Se a chave existir, esse texto entra no modelo.
13. **README operacional desatualizado.** `README.md` aponta App Service e `https://pmi.plantaoti.com.br`, que o workflow não usa.
14. **Firewall do Postgres e seed só no container.** Registrado em `STATE.json` → `risks`. O runner não aplica schema; um boot com `accept-data-loss` é o mecanismo atual.
15. **“Hub Docente” e “Insights” sem slides.** Risco escrito em `STATE.json`. Esses nomes não estão em `SANKHYA_CATALOG` (15 produtos). Não há evidência no código de que os produtos existam.
