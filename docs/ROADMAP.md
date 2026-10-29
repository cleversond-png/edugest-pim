# Roadmap — EduGest-PIM

Roteiro a partir do código em 2026-10-29, não da ordem antiga do `CLAUDE.md`. Aquela ordem (mover `packages/core`, subir Fastify, analyze, publish, web, deploy) já está no repositório. `STATE.json` (`last_updated` 2026-06-24) chama a fase corrente de “Phase 4 — Redução de Campos + Inteligência IA” e lista como próximas tarefas a geração de Marketing/Onboarding, cache de IA e documentação de operação. O código confirma o cadastro, o Blob e o formulário reduzido; não confirma que Marketing/Onboarding de campo esteja pronto.

Este arquivo não autoriza mudança de contrato. Merge de código de produto continua com o Cleverson (Plantão TI).

## Invariantes

Não violar, mesmo quando a spec e o código divergem. Onde a implementação ainda não cumpre, a fase correspondente fecha o buraco em vez de relaxar a regra.

| Regra | Evidência | O que ainda foge |
|---|---|---|
| Catálogo Sankhya é a fonte de verdade. Matching não devolve produto sem evidência e não inventa item fora do catálogo. | `SANKHYA_CATALOG` em `packages/core/src/agents/matchingAgentV3.ts`; `required_dependencies` sempre no resultado (array, possivelmente vazio) | Specs usam códigos `BB-*` que o catálogo não tem (`SPEC-PRODUTO.md`). Produto novo pode receber `BB-SAAS-PRD-001` (`products.ts`) sem entrar no matching |
| `fiscalStatus = A_VALIDAR` bloqueia export ERP: `blocked = true` e sem payload utilizável | `GET /api/products/:slug/export/erp` em `products.ts`; `transformToV4` zera `payload` quando o mapper marca bloqueio (`solutionPackV4.ts`) | `generateErpExport` publica `produto` mesmo com `blocked: true` (`docGenerator.ts`). O mapper procura o texto `A VALIDAR`, não o enum (`erpSankhyaMapperV2.ts`). Não há `cadastroStatus` em `schema.prisma` |
| Contrato Solution Pack V4 imutável | `schemas/solution_pack.schema.json`, `SPEC-SOLUTION-PACK-V4.md` | Não alterar o schema neste ciclo de documentação |
| `API_KEY` não vai para o browser | `apps/web/lib/server-api.ts`; smoke em `scripts/qa-frontend-production.sh` | `POST /api/analyze` e `POST /api/publish` estão isentos em `auth.ts` |
| Falha parcial continua visível (`PARTIAL_SUCCESS` e erros), sem engolir etapa | tipo em `analyze.ts`; upload de PPTX em `apresentacoes.ts` | Stubs em `stepRegistry.ts` retornam sucesso fictício. Lint e teste no CI usam `\|\| true` (`.github/workflows/deploy.yml`) |
| Não inventar dado de negócio. Sem evidência: `NAO_EVIDENCIADO`, `A_VALIDAR` ou lista vazia | enums em `schema.prisma`; mapper preenche `A VALIDAR` quando não há mapeamento | `productAiCompleter.ts` inventa preço, margem e faixa quando a chave de IA existe, e o prompt cita “Banco do Brasil” |

`BB-SERV-SUP-001` “sempre obrigatório” está em `STATE.json` → `business_rules` e em `SPEC-APRESENTACAO.md`. A UI obriga o slug `suporte-m365`. Tratar os dois como o mesmo produto só depois de uma tabela única (Fase 1). Até lá, a regra que o código executa é o slug.

## Estado de partida

Já dá para inspecionar, sem tratar como “próximo módulo a criar”:

- API Fastify com as rotas da seção 3 de `docs/ARCHITECTURE.md`
- 15 produtos no `seed.ts`, mesmos slugs do `SANKHYA_CATALOG`
- UI de catálogo, cadastro simplificado, detalhe, apresentações e análise
- Documentos de produto e PPTX publicados no Blob quando `AZURE_STORAGE_CONNECTION_STRING` existe
- Workflow de Container Apps em `.github/workflows/deploy.yml`

Não usar como plano vigente:

- A ordem de implementação no `CLAUDE.md` (fase “Backend API + SharePoint Integration”)
- O bloco “Próximas fases (pós-MVP)” do `CHECKPOINT.md`, que ainda lista PostgreSQL e testes como futuros
- `STATE.json` → `new_modules_to_build` (os arquivos já existem)
- `docs/INFRA-PIM-PROD.md` como URL de produção, enquanto divergir do workflow (ver Fase 0)

## Fase 0 — Confirmar o ambiente que o workflow descreve

**Resultado.** Uma URL de API, uma URL de web e um ACR, os mesmos em `deploy.yml`, `STATE.json` e `docs/INFRA-PIM-PROD.md`.

**Por que agora.** O checkout tem dois pares (ACR `acredgestpimedu` + host `kindcliff` versus ACR `acredgestpimprod` + host `purpleground`). Documentar ou automatizar em cima do par errado aponta smoke e suporte para um app que o workflow não atualiza.

**Aceite.**

- Os três arquivos citam o mesmo `ACR_NAME`, o mesmo `API_URL` e o mesmo frontend.
- `bash scripts/qa-frontend-production.sh` sem argumento usa essa URL de frontend (hoje o default é `purpleground`; o workflow passa `kindcliff` na linha do smoke).
- `GET {API_URL}/api/health` responde 200. Anotar o JSON real de `services` (o tipo atual não tem `graph`).

**Dependências.** Acesso à subscription. Este mapeamento não chamou a Azure. Se as duas infras existirem, a decisão de qual é a canônica é do Cleverson.

**Bloqueio.** Sem essa confirmação, as fases seguintes de deploy não devem mudar `deploy.yml`.

## Fase 1 — Uma identidade de catálogo

**Resultado.** Cada produto vendável tem um slug, um `codigo` e, quando for item Sankhya, o mesmo `erp_code` no banco e no `SANKHYA_CATALOG`. Códigos `BB-*` das specs ou entram nessa tabela ou saem das regras executáveis.

**Por que antes do restante.** Matching, apresentação obrigatória e export ERP leem identificadores diferentes. Fechar IA ou Copilot em cima disso grava documento com o produto errado.

**Aceite.**

- Tabela (no seed ou num teste) cobre os 15 ids de `PRODUCT` em `matchingAgentV3.ts`.
- Teste que falha se um slug do catálogo não existe no seed, ou o contrário para esses 15.
- `ApresentacaoForm.tsx` e `SPEC-APRESENTACAO.md` citam o mesmo identificador para Suporte M365.
- `generateNextProductCode()` não emite um `codigo` que o matching não reconhece, ou o produto novo fica de fora de sugestão enquanto `status = RASCUNHO` (regra já escrita em `STATE.json` → `business_rules`; falta teste que mostre a sugestão recusando `RASCUNHO`).

**Dependências.** Fase 0 não bloqueia esta. Bloqueia a decisão se `BB-SERV-SUP-001` deve substituir `109101` / `suporte-m365` ou se a spec é que será reescrita. Não inventar o mapeamento `BB-*` → slug: a spec lista nomes, o código lista outros códigos, e não há arquivo que una os dois.

## Fase 2 — Export ERP bloqueado de ponta a ponta

**Resultado.** Qualquer saída chamada de export ERP, com fiscal pendente, sai com `blocked: true` e sem payload de importação. O critério é o mesmo nos três caminhos.

**Por que nesta ordem.** O catálogo (Fase 1) diz qual produto é exportável. Sem isso, o bloqueio fiscal acerta um código e erra o outro.

**Aceite.**

- `GET /api/products/:slug/export/erp` com `fiscalStatus = A_VALIDAR` continua 400 `BLOCKED_EXPORT` (`products.ts`; já há teste de export em `apps/api/src/__tests__/docGenerator.test.ts` para `generateErpExport`).
- `generateErpExport` deixa de incluir dados importáveis quando `blocked` é true (hoje inclui `produto`). Inspeção do JSON em `exports/{slug}-ERP.json`.
- `erpSankhyaMapperV2` e o enum Prisma usam o mesmo token (`A_VALIDAR` ou `A VALIDAR`, um só). Caso com bloqueio: `exports.erp.payload === null` no objeto que passa por `transformToV4`.
- Decisão registrada sobre `cadastroStatus`: criar o campo em `schema.prisma` (isso muda contrato de dados e exige o Cleverson) ou retirar a menção de `CLAUDE.md` / `docs/AGENTS.md`. Não criar a coluna neste roadmap sem essa decisão.

