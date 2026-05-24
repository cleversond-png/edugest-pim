# 🔐 Resolução MFA — Azure Conditional Access

**Objetivo:** Permitir autenticação ROPC (Resource Owner Password Credentials) sem MFA para `no-reply@plantaoti.com.br`

**Status:** Passo a passo para resolução

---

## Problema

O fluxo ROPC está bloqueado com erro:
```
{
  "error": "AADSTS50076",
  "error_description": "Due to a Conditional Access policy... MFA is required"
}
```

Causa: Conditional Access policy força MFA mesmo em fluxo não-interativo.

---

## Solução: Criar Usuário de Serviço Dedicado (Recomendado)

Esta é a abordagem mais segura e confiável.

### Passo 1: Criar novo usuário no Azure AD

1. Ir para [Azure Portal → Azure AD → Users](https://portal.azure.com/#view/Microsoft_AAD_UsersAndTenants/UserManagementMenuBlade/~/AllUsers)

2. Clicar em **+ New user**

3. Preencher:
   ```
   User principal name: serviceaccount@plantaoti.onmicrosoft.com
   Display name: Service Account - EduGest
   Password: [Gerar senha temporária forte]
   ```

4. Clicar **Create**

5. ⚠️ **IMPORTANTE:** O usuário será obrigado a trocar senha no primeiro login
   - Fazer login uma vez com a senha temporária
   - Trocar para senha permanente
   - Guardar segura em `.env`

---

### Passo 2: Atribuir permissões ao Service Account

1. Ir para [SharePoint Admin Center](https://plantaoti-admin.sharepoint.com)

2. Em **Sites**, procurar pelo site EduGest

3. Clicar no site → **Permissions** → **Manage Admins**

4. Adicionar `serviceaccount@plantaoti.onmicrosoft.com` com role **Site Admin**

---

### Passo 3: Configurar Conditional Access para excluir Service Account (Opcional)

Se quiser deixar MFA em outros usuários mas excluir o service account:

1. Ir para [Azure Portal → Conditional Access](https://portal.azure.com/#view/Microsoft_AAD_ConditionalAccess/ConditionalAccessBlade/~/Policies)

2. Procurar pela política que força MFA (ex: "Require MFA for all users")

3. Clicar na política → **Edit** → **Users and groups**

4. Em **Exclude**, adicionar `serviceaccount@plantaoti.onmicrosoft.com`

5. Clicar **Save**

---

### Passo 4: Atualizar `.env` com Service Account

```bash
# Substituir:
GRAPH_USERNAME=no-reply@plantaoti.com.br
GRAPH_PASSWORD=MinhaPaz@25

# Por:
GRAPH_USERNAME=serviceaccount@plantaoti.onmicrosoft.com
GRAPH_PASSWORD=<senha-permanente-do-service-account>
```

---

## Solução Alternativa: Desabilitar MFA Globalmente

⚠️ Menos seguro, mas mais rápido.

### 1. Desabilitar Conditional Access

1. Ir para [Conditional Access Policies](https://portal.azure.com/#view/Microsoft_AAD_ConditionalAccess/ConditionalAccessBlade/~/Policies)

2. Para cada política que força MFA:
   - Clicar na política
   - Mudar **Enable policy** para **Off**
   - Clicar **Save**

### 2. Desabilitar per-user MFA

1. Ir para [Azure AD → Users](https://portal.azure.com/#view/Microsoft_AAD_UsersAndTenants/UserManagementMenuBlade/~/AllUsers)

2. Procurar `no-reply@plantaoti.com.br`

3. Clicar no usuário → **Authentication methods**

4. Se houver MFA registrado, clicar em **Delete** para remover

---

## Teste: Verificar se ROPC Funciona

Depois de aplicar uma das soluções acima, testar:

```bash
# Substituir {TENANT_ID}, {CLIENT_ID}, {USERNAME}, {PASSWORD}
curl -X POST https://login.microsoftonline.com/40ec3693-787d-41d9-8be0-74045cd0659f/oauth2/v2.0/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "client_id=04b07795-8ddb-461a-bbee-02f9e1bf7b46" \
  -d "username=serviceaccount@plantaoti.onmicrosoft.com" \
  -d "password=<sua-senha>" \
  -d "grant_type=password" \
  -d "scope=https://graph.microsoft.com/.default"
```

### Resposta esperada (sucesso):
```json
{
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "expires_in": 3599,
  "token_type": "Bearer"
}
```

### Resposta com erro (MFA ainda ativo):
```json
{
  "error": "AADSTS50076",
  "error_description": "Due to a Conditional Access policy..."
}
```

---

## Próximos Passos Após Resolver MFA

1. ✅ Atualizar `.env` com credenciais corretas
2. ✅ Rodar teste ROPC (curl acima) — deve retornar access_token
3. ✅ Ativar SharePoint no projeto:
   ```bash
   # apps/api/.env
   PUBLISH_MODE=sharepoint
   GRAPH_USERNAME=serviceaccount@plantaoti.onmicrosoft.com
   GRAPH_PASSWORD=<senha-do-service-account>
   ```
4. ✅ Reiniciar servidor e confirmar logs:
   ```bash
   npm run dev
   # [INFO] Using SharePoint publisher
   ```
5. ✅ Testar endpoint `POST /api/publish`

---

## Troubleshooting

| Erro | Causa | Solução |
|------|-------|---------|
| AADSTS50076 | MFA ainda ativo | Excluir usuário de Conditional Access ou criar service account novo |
| AADSTS7000218 | Credenciais inválidas | Verificar senha, username correto (UPN format) |
| 401 Unauthorized no Upload | Permissões insuficientes | Adicionar usuário como Site Admin no SharePoint |
| Timeout na autenticação | Conectividade/Rede | Testar curl de ROPC direto antes de integrar |

---

## Referências Internas

- [SHAREPOINT-ACTIVATION.md](SHAREPOINT-ACTIVATION.md) — Próximos passos após MFA resolver
- [apps/api/src/services/graph.ts](../apps/api/src/services/graph.ts) — Implementação ROPC
- [apps/api/.env.example](../apps/api/.env.example) — Template de variáveis

---

## Timeline

- **Agora:** Seguir um dos 2 caminhos acima (10-30 min)
- **Depois:** Rodar teste ROPC (2 min)
- **Depois:** Ativar SharePoint no `.env` (5 min)
- **Total:** ~1 hora para estar pronto em produção
