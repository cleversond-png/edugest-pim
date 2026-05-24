# SPEC-SOLUTION-PACK-V4 — Contrato de Saída (EduGest-PIM)

> **Objetivo**: definir o contrato **SolutionPack V4** — o artefato central gerado pelo pipeline multi-agente.
>
> O V4 é a normalização e expansão do output atual do `FallbackOrchestrator`, tornando-o compatível com:
> - Persistência no banco (modelo `SolutionPack` do `schema.prisma`)
> - Publicação no SharePoint (via `SPEC-GRAPH.md`)
> - Validação formal via `solution_pack_schema.json`
> - Consumo pela UI (Next.js)
>
> Referências:
> - `CHECKPOINT.md` — descreve o contrato alvo V4
> - `solution_pack_schema.json` — schema formal (fonte de verdade)
> - `SPEC-AGENT-RUNTIME.md` — outputs de cada agente
> - `matchingAgentV3.ts` — tipos `MatchingV3Result` e `SankhyaProduct`

---

## 0) Motivação do V4

O pipeline atual (`FallbackOrchestrator` + `stepRegistry_example.ts`) produz um output parcialmente estruturado. O V4 padroniza:

1. **Diagnóstico** → campos explícitos (pains, objectives, constraints, maturity, complexity)
2. **Recomendação** → separada em 3 subcampos: `intelligence`, `business`, `strategy`
3. **Exports** → ERP com `blocked` + `blockedReasons` explícitos; Partner normalizado
4. **Telemetria** → `modelRouting` e `tokenUsage` por etapa
5. **Metadados** → `executionId`, `opportunityId`, `status`, `durationMs`

---

## 1) Estrutura completa V4

```typescript
export type SolutionPackV4 = {
  // ── Metadados da execução ──────────────────────────────────
  executionId: string                      // UUID da execução
  opportunityId: string                    // ID da oportunidade
  status: 'SUCCESS' | 'PARTIAL_SUCCESS' | 'FAILED'
  durationMs: number
  createdAt: string                        // ISO-8601

  // ── Diagnóstico ────────────────────────────────────────────
  diagnosis: DiagnosisOutput

  // ── Recomendação ───────────────────────────────────────────
  recommendation: RecommendationOutput

  // ── Agentes opcionais (null se não executados) ─────────────
  presales: PresalesOutput | null          // SolutionArchitectAgent
  sales: SalesOutput | null                // SalesNarrativeAgent
  marketing: MarketingOutput | null        // MarketingDeckAgent

  // ── Exports ────────────────────────────────────────────────
  exports: ExportsOutput

  // ── Telemetria ─────────────────────────────────────────────
  telemetry: TelemetryOutput

  // ── Erros parciais (PARTIAL_SUCCESS) ───────────────────────
  errors?: StepError[]
}
```

---

## 2) Tipos detalhados

### 2.1 DiagnosisOutput

```typescript
export type DiagnosisOutput = {
  pains: string[]                  // dores identificadas (max 6)
  objectives: string[]             // objetivos declarados (max 6)
  constraints: string[]            // restrições (orçamento, prazo, etc.)
  maturity: Maturity               // "BAIXA" | "MEDIA" | "ALTA" | "NAO_EVIDENCIADO"
  complexity: Complexity           // "BAIXA" | "MEDIA" | "ALTA" | "NAO_EVIDENCIADO"
  context: string                  // resumo livre do diagnóstico (max 500 chars)
  notEvidenced: string[]           // campos sem evidência explícita
}

type Maturity = 'BAIXA' | 'MEDIA' | 'ALTA' | 'NAO_EVIDENCIADO'
type Complexity = 'BAIXA' | 'MEDIA' | 'ALTA' | 'NAO_EVIDENCIADO'
```

**Regras:**
- `pains`, `objectives`, `constraints` nunca podem ser `null` — usar `[]` se vazio.
- Quando a transcrição não evidenciar maturity/complexity → `"NAO_EVIDENCIADO"`.
- `notEvidenced` lista quais campos ficaram sem evidência.

---

### 2.2 RecommendationOutput

```typescript
export type RecommendationOutput = {
  intelligence: IntelligenceBlock
  business: BusinessBlock
  strategy: StrategyBlock
}

export type IntelligenceBlock = {
  score: number                    // 0.0 a 1.0 (confiança geral da recomendação)
  candidates: Candidate[]          // todos os produtos avaliados (com score individual)
}

export type Candidate = {
  product_id: string               // slug neutro do catálogo
  score: number                    // 0.0 a 1.0
  reasons: string[]                // evidências da transcrição
}

export type BusinessBlock = {
  products: SankhyaProduct[]       // produtos recomendados (enriquecidos com dados Sankhya)
  required_dependencies: string[]  // slugs de dependências obrigatórias
}

// SankhyaProduct — reaproveitado do matchingAgentV3.ts
export type SankhyaProduct = {
  product_id: string
  name: string
  erp_code: string
  group_code?: string
  group_name?: string
  pm_type?: string
  contract_model?: string
  billing_model?: string
  dependency_type?: 'Nenhuma' | 'Condicional'
  base_preferred?: string
  notes?: string
}

export type StrategyBlock = {
  summary: string                  // parágrafo de estratégia (max 300 chars)
  justification: string            // justificativa da recomendação baseada em evidências
}
```

