# 🔧 MANUAL SETUP CHECKLIST — Phase 3 Blockers

> **Data**: 2026-05-25 21:06 UTC  
> **Status**: Aguardando ações do usuário

---

## 📋 Blocker #1: ANTHROPIC_API_KEY

**Descrição**: Endpoint `/api/products/:slug/generate-docs` falha sem API key válida

**Ações Requeridas**:
- [ ] Obter ANTHROPIC_API_KEY em https://console.anthropic.com (formato: `sk-ant-...`)
- [ ] Adicionar em `.env.local`:
  ```bash
  ANTHROPIC_API_KEY=sk-ant-[sua-chave-aqui]
  ```
- [ ] Adicionar em GitHub Secrets (para CI/CD):
  ```
  Settings → Secrets and variables → Actions
  New secret: ANTHROPIC_API_KEY = sk-ant-...
  ```
- [ ] Adicionar em Azure Container Apps (para produção):
  ```bash
  az container create ... --environment-variables ANTHROPIC_API_KEY=sk-ant-...
  ```

**Teste Local**:
```bash
npm run dev
# Seu servidor API estará rodando em http://localhost:3000

# Testar doc generation
curl -X POST http://localhost:3000/api/products/bb-saas-int-001/generate-docs \
  -H "X-Api-Key: chave-local-teste-123"
  
# Esperado: HTTP 200 com documentos gerados em JSON
```

---

## 📋 Blocker #2: Permissão Graph 403 no SharePoint

**Descrição**: Endpoint `/api/apresentacoes/gerar-e-publicar` falha ao tentar fazer upload no SharePoint

**Análise Completa**:
- ✅ Service Principal `EduGest-PIM-API` existe (ID: 581edde8-2592-43fb-a3ba-368c6f94245c)
- ✅ Site SharePoint "novaintranet" existe (ID: eduproms.sharepoint.com,1765f30c-f095-456f-8c72-f6493f4f6ce3,40279f9a-77e8-49af-b7ae-a85f78a553d5)
- ❌ Service Principal não tem permissão de escrita no site

**Root Cause**: 
1. Service Principal não foi adicionado como membro do site
2. API Permissions não foram configuradas no App Registration

---

### PASSO 1️⃣: Configurar API Permissions

**Local**: Azure Portal → App Registrations

1. Ir para: https://portal.azure.com/#view/Microsoft_AAD_IAM/StartboardBlade
2. Buscar: **App registrations**
3. Buscar aplicação: **EduGest-PIM-API**
4. Clicar em **API permissions**
5. Clicar em **+ Add a permission**
6. **PRIMEIRA PERMISSÃO — SharePoint**:
   - Selecionar: **SharePoint**
   - Tipo: **Application permissions**
   - Buscar: `Sites.ReadWrite.All`
   - Clicar **Add permissions**

7. **SEGUNDA PERMISSÃO — Microsoft Graph**:
   - Clicar **+ Add a permission** novamente
   - Selecionar: **Microsoft Graph**
   - Tipo: **Application permissions**
   - Buscar: `Files.ReadWrite.All`
   - Clicar **Add permissions**

8. **Grant Admin Consent**:
   - Clicar no botão: **Grant admin consent for [tenant]**
   - Confirmar: **Yes**
   - Aguardar mudança de status para verde ✅

**Checklist**:
- [ ] Permissão `Sites.ReadWrite.All` — Status: ✅
- [ ] Permissão `Files.ReadWrite.All` — Status: ✅
- [ ] Admin consent concedido — Status: ✅

---

### PASSO 2️⃣: Adicionar Service Principal ao Site SharePoint

**Local**: SharePoint Online → novaintranet

1. Ir para: https://eduproms.sharepoint.com/sites/novaintranet
2. Clicar em **⚙️ Settings** (canto superior direito)
3. Clicar em **Site permissions**
4. Clicar em **Grant permissions** ou **Manage access**
5. Procurar: `EduGest-PIM-API`
   - Ou buscar pelo App ID: `581edde8-2592-43fb-a3ba-368c6f94245c`
6. Selecionar o resultado
7. Atribuir role:
   - Recomendado: **Site Admin**
   - Alternativa: **Editor** (se Site Admin não permitir)
8. Clicar **Share** ou **Add**
9. Confirmar que foi adicionado à lista de membros

