# SPEC-API — Backend REST (EduGest-PIM)

> **Objetivo**: definir os endpoints HTTP do backend do EduGest-PIM, seus contratos de entrada/saída, regras de erro, autenticação e estratégia de execução assíncrona.
>
> Esta spec cobre a fase atual do projeto conforme `STATE.json`: **Backend API + Integração SharePoint**.
>
> Referências obrigatórias antes de implementar:
> - `SPEC-AGENT-RUNTIME.md` — pipeline de agentes e contratos
> - `SPEC-RENDERER.md` — geração de docs e exports
> - `solution_pack_schema.json` — schema de saída V4
> - `opportunity_context_schema.json` — schema de entrada
> - `AGENTS.md` — regras de governança

---

## 0) Princípios

### 0.1 Contratos são imutáveis
Os schemas JSON (`opportunity_context_schema.json`, `solution_pack_schema.json`, `render_result_schema.json`) são a fonte de verdade. A API **não pode** retornar campos fora dos schemas sem versionamento explícito.

### 0.2 Falhas parciais são válidas
Seguindo o padrão do orquestrador (`PARTIAL_SUCCESS`), a API deve retornar HTTP 200 com `status: "PARTIAL_SUCCESS"` e `errors[]` quando parte do pipeline falhar. HTTP 5xx é reservado para falhas totais e infraestrutura.

### 0.3 Sem integração direta com ERP/CRM
Nesta versão, a API gera **artefatos** (JSON/MD) para consumo manual ou via SharePoint. Não há chamadas diretas ao ERP Sankhya ou ao CRM.

### 0.4 Execução síncrona no MVP
No MVP, `/api/analyze` executa o pipeline de forma síncrona (aguarda resposta). Timeout máximo: 120s. Pós-MVP: migrar para execução assíncrona com polling via `executionId`.

---

## 1) Stack recomendada

| Camada | Tecnologia |
|---|---|
| Runtime | Node.js (TypeScript) |
| Framework HTTP | Fastify 4.x (ou Express 4.x) |
| Validação de schema | AJV 8 (já no `package.json`) |
| Autenticação | API Key via header (MVP) / Azure AD (pós-MVP) |
| Banco de dados | PostgreSQL via Prisma (já no `schema.prisma`) |
| Upload SharePoint | Microsoft Graph SDK |

> Adicionar ao `package.json`: `fastify`, `@azure/identity`, `@microsoft/microsoft-graph-client`, `pino` (logs).

---

## 2) Endpoints

### 2.1 `POST /api/analyze`

**Descrição**: recebe o contexto de uma oportunidade (transcrição + CRM payload) e executa o pipeline multi-agente completo, retornando o `SolutionPack V4`.

#### Request

```
POST /api/analyze
Content-Type: application/json
X-Api-Key: {api_key}
```

**Body** — validado contra `opportunity_context_schema.json`:

```json
{
  "opportunityId": "opp-2026-001",
  "transcript": {
    "text": "Cliente quer implementar intranet no SharePoint...",
    "language": "pt-BR",
    "source": "Teams"
  },
  "crmPayload": {},
  "constraints": {
    "productFilter": [],
    "maxProducts": 5
  },
  "clientBranding": {
    "clientName": "Acme Educação",
    "primaryColor": "#0078D4"
  }
}
```

**Campos obrigatórios**: `opportunityId` (min 5 chars), `transcript.text` (min 1 char).

#### Response — Sucesso (`200 OK`)

```json
{
  "status": "SUCCESS",
  "executionId": "exec-uuid-v4",
  "opportunityId": "opp-2026-001",
  "durationMs": 8420,
  "solutionPack": {
    "diagnosis": {
      "pains": ["retrabalho manual na gestão de escalas", "..."],
      "objectives": ["automatizar processos", "..."],
      "constraints": ["orçamento limitado", "..."],
      "maturity": "MEDIA",
      "complexity": "MEDIA"
    },
    "recommendation": {
      "intelligence": {
        "score": 0.87,
        "candidates": [
          {
            "product_id": "intranet-sharepoint",
            "score": 0.92,
            "reasons": ["cliente mencionou SharePoint", "necessidade de portal"]
          }
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
        "summary": "Implementação de intranet corporativa com...",
        "justification": "Evidências na transcrição indicam..."
      }
    },
    "presales": null,
    "sales": null,
    "marketing": null,
    "exports": {
      "erp": {
        "blocked": false,
        "blockedReasons": [],
        "payload": {}
      },
      "partner": {
        "payload": {}
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
  },
  "steps": [
    { "step": "DiagnosisAgent", "status": "SUCCESS", "durationMs": 1200, "attempts": 1 },
    { "step": "MatchingAgent", "status": "SUCCESS", "durationMs": 2100, "attempts": 1 },
    { "step": "ERPSankhyaMapperAgent", "status": "SUCCESS", "durationMs": 800, "attempts": 1 }
  ]
}
```

#### Response — Sucesso Parcial (`200 OK`)

