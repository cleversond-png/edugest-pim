# Infra Produção — EDUGEST-PIM

## Recursos dedicados

| Função | Recurso |
|---|---|
| Resource group | `rg-edugest-pim-prod` |
| Container Registry | `acredgestpimprod.azurecr.io` |
| Managed Identity | `id-edugest-pim-prod` |
| Backend API | `ca-edugest-pim-api` |
| Frontend Web | `ca-edugest-pim-web-prod` |
| Log Analytics | `log-edugest-pim-prod` |

## URLs

- Backend: `https://ca-edugest-pim-api.purpleground-cde5672b.brazilsouth.azurecontainerapps.io`
- Frontend: `https://ca-edugest-pim-web-prod.purpleground-cde5672b.brazilsouth.azurecontainerapps.io`

## Imagens

- Backend: `acredgestpimprod.azurecr.io/edugest-pim-api:*`
- Frontend: `acredgestpimprod.azurecr.io/edugest-pim-web:*`

## Observação de quota

A assinatura Azure atualmente permite apenas um Azure Container Apps Managed Environment. Por isso, os Container Apps dedicados do PIM usam o Managed Environment existente da assinatura, mas os apps, resource group, registry, identidade e imagens são próprios do EDUGEST-PIM.

Quando a quota for aumentada, criar um Managed Environment próprio para o PIM e atualizar `MANAGED_ENV_ID` no bootstrap.

## Validação

```bash
bash scripts/qa-frontend-production.sh
```

Resultado esperado:

```text
PASS: frontend production smoke test ok
```
