# 🚀 Deployment — Frontend Next.js no Azure Static Web Apps

## Configuração Inicial (One-time)

### 1. Adicionar GitHub Secret: AZURE_STATIC_WEB_APPS_TOKEN

O token de deployment já foi fornecido. Adicione no GitHub:

**URL**: https://github.com/cleversond-png/edugest-pim/settings/secrets/actions

**Passo:**
1. Clique em "New repository secret"
2. Nome: `AZURE_STATIC_WEB_APPS_TOKEN`
3. Valor (copie exatamente):
```
08f5430d86a28128062ed19be6e6784b229849f80b9c2c103cbde098326065a007-d092a5d8-452a-4a77-96f5-b80ea3c430b000f31060b995350f
```
4. Clique em "Add secret"

### 2. Variáveis de Ambiente

O workflow já está configurado para usar:
```env
NEXT_PUBLIC_API_URL=https://ca-edugest-prod-backend.purpleground-cde5672b.brazilsouth.azurecontainerapps.io
```

Se precisar alterar, editar em `.github/workflows/deploy.yml` linha 119.

### 3. Configuração do Static Web Apps

O arquivo `staticwebapp.config.json` já foi criado com:
- Roteamento de `/api/*` para o backend em produção
- Fallback para SPA (rota 404 → index.html)

## Deploy — Fluxo Automático

O frontend fará deploy automaticamente quando:
1. Fazer `git push origin main`
2. GitHub Actions executa:
   - Build do Core package
   - Build do Next.js (apps/web)
   - Deploy no Azure Static Web Apps

**URL de Produção**: https://zealous-ground-0b995350f.7.azurestaticapps.net

## Validação Após Deploy

```bash
# 1. Testar página de produtos
curl -s https://zealous-ground-0b995350f.7.azurestaticapps.net/products | head -50

# 2. Testar rota dinâmica
curl -s https://zealous-ground-0b995350f.7.azurestaticapps.net/result/test-id | head -50

# 3. Testar proxy de API
curl -s -H "X-Api-Key: chave-local-teste-123" \
  https://zealous-ground-0b995350f.7.azurestaticapps.net/api/products | jq .

# 4. Verificar saúde do frontend
curl -I https://zealous-ground-0b995350f.7.azurestaticapps.io/
# Esperado: HTTP 200 OK
```

## Troubleshooting

| Problema | Solução |
|---|---|
| Deploy falha com token inválido | Verificar token em GitHub Settings → Secrets |
| API retorna 502 Bad Gateway | Backend em produção está down; verificar `ca-edugest-prod-backend` |
| Página carrega mas API falha | Verificar `NEXT_PUBLIC_API_URL` no workflow |
| Build falha | Verificar logs em GitHub Actions → Workflows |

## Monitoramento

**GitHub Actions**: https://github.com/cleversond-png/edugest-pim/actions  
**Azure Portal**: https://portal.azure.com → Static Web Apps → zealous-ground-0b995350f  
**Logs de Deployment**: Azure Portal → Static Web Apps → Overview → Latest deployment

---

**Última atualização**: 2026-05-25  
**Mantido por**: Claude Code (Fase 3)
