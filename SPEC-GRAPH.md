# SPEC-GRAPH — Microsoft Graph Client (EduGest-PIM)

> **Objetivo**: definir o client de integração com Microsoft Graph para publicação de artefatos no SharePoint Online.
>
> Referências:
> - `SHAREPOINT_SETUP.md` — permissões e configuração
> - `SPEC-API.md` — endpoint `/api/publish/sharepoint`
> - `SPEC-RENDERER.md` — estrutura de arquivos gerados

---

## 0) Princípios

### 0.1 Application-only (sem usuário)
Autenticação via **Client Credentials Flow** (sem delegação). O app age como serviço, não como usuário. Requer Admin Consent no Azure AD.

### 0.2 Idempotência
Toda operação de upload deve ser **upsert**: se a pasta ou o arquivo já existir, sobrescrever. Nunca falhar por conflito de existência.

### 0.3 Sem integração direta com ERP
O Graph client só gerencia arquivos no SharePoint. Não há chamada ao Sankhya ou qualquer outro sistema ERP nesta camada.

### 0.4 Falha isolada
Falha de upload de um arquivo individual não deve cancelar o upload dos demais. Retornar status por arquivo (`UPLOADED` / `FAILED`).

---

## 1) Dependências

```bash
npm install @azure/identity @microsoft/microsoft-graph-client
```

| Pacote | Versão mínima | Finalidade |
|---|---|---|
| `@azure/identity` | `^4.x` | Client Credentials (token Azure AD) |
| `@microsoft/microsoft-graph-client` | `^3.x` | Chamadas à Graph API |

---

## 2) Configuração e autenticação

### 2.1 Variáveis de ambiente (obrigatórias)

```env
AZURE_TENANT_ID=
AZURE_CLIENT_ID=
AZURE_CLIENT_SECRET=
SHAREPOINT_SITE_ID=
SHAREPOINT_DRIVE_ID=
SHAREPOINT_BASE_FOLDER=EduGest-PIM
```

### 2.2 Permissões necessárias no Azure AD

Tipo: **Application Permissions** (não Delegated).

| Permissão | Motivo |
|---|---|
| `Sites.ReadWrite.All` | Criar pastas e ler site |
| `Files.ReadWrite.All` | Upload de arquivos na document library |

> ⚠️ Ambas exigem **Admin Consent** explícito no Azure AD.

### 2.3 Como obter `SITE_ID` e `DRIVE_ID`

```bash
# Obter SITE_ID
GET https://graph.microsoft.com/v1.0/sites/{hostname}:/{site-path}

# Obter DRIVE_ID (document library padrão)
GET https://graph.microsoft.com/v1.0/sites/{SITE_ID}/drives
```

Para o site `https://eduproms.sharepoint.com/sites/novaintranet`:
- Hostname: `eduproms.sharepoint.com`
- Site-path: `/sites/novaintranet`

---

## 3) Contrato do client

### 3.1 Interface TypeScript

```typescript
export interface GraphClientConfig {
  tenantId: string
  clientId: string
  clientSecret: string
  siteId: string
  driveId: string
  baseFolder: string // ex: "EduGest-PIM"
}

export interface FileToUpload {
  path: string          // caminho relativo, ex: "solutionPack.json"
  content: string       // conteúdo como string (JSON.stringify ou MD)
  contentType: string   // "application/json" | "text/markdown"
}

export interface UploadResult {
  path: string
  status: 'UPLOADED' | 'FAILED'
  sharepointUrl?: string
  error?: string
}

export interface PublishResult {
  opportunityId: string
  folderUrl: string
  filesUploaded: UploadResult[]
  durationMs: number
}

export interface GraphClient {
  publishOpportunity(
    opportunityId: string,
    files: FileToUpload[]
  ): Promise<PublishResult>
}
```

---

## 4) Implementação

### 4.1 Inicialização do client