**Regras:**
- `intelligence.score` deve ser calculado como média ponderada dos `candidates` retornados.
- `business.products` deve conter **apenas** produtos existentes no catálogo Sankhya (guardrail).
- `required_dependencies` nunca pode ser omitido — usar `[]` se não houver.

---

### 2.3 PresalesOutput (SolutionArchitectAgent)

```typescript
export type PresalesOutput = {
  architectureHLD: string          // descrição de alto nível (texto livre)
  requirements: string[]           // requisitos técnicos identificados
  risks: RiskItem[]
  phases: Phase[]
}

export type RiskItem = {
  risk: string
  mitigation: string
  severity: 'BAIXA' | 'MEDIA' | 'ALTA'
}

export type Phase = {
  name: string
  description: string
  estimatedWeeks?: number
}
```

> Executado apenas quando `diagnosis.complexity !== 'BAIXA'` (conforme `agent_runtime.yaml`).

---

### 2.4 SalesOutput (SalesNarrativeAgent)

```typescript
export type SalesOutput = {
  narrative: string                // narrativa consultiva (texto livre)
  objections: ObjectionItem[]      // mínimo 5
  nextSteps: string[]              // próximos passos recomendados
}

export type ObjectionItem = {
  objection: string
  response: string
}
```

---

### 2.5 MarketingOutput (MarketingDeckAgent)

```typescript
export type MarketingOutput = {
  deckOutlineMd: string            // outline completo em Markdown
  slides: SlideOutline[]           // mínimo 7, máximo 10
  clientElements: string[]         // elementos personalizados do cliente (mínimo 2)
  logoPlaceholder: boolean         // true se não houver logoAssetId
}

export type SlideOutline = {
  number: number
  title: string
  content: string                  // bullets ou texto do slide
  isPersonalized: boolean          // true para slides 2 e 3 (cenário/dores)
}
```

---

### 2.6 ExportsOutput

```typescript
export type ExportsOutput = {
  erp: ERPExport
  partner: PartnerExport
}

export type ERPExport = {
  blocked: boolean
  blockedReasons: string[]         // ex: ["fiscalStatus: A_VALIDAR"]
  payload: ERPPayload | null       // null quando blocked = true
}

export type ERPPayload = {
  // Campos padrão Sankhya (conforme erpSankhyaMapperV2.ts)
  items: ERPItem[]
  generatedAt: string
}

export type ERPItem = {
  product_id: string
  erp_code: string
  descricao: string
  tipoReceita: string
  ativo: boolean
  grupoCodigo?: string
  grupoDescricao?: string
  unidadePadrao?: string
  temISS?: string
  centroResultado?: string
  codigoNBS?: string
  // ... demais campos do ERPMappingSankhya
}

export type PartnerExport = {
  payload: PartnerPayload
}

export type PartnerPayload = {
  // Campos padrão Partner Center
  items: PartnerItem[]
  generatedAt: string
}

export type PartnerItem = {
  product_id: string
  offerType: string
  title: string
  shortDescription: string
  solutionAreas: string[]
  markets: string[]
  languages: string[]
  keywords: string[]
}
```

**Regras críticas:**
- `erp.blocked` deve ser `true` se **qualquer** produto recomendado tiver `fiscalStatus = A_VALIDAR` ou `cadastroStatus = A_VALIDAR`.
- `erp.payload` deve ser `null` quando `blocked = true`.
- `erp.blockedReasons` deve listar o motivo por produto.

---

### 2.7 TelemetryOutput

```typescript
export type TelemetryOutput = {
  modelRouting: Record<StepName, string>   // etapa → alias de modelo usado
  tokenUsage: TokenUsageMap
}

export type TokenUsageMap = {
  [step in StepName]?: StepTokenUsage
} & {
  total: StepTokenUsage
}

export type StepTokenUsage = {
  input: number
  output: number
}

export type StepName =
  | 'DiagnosisAgent'
  | 'MatchingAgent'
  | 'SolutionArchitectAgent'
  | 'SalesNarrativeAgent'
  | 'MarketingDeckAgent'
  | 'ERPSankhyaMapperAgent'
  | 'PartnerCenterMapperAgent'
  | 'DocsPublisherAgent'
```

