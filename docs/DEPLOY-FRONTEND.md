# Deployment — Frontend EDUGEST-PIM

O frontend de produção do EDUGEST-PIM roda em Azure Container Apps, não em Static Web Apps.

## Produção Atual

| Item | Valor |
|---|---|
| Resource Group | `rg-edugest-pim-prod` |
| Container App | `ca-edugest-pim-web-prod` |
| URL | `https://ca-edugest-pim-web-prod.purpleground-cde5672b.brazilsouth.azurecontainerapps.io` |
| Imagem | `acredgestpimprod.azurecr.io/edugest-pim-web:*` |
| Backend | `https://ca-edugest-pim-api.purpleground-cde5672b.brazilsouth.azurecontainerapps.io` |

## Deploy Automático

O workflow `.github/workflows/deploy.yml` faz:

1. Build da API e do frontend.
2. Push das imagens para `acredgestpimprod.azurecr.io`.
3. Update do backend `ca-edugest-pim-api`.
4. Update do frontend `ca-edugest-pim-web-prod`.
5. Smoke test do frontend publicado.

## Variáveis do Frontend

O Container App recebe:

```env
NODE_ENV=production
PORT=3001
HOSTNAME=0.0.0.0
API_URL=https://ca-edugest-pim-api.purpleground-cde5672b.brazilsouth.azurecontainerapps.io
NEXT_PUBLIC_API_URL=https://ca-edugest-pim-api.purpleground-cde5672b.brazilsouth.azurecontainerapps.io
API_KEY=secretref:api-key
```

## Validação

```bash
bash scripts/qa-frontend-production.sh
```

Ou diretamente:

```bash
curl -sS https://ca-edugest-pim-web-prod.purpleground-cde5672b.brazilsouth.azurecontainerapps.io/api/products
```

## Troubleshooting

| Problema | Verificar |
|---|---|
| `/api/products` retorna 404 | Imagem ativa do backend em `ca-edugest-pim-api` |
| Frontend carrega mas API falha | `API_URL`, `NEXT_PUBLIC_API_URL` e secret `api-key` no Container App |
| Deploy falha ao puxar imagem | `AcrPull` da Managed Identity `id-edugest-pim-prod` no ACR |
| Revisão não fica saudável | Logs do Container App no resource group `rg-edugest-pim-prod` |

Última atualização: 2026-05-27.
