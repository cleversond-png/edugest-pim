# 🔄 SharePoint Integration Activation

**Status:** ✅ Ready (awaiting MFA resolution)

---

## Resumo

O sistema está preparado para trocar de publicação local → SharePoint em **2 passos**. A infraestrutura está pronta, apenas aguardando a resolução do problema de MFA no Azure.

---

## Arquitetura Implementada

```
┌─────────────────────────────────────────────┐
│ POST /api/publish (publish.ts)              │
│                                              │
│  publisher = createPublisher()  ← Factory   │
└────────────────────────┬────────────────────┘
                         │
                    Checks ENV
                         │
         ┌───────────────┴────────────────┐
         │                                 │
  PUBLISH_MODE=local          PUBLISH_MODE=sharepoint
  (default)                   (quando MFA resolver)
         │                                 │
    ┌────▼──────────┐        ┌────────────▼─────┐
    │ LocalPublisher│        │ SharePointPublisher
    │               │        │                   │
    │ PIM/Opp_*/    │        │ GraphClient.uploadFile
    └────────────────┘        └───────────────────┘
```

Ambas implementam `IPublisher`:
```typescript
interface IPublisher {
  saveFile(folderPath, filename, content): Promise<PublishedFile>
}
```

---

## Passo 1: Resolver MFA

**Blocker atual:** O usuário está investigando Conditional Access no Azure AD que reabilita MFA mesmo após desabilitar.

**Ações necessárias:**
1. Acessar [Azure Portal → Conditional Access](https://portal.azure.com/#view/Microsoft_AAD_ConditionalAccess/ConditionalAccessBlade/~/Policies)
2. Procurar por política que força MFA
3. Ajustar ou desabilitar se necessário
4. Ou criar usuário de serviço dedicado sem MFA

**Verificação:**
```bash
# Test ROPC flow (sem MFA prompt)
curl -X POST https://login.microsoftonline.com/{AZURE_TENANT_ID}/oauth2/v2.0/token \
  -d "client_id={CLIENT_ID}" \
  -d "username={USERNAME}" \
  -d "password={PASSWORD}" \
  -d "grant_type=password" \
  -d "scope=https://graph.microsoft.com/.default"

# Esperado: { "access_token": "...", "expires_in": 3599 }
# Atual: { "error": "AADSTS50076" } (MFA required)
```

---

## Passo 2: Ativar SharePoint (quando MFA resolver)

### 2.1 — Atualizar `.env`

```bash
# Antes (local):
PUBLISH_MODE=local

# Depois (SharePoint):
PUBLISH_MODE=sharepoint
```

### 2.2 — Confirmar credenciais no `.env`

Verificar que estas variáveis estão configuradas:

```bash
# Azure Authentication
AZURE_TENANT_ID=40ec3693-787d-41d9-8be0-74045cd0659f
AZURE_CLIENT_ID=04b07795-8ddb-461a-bbee-02f9e1bf7b46
GRAPH_USERNAME=no-reply@plantaoti.com.br
GRAPH_PASSWORD=MinhaPaz@25

# SharePoint
SHAREPOINT_SITE_ID=eduproms.sharepoint.com,1765f30c-f095-456f-8c72-f6493f4f6ce3,40279f9a-77e8-49af-b7ae-a85f78a553d5
SHAREPOINT_DRIVE_ID=b!DPNlF5Xwb0WMcvZJP09s45qfJ0Dod69Jt66oX3ilU9VBSSf8eOJwRJqzPpGUvkXE
SHAREPOINT_BASE_FOLDER=EduGest-PIM
```

### 2.3 — Reiniciar servidor

```bash
npm run dev
```

### 2.4 — Testar

```bash
# O servidor deve logar:
# [INFO] Using SharePoint publisher

# Test endpoint:
curl -X POST http://localhost:3000/api/publish \
  -H "Content-Type: application/json" \
  -H "X-Api-Key: chave-local-teste-123" \
  -d '{
    "executionId": "sp-test-001",
    "opportunityId": "sp-opp-001",
    "solutionPack": {...}
  }'

# Esperado: files com webUrl apontando para SharePoint
# { "status": "SUCCESS", "files": [{ "name": "...", "webUrl": "https://..." }] }
```

---

## Fallback Automático

Se `PUBLISH_MODE=sharepoint` mas credenciais estão faltando, o sistema **automaticamente cai para local**:

```
[WARN] SharePoint mode requested but credentials missing. Falling back to local publishing.
[INFO] Using local filesystem publisher
```

Isso permite que você teste em uma máquina com `.env` incompleto sem quebrar.

---

## Código Relevante

- **Factory:** [apps/api/src/services/publisherFactory.ts](../apps/api/src/services/publisherFactory.ts)
- **Interface:** [apps/api/src/services/publisher.interface.ts](../apps/api/src/services/publisher.interface.ts)
- **Local impl:** [apps/api/src/services/localPublisher.ts](../apps/api/src/services/localPublisher.ts)
- **SharePoint impl:** [apps/api/src/services/sharePointPublisher.ts](../apps/api/src/services/sharePointPublisher.ts)
- **Route:** [apps/api/src/routes/publish.ts](../apps/api/src/routes/publish.ts)

---

## Troubleshooting

| Problema | Solução |
|----------|---------|
| `[WARN] SharePoint mode but credentials missing` | Preencher AZURE_TENANT_ID, AZURE_CLIENT_ID, GRAPH_USERNAME, GRAPH_PASSWORD, SHAREPOINT_SITE_ID, SHAREPOINT_DRIVE_ID no .env |
| `Error: AADSTS50076 (MFA required)` | MFA ainda está ativa — resolver no Conditional Access ou criar usuário de serviço |
| Arquivo salvo em local em vez de SharePoint | Verificar se PUBLISH_MODE=sharepoint está no .env (default é "local") |
| `Error: Access denied` ao upload | Verificar se usuário tem permissão de escrita no site/library do SharePoint |

---

## Próximos Passos Após SharePoint Ativo

1. ✅ Testar E2E com SharePoint
2. ⬜ Implementar retry logic para uploads grandes (> 4MB)
3. ⬜ Adicionar logging de webUrl no response
4. ⬜ Monitora e alertas para falhas de upload
5. ⬜ Documentar estrutura final de arquivos no SharePoint

---

## Timeline Estimada

- **Agora:** Local publishing funcional ✅
- **Quando MFA resolver:** +30 minutos para ativar SharePoint
- **CI/CD:** +1 semana para automatizar testes com SharePoint

