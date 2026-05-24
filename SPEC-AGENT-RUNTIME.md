# SPEC-AGENT-RUNTIME — Runtime Multi‑Agente (EduGest‑PIM)

> Este documento define o **runtime de agentes** do **EduGest‑PIM / Central Inteligente de Produto**.
> O runtime executa o pipeline: **Transcrição → Diagnóstico → Matching → Pré‑venda → Comercial → Deck → Exports → Docs**.
>
> Nesta versão (MVP+), **não há integração direta** com sistemas externos; o runtime gera **artefatos e exports** (JSON/MD/HTML) para consumo manual/automatizado futuro.

---

## 0) Princípios (não‑negociáveis)

### 0.1 Orquestração centralizada
O runtime usa **orquestração centralizada** para garantir controle, monitoramento e rastreabilidade — a mesma racionalidade aplicada em decisões arquiteturais de orquestração e retry em integrações. citeturn14search226

### 0.2 Assíncrono com retry
As execuções devem suportar **retry com backoff** e registro de falhas (DLQ conceitual), pois o processo envolve múltiplas etapas e pode falhar parcialmente. citeturn14search226

### 0.3 Governança e auditabilidade
Toda execução gera um **ExecutionRun** (conceito) e persiste o resultado no `SolutionPack` (modelo já previsto no schema). O objetivo é conseguir explicar: *o que foi usado como contexto, que modelos foram usados, qual saída foi gerada.*

### 0.4 Economia de tokens por design
- **Nunca** enviar catálogo completo.
- Usar **context assembly** com “só o necessário” (README + dimensões/kits relevantes).
- Usar **roteamento de modelo** por etapa (barato para extração/estruturação; forte para síntese/arquitetura).

> Observação: as regras acima são complementares ao modelo de dados que já armazena `modelRouting` e `tokenUsage` no `SolutionPack`.

---

## 1) Componentes do Runtime

### 1.1 Orchestrator (Supervisor)
Agente supervisor responsável por:
- validar entrada
- decidir rota de execução
- chamar agentes especialistas
- consolidar saídas
- controlar retries/timeouts

A ideia de um agente supervisor (roteador) e time de agentes é comum em propostas internas de agentes e arquitetura de agentes. citeturn14search251turn14search253

### 1.2 Agentes especialistas (mínimo)
- `DiagnosisAgent`
- `MatchingAgent`
- `SolutionArchitectAgent` (pré‑venda)
- `SalesNarrativeAgent` (comercial)
- `MarketingDeckAgent`
- `ERPSankhyaMapperAgent`
- `PartnerCenterMapperAgent`
- `DocsPublisherAgent`

A motivação de automação “reunião → template → preencher via API / gerar artefatos” aparece explicitamente em discussão de automação e templates com agentes. citeturn14search295

### 1.3 RAG / Retrieval (sem vetor obrigatório no MVP)
No MVP, a recuperação pode ser:
- **SQL/Full‑text** por produto/kit/dimensão
- **busca por capability**

No pós‑MVP, plugar indexação vetorial (Azure AI Search, etc.) é compatível com a visão de embeddings/índices e tuning. citeturn14search251

### 1.4 Templates e geração
O runtime consome `DocTemplate` e gera:
- `README.md`, `index.html`, dimensões/kits
- exports: `erp-export.json`, `partner-center.json`

---

## 2) Contratos de Entrada e Saída

### 2.1 Input do runtime: `OpportunityContext`
```json
{
  "opportunityId": "uuid",
  "transcript": {
    "text": "...",
    "language": "pt-BR",
    "source": "Teams|Stream|Upload"
  },
  "crmPayload": {"...": "..."},
  "constraints": {
    "productFilter": ["optional slugs"],
    "maxProducts": 5
  },
  "clientBranding": {
    "clientName": "...",
    "logoAssetId": "optional",
    "primaryColor": "#...",
    "secondaryColor": "#..."
  }
}
```

### 2.2 Output do runtime: `OpportunitySolutionPack`
O runtime deve persistir e também retornar (API):
```json
{
  "diagnosis": {},
  "recommendation": {},
  "presales": {},
  "sales": {},
  "marketing": {},
  "exports": {
    "erp": {"blocked": false, "payload": {}},
    "partner": {"payload": {}}
  },
  "docs": {"files": []},
  "telemetry": {"modelRouting": {}, "tokenUsage": {}}
}
```

---

## 3) Grafo de Execução (DAG)

### 3.1 Fluxo padrão
1. **ValidateInput** (Orchestrator)
2. **ContextAssembly** (RAG)
3. **DiagnosisAgent**
4. **MatchingAgent**
5. **SolutionArchitectAgent** (somente se complexidade != BAIXA)
6. **SalesNarrativeAgent**
7. **MarketingDeckAgent**
8. **ERPSankhyaMapperAgent**
9. **PartnerCenterMapperAgent**
10. **DocsPublisherAgent** (gera bundle)
11. **PersistSolutionPack**

