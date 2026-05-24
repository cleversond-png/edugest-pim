# SPEC-UI — Interface Web (EduGest-PIM)

> **Objetivo**: definir o escopo mínimo da interface web (Next.js) do EduGest-PIM para a fase MVP.
>
> A UI consome a API definida em `SPEC-API.md` e apresenta o `SolutionPack V4` (definido em `SPEC-SOLUTION-PACK-V4.md`) de forma clara para times de pré-venda e comercial.
>
> Princípio: **MVP primeiro**. Evitar over-engineering de UI. O valor está na qualidade da análise, não na sofisticação visual.

---

## 0) Princípios

### 0.1 Consumidor da API, não do banco
A UI nunca acessa o banco diretamente. Todo dado vem de `/api/analyze` e `/api/publish/sharepoint`.

### 0.2 Sem autenticação complexa no MVP
MVP usa API Key configurada em variável de ambiente do servidor (Next.js Server Actions ou API Routes). A UI não expõe a key ao browser.

### 0.3 Server Components primeiro
Usar Next.js App Router com Server Components por padrão. Client Components apenas onde há interatividade (formulários, botões de ação, estados de loading).

### 0.4 Foco no fluxo principal
O fluxo crítico é: **Entrada de transcrição → Análise → Visualização do resultado → Publicar no SharePoint**.

---

## 1) Stack

| Camada | Tecnologia |
|---|---|
| Framework | Next.js 14+ (App Router) |
| Linguagem | TypeScript |
| Estilo | Tailwind CSS |
| Componentes | shadcn/ui (radix primitives) |
| Estado | React state local (sem Redux no MVP) |
| Fetch | Server Actions (Next.js) |
| Ícones | Lucide React |

---

## 2) Estrutura de rotas

```
apps/web/
├── app/
│   ├── layout.tsx               (root layout — nav + tema)
│   ├── page.tsx                 (home → redireciona para /analyze)
│   ├── analyze/
│   │   ├── page.tsx             (formulário de entrada)
│   │   └── actions.ts           (Server Action → POST /api/analyze)
│   ├── result/
│   │   └── [executionId]/
│   │       ├── page.tsx         (visualização do SolutionPack V4)
│   │       └── publish/
│   │           └── actions.ts   (Server Action → POST /api/publish/sharepoint)
│   └── api/
│       └── proxy/               (opcional: proxy seguro para esconder API key)
├── components/
│   ├── ui/                      (shadcn/ui)
│   ├── analyze/
│   │   ├── TranscriptForm.tsx
│   │   └── BrandingFields.tsx
│   └── result/
│       ├── DiagnosisCard.tsx
│       ├── RecommendationCard.tsx
│       ├── ExportsCard.tsx
│       ├── TelemetryCard.tsx
│       └── PublishButton.tsx
├── lib/
│   ├── api.ts                   (client para /api/analyze e /api/publish)
│   └── types.ts                 (reexporta SolutionPackV4 types)
└── tailwind.config.ts
```

---

## 3) Páginas e componentes

### 3.1 `/analyze` — Formulário de entrada

**Campos obrigatórios:**
- `opportunityId` — texto (min 5 chars), ex: "opp-2026-001"
- `transcript.text` — textarea (min 50 chars recomendado)

**Campos opcionais:**
- `transcript.source` — select: Teams / Stream / Upload / Other
- `clientBranding.clientName` — texto
- `clientBranding.primaryColor` — color picker
- `constraints.maxProducts` — número (1–10, default 5)

**Comportamento:**
- Submit dispara Server Action → `POST /api/analyze`
- Loading state com feedback de progresso ("Analisando transcrição...", "Gerando recomendação...")
- Em caso de erro → exibir `errorCode` + `message` no formulário
- Em sucesso → redirecionar para `/result/{executionId}`

**Wireframe textual:**

```
┌─────────────────────────────────────────┐
│  🧠 EduGest-PIM                         │
│  Nova Análise de Oportunidade           │
├─────────────────────────────────────────┤
│  ID da Oportunidade *                   │
│  [opp-2026-001_____________]            │
│                                         │
│  Transcrição da Reunião *               │
│  [                                    ] │
│  [                                    ] │
│  [                                    ] │
│                                         │
│  Fonte: [Teams ▼]                       │
│                                         │
│  Cliente: [___________]  Cor: [🎨]      │
│                                         │
│  [  Analisar Oportunidade  ]            │
└─────────────────────────────────────────┘
```

---

### 3.2 `/result/[executionId]` — Visualização do SolutionPack V4

Dividido em abas ou seções colapsáveis:

#### Seção 1 — Cabeçalho
- Badge de status: `SUCCESS` (verde) / `PARTIAL_SUCCESS` (amarelo) / `FAILED` (vermelho)
- `opportunityId`, `durationMs`, `createdAt`
- Botão "Publicar no SharePoint" (ver 3.3)

#### Seção 2 — Diagnóstico (`DiagnosisCard`)
- Maturidade + Complexidade como badges coloridos
- Lista de dores (`pains[]`)
- Lista de objetivos (`objectives[]`)
- Lista de restrições (`constraints[]`)
- Contexto em texto livre
- Se `notEvidenced[]` não vazio → aviso "Campos não evidenciados"

#### Seção 3 — Recomendação (`RecommendationCard`)
- Score de confiança (barra de progresso 0–100%)
- Tabela de produtos recomendados:
  - Nome, código ERP, tipo de dependência
  - Badge "Dependência obrigatória" quando aplicável
- Dependências obrigatórias listadas em destaque
- Justificativa em parágrafo

#### Seção 4 — Exports (`ExportsCard`)

