#!/usr/bin/env bash
set -euo pipefail

NEW_RG="${NEW_RG:-rg-edugest-pim-prod}"
ACR_NAME="${ACR_NAME:-acredgestpimprod}"
ACR_SERVER="${ACR_SERVER:-${ACR_NAME}.azurecr.io}"
MANAGED_ENV_ID="${MANAGED_ENV_ID:?Set MANAGED_ENV_ID to the Container Apps managed environment resource id}"
IDENTITY_ID="${IDENTITY_ID:-/subscriptions/fff2fba5-4dec-45c0-ad64-a04006defad9/resourcegroups/rg-edugest-pim-prod/providers/Microsoft.ManagedIdentity/userAssignedIdentities/id-edugest-pim-prod}"

API_APP="${API_APP:-ca-edugest-pim-api}"
WEB_APP="${WEB_APP:-ca-edugest-pim-web-prod}"
API_IMAGE="${API_IMAGE:-${ACR_SERVER}/edugest-pim-api:latest}"
WEB_IMAGE="${WEB_IMAGE:-${ACR_SERVER}/edugest-pim-web:latest}"

: "${DATABASE_URL:?Set DATABASE_URL}"
: "${JWT_SECRET:?Set JWT_SECRET}"
: "${ENCRYPTION_KEY:?Set ENCRYPTION_KEY}"
: "${API_KEY:?Set API_KEY}"
: "${ANTHROPIC_API_KEY:?Set ANTHROPIC_API_KEY}"
: "${MICROSOFT_CLIENT_ID:?Set MICROSOFT_CLIENT_ID}"
: "${MICROSOFT_TENANT_ID:?Set MICROSOFT_TENANT_ID}"
: "${TENANT_PORTAL_URL:?Set TENANT_PORTAL_URL}"

ensure_api_app() {
  if az containerapp show --name "$API_APP" --resource-group "$NEW_RG" >/dev/null 2>&1; then
    az containerapp secret set \
      --name "$API_APP" \
      --resource-group "$NEW_RG" \
      --secrets \
        database-url="$DATABASE_URL" \
        jwt-secret="$JWT_SECRET" \
        encryption-key="$ENCRYPTION_KEY" \
        api-key="$API_KEY" \
        anthropic-api-key="$ANTHROPIC_API_KEY" \
      >/dev/null

    az containerapp update \
      --name "$API_APP" \
      --resource-group "$NEW_RG" \
      --image "$API_IMAGE" \
      --set-env-vars \
        NODE_ENV=production \
        PORT=3000 \
        DATABASE_URL=secretref:database-url \
        JWT_SECRET=secretref:jwt-secret \
        ENCRYPTION_KEY=secretref:encryption-key \
        API_KEY=secretref:api-key \
        ANTHROPIC_API_KEY=secretref:anthropic-api-key \
        EMAIL_FROM=no-reply@plantaoti.com.br \
        TENANT_PORTAL_URL="$TENANT_PORTAL_URL" \
        MICROSOFT_CLIENT_ID="$MICROSOFT_CLIENT_ID" \
        MICROSOFT_TENANT_ID="$MICROSOFT_TENANT_ID" \
      >/dev/null
  else
    az containerapp create \
      --name "$API_APP" \
      --resource-group "$NEW_RG" \
      --environment "$MANAGED_ENV_ID" \
      --image "$API_IMAGE" \
      --target-port 3000 \
      --ingress external \
      --user-assigned "$IDENTITY_ID" \
      --registry-server "$ACR_SERVER" \
      --registry-identity "$IDENTITY_ID" \
      --cpu 0.5 \
      --memory 1Gi \
      --min-replicas 1 \
      --max-replicas 5 \
      --secrets \
        database-url="$DATABASE_URL" \
        jwt-secret="$JWT_SECRET" \
        encryption-key="$ENCRYPTION_KEY" \
        api-key="$API_KEY" \
        anthropic-api-key="$ANTHROPIC_API_KEY" \
      --env-vars \
        NODE_ENV=production \
        PORT=3000 \
        DATABASE_URL=secretref:database-url \
        JWT_SECRET=secretref:jwt-secret \
        ENCRYPTION_KEY=secretref:encryption-key \
        API_KEY=secretref:api-key \
        ANTHROPIC_API_KEY=secretref:anthropic-api-key \
        EMAIL_FROM=no-reply@plantaoti.com.br \
        TENANT_PORTAL_URL="$TENANT_PORTAL_URL" \
        MICROSOFT_CLIENT_ID="$MICROSOFT_CLIENT_ID" \
        MICROSOFT_TENANT_ID="$MICROSOFT_TENANT_ID" \
      >/dev/null
  fi
}

ensure_web_app() {
  local api_fqdn api_url
  api_fqdn="$(az containerapp show --name "$API_APP" --resource-group "$NEW_RG" --query "properties.configuration.ingress.fqdn" -o tsv)"
  api_url="https://${api_fqdn}"

  if az containerapp show --name "$WEB_APP" --resource-group "$NEW_RG" >/dev/null 2>&1; then
    az containerapp secret set \
      --name "$WEB_APP" \
      --resource-group "$NEW_RG" \
      --secrets api-key="$API_KEY" \
      >/dev/null

    az containerapp revision set-mode \
      --name "$WEB_APP" \
      --resource-group "$NEW_RG" \
      --mode single \
      >/dev/null

    az containerapp update \
      --name "$WEB_APP" \
      --resource-group "$NEW_RG" \
      --image "$WEB_IMAGE" \
      --set-env-vars \
        NODE_ENV=production \
        PORT=3001 \
        HOSTNAME=0.0.0.0 \
        API_URL="$api_url" \
        NEXT_PUBLIC_API_URL="$api_url" \
        API_KEY=secretref:api-key \
        FRONTEND_BUILD=dedicated-pim-infra \
      >/dev/null
  else
    az containerapp create \
      --name "$WEB_APP" \
      --resource-group "$NEW_RG" \
      --environment "$MANAGED_ENV_ID" \
      --image "$WEB_IMAGE" \
      --target-port 3001 \
      --ingress external \
      --user-assigned "$IDENTITY_ID" \
      --registry-server "$ACR_SERVER" \
      --registry-identity "$IDENTITY_ID" \
      --cpu 0.5 \
      --memory 1Gi \
      --min-replicas 1 \
      --max-replicas 10 \
      --secrets api-key="$API_KEY" \
      --env-vars \
        NODE_ENV=production \
        PORT=3001 \
        HOSTNAME=0.0.0.0 \
        API_URL="$api_url" \
        NEXT_PUBLIC_API_URL="$api_url" \
        API_KEY=secretref:api-key \
        FRONTEND_BUILD=dedicated-pim-infra \
      >/dev/null
  fi
}

ensure_api_app
ensure_web_app

api_fqdn="$(az containerapp show --name "$API_APP" --resource-group "$NEW_RG" --query "properties.configuration.ingress.fqdn" -o tsv)"
web_fqdn="$(az containerapp show --name "$WEB_APP" --resource-group "$NEW_RG" --query "properties.configuration.ingress.fqdn" -o tsv)"

printf 'API_URL=https://%s\n' "$api_fqdn"
printf 'WEB_URL=https://%s\n' "$web_fqdn"
