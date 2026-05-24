# 🚀 DEPLOYMENT COMPLETO — EduGest-PIM

**Status:** ✅ **LIVE & OPERATIONAL**  
**Data:** 2026-05-24  
**Plataforma:** Azure Container Instances  

---

## 📍 Acessar a Aplicação

### URLs de Acesso

| Serviço | URL | Status |
|---------|-----|--------|
| **API Health** | http://20.232.74.136:3000/api/health | ✅ Live |
| **Frontend** | http://20.232.74.136:3000 | ✅ Live |
| **Analisar Oportunidade** | http://20.232.74.136/analyze | ✅ Live |

### Domínio Customizado

Para apontar `pmi.plantaoti.com.br` para a aplicação:

1. Configure um CNAME no seu DNS:
   - **Host:** `pmi`
   - **Valor:** (você pode apontar para um Application Gateway ou usar um serviço como Cloudflare)
   - Ou use o IP direto: `20.232.74.136`

2. Depois acesse: `https://pmi.plantaoti.com.br/analyze`

---

## 🏗️ Infraestrutura Azure

### Recursos Criados

```
Resource Group: rg-edugest-pim (eastus)
├── Container Registry: acrpimplantaoti
│   └── Image: edugest-pim:latest
│       └── Platform: linux/amd64
│
└── Container Instance: pmi-plantaoti
    ├── Cores: 1 CPU
    ├── Memória: 1.5 GB
    ├── IP Público: 20.232.74.136
    ├── Portas: 80, 3000
    └── Estado: Running ✅
```

### Credenciais Armazenadas

Segredos foram salvos em `/tmp/azure-creds.json` (service principal para GitHub).

---

## 🔄 CI/CD Automático (GitHub Actions)

### Como Funciona

```
1. Você faz: git push origin main
   ↓
2. GitHub Actions é disparado
   ├── npm ci (instalar dependências)
   ├── npm run lint (validar código)
   ├── npm run test (rodar testes)
   ├── npm run build (compilar backend + frontend)
   ├── docker buildx build (build imagem amd64)
   ├── docker push (enviar para ACR)
   └── az container restart (reiniciar container)
   ↓
3. Aplicação atualizada em ~5-10 minutos
```

### Monitorar Deployment

Veja o status em tempo real:
```bash
# Via GitHub
open https://github.com/cleversond-png/edugest-pim/actions

# Via Azure
az container logs \
  --resource-group rg-edugest-pim \
  --name pmi-plantaoti \
  --follow
```

---

## 📦 Informações Técnicas

### Backend (Fastify)

- **Porta:** 3000
- **Health Check:** GET `/api/health`
- **Endpoints:**
  - `POST /api/analyze` - Analisar transcrição
  - `POST /api/publish` - Publicar no SharePoint
  - `GET /api/health` - Status da API

### Frontend (Next.js)

- **Porta:** 3001 (internamente, exposto como 3000)
- **Pages:**
  - `/analyze` - Formulário de entrada
  - `/result/[executionId]` - Resultado da análise
  - `/result/[executionId]/publish` - Publicação

### Docker

- **Imagem Base:** `node:20-alpine`
- **Tamanho:** ~850MB (comprimido)
- **Multi-stage Build:**
  1. Builder Backend: TypeScript → JavaScript
  2. Builder Frontend: Next.js Build
  3. Production: Ambas as apps rodando

---

## 🔧 Variáveis de Ambiente

Configuradas no Container Instance:

```env
WEBSITES_PORT=3000
NODE_ENV=production
API_URL=https://pmi.plantaoti.com.br
API_KEY=chave-producao-segura
NEXT_PUBLIC_API_URL=https://pmi.plantaoti.com.br
```

Para alterar:
```bash
az container update \
  --resource-group rg-edugest-pim \
  --name pmi-plantaoti \
  --environment-variables KEY=VALUE
```

---

## 🔐 GitHub Secrets Configurados

| Secret | Uso | Valor |
|--------|-----|-------|
| `AZURE_CREDENTIALS` | Autenticação Azure | Service Principal JSON |
| `ACR_NAME` | Container Registry | `acrpimplantaoti` |
| `ACR_LOGIN_SERVER` | URL do Registry | `acrpimplantaoti.azurecr.io` |
| `ACR_USERNAME` | Credencial ACR | `acrpimplantaoti` |
| `ACR_PASSWORD` | Senha ACR | (gerada) |
| `CONTAINER_RESOURCE_GROUP` | Grupo de recursos | `rg-edugest-pim` |
| `CONTAINER_NAME` | Nome da instância | `pmi-plantaoti` |