**Checklist**:
- [ ] Acessou https://eduproms.sharepoint.com/sites/novaintranet
- [ ] Procurou por `EduGest-PIM-API`
- [ ] Adicionou com role **Site Admin** ou **Editor**
- [ ] Confirmou que aparece na lista de membros do site

---

### PASSO 3️⃣: Validar Implementação

**Comando para testar** (requer `AZURE_CLIENT_SECRET`):

```bash
#!/bin/bash
TENANT_ID="40ec3693-787d-41d9-8be0-74045cd0659f"
CLIENT_ID="581edde8-2592-43fb-a3ba-368c6f94245c"
CLIENT_SECRET="[seu-secret-aqui]"  # Obter em App Registration > Certificates & secrets
DRIVE_ID="b!DPNlF5Xwb0WMcvZJP09s45qfJ0Dod69Jt66oX3ilU9VslJOAf9OVToHJQ5dEGorE"

# 1. Obter token do Service Principal
TOKEN=$(curl -s -X POST "https://login.microsoftonline.com/$TENANT_ID/oauth2/v2.0/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "client_id=$CLIENT_ID" \
  -d "client_secret=$CLIENT_SECRET" \
  -d "scope=https://graph.microsoft.com/.default" \
  -d "grant_type=client_credentials" | jq -r '.access_token')

echo "✅ Token obtido"

# 2. Testar upload de arquivo
RESPONSE=$(curl -s -X PUT \
  "https://graph.microsoft.com/v1.0/drives/$DRIVE_ID/root/test-permission-$(date +%s).json:/content" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"test": "permission validation"}')

# 3. Verificar resposta
HTTP_CODE=$(echo "$RESPONSE" | grep -o '"@odata\|"error' | head -1)
if [[ "$HTTP_CODE" == '"@odata' ]]; then
  echo "✅ SUCESSO! Service Principal tem permissão de escrita no SharePoint"
  echo "$RESPONSE" | jq '.'
else
  echo "❌ FALHA! Ainda há erro de permissão"
  echo "$RESPONSE" | jq '.error'
fi
```

**Esperado após Passo 2️⃣**:
```json
{
  "name": "test-permission-1779742300.json",
  "id": "01ABC...XYZ",
  "webUrl": "https://eduproms.sharepoint.com/sites/novaintranet/Shared Documents/test-permission-1779742300.json"
}
```

---

## 📝 Timeline Recomendada

| Atividade | Tempo | Quando |
|-----------|-------|--------|
| Configurar API Permissions | 5 min | Agora |
| Adicionar ao site SharePoint | 5 min | Após passo 1 |
| Aguardar propagação | 2-5 min | Aguarde |
| Testar com curl | 2 min | Após propagação |
| Atualizar STATUS em STATE.json | 1 min | Após sucesso |

**Total estimado**: 15-20 minutos

---

## 🔑 Onde Encontrar Credenciais

### AZURE_CLIENT_SECRET

Local: Azure Portal → App Registrations → EduGest-PIM-API → Certificates & secrets

1. Ir para: https://portal.azure.com/#view/Microsoft_AAD_IAM/StartboardBlade
2. App registrations → EduGest-PIM-API
3. Clicar em **Certificates & secrets**
4. Na aba **Client secrets**, copiar o valor de **Value** (não "Secret ID")
5. ⚠️ **IMPORTANTE**: Guardar com segurança. Se expirar, gerar novo.

---

## 🆘 Troubleshooting

| Erro | Causa | Solução |
|------|-------|---------|
| "AADSTS50076" | MFA bloqueando Service Principal | Excluir da Conditional Access policy ou criar novo service account |
| "Access denied" ao adicionar permissão | Usuário não é site admin | Usar conta de admin do tenant |
| Service Principal não aparece ao buscar | Ainda não sincronizou | Aguardar 5-10 min e tentar novamente |
| Teste curl retorna 401 | Token inválido ou expirado | Gerar novo token |

---

## ✅ Confirmação de Sucesso

Após completar todos os passos, este arquivo será atualizado com:

- [ ] PASSO 1 COMPLETO — API Permissions configuradas
- [ ] PASSO 2 COMPLETO — Service Principal adicionado ao site
- [ ] PASSO 3 COMPLETO — Teste curl retorna HTTP 201
- [ ] STATE.json atualizado com novo status
- [ ] Próximas tarefas podem prosseguir

---

**Versionado em**: 2026-05-25 21:06 UTC  
**Por**: Phase 3 Analysis Agent  
**Status**: Aguardando ações manuais
