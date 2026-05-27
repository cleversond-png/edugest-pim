#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${1:-https://ca-edugest-pim-web-prod.purpleground-cde5672b.brazilsouth.azurecontainerapps.io}"

tmp_dir="$(mktemp -d)"
trap 'rm -rf "$tmp_dir"' EXIT

html_file="$tmp_dir/products-new.html"
css_file="$tmp_dir/app.css"
api_file="$tmp_dir/products.json"

curl -fsSL "$BASE_URL/products/new" -o "$html_file"

if grep -Eq 'NEXT_PUBLIC_API_KEY|X-Api-Key|chave-local|api-key' "$html_file"; then
  echo "FAIL: public HTML contains API key markers"
  exit 1
fi

css_path="$(grep -o 'href="/_next/static/chunks/[^"]*\.css"' "$html_file" | head -1 | sed 's/^href="//;s/"$//')"
if [[ -z "$css_path" ]]; then
  echo "FAIL: CSS asset not found in HTML"
  exit 1
fi

curl -fsSL "$BASE_URL$css_path" -o "$css_file"

for token in '.bg-blue-600' '.text-gray-900' '.rounded-lg' ':where(select),:where(option)' ':where(option:checked)'; do
  if ! grep -q "$token" "$css_file"; then
    echo "FAIL: CSS token missing: $token"
    exit 1
  fi
done

curl -fsSL "$BASE_URL/api/products" -o "$api_file"
if ! grep -q '"data"' "$api_file"; then
  echo "FAIL: frontend /api/products proxy did not return data"
  exit 1
fi

echo "PASS: frontend production smoke test ok"
