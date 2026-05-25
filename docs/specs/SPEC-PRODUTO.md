# SPEC-PRODUTO — Cadastro de Produto (EduGest-PIM)

> **Objetivo**: definir o modelo completo de cadastro de produto — campos, blocos, validações e regras de negócio.
>
> O cadastro é o **coração do sistema**. Toda geração de documentos, apresentações e exports parte daqui.
>
> Referências:
> - `Catálogo Único de Produtos – Modelo Final (ERP Shankya = Master).pdf`
> - `matchingAgentV3.ts` → `SANKHYA_CATALOG` (catálogo atual)
> - `SPEC-PRECIFICACAO.md` (campos de preço)

---

## 0) Princípios

### 0.1 ERP Sankhya é o master
Todo produto nasce no EduGest-PIM e é exportado para o Sankhya. O Sankhya nunca cria produto — apenas consome.

### 0.2 Produto precisa ser faturável e contratável
Jornada, solução e narrativa **não são produto**. O modelo de contratação define o produto.

### 0.3 Origem registrada desde o início
Todo produto pode ter origem registrada — se nasceu de uma dor de cliente, isso fica documentado no campo `origem`.

### 0.4 Campos por público
O mesmo cadastro alimenta visões diferentes. Cada bloco do formulário corresponde a um público consumidor.

---

## 1) Estrutura do modelo (`Product`)

### 1.1 Bloco Identidade (obrigatório — ERP Master)

| Campo | Tipo | Valores | Público |
|---|---|---|---|
| `codigo` | string | `BB-[TIPO]-[GRUPO]-[SEQ]` | ERP |
| `nomeComercial` | string | texto livre | Todos |
| `nomeInterno` | string | texto livre | Interno |
| `slug` | string | auto-gerado do nome | Sistema |
| `tipoProduto` | enum | `SAAS_BB` / `SERVICO_PROFISSIONAL` / `LICENCIAMENTO` / `CREDITO` / `HARDWARE` | ERP / Financeiro |
| `categoria` | string | texto livre | Financeiro |
| `subcategoria` | string | texto livre | Financeiro |
| `natureza` | enum | `CORE` / `MODULAR` / `DEPENDENTE` | Comercial |
| `status` | enum | `ATIVO` / `INATIVO` / `RASCUNHO` | Sistema |
| `produtoCore` | boolean | sim/não | Comercial |
| `integraJornada` | boolean | sim/não | Comercial |
| `versao` | string | `1.0.0` | Sistema |

### 1.2 Bloco Comercial (obrigatório)

| Campo | Tipo | Valores | Público |
|---|---|---|---|
| `descricaoComercialCurta` | string | max 280 chars | Comercial / CRM |
| `shortPitch` | string | max 140 chars (para slides) | Marketing |
| `proposta_valor` | text | texto rico | Marketing / Comercial |
| `doresAtendidas` | string[] | lista de dores | Comercial / Pré-venda |
| `publicoAlvo` | string[] | personas | Marketing |
| `diferenciais` | string[] | max 5 itens | Marketing |
| `dependenciaComercial` | enum | `NENHUMA` / `REQUER` / `RECOMENDADO` / `OPCIONAL` | Comercial / ERP |
| `produtoBase` | string (slug) | referência a outro produto | Comercial / ERP |
| `observacoesComerciais` | text | regras comerciais / exceções | Comercial |
| `perfilCliente` | enum[] | `ESCOLA_PEQUENA` / `ESCOLA_MEDIA` / `REDE_GRANDE` | Comercial |

### 1.3 Bloco Financeiro / ERP (obrigatório)

| Campo | Tipo | Valores | Público |
|---|---|---|---|
| `modeloContratado` | enum | `SUBSCRICAO` / `CREDITO` / `PONTUAL` / `CONSUMO` | Financeiro / ERP |
| `modeloFaturamento` | enum | `RECORRENTE` / `PONTUAL` / `VARIAVEL` | Financeiro |
| `tipoReceita` | enum | `ARR` / `NRR` / `PONTUAL` / `NA` | Financeiro |
| `unidadeMedida` | enum | `UNIDADE` / `HORA` / `LICENCA` / `USUARIO` | ERP |
| `geraARR` | boolean | sim/não | Financeiro |
| `centroResultado` | string | código do CR | Financeiro / ERP |
| `grupoCodigo` | string | código grupo Sankhya | ERP |
| `grupoDescricao` | string | descrição grupo | ERP |
| `ativo` | boolean | sim/não | ERP |

### 1.4 Bloco Fiscal (obrigatório — maior dor atual)

| Campo | Tipo | Valores | Status |
|---|---|---|---|
| `codigoNBS` | string | código NBS | `A_VALIDAR` até confirmar |
| `temISS` | enum | `SIM` / `NAO` / `A_VALIDAR` | crítico |
| `aliquotaISS` | decimal | 0.00–100.00 | condicional |
| `codigoServico` | string | código LC 116 | `A_VALIDAR` |
| `regimeTributario` | string | texto livre | Financeiro |
| `observacoesFiscais` | text | notas fiscais | Financeiro |
| `fiscalStatus` | enum | `VALIDADO` / `A_VALIDAR` | **bloqueia export ERP** |