**Dependências.** Fase 1 para o código do produto. A coluna nova é bloqueio de produto, não de documentação.

## Fase 3 — Blob como destino dos documentos de produto

**Resultado.** Geração de docs e de PPTX grava só no container configurado. Specs e logs deixam de mandar o operador ao SharePoint para esse fluxo. Graph permanece apenas no `POST /api/publish` do solution pack, até alguém decidir desligar.

**Por que depois do ERP.** O JSON de export entra no pacote publicado. Publicar antes de fechar o bloqueio espalha payload que a regra manda reter.

**Aceite.**

- `publishProductDocuments` e `uploadPresentation` seguem em `blobStorage.ts`.
- Log de `generateProductContentInBackground` não chama o destino de “SharePoint” quando a função é a do Blob (`products.ts`).
- `SPEC-GERACAO-DOCS.md` descreve o prefixo `{container}/{slug}/` e os nomes reais (`{slug}-MARKETING.md`, etc.), ou um comentário no topo aponta o código como vigente e a árvore SharePoint como histórica.
- `GET /api/health` com connection string inválida devolve `services.storage: unreachable`. Com string ausente, `not_configured`.
- Upload repetido do mesmo blob não cria segunda cópia (overwrite do Block Blob no mesmo path). Checagem: dois `POST /api/products/:slug/generate-docs` e um único blob por nome.
- `POST /api/apresentacoes/gerar-e-publicar` sem storage devolve `PARTIAL_SUCCESS` e o aviso `UPLOAD_FAILED`, não 200 mudo.

**Dependências.** `AZURE_STORAGE_CONNECTION_STRING` no Container App. Sem a variável, o código já falha o upload e segue o ramo parcial; não reativar SharePoint por causa disso. `STATE.json` trata o Graph como desativado para este destino e o client secret do app SharePoint como inválido.

## Fase 4 — Inteligência do cadastro, sem preço inventado às cegas

**Resultado.** Financeiro gerado por IA continua revisável. Marketing e onboarding automáticos passam a ser definição explícita: ou preenchem campos do `Product`, ou ficam só como visão `.md`. O prompt deixa de assumir um cliente que as specs não citam.

**Por que agora.** As fases 1–3 fixam produto, bloqueio e arquivo. Gerar texto antes disso indexa conteúdo frágil. `STATE.json` → `next_tasks` coloca esta geração como primeiro item aberto; o código já gera as visões e ainda não preenche o bloco.

**Aceite.**

- `completeProductWithAI` (`productAiCompleter.ts`) documentado pelo que grava hoje: `precoBaseUnitario`, `margemSugerida`, `descontoMaximo`, `faixasPreco`, `pacotesCredito` (só se `modeloContratado = CREDITO`).
- Critério único, escrito na spec ou no `STATE.json`: “Fase 4.2” significa (a) preencher `contextoGeral`, `porQueExiste`, `scriptVenda`, `tagsCopilot` etc., ou (b) apenas os `.md` de `MARKETING` e `ONBOARDING`. Hoje (b) existe em `generateVisionDocument`; (a) não está em `completeProductWithAI`.
- Sem `ANTHROPIC_API_KEY`, `generateWithAI` devolve mock (`aiClientWrapper.ts`) e o log indica o modo. `generateFinanceiroFields` não passa por esse wrapper: chama o SDK direto e, no erro, `completeProductWithAI` devolve o produto sem preço. Teste sem chave não pode marcar o financeiro como gerado.
- O prompt não descreve “Banco do Brasil”, a menos que o Cleverson confirme esse posicionamento. As specs de preço falam em escola e rede (`SPEC-PRECIFICACAO.md`).
- `precificacaoStatus` não vai a `PUBLICADO` só porque a IA respondeu. A UI de revisão é `FinancialEditPanel` / `edit-ai-content`.

**Dependências.** Fases 1 e 3. Calculadora variável da fase 2 de `SPEC-PRECIFICACAO.md` (Azure/SQL) fica fora: a própria spec reserva isso e não há módulo no código.

## Fase 5 — Oportunidade só com etapa real

**Resultado.** `POST /api/analyze` ou executa agentes de verdade, ou devolve `PARTIAL_SUCCESS` / erro quando a etapa ainda é stub. Solution Pack que passou na validação pode ser gravado nos models que já existem. Nenhum produto recomendado sai de fora do catálogo da Fase 1.

