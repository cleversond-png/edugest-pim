# SPEC-EVALS — Testes e Critérios de Aceite (EduGest‑PIM)

> Este documento define a suíte de **testes**, **métricas** e **critérios de aceite** para o runtime multi‑agente do **EduGest‑PIM / Central Inteligente de Produto**.
>
> Foco: evitar retrabalho, garantir consistência de saídas (JSON/MD/HTML) e controlar custo (tokens) por etapa.

---

## 1) Objetivos

1. Garantir que o runtime entregue saídas **estruturadas** (JSON válido + docs geradas) para cada oportunidade.
2. Garantir **governança** (não inventar produto/feature; respeitar dependências; bloquear export ERP quando “A_VALIDAR”). citeturn2search2
3. Garantir **orquestração e rastreabilidade** (telemetria por etapa; execução com retry/backoff; falhas parciais controladas). citeturn14search226
4. Garantir **economia de tokens** via context assembly (não enviar catálogo inteiro) e model routing por etapa.
5. Garantir que o processo “transcrição → template → artefatos” esteja testado com cenários reais de automação discutidos internamente. citeturn15search269

---

## 2) Escopo

### 2.1 Dentro do escopo (MVP)
- Testes do pipeline:
  - Diagnosis → Matching → Presales → Sales → Deck → ERP Export → Partner Export → Docs Bundle
- Validação de:
  - JSON estrito (mapeadores)
  - árvore de arquivos do bundle
  - bloqueios de export
  - telemetria (modelRouting/tokenUsage)

### 2.2 Fora do escopo (agora)
- Publicação real no SharePoint (modo PUBLISH) pode ser testada como **integração** quando implementada.
- Integrações diretas com sistemas externos (ERP/CRM/Partner via API) — por decisão do produto, ficam para fase futura.

---

## 3) Tipos de testes (camadas)

### 3.1 Contract tests (contratos e schemas)
**Objetivo:** garantir que entradas/saídas respeitam os contratos.
- `OpportunityContext` válido
- `SolutionPack` válido
- `RenderResult` válido

**Critério de aceite:**
- 100% dos contratos passam validação JSON Schema.

### 3.2 Unit tests (funções determinísticas)
- Inferência de solution areas a partir de capabilities
- Cálculo de preço por faixa e derivação de plano (se aplicável)
- Regras de bloqueio do ERP (A_VALIDAR → blocked)
- Montagem da árvore de docs (paths)

**Critério de aceite:**
- Cobertura mínima sugerida: 80% em funções determinísticas (ajustável no CI).

### 3.3 Golden tests (casos fixos, regressão)
**Objetivo:** impedir regressão silenciosa do pipeline.
- Dado um input fixo (transcrição + CRM payload), a saída deve:
  - manter estrutura
  - manter decisões (produto escolhido) dentro de tolerância
  - manter bloqueios e campos obrigatórios

### 3.4 E2E tests (pipeline completo)
- Cria oportunidade
- Insere transcrição
- Executa runtime
- Persiste `SolutionPack`

**Critério de aceite:**
- Execução completa com status SUCCESS ou PARTIAL_SUCCESS (com motivo) e persistência do SolutionPack.

### 3.5 Load/Cost tests (tokens e latência)
- Rodar N execuções (ex.: 20) com inputs médios
- Medir tokens por etapa e total
- Medir tempo por etapa

**Critério de aceite (MVP):**
- Limites configuráveis por `agent_runtime.yaml`.

---

## 4) Dataset de avaliação (fixtures)

### 4.1 Regras para fixtures
- **Sem PII**: nomes reais, e-mails, domínios reais e dados sensíveis devem ser removidos.
- Incluir 3 classes de transcrição:
  1) curta (1–2 min)
  2) média (5–10 min)
  3) longa (20+ min) — usada para testar context assembly

### 4.2 Estrutura de arquivos

```
/evals
  /fixtures
    opportunity_min.json
    transcript_short.txt
    transcript_medium.txt
    transcript_long.txt
    crm_payload_min.json
  /expected
    expected_diagnosis.json
    expected_recommendation.json
    expected_exports_erp.json
    expected_exports_partner.json
    expected_deck_outline.md
  /schemas
    opportunity_context.schema.json
    solution_pack.schema.json
    render_result.schema.json
```

### 4.3 Casos mínimos (MVP)

#### Caso A — “Discovery típico”
- Transcrição média
- Esperado:
  - Diagnóstico com dores + objetivos
  - Matching com 1 recomendação e justificativa
  - Deck com 7–10 slides e slides 2/3 personalizados

#### Caso B — “ERP bloqueado por fiscal”
- Produto com `ERPMappingSankhya.fiscalStatus = A_VALIDAR`
- Esperado:
  - `exports.erp.blocked = true`
  - `blockedReasons` inclui fiscal A_VALIDAR citeturn2search2

#### Caso C — “Dependência comercial”
- Produto A depende de Produto Base
- Esperado:
  - Recommendation inclui dependência explícita
  - Não aprova recomendação se dependência não estiver atendida

#### Caso D — “Transcrição longa / economia de tokens”
- Transcrição longa
- Esperado:
  - Context assembly limita trechos
  - Token budget dentro do limite

---

## 5) Critérios de aceite por etapa (agentes)

> Para cada agente, definimos **checks determinísticos** (pass/fail) + **checks qualitativos** (score).