```typescript
// src/services/graph.ts
import { ClientSecretCredential } from '@azure/identity'
import { Client, AuthenticationProvider } from '@microsoft/microsoft-graph-client'
import { TokenCredentialAuthenticationProvider } from '@microsoft/microsoft-graph-client/authProviders/azureTokenCredentials'

export function createGraphClient(config: GraphClientConfig): Client {
  const credential = new ClientSecretCredential(
    config.tenantId,
    config.clientId,
    config.clientSecret
  )

  const authProvider = new TokenCredentialAuthenticationProvider(credential, {
    scopes: ['https://graph.microsoft.com/.default']
  })

  return Client.initWithMiddleware({ authProvider })
}
```

### 4.2 Criar pasta (upsert)

```typescript
async function ensureFolder(
  client: Client,
  driveId: string,
  parentPath: string,
  folderName: string
): Promise<string> {
  // Tenta criar a pasta; se já existir (409), retorna sem erro
  try {
    const response = await client
      .api(`/drives/${driveId}/root:/${parentPath}:/children`)
      .post({
        name: folderName,
        folder: {},
        '@microsoft.graph.conflictBehavior': 'rename' // ou 'fail' para detectar existência
      })
    return response.webUrl
  } catch (err: any) {
    // 409 = já existe — buscar URL existente
    if (err?.statusCode === 409) {
      const existing = await client
        .api(`/drives/${driveId}/root:/${parentPath}/${folderName}`)
        .get()
      return existing.webUrl
    }
    throw err
  }
}
```

### 4.3 Upload de arquivo (upsert)

```typescript
async function uploadFile(
  client: Client,
  driveId: string,
  filePath: string,    // ex: "EduGest-PIM/Opportunity_opp-001/solutionPack.json"
  content: string,
  contentType: string
): Promise<string> {
  // PUT com conflictBehavior=replace é idempotente
  const response = await client
    .api(`/drives/${driveId}/root:/${filePath}:/content`)
    .header('Content-Type', contentType)
    .put(Buffer.from(content, 'utf-8'))

  return response.webUrl
}
```

### 4.4 Fluxo completo — `publishOpportunity`

```typescript
export async function publishOpportunity(
  config: GraphClientConfig,
  opportunityId: string,
  files: FileToUpload[]
): Promise<PublishResult> {
  const startMs = Date.now()
  const client = createGraphClient(config)
  const folderName = `Opportunity_${opportunityId}`
  const folderPath = `${config.baseFolder}/${folderName}`

  // 1. Garantir que a pasta base existe
  await ensureFolder(client, config.driveId, config.baseFolder, folderName)

  // 2. Upload de cada arquivo (isolado — falha não cancela os demais)
  const results: UploadResult[] = await Promise.allSettled(
    files.map(async (file) => {
      const fullPath = `${folderPath}/${file.path}`
      try {
        const url = await uploadFile(client, config.driveId, fullPath, file.content, file.contentType)
        return { path: file.path, status: 'UPLOADED' as const, sharepointUrl: url }
      } catch (err: any) {
        return { path: file.path, status: 'FAILED' as const, error: err.message }
      }
    })
  ).then(settled =>
    settled.map(r => r.status === 'fulfilled' ? r.value : r.reason)
  )

  // 3. URL da pasta
  const folderUrl = `https://eduproms.sharepoint.com/sites/novaintranet/${folderPath}`

  return {
    opportunityId,
    folderUrl,
    filesUploaded: results,
    durationMs: Date.now() - startMs
  }
}
```

---

## 5) Arquivos gerados por oportunidade

A partir do `SolutionPack`, a API deve gerar estes 4 arquivos antes do upload:

| Arquivo | Conteúdo | Content-Type |
|---|---|---|
| `solutionPack.json` | `JSON.stringify(solutionPack, null, 2)` completo | `application/json` |
| `erp_payload.json` | `JSON.stringify(solutionPack.exports.erp, null, 2)` | `application/json` |
| `summary.md` | Markdown com resumo executivo gerado | `text/markdown` |
| `recommendation.md` | Markdown com visão comercial/recomendação | `text/markdown` |

### 5.1 Template `summary.md`

```markdown
# Resumo Executivo — {clientName}

