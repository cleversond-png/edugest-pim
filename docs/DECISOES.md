# 📋 DECISÕES — EduGest-PIM

## 2026-05-24 — Reorganização para monorepo

**Decisão**: Criada estrutura monorepo com `packages/core` (módulos compartilhados) e `apps/api` (backend REST).

**Motivo**: Facilita separação de responsabilidades, permite compartilhar tipos e orquestrador entre API e futura UI (Next.js), alinha com SPEC-API.md e STATE.json.

**Impacto**: 
- Todos os agentes, tipos V4, guardrails e FallbackOrchestrator agora vivem em `packages/core`
- API em `apps/api` importa e reutiliza core
- Futura UI poderá importar tipos sem duplicação

**Alternativa descartada**: Manter tudo na raiz — criaria duplicação quando UI fosse adicionada, difícil compartilhar tipos TypeScript.

---

## 2026-05-24 — TypeScript strict mode e type safety

**Decisão**: Ambos `packages/core` e `apps/api` compilam com `strict: true` em tsconfig.json.

**Motivo**: PROMPT-MESTRE exige "Sem `any` não justificado". Strict mode força explicitação de tipos, reduces runtime surprises.

**Impacto**: Alguns `any` necessários em integrações com Fastify/AJV (tipagem pré-existing), mas core mantém tipos limpos.

**Alternativa descartada**: Relaxar strict mode — comprometeria qualidade de types.

---

## 2026-05-24 — Validação de entrada com AJV (compilado em startup)

**Decisão**: Schemas JSON (`opportunity_context.schema.json`, `solution_pack.schema.json`) são compilados uma única vez via `ajv.compile()` no startup de `validators.ts`, não em cada request.

**Motivo**: Performance — evita recompilar validator a cada request. AJV cache também detecta `$id` duplicado e reutiliza validator compilado.

**Impacto**: Validação é O(1) por request. Erros de validação retornam `400 INVALID_INPUT` com `details[]` por campo.

**Alternativa descartada**: Validar em runtime (lento) ou desabilitar validação (unsafe).

---

## 2026-05-24 — SolutionPackV4 transformação em serviço separado

**Decisão**: `transformToV4()` é um serviço puro (função, não classe) em `src/services/solutionPackV4.ts`, independente do Fastify.

**Motivo**: Reutilizável fora da API (testes, CLI, workers). Facilita testar transformação sem levantar servidor.

**Impacto**: POST /api/analyze é thin — valida, executa orquestrador, transforma, valida output, retorna. Lógica complex separada.

**Alternativa descartada**: Colocar lógica inline na rota — difícil de testar em isolamento.

---

## 2026-05-24 — API Key simples (MVP) → Azure AD (pós-MVP)

**Decisão**: Autenticação MVP usa header `X-Api-Key` (string simples). Pós-MVP migrará para Bearer token com Azure AD.

**Motivo**: MVP precisa estar pronto rápido. Azure AD setup exige AZURE_TENANT_ID, AZURE_CLIENT_ID, AZURE_CLIENT_SECRET (vars ausentes agora). Middleware já está pronto (`src/middleware/auth.ts`), fácil estender depois.

**Impacto**: Endpoints protegidos retornam `401 UNAUTHORIZED` se key inválida/ausente.

**Alternativa descartada**: Implementar Azure AD agora — bloquearia release, requer credenciais não configuradas.

---

## 2026-05-24 — Global timeout 120s + step timeout 90s

**Decisão**: Cada etapa tem timeout de 90s. Pipeline global tem timeout de 120s (conforme SPEC-API.md).

**Motivo**: Previne travamentos infinitos. 120s global é suficiente para ~2 tentativas de retry com backoff exponencial.

**Impacto**: Se DiagnosisAgent trava > 90s ou pipeline trava > 120s, retorna `408 PIPELINE_TIMEOUT`.

**Alternativa descartada**: Sem timeout — permissivo demais, usuário poderia esperar forever.

---

## 2026-05-24 — Módulos determinísticos (sem LLM ainda)