> ⚠️ Quando `fiscalStatus = A_VALIDAR`, o export ERP é bloqueado automaticamente.

### 1.5 Bloco Técnico (obrigatório para pré-venda)

| Campo | Tipo | Descrição | Público |
|---|---|---|---|
| `arquiteturaHLD` | text | descrição de alto nível | Pré-venda / DEV |
| `requisitosMinimos` | string[] | lista de requisitos | Pré-venda |
| `tecnologiasBase` | string[] | ex: SharePoint, Azure AD | Pré-venda / DEV |
| `modeloDeployment` | enum | `CLOUD` / `HYBRID` / `ON_PREMISE` | Pré-venda |
| `integracoesSuportadas` | string[] | sistemas que integra | Pré-venda |
| `limitacoesConhecidas` | text | o que o produto não faz | Pré-venda / Suporte |
| `tempoImplementacao` | string | ex: "2 a 4 semanas" | Pré-venda |

### 1.6 Bloco Suporte (obrigatório)

| Campo | Tipo | Descrição | Público |
|---|---|---|---|
| `slaAtendimento` | string | ex: "8h úteis" | Suporte |
| `faq` | FAQ[] | perguntas e respostas | Suporte |
| `problemasConhecidos` | string[] | bugs/limitações conhecidas | Suporte |
| `troubleshootingGuia` | text | passo a passo de diagnóstico | Suporte |
| `kbArticles` | string[] | links para base de conhecimento | Suporte |

### 1.7 Bloco Marketing (obrigatório)

| Campo | Tipo | Descrição | Público |
|---|---|---|---|
| `cases` | Case[] | casos de sucesso | Marketing |
| `objecoesRespostas` | ObjecaoItem[] | objeções e como responder | Comercial |
| `scriptVenda` | text | roteiro de apresentação | Comercial |
| `tagsCopilot` | string[] | palavras-chave para busca do Copilot | Sistema |

### 1.8 Bloco Onboarding (obrigatório)

| Campo | Tipo | Descrição | Público |
|---|---|---|---|
| `contextoGeral` | text | história e posicionamento do produto | Onboarding |
| `porQueExiste` | text | dor original que gerou o produto | Onboarding |
| `paraquemE` | text | para qual cliente/contexto é ideal | Onboarding |
| `naoConfundirCom` | text | diferença de produtos similares | Onboarding |
| `roadmapPublico` | text | o que vem por aí | Onboarding |

### 1.9 Bloco Origem (rastreabilidade)

| Campo | Tipo | Descrição |
|---|---|---|
| `origemTipo` | enum | `INTERNO` / `DOR_CLIENTE` / `PARCERIA` / `REGULATORIO` |
| `origemDescricao` | text | descrição da origem |
| `origemClienteSegmento` | string | segmento/cliente que originou |
| `origemData` | date | quando surgiu a demanda |
| `origemResponsavel` | string | quem trouxe a demanda |

---

## 2) Tipos auxiliares

```typescript
type FAQ = {
  pergunta: string
  resposta: string
}

type Case = {
  cliente: string          // pode ser genérico: "Rede Estadual SP"
  desafio: string
  solucao: string
  resultado: string
}

type ObjecaoItem = {
  objecao: string
  resposta: string
  contexto?: string        // quando essa objeção aparece
}
```

---

## 3) Padrão de código de produto

```
BB-[TIPO]-[GRUPO]-[SEQUENCIA]
```

| Tipo | Código |
|---|---|
| SaaS Big Brain | `SAAS` |
| Serviço Profissional | `SERV` |
| Crédito / Booking | `CRED` |
| Licenciamento | `LIC` |
| Hardware | `HW` |

Exemplos:
- `BB-SAAS-CO-001` → Centro de Operações
- `BB-SERV-PORT-IMP-001` → Implementação de Portal
- `BB-LIC-MS-M365-A3` → Microsoft 365 A3

O sistema **sugere automaticamente** o próximo código disponível ao criar um produto.

---

## 4) Catálogo inicial (seed)

Produtos existentes que devem ser migrados do `SANKHYA_CATALOG` atual:

| Código | Nome | Tipo | Natureza |
|---|---|---|---|
| BB-SAAS-INT-001 | Integrador Big Brain | SaaS BB | Core |
| BB-SAAS-AGN-001 | Agenda Inteligente | SaaS BB | Modular |
| BB-SAAS-RI-001 | Relatórios Inteligentes | SaaS BB | Modular |
| BB-SAAS-CO-001 | Centro de Operações | SaaS BB | Core |
| BB-SAAS-NE-001 | Núcleo de Experiências | SaaS BB | Modular |
| BB-SAAS-PORT-001 | Portal Institucional SaaS | SaaS BB | Core |
| BB-SAAS-INTRA-001 | Intranet SaaS | SaaS BB | Core |
| BB-SAAS-HD-001 | Hub Docente | SaaS BB | Modular |
| BB-SAAS-INS-001 | Insights | SaaS BB | Modular |
| BB-SERV-PORT-IMP-001 | Implementação de Portal | Serviço Profissional | — |
| BB-SERV-INTRA-IMP-001 | Implementação de Intranet | Serviço Profissional | — |
| BB-SERV-SUP-001 | Suporte Ambiente M365 | Serviço Profissional | — |
| BB-SERV-FORM-001 | Formação Microsoft | Serviço Profissional | — |
| BB-SERV-CONS-001 | Consultoria Especializada | Serviço Profissional | — |
| BB-CRED-HOR-001 | Booking de Horas | Crédito | — |
| BB-CRED-DEV-001 | Desenvolvimento sob Demanda | Crédito | — |
| BB-LIC-MS-M365-A1 | Microsoft 365 A1 | Licenciamento | — |
| BB-LIC-MS-M365-A3 | Microsoft 365 A3 | Licenciamento | — |
| BB-LIC-MS-M365-A5 | Microsoft 365 A5 | Licenciamento | — |
| BB-LIC-MS-COP-001 | Copilot Microsoft 365 | Licenciamento | — |

---

## 5) Perfis de cliente e produtos por perfil

```typescript
export const PERFIS_CLIENTE = {
  ESCOLA_PEQUENA: {
    label: 'Escola Pequena',
    descricao: 'Até ~500 alunos',
    produtosSugeridos: [
      'BB-SAAS-INT-001',   // Integrador
      'BB-SAAS-INTRA-001', // Intranet SaaS
      'BB-SERV-FORM-001',  // Formação Microsoft
      'BB-SERV-SUP-001',   // Suporte M365 ← sempre obrigatório
    ]
  },
  ESCOLA_MEDIA: {
    label: 'Escola Média',
    descricao: '500–2.000 alunos',
    produtosSugeridos: [
      'BB-SAAS-INT-001',
      'BB-SAAS-INTRA-001',
      'BB-SAAS-PORT-001',
      'BB-SERV-FORM-001',
      'BB-SERV-SUP-001',   // sempre obrigatório
    ]
  },
  REDE_GRANDE: {
    label: 'Rede / Grande',
    descricao: 'Redes e grupos educacionais',
    produtosSugeridos: [
      'BB-SAAS-INT-001',
      'BB-SAAS-INTRA-001',
      'BB-SAAS-PORT-001',
      'BB-SAAS-CO-001',    // Centro de Operações
      'BB-SAAS-HD-001',    // Hub Docente
      'BB-SAAS-INS-001',   // Insights
      'BB-SERV-CONS-001',  // Consultoria
      'BB-SERV-FORM-001',
      'BB-SERV-SUP-001',   // sempre obrigatório
    ]
  }
} as const

// Produto sempre obrigatório em qualquer proposta
export const PRODUTO_OBRIGATORIO = 'BB-SERV-SUP-001'
```

---

## 6) Endpoints da API de produtos

### 6.1 `POST /api/products` — Criar produto
**Body**: campos do formulário de cadastro
**Response**: produto criado com `id`, `codigo` gerado, `slug`

### 6.2 `PUT /api/products/:slug` — Atualizar produto
**Body**: campos a atualizar (parcial)
**Response**: produto atualizado

### 6.3 `GET /api/products` — Listar catálogo
**Query params**: `?tipo=SAAS_BB&status=ATIVO&perfil=ESCOLA_PEQUENA`
**Response**: lista paginada

### 6.4 `GET /api/products/:slug` — Detalhe do produto
**Response**: produto completo com todos os blocos

### 6.5 `POST /api/products/:slug/generate-docs` — Gerar documentos
Dispara geração de `.md` e `.html` por público (ver `SPEC-GERACAO-DOCS.md`)

### 6.6 `GET /api/products/:slug/export/erp` — Export Sankhya
Retorna payload formatado para importação no ERP.
Bloqueado se `fiscalStatus = A_VALIDAR`.

---

## 7) Regras de negócio críticas

1. `codigo` é imutável após criação.
2. `slug` é auto-gerado a partir de `nomeComercial` e também imutável.
3. `fiscalStatus = A_VALIDAR` bloqueia export ERP e exibe aviso no cadastro.
4. `dependenciaComercial = REQUER` exige que `produtoBase` seja preenchido.
5. Produto com `status = RASCUNHO` não aparece em sugestões de proposta.
6. `PRODUTO_OBRIGATORIO` (`BB-SERV-SUP-001`) sempre incluído em propostas — não pode ser removido.
7. `tagsCopilot` é gerado automaticamente na primeira geração de docs, mas pode ser editado manualmente.

---

## 8) Definition of Done

- Formulário web com todos os blocos implementado.
- Validação de campos obrigatórios por bloco.
- `codigo` sugerido automaticamente.
- Seed com 20 produtos do catálogo atual.
- `fiscalStatus = A_VALIDAR` bloqueia export e exibe aviso.
- `GET /api/products` retorna catálogo filtrado por perfil.
