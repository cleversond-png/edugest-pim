# SPEC-RENDERER — Motor de Geração de Documentação e Exports (EduGest-PIM)

> Este documento define o **motor de renderização** responsável por gerar:
> - Documentação por produto (`.md` e `.html`)
> - Exports de integração (`.json`) para ERP (padrão Sankhya) e Partner Center
> - Consolidados (`_index/`)
>
> O motor deve operar em dois modos:
> 1) **Dry-run**: gera bundle local (lista de arquivos + conteúdo)
> 2) **Publish**: publica no SharePoint (quando habilitado)

A estrutura de saída (pastas e arquivos) segue a árvore especificada na spec v2 (README.md, index.html, dimensões e exports em `/integracao/`, além do `_index`). citeturn1search1

Os campos do export ERP devem seguir o padrão do cadastro Sankhya e o guia campo‑a‑campo (quando um campo estiver “A VALIDAR”, o export final deve ser marcado como bloqueado). citeturn2search2

---

## 1) Entradas e saídas

### 1.1 Entrada do renderer
O renderer recebe um `RenderRequest`:

```json
{
  "productId": "...",
  "productVersion": "1.0.0",
  "pricingVersion": "1.0.0",
  "mode": "DRY_RUN | PUBLISH",
  "targets": ["SHAREPOINT_DOCS", "ERP_SANKHYA", "PARTNER_CENTER"],
  "sharepoint": {
    "siteUrl": "https://eduproms.sharepoint.com/sites/novaintranet",
    "libraryPath": "/Central do Produto/"
  }
}
```

### 1.2 Saída do renderer
O renderer deve retornar um `RenderResult`:

```json
{
  "blocked": false,
  "blockedReasons": [],
  "files": [
    {"path": "Produto/README.md", "contentType": "text/markdown", "content": "..."},
    {"path": "Produto/index.html", "contentType": "text/html", "content": "..."},
    {"path": "Produto/integracao/erp-export.json", "contentType": "application/json", "content": "{...}"}
  ],
  "summary": {
    "filesGenerated": 14,
    "targets": ["SHAREPOINT_DOCS", "ERP_SANKHYA"],
    "product": {"id": "...", "name": "...", "slug": "..."}
  }
}
```

---

## 2) Fonte de dados (query)

Para renderizar, o motor deve carregar:
- `Product` (campos canônicos)
- `ProductCapability` + `Capability`
- `ProductDimensionDoc` (por dimensão)
- `ProductKit` (SALES/MARKETING/PRESALES)
- `DependencyRule`
- `PricingPolicy` + `PricingVersion(active)` + `PricingTier` + `PricingAdjustment`
- `ERPMappingSankhya`
- `PartnerCenterMapping`
- `SharePointConfig`

> **Regra de consistência**: o renderer deve preferir `ProductVersion.snapshot` quando `productVersion` for informado.

---

## 3) Linguagem de template

### 3.1 Padrão de placeholders
Os templates do seed usam placeholders no estilo **Handlebars/Mustache**, por exemplo:
- `{{product.name}}`
- `{{#each pricing.tiers}}...{{/each}}`

### 3.2 Contexto de render (`RenderContext`)
O renderer deve construir um objeto único:

```json
{
  "product": {
    "name": "...",
    "slug": "...",
    "status": "ATIVO",
    "shortPitch": "...",
    "pains": [],
    "valueProp": "...",
    "differentiators": [],
    "capabilities": [{"code": "M365", "name": "Microsoft 365"}]
  },
  "pricing": {
    "currency": "BRL",
    "tiers": [{"hosting": "CLOUD", "minQty": 1, "maxQty": 50, "monthlyFee": "500.00", "planName": "BASIC"}],
    "table": "...renderização opcional..."
  },
  "dependencies": [{"dependencyType": "Condicional", "baseProductRef": "integrador", "notes": "..."}],
  "erp": {"codigo": "...", "grupoCodigo": "...", "temISS": "..."},
  "partner": {"offerType": "SaaS", "solutionAreas": ["ModernWork"], "plans": []},
  "tech": {"architecture": "..."},
  "support": {"kb": "..."},
  "roadmap": {"items": "..."},
  "integrations": {"summary": "..."},
  "meta": {
    "generatedAt": "ISO-8601",
    "updatedAt": "ISO-8601",
    "productVersion": "1.0.0",
    "pricingVersion": "1.0.0"
  }
}
```

---

## 4) Regras de geração de arquivos (árvore)

A árvore abaixo é o resultado esperado (base): citeturn1search1