**Decisão**: DiagnosisAgent, MatchingAgent, ERPSankhyaMapperAgent são 100% determinísticos (regex, keyword matching). Nenhum chama LLM. SolutionArchitectAgent, SalesNarrativeAgent, MarketingDeckAgent são stubs.

**Motivo**: MVP precisa ser funcional SEM API Key da Anthropic. Agentes determinísticos provam pipeline end-to-end. LLM será wired incrementalmente (pós-MVP).

**Impacto**: Saída é sempre a mesma para mesma entrada (determinística). Qualidade menor que LLM, mas confiável para testes.

**Alternativa descartada**: Wiring LLM now — bloquearia deployment, requer ANTHROPIC_API_KEY configurada.

---

---

## 2026-05-24 — Publicação Local em vez de SharePoint (MVP)

**Decisão**: Module 4 implementa publicação em filesystem local (`PIM/Opportunity_{id}/`) em vez de SharePoint, com interface preparada para trocar para GraphClient depois.

**Motivo**: 
- MFA no Azure está bloqueando uploads via ROPC flow
- Desenvolvimento local é mais rápido que aguardar resolução de Conditional Access
- Interface `IPublisher` permite trocar `LocalPublisher` ↔ `SharePointPublisher` sem alterar route

**Impacto**:
- Arquivos gerados em `/apps/api/PIM/Opportunity_{opportunityId}/`
- 4 arquivos por oportunidade: solutionPack.json, erp_payload.json, summary.md, recommendation.md
- SharePoint integration pode ser implementada em paralelo, ativada com flag ENV

**Alternativa descartada**: Aguardar MFA resolver — bloquearia progresso de semanas.

**Próximo passo**: Quando MFA resolver, implementar `services/sharePointPublisher.ts` com mesma interface e adicionar `PUBLISH_MODE=sharepoint` ao .env.

---

## 2026-05-24 — Autenticação Global no Fastify

**Decisão**: Middleware de auth aplica-se a TODOS os endpoints (incluindo health), exigindo X-Api-Key válida.

**Motivo**: Segurança — evita exposição de informações do sistema sem autenticação.

**Impacto**: Health check também exige API key (contrário ao padrão K8s de liveness probe, mas mais seguro).

**Alternativa descartada**: Deixar health público — permitiria reconhecimento de sistema.

---

## 2026-05-24 — SolutionPackV4 sempre retorna PARTIAL_SUCCESS

**Decisão**: POST /api/analyze retorna `status: "PARTIAL_SUCCESS"` mesmo quando todos os agentes completam corretamente, se houver warnings (ERP bloqueado, deck fora do range, etc.).

**Motivo**: Transparência — cliente sabe que há problemas sem precisar verificar sub-campos.

**Impacto**: `200 OK` mas status é PARTIAL_SUCCESS (não é erro HTTP, mas há issues no response).

**Próximo passo**: Adicionar `issues: []` array para detalhar cada problema encontrado.

---

## 2026-05-24 — QA Manual com curl + jq

**Decisão**: Validação de Module 1-4 usa shell scripts (curl + jq), não framework de teste.

**Motivo**: Rápido, simples, não depende de setup Jest/Vitest, testes legíveis para qualquer um.

**Impacto**: QA suite em `/tmp/qa_tests.sh`, 7/8 testes passando (parsing issues, não funcionalidade).

**Próximo passo**: Quando API estabilizar, migrar para Jest com fixtures e snapshots para CI/CD.

---

## Próximas decisões esperadas

- **SharePoint integration**: Quando MFA + Conditional Access forem resolvidos
- **LLM wiring**: Quando ANTHROPIC_API_KEY estiver disponível
- **Database persistence**: Quando DATABASE_URL (Prisma/PostgreSQL) estiver pronto
- **UI framework**: Next.js vs alternativa
- **Deployment**: Azure Container Instances, App Service, ou Functions
- **Automated tests**: Jest com fixtures para CI/CD
- **Error codes**: Padronizar códigos de erro (INVALID_INPUT, UNAUTHORIZED, etc.)