```json
{
  "status": "PARTIAL_SUCCESS",
  "executionId": "exec-uuid-v4",
  "opportunityId": "opp-2026-001",
  "durationMs": 5100,
  "solutionPack": { "...": "campos que foram gerados com sucesso" },
  "steps": [
    { "step": "DiagnosisAgent", "status": "SUCCESS", "durationMs": 1200, "attempts": 1 },
    { "step": "MatchingAgent", "status": "FAILED", "durationMs": 3000, "attempts": 2,
      "error": { "code": "TIMEOUT", "message": "Step exceeded timeout after 2 retries" }
    }
  ],
  "errors": [
    { "step": "MatchingAgent", "code": "TIMEOUT", "message": "Step exceeded timeout after 2 retries" }
  ]
}
```

#### Response — Erros

| Código HTTP | Cenário | `errorCode` |
|---|---|---|
| `400` | Body inválido (schema) | `INVALID_INPUT` |
| `400` | `opportunityId` ausente ou curto | `MISSING_OPPORTUNITY_ID` |
| `401` | API Key ausente ou inválida | `UNAUTHORIZED` |
| `422` | Transcrição vazia ou ilegível | `EMPTY_TRANSCRIPT` |
| `408` | Pipeline excedeu timeout (120s) | `PIPELINE_TIMEOUT` |
| `500` | Erro interno não recuperável | `INTERNAL_ERROR` |

```json
{
  "status": "FAILED",
  "errorCode": "INVALID_INPUT",
  "message": "Body inválido: 'transcript.text' é obrigatório",
  "details": [{ "field": "transcript.text", "issue": "required" }]
}
```

---

### 2.2 `POST /api/publish/sharepoint`

**Descrição**: recebe um `SolutionPack` (gerado pelo `/api/analyze`) e publica os artefatos na estrutura de pastas do SharePoint via Microsoft Graph.

#### Request

```
POST /api/publish/sharepoint
Content-Type: application/json
X-Api-Key: {api_key}
```

**Body**:

```json
{
  "opportunityId": "opp-2026-001",
  "executionId": "exec-uuid-v4",
  "solutionPack": { "...": "output do /api/analyze" },
  "sharepoint": {
    "siteId": "{{SHAREPOINT_SITE_ID}}",
    "driveId": "{{SHAREPOINT_DRIVE_ID}}",
    "baseFolder": "EduGest-PIM"
  }
}
```

**Campos obrigatórios**: `opportunityId`, `solutionPack`, `sharepoint.siteId`, `sharepoint.driveId`.

#### Estrutura gerada no SharePoint

```
EduGest-PIM/
└── Opportunity_{opportunityId}/
    ├── solutionPack.json        (completo, para auditoria)
    ├── erp_payload.json         (exports.erp.payload)
    ├── summary.md               (resumo executivo)
    └── recommendation.md        (visão comercial)
```

#### Response — Sucesso (`200 OK`)

```json
{
  "status": "SUCCESS",
  "opportunityId": "opp-2026-001",
  "folderUrl": "https://eduproms.sharepoint.com/sites/novaintranet/EduGest-PIM/Opportunity_opp-2026-001",
  "filesUploaded": [
    { "path": "solutionPack.json", "status": "UPLOADED", "sharepointUrl": "https://..." },
    { "path": "erp_payload.json", "status": "UPLOADED", "sharepointUrl": "https://..." },
    { "path": "summary.md", "status": "UPLOADED", "sharepointUrl": "https://..." },
    { "path": "recommendation.md", "status": "UPLOADED", "sharepointUrl": "https://..." }
  ],
  "durationMs": 3200
}
```

#### Response — Erros

| Código HTTP | Cenário | `errorCode` |
|---|---|---|
| `400` | Body inválido | `INVALID_INPUT` |
| `401` | API Key inválida | `UNAUTHORIZED` |
| `403` | Graph sem permissão no SharePoint | `GRAPH_PERMISSION_DENIED` |
| `404` | Site ou Drive não encontrado | `SHAREPOINT_NOT_FOUND` |
| `409` | Pasta já existe (tolerável — deve fazer upsert) | — |
| `502` | Graph API retornou erro | `GRAPH_ERROR` |
| `500` | Erro interno | `INTERNAL_ERROR` |

---

### 2.3 `GET /api/health`

**Descrição**: endpoint de health check para monitoramento e deploy.

#### Response (`200 OK`)

```json
{
  "status": "ok",
  "version": "1.0.0",
  "timestamp": "2026-05-23T00:00:00Z",
  "services": {
    "database": "ok",
    "graph": "ok"
  }
}
```

Se banco ou Graph estiver indisponível:

```json
{
  "status": "degraded",
  "services": {
    "database": "ok",
    "graph": "unreachable"
  }
}
```

---

### 2.4 `GET /api/opportunities/:id/solution-pack` *(pós-MVP)*

**Descrição**: recupera um `SolutionPack` persistido no banco por `opportunityId`. Reservado para fase futura quando o banco estiver em uso ativo.

---

