# SPEC-SEED — EduGest-PIM (Central Inteligente de Produto)

> Este documento define o **seed inicial** do banco para o produto **EduGest-PIM / Central Inteligente de Produto**.
> O seed cria:
> 1) Taxonomia de **Capabilities** (para matching e inferência de solution areas)
> 2) **DocTemplates** (Markdown/HTML/JSON) para geração automática de documentação e exports

## 1) Escopo do seed

### 1.1 O seed **NÃO** cria produtos reais
- Apenas prepara o banco com **capabilities** e **templates**.
- Produtos serão cadastrados via UI/API depois.

### 1.2 SharePoint (Central do Produto)
- Site inicial de documentação: [Central do Produto (SharePoint)](https://eduproms.sharepoint.com/sites/novaintranet)
- A estrutura de docs e o formato do README e da árvore de pastas seguem a spec v2 (README + index.html + subpastas e `_index`). citeturn1search1

### 1.3 ERP (Sankhya) — export
- Os campos previstos no template de ERP seguem o padrão da planilha de cadastro/guia campo‑a‑campo. citeturn2search2

---

## 2) Capabilities (taxonomia inicial)

> **Regra**: capability tem `code` estável (UPPER_SNAKE / UPPER) e `name` humano.
> O matching e a inferência de solution areas usam essa lista.

### 2.1 Lista inicial (recomendada)

**Plataformas e colaboração**
- `M365` — Microsoft 365 (suite)
- `TEAMS` — Colaboração e reuniões
- `SHAREPOINT` — Portais, intranet, conteúdos
- `ONEDRIVE` — Arquivos pessoais / sync

**Identidade e segurança**
- `IDENTITY` — Identidade e autenticação
- `ENTRA_ID` — Entra ID (Azure AD)
- `PIM` — Privileged Identity Management
- `MFA_CA` — MFA e Conditional Access
- `SECURITY` — Segurança (geral)
- `AUDIT_LOGS` — Auditoria e logs
- `DATA_GOVERNANCE` — Governança de dados

**Azure / Integração / Dev**
- `AZURE` — Azure (geral)
- `AZURE_APP` — Apps/Functions/App Service
- `GRAPH_API` — Microsoft Graph
- `API_INTEGRATION` — Integração com APIs de terceiros
- `WEBHOOKS` — Webhooks/eventos

**IA / Copilot**
- `AI` — IA (geral)
- `COPILOT` — Copilot / agentes
- `RAG` — Retrieval Augmented Generation

**Operação / Comercial**
- `PRICING` — Motor de pricing
- `MARKETPLACE` — Offer/listing marketplace

> Você pode adicionar/remover capabilities depois, mas evite renomear `code`.

---

## 3) DocTemplates (templates de geração)

> Os templates são armazenados na tabela `DocTemplate` e usados no módulo de geração de docs.

### 3.1 Tipos de template (campo `type`)
- `README` — README.md por produto (IA consome)
- `INDEX_HTML` — index.html navegável
- `DIMENSION` — docs por dimensão (identidade/técnico/comercial/suporte/roadmap/integrações)
- `KIT` — kits por persona (sales/marketing/presales)
- `INDEX` — arquivos `_index/` (catálogo completo)
- `EXPORT_ERP` — `integracao/erp-export.json`
- `EXPORT_PARTNER` — `integracao/partner-center.json`

### 3.2 Templates criados no seed

#### 3.2.1 README.md (por produto)
Baseado no template da spec v2. citeturn1search1

Campos esperados no renderer:
- `product.name`, `product.slug`, `product.status`, `product.shortPitch`
- `pricing` (tabela), `kits`, `dimension docs`, `dependencies`

#### 3.2.2 index.html (navegável)
Versão humana do README com navegação lateral e seções.

#### 3.2.3 Dimensões
Arquivos sugeridos (gerados a partir de templates):
- `identidade/proposta-valor.md`, `identidade/dores-e-persona.md`, `identidade/diferenciais.md`
- `tecnico/arquitetura.md`, `tecnico/requisitos.md`, `tecnico/integracoes.md`, `tecnico/limitacoes.md`
- `comercial/tabela-precos.md`, `comercial/scripts-venda.md`, `comercial/objecoes-respostas.md`, `comercial/cases-sucesso.md`
- `suporte/problemas-conhecidos.md`, `suporte/faq.md`, `suporte/troubleshooting.md`
- `roadmap/backlog.md`, `roadmap/changelog.md`
- `integracao/erp-export.json`, `integracao/partner-center.json`

A estrutura acima segue a árvore proposta na spec v2. citeturn1search1

#### 3.2.4 `_index/`
- `catalogo-completo.md`
- `catalogo-completo.json`
- `tabela-precos-geral.md`

---

## 4) Seed script

O arquivo <File>seed.ts</File> deve:
1. `upsert` de capabilities
2. `upsert` de templates
3. Não criar produtos reais

---

## 5) Boas práticas (para evitar retrabalho)
- Templates devem ser versionados via Git.
- Se um template mudar, crie nova entrada (ou guarde versão no `name`, ex.: `README_v1`).
- Não embutir marca/empresa nos textos de template.