**Oportunidade**: {opportunityId}  
**Data**: {date}  
**Maturidade**: {maturity} | **Complexidade**: {complexity}

## Dores Identificadas
{pains}

## Objetivos
{objectives}

## Produtos Recomendados
{products}
```

### 5.2 Template `recommendation.md`

```markdown
# Recomendação Comercial — {clientName}

## Produtos
{products com erp_code, name, dependency_type}

## Dependências Obrigatórias
{required_dependencies}

## Justificativa
{justification}

## Exportação ERP
Status: {blocked ? "⛔ BLOQUEADO" : "✅ Liberado"}
{blockedReasons se houver}
```

---

## 6) Verificação de saúde do Graph

O endpoint `GET /api/health` deve verificar conectividade com o Graph:

```typescript
async function checkGraphHealth(config: GraphClientConfig): Promise<boolean> {
  try {
    const client = createGraphClient(config)
    await client.api(`/sites/${config.siteId}`).select('id').get()
    return true
  } catch {
    return false
  }
}
```

---

## 7) Erros e mapeamento

| Erro Graph | HTTP retornado pela API | `errorCode` |
|---|---|---|
| `401 Unauthorized` | `403` | `GRAPH_PERMISSION_DENIED` |
| `403 Forbidden` | `403` | `GRAPH_PERMISSION_DENIED` |
| `404 Not Found` (site/drive) | `404` | `SHAREPOINT_NOT_FOUND` |
| `409 Conflict` | tratado internamente (upsert) | — |
| `429 Too Many Requests` | retry com backoff | — |
| `5xx` | `502` | `GRAPH_ERROR` |
| Timeout de rede | `502` | `GRAPH_ERROR` |

### 7.1 Retry para 429 (rate limit)

```typescript
// Respeitar o header Retry-After quando presente
async function withRetry<T>(fn: () => Promise<T>, maxRetries = 2): Promise<T> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (err: any) {
      if (err?.statusCode === 429 && attempt < maxRetries) {
        const retryAfter = parseInt(err.headers?.['retry-after'] || '2', 10)
        await new Promise(r => setTimeout(r, retryAfter * 1000))
        continue
      }
      throw err
    }
  }
  throw new Error('Max retries exceeded')
}
```

---

## 8) Estrutura de arquivos

```
apps/api/src/services/
└── graph/
    ├── index.ts          (exporta GraphClient e publishOpportunity)
    ├── client.ts         (createGraphClient — auth)
    ├── folder.ts         (ensureFolder — upsert de pasta)
    ├── upload.ts         (uploadFile — upsert de arquivo)
    ├── templates.ts      (geração de summary.md e recommendation.md)
    └── health.ts         (checkGraphHealth)
```

---

## 9) Testes

### 9.1 Unit (mock Graph)
- `ensureFolder` com 409 retorna URL existente sem lançar erro
- `uploadFile` chama PUT no path correto
- `publishOpportunity` com um arquivo falhando ainda retorna os outros como `UPLOADED`
- Templates `summary.md` e `recommendation.md` preenchidos corretamente

### 9.2 Integração (ambiente de teste com Graph real)
- Criar pasta `Opportunity_test-001` no SharePoint de homologação
- Upload de `solutionPack.json` e verificar URL retornada
- Segundo upload no mesmo path sobrescreve (idempotência)
- `checkGraphHealth` retorna `true` com credenciais válidas

---

## 10) Definition of Done (Graph)

- `publishOpportunity` cria a estrutura de pastas e sobe 4 arquivos.
- Upload é idempotente (reexecução não duplica arquivos).
- Falha em 1 arquivo não cancela os demais.
- `checkGraphHealth` integrado ao `/api/health`.
- Variáveis documentadas no `.env.example`.
- Permissões documentadas no `SHAREPOINT_SETUP.md` (já existe).