---

## 📊 Monitoramento

### Logs em Tempo Real

```bash
# Logs da aplicação
az container logs \
  --resource-group rg-edugest-pim \
  --name pmi-plantaoti \
  --follow

# Ver status atual
az container show \
  --resource-group rg-edugest-pim \
  --name pmi-plantaoti \
  --query "containers[0].instanceView"
```

### Health Check

```bash
# Testar API
curl http://20.232.74.136:3000/api/health

# Testar Frontend
curl -I http://20.232.74.136
```

---

## 🛠️ Operações Comuns

### Reiniciar Container

```bash
az container restart \
  --resource-group rg-edugest-pim \
  --name pmi-plantaoti
```

### Deletar Container (⚠️ cuidado!)

```bash
az container delete \
  --resource-group rg-edugest-pim \
  --name pmi-plantaoti \
  --yes
```

### Recriar Container

```bash
az container create \
  --resource-group rg-edugest-pim \
  --name pmi-plantaoti \
  --image acrpimplantaoti.azurecr.io/edugest-pim:latest \
  --cpu 1 --memory 1.5 \
  --registry-login-server acrpimplantaoti.azurecr.io \
  --registry-username <USERNAME> \
  --registry-password <PASSWORD> \
  --ip-address public --ports 80 3000 \
  --environment-variables \
    WEBSITES_PORT=3000 \
    NODE_ENV=production \
    API_URL=https://pmi.plantaoti.com.br \
    API_KEY=chave-producao-segura
```

---

## 📝 Próximos Passos (Opcional)

### 1. HTTPS com Custom Domain

Use Azure Application Gateway ou adicione um certificado SSL:

```bash
# Gerar certificado (Let's Encrypt recomendado)
# Depois configure em um Application Gateway ou Front Door
```

### 2. Auto-scaling

Container Instances não faz auto-scale automaticamente. Para isso, use Azure App Service ou AKS.

### 3. Backup & Disaster Recovery

- Container Instances não persiste dados entre restarts
- Para dados persistentes, use Azure Files ou Database
- Recomendação: Usar Azure Cosmos DB + SharePoint para persistência

### 4. CDN

Adicione Azure Front Door para:
- Distribuição geográfica
- Cache global
- DDoS protection

---

## 🎯 Checklist de Deploy

- ✅ Azure Resource Group criado
- ✅ Container Registry criado
- ✅ Docker image buildada (amd64)
- ✅ Container Instance rodando
- ✅ GitHub Actions configurado
- ✅ GitHub Secrets adicionados
- ✅ Primeira implantação funcionando
- ⏳ DNS apontando (próximo passo do usuário)
- ⏳ HTTPS/SSL (opcional)

---

## 📞 Suporte & Documentação

| Arquivo | Propósito |
|---------|-----------|
| [README.md](./README.md) | Overview do projeto |
| [DEPLOYMENT.md](./DEPLOYMENT.md) | Guia detalhado (referência) |
| [AZURE-SETUP-QUICK.md](./AZURE-SETUP-QUICK.md) | Setup rápido |
| [.github/workflows/deploy.yml](./.github/workflows/deploy.yml) | Configuração CI/CD |
| [Dockerfile](./Dockerfile) | Definição do container |
| [start.js](./start.js) | Entry point de produção |

---

## 🚀 Resumo Final

### O que você tem agora:

✅ **Aplicação rodando** em um IP público do Azure  
✅ **CI/CD automático** - qualquer push dispara deployment  
✅ **Backend + Frontend juntos** em um único container  
✅ **Segredos seguros** em GitHub Secrets  
✅ **Imagem optimizada** em multi-stage Docker build  
✅ **Pronto para produção** com variáveis de ambiente  

### Próximos passos (SEU):

1. Configurar DNS apontando para `20.232.74.136` (ou Application Gateway)
2. (Opcional) Adicionar HTTPS/SSL
3. (Opcional) Configurar backup e monitoring

---

**Deploy completado com sucesso!** 🎉  
Sua aplicação está ao vivo e pronta para uso.