```
SharePoint/Central do Produto/
├── {Produto}/
│   ├── README.md
│   ├── index.html
│   ├── identidade/
│   │   ├── proposta-valor.md
│   │   ├── dores-e-persona.md
│   │   └── diferenciais.md
│   ├── tecnico/
│   │   ├── arquitetura.md
│   │   ├── requisitos.md
│   │   ├── integracoes.md
│   │   └── limitacoes.md
│   ├── comercial/
│   │   ├── tabela-precos.md
│   │   ├── scripts-venda.md
│   │   ├── objecoes-respostas.md
│   │   └── cases-sucesso.md
│   ├── suporte/
│   │   ├── problemas-conhecidos.md
│   │   ├── faq.md
│   │   └── troubleshooting.md
│   ├── roadmap/
│   │   ├── backlog.md
│   │   └── changelog.md
│   └── integracao/
│       ├── erp-export.json
│       └── partner-center.json
│
└── _index/
    ├── catalogo-completo.md
    ├── catalogo-completo.json
    └── tabela-precos-geral.md
```

### 4.1 Regras de nomes e slug
- `Produto/` deve ser derivado de `product.name` normalizado **ou** `product.slug` (recomendado).
- O renderer deve preservar uma `folderSlug` no `SharePointConfig` para estabilidade.

---

## 5) Renderização por tipo de template

### 5.1 README (README.md)
- Fonte: `DocTemplate` com `type = README`
- Contexto mínimo:
  - `product` + `capabilities` + `pricing.tiers` + `dependencies` + `meta`

### 5.2 INDEX_HTML (index.html)
- Fonte: `DocTemplate` com `type = INDEX_HTML`
- Contexto mínimo:
  - `product` + `pricing.table` + `tech/support/roadmap/integrations` + `meta`

### 5.3 DIMENSION (docs por dimensão)
- Fonte: `DocTemplate` com `type = DIMENSION`
- Para cada dimensão, o renderer deve:
  1) resolver o `ProductDimensionDoc` correspondente (markdown/html/jsonData)
  2) construir `dimension.title` e `dimension.body`

### 5.4 KIT (docs por persona)
- Fonte: `DocTemplate` com `type = KIT`
- Para cada kit (SALES/MARKETING/PRESALES), usar `ProductKit.markdown` ou `ProductKit.jsonData`.

### 5.5 INDEX (consolidados)
- `catalogo-completo.md`: lista produtos/slug/status/pitch.
- `catalogo-completo.json`: estrutura simplificada para IA.
- `tabela-precos-geral.md`: consolidado de tiers.

---

## 6) Exports

### 6.1 ERP (Sankhya)
- Fonte: template `EXPORT_ERP`
- Dados vêm de `ERPMappingSankhya` e `Pricing`.
- **Regra de bloqueio**: se `ERPMappingSankhya.fiscalStatus` ou `cadastroStatus` for `A_VALIDAR`, marcar `blocked=true` para `ERP_SANKHYA`. citeturn2search2

### 6.2 Partner Center
- Fonte: template `EXPORT_PARTNER`
- Dados vêm de `PartnerCenterMapping` + `Pricing`.
- `solutionAreas` pode ser inferido via capabilities, mas o valor final deve ficar em `PartnerCenterMapping.solutionAreas` para permitir ajuste humano.

---

## 7) Modo Publish (SharePoint)

### 7.1 Persistência e auditoria
- Cada execução cria um registro `DocBuildRun`:
  - status (SUCCESS/FAILED)
  - logs
  - quantidade de arquivos gerados

### 7.2 Publicação
- Quando `mode = PUBLISH`, o renderer deve publicar no SharePoint.
- A spec v2 prevê sincronização via Graph API e endpoint de sync. citeturn1search1

> Nesta fase, se a publicação não estiver implementada, o renderer deve retornar o bundle (modo DRY_RUN) para upload manual.

---

## 8) Economia de tokens (renderer + IA)

- O renderer deve gerar um `README.md` **IA-ready** com alto sinal e baixo ruído.
- O sistema deve armazenar:
  - versões (`ProductVersion`, `PricingVersion`)
  - bundles gerados
- O agente deve consumir:
  - `README.md` (resumo)
  - apenas as dimensões/kits relevantes recuperados por busca

---

## 9) Checklist de testes (mínimo)

### Unit
- Render README com produto mínimo
- Render index.html
- Render exports JSON com placeholders
- Bloqueio de export ERP quando `A_VALIDAR`

### Integração
- Build completo de 1 produto gera estrutura inteira
- `_index` consolidado não quebra com catálogo vazio

---

## 10) Definition of Done (renderer)
- Dado um `productId`, o renderer gera os arquivos conforme árvore.
- Gera exports ERP/Partner conforme templates.
- Registra `DocBuildRun`.
- Funciona em DRY_RUN.