---

### 2.8 StepError (PARTIAL_SUCCESS)

```typescript
export type StepError = {
  step: StepName
  code: string                     // ex: "TIMEOUT", "GUARDRAIL_FAILED", "LLM_ERROR"
  message: string
  attempts: number
}
```

---

## 3) Serviço de transformação (`solutionPackV4.ts`)

O `FallbackOrchestrator` retorna `OrchestratorResult`. O serviço de transformação converte esse resultado para `SolutionPackV4`.

```typescript
// src/services/solutionPackV4.ts

import { OrchestratorResult } from '../../fallback-orchestrator'
import { SolutionPackV4 } from './types/solutionPackV4'
import { v4 as uuidv4 } from 'uuid'

export function transformToV4(
  result: OrchestratorResult,
  opportunityId: string,
  startMs: number
): SolutionPackV4 {
  const executionId = uuidv4()
  const durationMs = Date.now() - startMs

  // Extrair outputs por etapa
  const diagnosisStep = result.steps.find(s => s.step === 'DiagnosisAgent')
  const matchingStep = result.steps.find(s => s.step === 'MatchingAgent')
  const erpStep = result.steps.find(s => s.step === 'ERPSankhyaMapperAgent')
  const presalesStep = result.steps.find(s => s.step === 'SolutionArchitectAgent')
  const salesStep = result.steps.find(s => s.step === 'SalesNarrativeAgent')
  const marketingStep = result.steps.find(s => s.step === 'MarketingDeckAgent')

  // Erros parciais
  const errors = result.steps
    .filter(s => s.status === 'FAILED')
    .map(s => ({
      step: s.step,
      code: s.error?.code || 'UNKNOWN',
      message: s.error?.message || 'Unknown error',
      attempts: s.attempts
    }))

  // Montagem do V4
  return {
    executionId,
    opportunityId,
    status: result.status,
    durationMs,
    createdAt: new Date().toISOString(),

    diagnosis: buildDiagnosis(diagnosisStep?.output),
    recommendation: buildRecommendation(matchingStep?.output),

    presales: presalesStep?.output ?? null,
    sales: salesStep?.output ?? null,
    marketing: marketingStep?.output ?? null,

    exports: buildExports(erpStep?.output, matchingStep?.output),

    telemetry: buildTelemetry(result.steps),

    errors: errors.length > 0 ? errors : undefined
  }
}
```

### 3.1 `buildDiagnosis`

```typescript
function buildDiagnosis(output: any): DiagnosisOutput {
  return {
    pains: output?.pains ?? [],
    objectives: output?.objectives ?? [],
    constraints: output?.constraints ?? [],
    maturity: output?.maturity ?? 'NAO_EVIDENCIADO',
    complexity: output?.complexity ?? 'NAO_EVIDENCIADO',
    context: output?.context ?? '',
    notEvidenced: output?.notEvidenced ?? []
  }
}
```

### 3.2 `buildRecommendation`

```typescript
function buildRecommendation(output: any): RecommendationOutput {
  const matchingResult = output as MatchingV3Result | undefined

  return {
    intelligence: {
      score: matchingResult?.confidence ?? 0,
      candidates: matchingResult?.candidates ?? []
    },
    business: {
      products: matchingResult?.products ?? [],
      required_dependencies: matchingResult?.required_dependencies ?? []
    },
    strategy: {
      summary: matchingResult?.justification?.slice(0, 300) ?? '',
      justification: matchingResult?.justification ?? ''
    }
  }
}
```

### 3.3 `buildExports`

```typescript
function buildExports(erpOutput: any, matchingOutput: any): ExportsOutput {
  const blocked = erpOutput?.blocked ?? false
  const blockedReasons = erpOutput?.blockedReasons ?? []

  return {
    erp: {
      blocked,
      blockedReasons,
      payload: blocked ? null : (erpOutput?.payload ?? null)
    },
    partner: {
      payload: buildPartnerPayload(matchingOutput)
    }
  }
}
```

### 3.4 `buildTelemetry`

```typescript
function buildTelemetry(steps: StepResult[]): TelemetryOutput {
  const modelRouting: Record<string, string> = {}
  const tokenUsage: TokenUsageMap = { total: { input: 0, output: 0 } }

  for (const step of steps) {
    if (step.usedModelAlias) {
      modelRouting[step.step] = step.usedModelAlias
    }
    // tokenUsage por etapa — quando LLM retornar usage (pós-MVP)
  }

  return { modelRouting, tokenUsage }
}
```

---

## 4) Exemplo completo V4