## 3) Autenticação

### 3.1 MVP — API Key

Todas as rotas (exceto `/api/health`) exigem o header:

```
X-Api-Key: {valor-configurado-em-env}
```

Variável de ambiente: `API_KEY`.

Se ausente ou inválida → `401 UNAUTHORIZED`.

### 3.2 Pós-MVP — Azure AD

Migrar para Bearer Token via Azure AD (Client Credentials ou Delegated). As variáveis `AZURE_TENANT_ID`, `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET` já estão previstas no `STATE.json`.

---

## 4) Variáveis de ambiente

```env
# Server
PORT=3000
NODE_ENV=production

# Auth
API_KEY=chave-secreta-local

# Azure / Graph
AZURE_TENANT_ID=
AZURE_CLIENT_ID=
AZURE_CLIENT_SECRET=

# SharePoint
SHAREPOINT_SITE_ID=
SHAREPOINT_DRIVE_ID=
SHAREPOINT_BASE_FOLDER=EduGest-PIM

# Database (Prisma)
DATABASE_URL=postgresql://user:pass@host:5432/edugest

# LLM
ANTHROPIC_API_KEY=
```

---

## 5) Estrutura de arquivos (apps/api)

```
apps/api/
├── src/
│   ├── server.ts              (bootstrap Fastify + registro de rotas)
│   ├── routes/
│   │   ├── analyze.ts         (POST /api/analyze)
│   │   ├── publish.ts         (POST /api/publish/sharepoint)
│   │   └── health.ts          (GET /api/health)
│   ├── services/
│   │   ├── orchestrator.ts    (wrapper do FallbackOrchestrator)
│   │   ├── graph.ts           (Microsoft Graph client)
│   │   └── solutionPackV4.ts  (transformação para contrato V4)
│   ├── schemas/
│   │   ├── opportunityContext.ts   (AJV compile)
│   │   └── solutionPack.ts         (AJV compile)
│   ├── middleware/
│   │   ├── auth.ts            (validação X-Api-Key)
│   │   └── errorHandler.ts    (normalização de erros)
│   └── utils/
│       ├── logger.ts          (pino structured logging)
│       └── timer.ts           (medição de durationMs)
├── tsconfig.json
└── package.json
```

---

## 6) Logs estruturados (obrigatório)

Cada request deve registrar:

```json
{
  "level": "info",
  "time": "2026-05-23T00:00:00Z",
  "requestId": "req-uuid",
  "opportunityId": "opp-2026-001",
  "route": "POST /api/analyze",
  "status": "SUCCESS",
  "durationMs": 8420,
  "steps": {
    "DiagnosisAgent": { "status": "SUCCESS", "durationMs": 1200 },
    "MatchingAgent": { "status": "SUCCESS", "durationMs": 2100 }
  },
  "tokenUsage": { "total": { "input": 1400, "output": 520 } }
}
```

Erros devem logar `errorCode`, `stack` (apenas em `NODE_ENV=development`) e `opportunityId`.

---

## 7) Regras de negócio na camada API

### 7.1 Validação de entrada
- Schema AJV compilado em startup (não em cada request).
- Erros de validação retornam `400` com `details[]` por campo.

### 7.2 Persistência de SolutionPack
- Se `DATABASE_URL` estiver configurado, persistir `SolutionPack` em `Opportunity` + `SolutionPack` (Prisma) ao final do `/api/analyze`.
- Se banco não configurado, retornar apenas na response (sem persistência).

### 7.3 Bloqueio ERP
- Quando `exports.erp.blocked = true`, o payload de `erp_payload.json` publicado no SharePoint deve conter `{ "blocked": true, "reasons": [...] }` em vez do payload real.

### 7.4 Timeout por etapa
- Seguir `agent_runtime.yaml`: `timeout_seconds_per_step: 90`.
- Timeout global da request: 120s.

---

## 8) Testes (camada API)

### 8.1 Unit
- Middleware de auth rejeita key inválida
- Validação AJV rejeita body sem `transcript.text`
- `errorHandler` normaliza erros do orquestrador corretamente

### 8.2 Integração
- `POST /api/analyze` com transcrição válida retorna `SolutionPack` com `diagnosis`, `recommendation` e `exports`
- `POST /api/analyze` com transcrição vazia retorna `422`
- `POST /api/publish/sharepoint` sem credenciais Graph retorna `403`
- `GET /api/health` retorna `200` com `status: ok`

### 8.3 Contrato
- Response do `/api/analyze` valida contra `solution_pack_schema.json`
- Body do `/api/analyze` inválido é rejeitado com `400`

---

## 9) Definition of Done (API)

- `POST /api/analyze` executa pipeline completo e retorna `SolutionPack V4` válido.
- `POST /api/publish/sharepoint` publica 4 arquivos na estrutura correta.
- `GET /api/health` responde em < 200ms.
- Todos os erros retornam `errorCode` padronizado.
- Logs estruturados em todas as rotas.
- Variáveis de ambiente documentadas no `.env.example`.