### 3.2 Execução condicional
- Se não houver `clientBranding.logoAssetId`, o deck **deve** gerar instruções “placeholder para logo”.
- Se `ERPMappingSankhya.fiscalStatus = A_VALIDAR`, marcar export ERP como `blocked=true`. (regra de governança do ERP) citeturn2search2

---

## 4) Context Assembly (economia de tokens)

### 4.1 Regra “menos é mais”
Contexto enviado para agentes deve ser **composto** por:
- `Product README` (alto sinal)
- até **N** trechos de `ProductDimensionDoc` relevantes
- até **N** trechos de `ProductKit` relevantes

### 4.2 Estratégia de recuperação (MVP)
- Passo 1: determinar capabilities candidatas
  - baseado em palavras‑chave da transcrição (heurística) + filtros do usuário
- Passo 2: buscar produtos que possuam essas capabilities
- Passo 3: para cada produto candidato, recuperar:
  - 1) resumo (campos canônicos)
  - 2) SalesKit + PresalesKit (se existir)
  - 3) dimensão Técnico (arquitetura/requisitos) e Comercial (preço/objeções)

> Pós‑MVP: substituir heurística por embedding + índice (compatível com roadmap de embeddings/índices). citeturn14search251

---

## 5) Roteamento de Modelos (Model Routing)

### 5.1 Por que roteamento existe
- Reduz custo (tokens) e latência.
- Usa modelo forte apenas onde há síntese complexa.

### 5.2 Perfil de execução (recomendação)
> **Recomendação** (não‑vinculante): configure modelos como aliases, por exemplo:
- `FAST_TEXT` (baixo custo)
- `REASONING` (alto raciocínio)
- `WRITER` (boa escrita)
- `JSON_STRICT` (alta aderência a JSON)

### 5.3 Mapa de etapas → alias
- DiagnosisAgent → `FAST_TEXT`
- MatchingAgent → `REASONING` (ou `FAST_TEXT` se catálogo pequeno)
- SolutionArchitectAgent → `REASONING`
- SalesNarrativeAgent → `WRITER`
- MarketingDeckAgent → `WRITER`
- ERPSankhyaMapperAgent → `JSON_STRICT`
- PartnerCenterMapperAgent → `JSON_STRICT`

### 5.4 Saída obrigatória de telemetria
Cada etapa deve registrar:
- modelo usado (alias + nome)
- inputTokens, outputTokens
- tempo
- status

Isso alimenta `SolutionPack.modelRouting` e `SolutionPack.tokenUsage`.

---

## 6) Garantias de Qualidade (Guardrails)

### 6.1 JSON Strict Mode
Para agentes mapeadores (ERP/Partner), o runtime deve:
- exigir JSON válido
- rejeitar campos fora do schema esperado
- aplicar validação antes de persistir

### 6.2 “Não inventar” (catálogo como verdade)
O MatchingAgent e os agentes de narrativa devem:
- citar produtos SOMENTE se existirem no catálogo
- não criar features inexistentes

### 6.3 Dependências comerciais
O MatchingAgent deve respeitar `DependencyRule` e explicitar dependências.

---

## 7) Retry, timeouts e falhas parciais

### 7.1 Estratégia de retry
- Retry com backoff para falhas transitórias (timeout, rate limit)
- Circuit breaker quando ocorrer falha repetida

A prática de retry/backoff e DLQ é alinhada ao racional de broker e retry documentado em arquitetura. citeturn14search226

### 7.2 Falhas parciais
- Se falhar MarketingDeckAgent, ainda assim persistir diagnóstico + recomendação
- Se falhar export ERP (bloqueado), permitir export Partner e docs

---

## 8) Observabilidade e auditoria

### 8.1 Logs por execução
- `executionId`
- etapa
- status
- erro normalizado

### 8.2 Artefatos
- salvar `inputSnapshot`
- salvar `deckOutlineMd`

---

## 9) Testes (MVP)

### 9.1 Testes unitários
- Context assembly retorna no máximo N trechos
- JSON strict valida export ERP/Partner
- Bloqueio de export ERP quando `A_VALIDAR` citeturn2search2

### 9.2 Teste E2E
- Criar oportunidade + transcrição
- Executar runtime
- Verificar `SolutionPack` persistido com:
  - diagnosis
  - recommendation
  - deck outline
  - exports

---

## 10) Integração com Copilot Studio (opcional)

Conceitos de agente, tópicos e orquestração podem ser aplicados em Copilot Studio quando você optar por publicar um agente. citeturn14search252

---

## 11) Definition of Done (runtime)
- Dada uma transcrição, o runtime gera `SolutionPack` completo.
- Não envia catálogo inteiro para modelos.
- Registra telemetria (modelRouting/tokenUsage).
- Respeita dependências e bloqueio ERP.
