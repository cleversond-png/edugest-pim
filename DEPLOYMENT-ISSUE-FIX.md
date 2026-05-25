# 🔧 Issue Fix — API_KEY Configuration

**Data:** 2026-05-25  
**Issue:** Container não estava respondendo ao health check (timeout > 3 min)  
**Causa:** Variável de ambiente `API_KEY` não estava configurada no Azure Container Instance  
**Status:** ✅ Resolvido

---

## Problema

O container estava rodando mas não respondia a requisições HTTP:

```
❌ curl -s http://20.232.74.136:3000/api/health
→ TIMEOUT (timeout >3 minutos)
```

### Diagnóstico

Os logs do container mostravam:
```json
{"status":"FAILED","errorCode":"INTERNAL_ERROR","message":"API_KEY not configured on server"}
```

A middleware de autenticação (`apps/api/src/middleware/auth.ts`) exige a variável de ambiente `API_KEY` e retorna 500 se não estiver configurada.

---

## Solução

### 1️⃣ Deletar container antigo
```bash
az container delete --resource-group rg-edugest-pim --name pmi-plantaoti --yes
```

### 2️⃣ Recriar com variáveis de ambiente
```bash
az container create \
  --resource-group rg-edugest-pim \
  --name pmi-plantaoti \
  --image acrpimplantaoti.azurecr.io/edugest-pim:latest \
  --cpu 1 \
  --memory 1.5 \
  --os-type Linux \
  --registry-login-server acrpimplantaoti.azurecr.io \
  --registry-username acrpimplantaoti \
  --registry-password <ACR_PASSWORD> \
  --ip-address Public \
  --ports 80 3000 \
  --environment-variables \
    API_KEY="chave-local-teste-123" \
    NODE_ENV="production"
```

### 3️⃣ Atualizar arquivo de configuração

Para evitar este problema no futuro com o GitHub Actions, a variável `API_KEY` deveria estar em um GitHub Secret e passada no workflow.

**Arquivo:** `.github/workflows/deploy.yml`

Adicionar step antes de `az container create`:
```yaml
- name: Set API_KEY
  env:
    API_KEY: ${{ secrets.API_KEY }}
  run: echo "API_KEY=${{ secrets.API_KEY }}" >> deploy.env
```

---

## IPs Antigos vs Novos

| Data | IP | Status |
|------|----|----|
| 2026-05-24 | `20.232.74.136` | ❌ Obsoleto (container deletado) |
| 2026-05-25 | `52.142.35.255` | ❌ Sem IP público (recriar) |
| 2026-05-25 (atual) | `4.157.43.147` | ✅ Ativo com API_KEY |

---

## Teste Final

```bash
# Health check com API_KEY
curl -H "X-Api-Key: chave-local-teste-123" \
  http://4.157.43.147:3000/api/health

# Resposta esperada:
# {"status":"ok","version":"1.0.0",...}
```

✅ **Resultado:** Servidor respondendo normalmente

---

## Próximas Melhorias

1. **GitHub Secrets:** Adicionar `API_KEY` como GitHub Secret
2. **Workflow:** Passar `API_KEY` no passo de `az container create`
3. **Environment File:** Usar `.env` template para variáveis críticas
4. **Dockerfile:** Adicionar comentário sobre variáveis obrigatórias

---

## Frontend Fix (Commit f02790f)

Também atualizado `start.js` para iniciar tanto o backend quanto o frontend Next.js:
- Backend: Fastify na porta 3000
- Frontend: Next.js na porta 3001

Aguardando rebuild e redeploy do GitHub Actions...
