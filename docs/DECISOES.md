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

## 2026-05-26 — Fontes do sistema no frontend

**Decisão**: Remover `next/font/google` do frontend e usar fontes do sistema em `apps/web/app/globals.css`.

**Motivo**: O build do Next.js não deve depender de download externo do Google Fonts para publicar correções visuais ou manter a URL externa operacional.

**Impacto**: Frontend builda de forma mais previsível em CI/CD e ambientes sem rede externa; aparência usa Arial/Helvetica e fonte monospace do sistema. A imagem do frontend deve ser publicada como `linux/amd64` para Azure Container Apps.

**Alternativa descartada**: Manter Geist via Google Fonts — preservaria a tipografia anterior, mas deixaria o deploy vulnerável a falhas de rede durante `next build`.

---

## 2026-05-26 — Tailwind v4 via CSS-first

**Decisão**: Usar `@import "tailwindcss"` em `apps/web/app/globals.css`, com `@source "../app"` e `@source "../components"`.

**Motivo**: Em Tailwind CSS v4, o formato antigo `@tailwind base/components/utilities` gerou CSS parcial neste build, sem classes visuais de tema como cores, espaçamentos e radius.

**Impacto**: O CSS de produção volta a incluir os utilitários esperados (`bg-blue-600`, `text-gray-900`, `rounded-lg`, etc.) e fica menos dependente de autodetecção.

**Alternativa descartada**: Voltar para Tailwind v3 — exigiria downgrade de dependências e aumentaria o risco de regressão no Next.js 16.

---

## 2026-05-26 — Contraste nativo de selects

**Decisão**: Definir estilos globais para `select`, `option` e `option:checked` em `apps/web/app/globals.css`.

**Motivo**: O dropdown nativo herdava estilos/tema com contraste insuficiente, deixando as opções quase invisíveis em produção.

**Impacto**: Todos os campos dropdown usam texto escuro e fundo claro de forma consistente, independente do estilo nativo do navegador.

**Alternativa descartada**: Corrigir cada componente individualmente — deixaria risco de novos selects nascerem com o mesmo problema.

---

## 2026-05-26 — API Key somente no servidor Next

**Decisão**: Remover `NEXT_PUBLIC_API_KEY` do frontend e rotear chamadas protegidas por proxies Next server-side.

**Motivo**: Variáveis `NEXT_PUBLIC_*` entram no bundle/browser e violam a regra do projeto de manter `API_KEY` somente no servidor.

**Impacto**: Páginas client-side chamam `/api/products`, `/api/products/[slug]` e `/api/apresentacoes/gerar` no próprio frontend; esses handlers injetam `X-Api-Key` no servidor.

**Alternativa descartada**: Manter chamadas diretas do browser para a API com header público — simplifica integração, mas expõe credencial.

---

## 2026-05-26 — Deploy linux/amd64 e single revision

**Decisão**: Padronizar build Docker com `buildx --platform linux/amd64` e manter o frontend Container App em `single revision`.

**Motivo**: Azure Container Apps falhou ao puxar imagem sem plataforma compatível; modo multiple também permitiu revisões saudáveis ficarem sem tráfego.

**Impacto**: Deploy automático passa a publicar imagens compatíveis com o runtime e novas revisões recebem tráfego automaticamente.

**Alternativa descartada**: Build Docker padrão local — pode gerar manifest incompatível dependendo da máquina executora.

---

## 2026-05-27 — Backend EduGest-PIM como imagem canônica

**Decisão**: O Container App `ca-edugest-pim-api` deve rodar a imagem `acredgestpimprod.azurecr.io/edugest-pim-api:*`.

**Motivo**: O PIM precisa de backend dedicado com as rotas de catálogo, incluindo `/api/products`, sem depender de imagens ou automações de outro projeto.

**Impacto**: Deploys e rollbacks devem validar explicitamente a imagem ativa do backend antes de considerar produção saudável.

**Alternativa descartada**: Ajustar o frontend para contornar o 404 — o problema era a imagem errada no backend, não o contrato do frontend.

---

## 2026-05-27 — Prisma Client validado no build Docker

**Decisão**: O Dockerfile do backend deve gerar Prisma Client com `--schema=./schema.prisma` e validar o DMMF do modelo `Product` durante o build.