**ERP Sankhya:**
- Se `blocked = true` → banner vermelho com `blockedReasons`
- Se `blocked = false` → accordion com payload JSON copiável

**Partner Center:**
- Accordion com payload JSON copiável

#### Seção 5 — Telemetria (`TelemetryCard`) *(colapsado por padrão)*
- Tabela: etapa → modelo usado → tokens (input/output)
- Total de tokens e custo estimado (placeholder pós-MVP)

#### Seção 6 — Erros parciais *(apenas se PARTIAL_SUCCESS)*
- Lista de etapas que falharam com `code` e `message`

---

### 3.3 Publicar no SharePoint (`PublishButton`)

**Fluxo:**
1. Usuário clica em "Publicar no SharePoint"
2. Modal de confirmação com lista de arquivos que serão gerados
3. Confirma → Server Action → `POST /api/publish/sharepoint`
4. Loading state
5. Sucesso → exibir link da pasta no SharePoint + lista de arquivos com status

**Wireframe textual (modal):**

```
┌─────────────────────────────────────┐
│  Publicar no SharePoint             │
│                                     │
│  Os arquivos abaixo serão criados   │
│  em EduGest-PIM/Opportunity_{id}:   │
│                                     │
│  ✓ solutionPack.json                │
│  ✓ erp_payload.json                 │
│  ✓ summary.md                       │
│  ✓ recommendation.md                │
│                                     │
│  [Cancelar]  [Confirmar Publicação] │
└─────────────────────────────────────┘
```

---

## 4) Server Actions

### 4.1 `analyzeAction` (apps/web/app/analyze/actions.ts)

```typescript
'use server'

import { redirect } from 'next/navigation'

export async function analyzeAction(formData: FormData) {
  const body = {
    opportunityId: formData.get('opportunityId'),
    transcript: {
      text: formData.get('transcriptText'),
      source: formData.get('source') || 'Other',
      language: 'pt-BR'
    },
    clientBranding: {
      clientName: formData.get('clientName') || undefined,
      primaryColor: formData.get('primaryColor') || undefined
    },
    constraints: {
      maxProducts: parseInt(formData.get('maxProducts') as string || '5', 10)
    }
  }

  const res = await fetch(`${process.env.API_URL}/api/analyze`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Api-Key': process.env.API_KEY!
    },
    body: JSON.stringify(body)
  })

  const data = await res.json()

  if (!res.ok) {
    return { error: data }
  }

  // Armazenar resultado em session/cache e redirecionar
  redirect(`/result/${data.executionId}`)
}
```

> **Nota de segurança**: `API_KEY` nunca é exposta ao browser — fica apenas no servidor Next.js.

### 4.2 `publishAction` (apps/web/app/result/[executionId]/publish/actions.ts)

```typescript
'use server'

export async function publishAction(opportunityId: string, solutionPack: any) {
  const res = await fetch(`${process.env.API_URL}/api/publish/sharepoint`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Api-Key': process.env.API_KEY!
    },
    body: JSON.stringify({
      opportunityId,
      solutionPack,
      sharepoint: {
        siteId: process.env.SHAREPOINT_SITE_ID,
        driveId: process.env.SHAREPOINT_DRIVE_ID,
        baseFolder: process.env.SHAREPOINT_BASE_FOLDER || 'EduGest-PIM'
      }
    })
  })

  return res.json()
}
```

---

## 5) Variáveis de ambiente (apps/web)

```env
# URL interna da API (backend)
API_URL=http://localhost:3000

# API Key (nunca exposta ao browser)
API_KEY=chave-secreta-local

# SharePoint (usados apenas no publishAction)
SHAREPOINT_SITE_ID=
SHAREPOINT_DRIVE_ID=
SHAREPOINT_BASE_FOLDER=EduGest-PIM
```

---

## 6) Estados de UX

| Estado | Comportamento |
|---|---|
| Formulário vazio | Botão "Analisar" desabilitado |
| Carregando análise | Spinner + mensagem "Analisando..." (bloqueio de reenvio) |
| Erro da API | Toast de erro com `errorCode` |
| Sucesso parcial | Aviso amarelo com etapas que falharam |
| ERP bloqueado | Banner vermelho na seção de exports |
| Publicação em andamento | Spinner no botão "Publicar" |
| Publicação concluída | Link clicável para a pasta no SharePoint |

---

## 7) Estrutura monorepo (referência)

Conforme `STATE.json`, a estrutura alvo é:

```
edugest-pim/
├── apps/
│   ├── api/         (Fastify — SPEC-API.md)
│   └── web/         (Next.js — esta spec)
├── packages/
│   └── core/        (FallbackOrchestrator, agentes, types compartilhados)
└── docs/
    └── specs/       (todas as SPECs)
```

O `packages/core` compartilha tipos TypeScript entre `apps/api` e `apps/web` sem duplicação.

---

## 8) Pós-MVP (fora de escopo agora)

- Histórico de oportunidades (listagem + busca)
- Autenticação com Azure AD (SSO corporativo)
- Upload direto de arquivo de transcrição (`.txt`, `.vtt`, `.docx`)
- Edição manual do SolutionPack antes de publicar
- Dashboard de telemetria (tokens, custo, taxa de sucesso)
- Modo escuro

---

## 9) Definition of Done (UI)

- Formulário `/analyze` envia transcrição e redireciona para `/result/{executionId}`.
- Página `/result` exibe diagnóstico, recomendação e exports de forma legível.
- ERP bloqueado mostra banner vermelho com motivos.
- Botão "Publicar" executa upload e exibe link da pasta no SharePoint.
- API Key nunca exposta no bundle do browser.
- Responsivo em mobile (largura mínima 375px).