```json
{
  "executionId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "opportunityId": "opp-2026-001",
  "status": "SUCCESS",
  "durationMs": 8420,
  "createdAt": "2026-05-23T00:00:00Z",
  "diagnosis": {
    "pains": ["retrabalho manual na gestão de escalas", "falta de visibilidade dos processos"],
    "objectives": ["automatizar fluxos", "centralizar informações"],
    "constraints": ["orçamento limitado", "prazo de 3 meses"],
    "maturity": "MEDIA",
    "complexity": "MEDIA",
    "context": "Cliente de médio porte busca digitalização de processos internos",
    "notEvidenced": []
  },
  "recommendation": {
    "intelligence": {
      "score": 0.87,
      "candidates": [
        { "product_id": "intranet-sharepoint", "score": 0.92, "reasons": ["cliente mencionou SharePoint"] },
        { "product_id": "integrador-provisionador", "score": 0.75, "reasons": ["necessidade de integração"] }
      ]
    },
    "business": {
      "products": [
        {
          "product_id": "intranet-sharepoint",
          "name": "Intranet SharePoint",
          "erp_code": "SP-INTRA-001",
          "dependency_type": "Nenhuma"
        }
      ],
      "required_dependencies": ["integrador-provisionador"]
    },
    "strategy": {
      "summary": "Implementação de intranet corporativa com portal SharePoint integrado ao sistema acadêmico.",
      "justification": "A transcrição evidencia necessidade de portal centralizado e integração com sistemas existentes..."
    }
  },
  "presales": null,
  "sales": null,
  "marketing": null,
  "exports": {
    "erp": {
      "blocked": false,
      "blockedReasons": [],
      "payload": {
        "items": [{ "product_id": "intranet-sharepoint", "erp_code": "SP-INTRA-001", "descricao": "Intranet SharePoint" }],
        "generatedAt": "2026-05-23T00:00:00Z"
      }
    },
    "partner": {
      "payload": {
        "items": [{ "product_id": "intranet-sharepoint", "solutionAreas": ["ModernWork"] }],
        "generatedAt": "2026-05-23T00:00:00Z"
      }
    }
  },
  "telemetry": {
    "modelRouting": {
      "DiagnosisAgent": "FAST_TEXT",
      "MatchingAgent": "REASONING"
    },
    "tokenUsage": {
      "DiagnosisAgent": { "input": 420, "output": 180 },
      "MatchingAgent": { "input": 980, "output": 340 },
      "total": { "input": 1400, "output": 520 }
    }
  }
}
```

---

## 5) Persistência no banco

O `SolutionPackV4` mapeia diretamente ao modelo Prisma `SolutionPack`:

| Campo V4 | Campo Prisma |
|---|---|
| `diagnosis` | `diagnosis` (Json) |
| `recommendation` | `recommendation` (Json) |
| `presales` | `presales` (Json) |
| `sales` | `sales` (Json) |
| `marketing` | `marketing` (Json) |
| `exports` | `exports` (Json) |
| `telemetry.modelRouting` | `modelRouting` (Json) |
| `telemetry.tokenUsage` | `tokenUsage` (Json) |
| `recommendation.business` (deck outline) | `deckOutlineMd` (String) |
| `{diagnosis, recommendation, ...}` | `inputSnapshot` (Json) |

---

## 6) Validação

O V4 deve ser validado contra `solution_pack_schema.json` antes de:
- Retornar pela API
- Persistir no banco
- Publicar no SharePoint

```typescript
import Ajv from 'ajv'
import schema from '../../solution_pack_schema.json'

const ajv = new Ajv()
const validate = ajv.compile(schema)

export function validateSolutionPackV4(data: unknown): boolean {
  const valid = validate(data)
  if (!valid) throw new Error(`SolutionPack inválido: ${ajv.errorsText(validate.errors)}`)
  return true
}
```

---

## 7) Regras de negócio críticas

1. **Produtos inexistentes no catálogo** → nunca aparecem em `recommendation.business.products`.
2. **ERP bloqueado** → `exports.erp.payload` é `null`; `blockedReasons` lista o motivo por produto.
3. **Dependências** → `required_dependencies` sempre preenchido (mesmo que `[]`).
4. **Campos "não evidenciados"** → usar string literal `"NAO_EVIDENCIADO"` (não `null`).
5. **Telemetria** → `total` em `tokenUsage` sempre presente; campos por etapa são opcionais.

---

## 8) Definition of Done (V4)

- `transformToV4` converte `OrchestratorResult` para `SolutionPackV4` sem perda de dados.
- Output validado contra `solution_pack_schema.json` em 100% dos casos.
- ERP bloqueado quando `A_VALIDAR` e `payload = null` nesses casos.
- Persistência no banco via Prisma mapeada corretamente.
- Testes unitários cobrem: transformação mínima, transformação com PARTIAL_SUCCESS, bloqueio ERP.