**Motivo**: A produção retornou 500 em `/api/products/:slug` porque o client gerado esperava a coluna legada `Product.name`, enquanto o schema/banco atual usam `nomeComercial`.

**Impacto**: Builds de backend falham cedo se o Prisma Client ficar incompatível com o schema atual, evitando publicar imagem que lista produtos mas quebra no detalhe.

**Alternativa descartada**: Migrar o banco para recriar `Product.name` — isso reintroduziria campo legado removido na Phase 4 e mascararia a inconsistência de build.

---

## 2026-05-27 — Página canônica de detalhe em `/products/:slug`

**Decisão**: Manter `/products/[slug]/page.tsx` como página canônica de detalhe e deixar `/products/[slug]/edit-ai-content` apenas para revisão/edição assistida por IA.

**Motivo**: A listagem de catálogo navega para `/products/:slug`; remover essa página quebrou o fluxo natural de clique no produto.

**Impacto**: O usuário volta a abrir detalhes ao clicar no card, com opção explícita para revisar IA; chamadas protegidas continuam passando por proxy server-side.

**Alternativa descartada**: Alterar os cards para abrir direto `/edit-ai-content` — resolveria o clique, mas misturaria visualização de catálogo com fluxo de revisão.

---

## 2026-05-27 — Ações primárias no detalhe de produto

**Decisão**: A tela `/products/:slug` deve expor explicitamente as ações `Voltar`, `Editar` e `Excluir`.

**Motivo**: O usuário espera operar o produto a partir da tela de detalhe; remover esses botões gerou regressão funcional apesar da rota carregar.

**Impacto**: `Editar` direciona para o fluxo Phase 4 em `/products/:slug/edit-ai-content`; `Excluir` usa o proxy server-side `DELETE /api/products/:slug` e retorna ao catálogo.

**Alternativa descartada**: Manter só o link `Revisar IA` no topo — ele não substitui as ações operacionais do detalhe.

---

## 2026-05-27 — Params assíncronos em páginas dinâmicas Next

**Decisão**: Páginas dinâmicas server-side em `apps/web/app/**/[slug]/**/page.tsx` devem tratar `params` como `Promise` e resolver antes de acessar `slug`.

**Motivo**: `/products/:slug/edit-ai-content` retornou 404 porque a página acessava `params.slug` diretamente, resultando em busca sem slug e `notFound()`.

**Impacto**: Rotas dinâmicas server-side ficam compatíveis com o comportamento atual do Next.js 16; rotas client-side com `useParams()` não são afetadas.

**Alternativa descartada**: Converter a tela de revisão para client component apenas para ler params — aumentaria JS no browser sem necessidade.

---

## 2026-05-27 — Infraestrutura dedicada EDUGEST-PIM

**Decisão**: Produção do EDUGEST-PIM deve usar Resource Group, ACR, Managed Identity, Container Apps e Log Analytics próprios: `rg-edugest-pim-prod`, `acredgestpimprod.azurecr.io`, `id-edugest-pim-prod`, `ca-edugest-pim-api`, `ca-edugest-pim-web-prod` e `log-edugest-pim-prod`.

**Motivo**: O ambiente anterior recebia atualizações de automações externas ao PIM, o que causava regressões como 404 em `/api/products`.

**Impacto**: Workflow, scripts de QA e documentação operacional passam a apontar somente para a infra dedicada do PIM.

**Exceção temporária**: A assinatura Azure bloqueou a criação de um segundo Container Apps Managed Environment. Os apps usam o Managed Environment existente até aumento de quota ou migração para outro runtime.

**Alternativa descartada**: Continuar restaurando manualmente após cada overwrite — resolve o incidente imediato, mas mantém a produção instável.

---

## Próximas decisões esperadas

- **SharePoint integration**: Quando MFA + Conditional Access forem resolvidos
- **LLM wiring**: Quando ANTHROPIC_API_KEY estiver disponível
- **Database persistence**: Quando DATABASE_URL (Prisma/PostgreSQL) estiver pronto
- **UI framework**: Next.js vs alternativa
- **Deployment**: Azure Container Instances, App Service, ou Functions
- **Automated tests**: Jest com fixtures para CI/CD
- **Error codes**: Padronizar códigos de erro (INVALID_INPUT, UNAUTHORIZED, etc.)
