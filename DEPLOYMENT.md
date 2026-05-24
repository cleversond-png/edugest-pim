# Deployment Guide — EduGest-PIM no Azure + GitHub Actions

Este guia cobre o deployment automático da aplicação para Azure App Service via GitHub Actions.

## 📋 Pré-requisitos

- ✅ Conta Azure com subscription ativa
- ✅ Azure CLI instalado (`az --version`)
- ✅ Docker instalado (para testes locais)
- ✅ GitHub account (repositório criado)
- ✅ Domínio `pmi.plantaoti.com.br` configurado

---

## 🚀 Setup Inicial (Executar uma vez)

### 1. Criar Resource Group

```bash
az group create \
  --name rg-edugest-pim \
  --location eastus
```

### 2. Criar Azure Container Registry (ACR)

```bash
az acr create \
  --resource-group rg-edugest-pim \
  --name acrpimplantaoti \
  --sku Basic
```

Anote o login server: `acrpimplantaoti.azurecr.io`

### 3. Criar App Service Plan

```bash
az appservice plan create \
  --name plan-edugest-pim \
  --resource-group rg-edugest-pim \
  --sku B1 \
  --is-linux
```

### 4. Criar App Service (com ACR)

```bash
az webapp create \
  --resource-group rg-edugest-pim \
  --plan plan-edugest-pim \
  --name pmi-plantaoti \
  --deployment-container-image-name-user acrpimplantaoti \
  --deployment-container-image-name acrpimplantaoti.azurecr.io/edugest-pim:latest
```

O App Service estará em: `https://pmi-plantaoti.azurewebsites.net`

### 5. Configurar App Service para usar ACR

```bash
az webapp config container set \
  --name pmi-plantaoti \
  --resource-group rg-edugest-pim \
  --docker-custom-image-name acrpimplantaoti.azurecr.io/edugest-pim:latest \
  --docker-registry-server-url https://acrpimplantaoti.azurecr.io \
  --docker-registry-server-user <ACR_USERNAME> \
  --docker-registry-server-password <ACR_PASSWORD>
```

Obtenha credenciais com:
```bash
az acr credential show --resource-group rg-edugest-pim --name acrpimplantaoti
```

### 6. Configurar Variáveis de Ambiente do App Service

```bash
az webapp config appsettings set \
  --resource-group rg-edugest-pim \
  --name pmi-plantaoti \
  --settings \
    WEBSITES_PORT=3000 \
    NODE_ENV=production \
    API_URL=https://pmi.plantaoti.com.br \
    API_KEY=<SUA_CHAVE_API_SECRETA> \
    NEXT_PUBLIC_API_URL=https://pmi.plantaoti.com.br \
    NEXT_PUBLIC_API_KEY=<SUA_CHAVE_API_PUBLICA>
```

---

## 🔐 Configurar Secrets do GitHub

Acesse: `https://github.com/cleversond-png/edugest-pim/settings/secrets/actions`

Adicione os seguintes secrets:

### 1. `AZURE_CREDENTIALS`

Crie um Service Principal com permissões de deploy:

```bash
az ad sp create-for-rbac \
  --name "gh-deploy-edugest-pim" \
  --role contributor \
  --scopes /subscriptions/<SUBSCRIPTION_ID>/resourceGroups/rg-edugest-pim \
  --sdk-auth
```

Copie todo o JSON retornado e cole como valor do secret `AZURE_CREDENTIALS`

### 2. `ACR_NAME`

```
acrpimplantaoti
```

### 3. `ACR_LOGIN_SERVER`

```
acrpimplantaoti.azurecr.io
```

### 4. `APP_SERVICE_NAME`

```
pmi-plantaoti
```

---

## 🌐 Configurar DNS

Aponte o domínio `pmi.plantaoti.com.br` para o Azure App Service:

1. Vá para seu provedor de DNS (ex: Cloudflare, GoDaddy, etc.)
2. Crie um registro **CNAME**:
   - **Host:** `pmi`
   - **Valor:** `pmi-plantaoti.azurewebsites.net`

Aguarde a propagação (até 24 horas)

### Validar DNS

```bash
nslookup pmi.plantaoti.com.br
# Deve retornar: pmi-plantaoti.azurewebsites.net
```

### Configurar Custom Domain no App Service

```bash
az webapp config hostname add \
  --resource-group rg-edugest-pim \
  --webapp-name pmi-plantaoti \
  --hostname pmi.plantaoti.com.br
```

---

## 🔒 Habilitar HTTPS com certificado automático

```bash
az webapp config ssl bind \
  --resource-group rg-edugest-pim \
  --name pmi-plantaoti \
  --certificate-thumbprint <THUMBPRINT> \
  --ssl-type SNI
```

Ou use o Azure App Service's Free Managed Certificate:

```bash
az webapp config ssl create \
  --resource-group rg-edugest-pim \
  --name pmi-plantaoti \
  --hostname pmi.plantaoti.com.br
```

---

## 📤 Deploy Inicial

### 1. Fazer Push para GitHub

```bash
git add .
git commit -m "Initial setup: Docker, GitHub Actions, deployment config"
git remote add origin https://github.com/cleversond-png/edugest-pim.git
git push -u origin main
```

### 2. GitHub Actions vai:

1. ✅ Instalar dependências
2. ✅ Executar linter
3. ✅ Executar testes
4. ✅ Build backend + frontend
5. ✅ Build Docker image
6. ✅ Push para Azure Container Registry
7. ✅ Deploy para App Service

Monitore em: `https://github.com/cleversond-png/edugest-pim/actions`

---

## 🔍 Troubleshooting

### App Service não inicia

```bash
az webapp log tail --resource-group rg-edugest-pim --name pmi-plantaoti
```

### Ver configurações atuais

```bash
az webapp config show --resource-group rg-edugest-pim --name pmi-plantaoti
az webapp config appsettings list --resource-group rg-edugest-pim --name pmi-plantaoti
```

### Reiniciar App Service

```bash
az webapp restart --resource-group rg-edugest-pim --name pmi-plantaoti
```

### Limpar container antigo

```bash
az acr repository delete --name acrpimplantaoti --image edugest-pim:old-tag
```

---

## 📊 Monitoramento

### Ver logs em tempo real

```bash
az webapp log tail \
  --resource-group rg-edugest-pim \
  --name pmi-plantaoti \
  --provider provider-name
```

### Acessar aplicação

```
https://pmi.plantaoti.com.br/analyze
```

---

## 🔄 Atualizações Futuras

A cada commit em `main`, o GitHub Actions automaticamente:

1. Faz build
2. Roda testes
3. Compila Docker image com novo hash
4. Push para ACR
5. Deploy para App Service

**Nada manual necessário!**

---

## 💡 Dicas

- Commits em branches não fazem deploy (só em `main`)
- Pull Requests fazem build e testes, mas NÃO deployam
- Logs estão sempre em: `https://github.com/cleversond-png/edugest-pim/actions`
- Variáveis de ambiente são gerenciadas via Azure portal ou CLI, não pelo código

---

## Documentação Completa

- [Azure App Service](https://learn.microsoft.com/en-us/azure/app-service/)
- [Azure Container Registry](https://learn.microsoft.com/en-us/azure/container-registry/)
- [GitHub Actions + Azure](https://learn.microsoft.com/en-us/azure/developer/github/connect-from-azure)