### 5.1 DiagnosisAgent
**Pass/Fail (determinístico)**
- Retorna JSON válido conforme schema.
- Preenche ao menos: `pains[]`, `objectives[]`, `constraints[]`, `maturity`, `complexity`.
- Campos não evidenciados devem ser marcados como “não evidenciado”.

**Score (qualitativo) — 0 a 5**
- Cobertura: dores identificadas vs dores explícitas na transcrição.
- Precisão: evita inventar informações.

**Aceite:**
- Pass/Fail: PASS
- Score: ≥ 4

### 5.2 MatchingAgent
**Pass/Fail**
- Produtos recomendados existem no catálogo (by `productId`/`slug`).
- Não recomenda produto fora do catálogo.
- Respeita `DependencyRule` e retorna `required_dependencies`.

**Score**
- Justificativa cita evidências da transcrição (frases/trechos).
- Clareza do porquê.

**Aceite:** PASS + score ≥ 4

### 5.3 SolutionArchitectAgent (Pré‑venda)
**Pass/Fail**
- Retorna arquitetura HLD (texto) + lista de requisitos + riscos/mitigações + fases.
- Não cria componentes não suportados pelo produto (usar catálogo como verdade).

**Score**
- Requisitos coerentes com as restrições do diagnóstico.
- Riscos práticos e mitigáveis.

**Aceite:** PASS + score ≥ 4

### 5.4 SalesNarrativeAgent
**Pass/Fail**
- Retorna narrativa + pelo menos 5 objeções/respostas + próximos passos.
- Não menciona marca/empresa dentro do conteúdo gerado (produto neutro).

**Score**
- Linguagem objetiva e consultiva.

**Aceite:** PASS + score ≥ 4

### 5.5 MarketingDeckAgent
**Pass/Fail**
- Gera 7–10 slides.
- Slide 2 (cenário) e 3 (dores) devem conter conteúdo diretamente derivado da transcrição.
- Se não houver logo, inclui instrução “placeholder”.

**Score**
- Clareza da narrativa.
- Personalização (2+ elementos específicos do cliente).

**Aceite:** PASS + score ≥ 4

### 5.6 ERPSankhyaMapperAgent
**Pass/Fail**
- JSON válido.
- Contém campos principais do padrão (tipo receita/despesa, ativo, grupo, código, descrição, unidade, ISS etc.). citeturn2search2
- Se `fiscalStatus` ou `cadastroStatus` = `A_VALIDAR`, deve marcar `blocked=true`. citeturn2search2

**Aceite:** PASS

### 5.7 PartnerCenterMapperAgent
**Pass/Fail**
- JSON válido.
- Contém `offerType`, `listing` (title/short/long), `markets`, `languages`, `keywords`, `solutionAreas`, `plans`.
- `solutionAreas` deve ser consistente com capabilities do produto.

**Aceite:** PASS

### 5.8 DocsPublisherAgent (Renderer)
**Pass/Fail**
- Gera árvore completa de arquivos (README, index.html, dimensões, kits, exports, _index) conforme spec. citeturn1search1
- Conteúdos não vazios nos arquivos principais.

**Aceite:** PASS

---

## 6) Critérios globais (pipeline)

### 6.1 “Não inventar” (hallucination guardrail)
- Nenhum output pode citar:
  - produto inexistente
  - feature não cadastrada
- Se faltar dado, deve marcar como “não evidenciado”.

### 6.2 Economia de tokens
- Context assembly deve limitar:
  - número de produtos
  - número de docs por dimensão
  - número de kits
- Deve registrar `tokenUsage` e `modelRouting` no `SolutionPack`.

### 6.3 Orquestração, falhas e retry
- Execução registra status por etapa.
- Falhas transitórias devem fazer retry (até o limite), alinhado ao padrão de retry/backoff. citeturn14search226

### 6.4 Persistência
- Sempre persistir `SolutionPack` mesmo em `PARTIAL_SUCCESS` (com `errors[]`).

---

## 7) Métricas e thresholds (configuráveis)

> Defina thresholds no CI/CD, não hardcode no código.

### 7.1 Métricas mínimas
- `totalTokens` por execução
- tokens por etapa
- tempo por etapa
- número de retries
- taxa de bloqueio ERP (quando aplicável)

### 7.2 Exemplo de budgets (placeholder)
- `DiagnosisAgent`: até X tokens
- `MatchingAgent`: até Y tokens
- Total: até Z tokens

---

## 8) Ferramenta de avaliação (harness)

### 8.1 Execução
- Um runner (`npm run evals`) deve:
  1) carregar fixture
  2) executar runtime (DRY_RUN)
  3) validar schemas
  4) comparar saídas com expected (golden)
  5) registrar métricas

### 8.2 Comparação de saídas
- Para JSON: comparação estruturada com tolerância por campos não determinísticos (timestamps).
- Para textos (deck/README):
  - verificar presença de seções
  - verificar número de slides
  - verificar presença de 2+ elementos específicos do input

---

## 9) Checklist de aceite (release)

Para aprovar um release do runtime:
- Todos contract tests PASS
- Todos unit tests PASS
- Golden tests: 0 regressões críticas
- E2E: PASS em 3 casos (A/B/C) + 1 caso longo
- Token/cost: dentro do budget
- Logs e telemetria presentes

---

## 10) Rastreabilidade com processo consultivo

A automação “reunião/transcrição → template → gerar artefatos e, futuramente, preencher campos via API” é o norte do produto e deve ser coberta pelos testes E2E (caso A e D). citeturn15search269