**Por que por último no produto.** `STATE.json` trata o analyze como funcionalidade secundária. Endurecer stub antes do catálogo único só congela a lista errada.

**Aceite.**

- `stepRegistry.ts`: etapas que ainda retornam texto fixo não contam como `SUCCESS` sozinhas. Inspeção do array `steps` / `errors` de `POST /api/analyze`.
- Resposta valida contra `schemas/solution_pack.schema.json` (já feito em `analyze.ts` quando a transformação passa).
- Com `DATABASE_URL`, existe linha em `SolutionPack` para o `executionId`, ou a spec `SPEC-API.md` (persistir se houver banco) é explicitamente adiada. Hoje `PersistSolutionPack` retorna `true` e `analyze.ts` não usa Prisma.
- `POST /api/publish` permanece o caminho do solution pack (local ou `PUBLISH_MODE=sharepoint`). Não apontar esse publish para o Blob sem decisão: são fluxos diferentes (`publisherFactory.ts` vs `blobStorage.ts`).
- `GET /api/opportunities/:id/solution-pack` só entra quando a persistência existir. A spec marca a rota como pós-MVP.

**Dependências.** Fases 1 e 2. Contrato V4 não muda.

## Fase 6 — Operação que falha quando tem que falhar

**Resultado.** Boot não aplica schema com perda de dados aceita por padrão. CI reprova teste quebrado. Health distingue “variável presente” de “banco alcançável”. Chave de API cobre as rotas que a spec marca como protegidas, ou a isenção fica escrita como decisão.

**Por que no fim.** É o que segura as fases anteriores. Fazer migrations no meio da Fase 1, com dois ACRs possíveis, mistura mudança de schema e dúvida de ambiente.

**Aceite.**

- `start.js` não chama `prisma db push --accept-data-loss` em todo boot, ou o comando fica atrás de uma flag explícita de emergência. Schema novo entra por migration revisada. Pasta `prisma/migrations` passa a existir.
- `.github/workflows/deploy.yml`: `npm run test --workspace=@edugest-pim/api` sem `|| true`. O limiar de 70% em `apps/api/jest.config.js` só passa a quebrar o job quando a suíte estiver verde com cobertura; até lá, registrar o número medido (`npm run test:coverage`) em vez de repetir os 76% do `STATE.json`.
- Lint do web: ou o job deixa de usar `|| true`, ou o débito citado em `STATE.json` → `risks` vira tarefa com a lista de regras, sem bloquear o deploy de documentação.
- `health.ts`: `services.database` sai de uma query (por exemplo `SELECT 1` via Prisma), não da presença de `DATABASE_URL`.
- `auth.ts`: pedido sem `X-Api-Key` para `/api/analyze` e `/api/publish` responde 401, **ou** o Cleverson registra que essas duas rotas são públicas de propósito. `SPEC-API.md` hoje exige a chave. O proxy web já manda a chave nas rotas de produto.

**Dependências.** Fase 0 para qualquer mudança de boot em produção. A decisão da API key é bloqueio de produto: fechar a rota muda clientes que hoje chamam analyze sem header.

## Fora deste roteiro

Não puxar para a frente, porque não há implementação e a spec marca como depois:

- Login Azure AD (decisão de 2026-05-24 em `docs/DECISOES.md`)
- Fila assíncrona e polling de `executionId` (`SPEC-API.md` §0.4)
- Evals de `SPEC-EVALS.md` (arquivado em `STATE.json`)
- Calculadora de preço variável (`SPEC-PRECIFICACAO.md` fase 2)
- Integração direta com Sankhya ou Ploomes (as specs de API e Graph dizem que a saída é artefato, não chamada ao ERP)

## Bloqueios para o Cleverson

1. Qual par infra é o de produção: `kindcliff` / `acredgestpimedu` (workflow e `STATE.json`) ou `purpleground` / `acredgestpimprod` (`docs/INFRA-PIM-PROD.md`).
2. `BB-*` substitui o código numérico do Sankhya, ou as specs passam a usar slug + `erp_code`.
3. Criar `cadastroStatus` ou apagar a regra.
4. Fase 4.2 preenche campo do produto ou só gera markdown.
5. `/api/analyze` e `/api/publish` passam a exigir `X-Api-Key` ou permanecem públicos.
6. O prompt de precificação pode citar Banco do Brasil ou deve falar só do portfólio educacional das specs.
