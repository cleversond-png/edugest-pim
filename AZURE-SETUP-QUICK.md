# ⚡ Azure Setup Rápido — 10 minutos

Siga este guia para ter o deployment automático funcionando.

## ✅ Pré-requisitos

- ✅ Azure CLI: `az --version`
- ✅ GitHub Secrets foram configurados (vide abaixo)

## 🚀 Passo 1: Criar infraestrutura no Azure (5 min)

```bash
# 1.1 Fazer login no Azure
az login

# 1.2 Criar resource group
az group create --name rg-edugest-pim --location eastus

# 1.3 Criar container registry
az acr create --resource-group rg-edugest-pim --name acrpimplantaoti --sku Basic

# 1.4 Criar app service plan (Linux + Node.js)
az appservice plan create \
  --name plan-edugest-pim \
  --resource-group rg-edugest-pim \
  --sku B1 \
  --is-linux

# 1.5 Criar app service
az webapp create \
  --resource-group rg-edugest-pim \
  --plan plan-edugest-pim \
  --name pmi-plantaoti \
  --deployment-container-image-name acrpimplantaoti.azurecr.io/edugest-pim:latest \
  --docker-registry-server-url https://acrpimplantaoti.azurecr.io
```

## 🔑 Passo 2: Configurar GitHub Secrets (3 min)

### Obter credenciais Azure

```bash
# Service Principal (para GitHub Actions fazer deploy)
az ad sp create-for-rbac \
  --name "gh-deploy-edugest-pim" \
  --role contributor \
  --scopes /subscriptions/<SUBSCRIPTION_ID>/resourceGroups/rg-edugest-pim \
  --sdk-auth
```

**Copie o JSON retornado**

### Configurar no GitHub

1. Vá em: `https://github.com/cleversond-png/edugest-pim/settings/secrets/actions`
2. Clique em "New repository secret"
3. Adicione os seguintes secrets:

| Secret | Valor |
|--------|-------|
| `AZURE_CREDENTIALS` | JSON do comando acima ☝️ |
| `ACR_NAME` | `acrpimplantaoti` |
| `ACR_LOGIN_SERVER` | `acrpimplantaoti.azurecr.io` |
| `APP_SERVICE_NAME` | `pmi-plantaoti` |

## 🔒 Passo 3: Configurar variáveis de ambiente (1 min)

```bash
az webapp config appsettings set \
  --resource-group rg-edugest-pim \
  --name pmi-plantaoti \
  --settings \
    WEBSITES_PORT=3000 \
    NODE_ENV=production \
    API_URL=https://pmi.plantaoti.com.br \
    API_KEY=sua-chave-aqui \
    NEXT_PUBLIC_API_URL=https://pmi.plantaoti.com.br
```

## 🌐 Passo 4: DNS (1 min)

Seu provedor de DNS (Cloudflare, GoDaddy, etc):

**Crie um registro CNAME:**
- Host: `pmi`
- Valor: `pmi-plantaoti.azurewebsites.net`

## 🚢 Passo 5: Deploy automático

Pronto! A próxima vez que você fizer `git push`, o GitHub Actions vai:

1. ✅ Build backend + frontend
2. ✅ Build Docker image
3. ✅ Push para Azure Container Registry
4. ✅ Deploy no App Service

**Monitore em:** `https://github.com/cleversond-png/edugest-pim/actions`

## 🔍 Verificar deployment

```bash
# Ver logs
az webapp log tail --resource-group rg-edugest-pim --name pmi-plantaoti

# Acessar aplicação
open https://pmi.plantaoti.com.br/analyze
```

## ❓ Troubleshooting

### Deployment falha?
- Verificar secrets: `https://github.com/cleversond-png/edugest-pim/settings/secrets/actions`
- Verificar logs: GitHub Actions → workflow run

### App Service não inicia?
```bash
az webapp log tail --resource-group rg-edugest-pim --name pmi-plantaoti
```

### Certificado HTTPS?
Você pode adicionar um certificado gerenciado do Azure ou usar Let's Encrypt (grátis).

---

**Quando terminar, a app estará em:** `https://pmi.plantaoti.com.br` 🎉
