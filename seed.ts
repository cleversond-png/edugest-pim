/* seed.ts — EduGest-PIM (Central Inteligente de Produto)
 *
 * Seed inicializa:
 * - Product (catálogo de produtos do SANKHYA_CATALOG)
 * - Capability (taxonomia)
 * - DocTemplate (templates de docs e exports)
 *
 * Importante (recomendação): definir `DocTemplate.name` como @unique no schema.prisma.
 * - Se `name` for @unique, você pode trocar a função upsertTemplate() para usar `upsert`.
 * - Nesta versão, usamos findFirst+create/update para funcionar mesmo sem @unique.
 */

import { PrismaClient, ProductType, ContractModel, BillingModel, DependencyType, ProductStatus, ProductNature } from '@prisma/client'

const prisma = new PrismaClient()

// Mapa de tipos de produto PM → ProductType enum
const PM_TYPE_MAP: Record<string, ProductType> = {
  'SaaS BB': ProductType.SAAS_BB,
  'Serviço Profissional': ProductType.SERVICO_PROFISSIONAL,
  'Serviço Profissional / SharePoint': ProductType.SERVICO_PROFISSIONAL,
  'Crédito / Banco de horas': ProductType.CREDITO,
  'Licenciamento': ProductType.LICENCIAMENTO,
  'SaaS BB / Solução Analítica': ProductType.SAAS_BB,
}

// Mapa de modelos de contratação
const CONTRACT_MODEL_MAP: Record<string, ContractModel> = {
  'Subscrição': ContractModel.SUBSCRICAO,
  'Pontual': ContractModel.PONTUAL,
  'Crédito': ContractModel.CREDITO,
}

// Mapa de modelos de faturamento
const BILLING_MODEL_MAP: Record<string, BillingModel> = {
  'Recorrente': BillingModel.RECORRENTE,
  'Pontual': BillingModel.PONTUAL,
  'Pontual ou Recorrente': BillingModel.RECORRENTE,
}

// Mapa de tipos de dependência
const DEPENDENCY_TYPE_MAP: Record<string, DependencyType> = {
  'Nenhuma': DependencyType.NENHUMA,
  'Condicional': DependencyType.RECOMENDADO,
}

// Catálogo de produtos mapeados
const PRODUCTS_TO_SEED = [
  {
    slug: 'integrador-provisionador',
    nomeComercial: 'INTEGRADOR BIG BRAIN / PROVISIONADOR',
    codigo: '105101',
    grupoCodigo: '105001',
    grupoDescricao: 'INTEGRADOR',
    tipoProduto: ProductType.SAAS_BB,
    modeloContratado: ContractModel.SUBSCRICAO,
    modeloFaturamento: BillingModel.RECORRENTE,
    dependenciaComercial: DependencyType.NENHUMA,
    observacoesComerciais: 'Produto SaaS faturável que integra sistemas educacionais ao Microsoft 365/Office 365.',
    status: ProductStatus.ATIVO,
    natureza: ProductNature.CORE,
  },
  {
    slug: 'agenda-inteligente',
    nomeComercial: 'AGENDA INTELIGENTE',
    codigo: '105102',
    grupoCodigo: '105003',
    grupoDescricao: 'AGENDA INTELIGENTE',
    tipoProduto: ProductType.SAAS_BB,
    modeloContratado: ContractModel.SUBSCRICAO,
    modeloFaturamento: BillingModel.RECORRENTE,
    dependenciaComercial: DependencyType.RECOMENDADO,
    produtoBase: 'integrador-provisionador',
    observacoesComerciais: 'Requer integração educacional ativa, preferencialmente via Integrador/Provisionador.',
    status: ProductStatus.ATIVO,
    natureza: ProductNature.MODULAR,
  },
  {
    slug: 'relatorios-inteligentes',
    nomeComercial: 'RELATORIOS INTELIGENTES',
    codigo: '105103',
    grupoCodigo: '105000',
    grupoDescricao: 'PRODUTOS PRÓPRIOS (PLATAFORMAS & PRODUTOS CORE)',
    tipoProduto: ProductType.SAAS_BB,
    modeloContratado: ContractModel.SUBSCRICAO,
    modeloFaturamento: BillingModel.RECORRENTE,
    dependenciaComercial: DependencyType.RECOMENDADO,
    produtoBase: 'integrador-provisionador',
    observacoesComerciais: 'Requer integração educacional ativa, preferencialmente via Integrador/Provisionador.',
    status: ProductStatus.ATIVO,
    natureza: ProductNature.MODULAR,
  },
  {
    slug: 'centro-operacoes',
    nomeComercial: 'CENTRO DE OPERACOES',
    codigo: '105104',
    grupoCodigo: '105007',
    grupoDescricao: 'CENTRO DE OPERAÇÕES',
    tipoProduto: ProductType.SAAS_BB,
    modeloContratado: ContractModel.SUBSCRICAO,
    modeloFaturamento: BillingModel.RECORRENTE,
    dependenciaComercial: DependencyType.RECOMENDADO,
    produtoBase: 'integrador-provisionador',
    observacoesComerciais: 'Requer integração educacional ativa, preferencialmente via Integrador/Provisionador.',
    status: ProductStatus.ATIVO,
    natureza: ProductNature.MODULAR,
  },
  {
    slug: 'nucleo-experiencia',
    nomeComercial: 'NUCLEO DE EXPERIENCIA',
    codigo: '105105',
    grupoCodigo: '105006',
    grupoDescricao: 'NÚCLEO DE EXPERIÊNCIA',
    tipoProduto: ProductType.SAAS_BB,
    modeloContratado: ContractModel.SUBSCRICAO,
    modeloFaturamento: BillingModel.RECORRENTE,
    dependenciaComercial: DependencyType.NENHUMA,
    observacoesComerciais: 'Produto/solução analítica independente. Não requer Integrador.',
    status: ProductStatus.ATIVO,
    natureza: ProductNature.CORE,
  },
  {
    slug: 'portal-institucional-sharepoint',
    nomeComercial: 'PORTAL INSTITUCIONAL SHAREPOINT',
    codigo: '105201',
    grupoCodigo: '108003',
    grupoDescricao: 'SQUADS & PROJETOS ESTRUTURANTES',
    tipoProduto: ProductType.SERVICO_PROFISSIONAL,
    modeloContratado: ContractModel.PONTUAL,
    modeloFaturamento: BillingModel.PONTUAL,
    dependenciaComercial: DependencyType.NENHUMA,
    observacoesComerciais: 'Página/estrutura em SharePoint. Não depende do Integrador.',
    status: ProductStatus.ATIVO,
    natureza: ProductNature.CORE,
  },
  {
    slug: 'intranet-sharepoint',
    nomeComercial: 'INTRANET SHAREPOINT',
    codigo: '105202',
    grupoCodigo: '105005',
    grupoDescricao: 'INTRANET CORPORATIVA',
    tipoProduto: ProductType.SERVICO_PROFISSIONAL,
    modeloContratado: ContractModel.PONTUAL,
    modeloFaturamento: BillingModel.PONTUAL,
    dependenciaComercial: DependencyType.NENHUMA,
    observacoesComerciais: 'Página/estrutura em SharePoint. Não depende do Integrador (mas pode exigir Integrador se houver integração citada na demanda).',
    status: ProductStatus.ATIVO,
    natureza: ProductNature.CORE,
  },
  {
    slug: 'formacao-microsoft',
    nomeComercial: 'FORMACAO MICROSOFT',
    codigo: '102101',
    grupoCodigo: '102001',
    grupoDescricao: 'FORMACAO MICROSOFT',
    tipoProduto: ProductType.SERVICO_PROFISSIONAL,
    modeloContratado: ContractModel.PONTUAL,
    modeloFaturamento: BillingModel.PONTUAL,
    dependenciaComercial: DependencyType.NENHUMA,
    status: ProductStatus.ATIVO,
    natureza: ProductNature.CORE,
  },
  {
    slug: 'suporte-m365',
    nomeComercial: 'SUPORTE AMBIENTE MICROSOFT 365',
    codigo: '109101',
    grupoCodigo: '109001',
    grupoDescricao: 'SUPORTE E ATENDIMENTO',
    tipoProduto: ProductType.SERVICO_PROFISSIONAL,
    modeloContratado: ContractModel.SUBSCRICAO,
    modeloFaturamento: BillingModel.RECORRENTE,
    dependenciaComercial: DependencyType.NENHUMA,
    status: ProductStatus.ATIVO,
    natureza: ProductNature.CORE,
  },
  {
    slug: 'consultoria-especializada',
    nomeComercial: 'CONSULTORIA ESPECIALIZADA',
    codigo: '109501',
    grupoCodigo: '109501',
    grupoDescricao: 'CONSULTORIA',
    tipoProduto: ProductType.SERVICO_PROFISSIONAL,
    modeloContratado: ContractModel.PONTUAL,
    modeloFaturamento: BillingModel.PONTUAL,
    dependenciaComercial: DependencyType.NENHUMA,
    status: ProductStatus.ATIVO,
    natureza: ProductNature.CORE,
  },
  {
    slug: 'booking-horas',
    nomeComercial: 'BOOKING DE HORAS',
    codigo: '108101',
    grupoCodigo: '108001',
    grupoDescricao: 'HORAS TECNICAS',
    tipoProduto: ProductType.CREDITO,
    modeloContratado: ContractModel.CREDITO,
    modeloFaturamento: BillingModel.RECORRENTE,
    dependenciaComercial: DependencyType.NENHUMA,
    status: ProductStatus.ATIVO,
    natureza: ProductNature.CORE,
  },
  {
    slug: 'licenciamento-m365-a1',
    nomeComercial: 'LICENCIAMENTO MICROSOFT OFFICE 365 A1',
    codigo: '40001',
    grupoCodigo: '104005',
    grupoDescricao: 'LICENCIMANETO M 365',
    tipoProduto: ProductType.LICENCIAMENTO,
    modeloContratado: ContractModel.SUBSCRICAO,
    modeloFaturamento: BillingModel.RECORRENTE,
    dependenciaComercial: DependencyType.NENHUMA,
    status: ProductStatus.ATIVO,
    natureza: ProductNature.CORE,
  },
  {
    slug: 'licenciamento-m365-a3',
    nomeComercial: 'LICENCIAMENTO MICROSOFT OFFICE 365 A3',
    codigo: '40002',
    grupoCodigo: '104005',
    grupoDescricao: 'LICENCIMANETO M 365',
    tipoProduto: ProductType.LICENCIAMENTO,
    modeloContratado: ContractModel.SUBSCRICAO,
    modeloFaturamento: BillingModel.RECORRENTE,
    dependenciaComercial: DependencyType.NENHUMA,
    status: ProductStatus.ATIVO,
    natureza: ProductNature.CORE,
  },
  {
    slug: 'licenciamento-m365-a5',
    nomeComercial: 'LICENCIAMENTO MICROSOFT OFFICE 365 A5',
    codigo: '40003',
    grupoCodigo: '104005',
    grupoDescricao: 'LICENCIMANETO M 365',
    tipoProduto: ProductType.LICENCIAMENTO,
    modeloContratado: ContractModel.SUBSCRICAO,
    modeloFaturamento: BillingModel.RECORRENTE,
    dependenciaComercial: DependencyType.NENHUMA,
    status: ProductStatus.ATIVO,
    natureza: ProductNature.CORE,
  },
  {
    slug: 'copilot-m365',
    nomeComercial: 'COPILOT MICROSOFT 365',
    codigo: '40004',
    grupoCodigo: '104005',
    grupoDescricao: 'LICENCIMANETO M 365',
    tipoProduto: ProductType.LICENCIAMENTO,
    modeloContratado: ContractModel.SUBSCRICAO,
    modeloFaturamento: BillingModel.RECORRENTE,
    dependenciaComercial: DependencyType.NENHUMA,
    status: ProductStatus.ATIVO,
    natureza: ProductNature.CORE,
  },
]

type CapabilitySeed = {
  code: string
  name: string
  description?: string
}

type DocTemplateSeed = {
  name: string
  type: string
  templateMd?: string
  templateHtml?: string
  templateJson?: any
}

const capabilities: CapabilitySeed[] = [
  // Plataformas e colaboração
  { code: 'M365', name: 'Microsoft 365', description: 'Suite de produtividade e colaboração' },
  { code: 'TEAMS', name: 'Microsoft Teams', description: 'Colaboração, reuniões e chamadas' },
  { code: 'SHAREPOINT', name: 'SharePoint', description: 'Sites, intranet, conteúdos e documentos' },
  { code: 'ONEDRIVE', name: 'OneDrive', description: 'Arquivos pessoais e sincronização' },

  // Identidade e segurança
  { code: 'IDENTITY', name: 'Identidade', description: 'Identidade e autenticação (geral)' },
  { code: 'ENTRA_ID', name: 'Entra ID', description: 'Diretório e identidade (Azure AD)' },
  { code: 'PIM', name: 'PIM', description: 'Privileged Identity Management' },
  { code: 'MFA_CA', name: 'MFA/Conditional Access', description: 'MFA e políticas de acesso condicional' },
  { code: 'SECURITY', name: 'Segurança', description: 'Controles e postura de segurança (geral)' },
  { code: 'AUDIT_LOGS', name: 'Auditoria e Logs', description: 'Logs, auditoria e trilhas de eventos' },
  { code: 'DATA_GOVERNANCE', name: 'Governança de Dados', description: 'Governança, retenção e conformidade' },

  // Azure / Integração / Dev
  { code: 'AZURE', name: 'Azure', description: 'Plataforma Azure (geral)' },
  { code: 'AZURE_APP', name: 'Azure Apps', description: 'App Service / Functions / Apps' },
  { code: 'GRAPH_API', name: 'Microsoft Graph API', description: 'Integrações via Microsoft Graph' },
  { code: 'API_INTEGRATION', name: 'Integração de APIs', description: 'Integração com APIs de terceiros' },
  { code: 'WEBHOOKS', name: 'Webhooks', description: 'Eventos e webhooks' },

  // IA / Copilot
  { code: 'AI', name: 'IA', description: 'Inteligência Artificial (geral)' },
  { code: 'COPILOT', name: 'Copilot/Agentes', description: 'Agentes e automações com Copilot/IA' },
  { code: 'RAG', name: 'RAG', description: 'Retrieval-Augmented Generation' },

  // Operação / Comercial
  { code: 'PRICING', name: 'Pricing Engine', description: 'Motor de preços e planos' },
  { code: 'MARKETPLACE', name: 'Marketplace', description: 'Offer/listing e marketplace' },
]

// Templates (placeholders estilo Handlebars/Mustache — renderer substitui na geração)
const README_MD = `# {{product.name}}
> {{product.shortPitch}}

**Slug:** {{product.slug}}
**Status:** {{product.status}}
**Última atualização:** {{meta.updatedAt}}

---

## Dores que resolve
{{#each product.pains}}
- {{this}}
{{/each}}

## Proposta de valor
{{product.valueProp}}

## Diferenciais
{{#each product.differentiators}}
- {{this}}
{{/each}}

---

## Capabilities
{{#each product.capabilities}}
- {{this.code}} — {{this.name}}
{{/each}}

---

## Tabela de preços
| Hosting | Faixa | FEE mensal | Plano |
|---|---:|---:|---|
{{#each pricing.tiers}}
| {{this.hosting}} | {{this.minQty}}–{{this.maxQty}} | {{this.monthlyFee}} | {{this.planName}} |
{{/each}}

---

## Dependências
{{#if dependencies.length}}
{{#each dependencies}}
- **{{this.dependencyType}}** {{#if this.baseProductRef}}→ base: {{this.baseProductRef}}{{/if}}
  - {{this.notes}}
{{/each}}
{{else}}
- Nenhuma
{{/if}}

---

## Links de documentação
- Identidade
- Técnico
- Comercial
- Suporte
- Roadmap
- Integrações

---

*Documento gerado automaticamente pela Central Inteligente de Produto em {{meta.generatedAt}}*
`

const INDEX_HTML = `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>{{product.name}} — Documentação</title>
  <style>
    body{font-family:system-ui,Segoe UI,Roboto,Arial;margin:0;display:flex;min-height:100vh;}
    nav{width:280px;background:#0f172a;color:#fff;padding:16px;}
    nav a{color:#cbd5e1;text-decoration:none;display:block;padding:6px 0;}
    main{flex:1;padding:24px;}
    h1,h2{margin-top:0;}
    .badge{display:inline-block;padding:2px 8px;border-radius:999px;background:#e2e8f0;color:#0f172a;font-size:12px;}
    pre{background:#f1f5f9;padding:12px;border-radius:8px;overflow:auto;}
  </style>
</head>
<body>
  <nav>
    <h3>{{product.name}}</h3>
    <div class="badge">{{product.status}}</div>
    <hr style="border:0;border-top:1px solid #334155;margin:12px 0;"/>
    <a href="#visao">Visão</a>
    <a href="#dores">Dores</a>
    <a href="#valor">Proposta de valor</a>
    <a href="#preco">Tabela de preços</a>
    <a href="#arquitetura">Arquitetura</a>
    <a href="#suporte">Suporte</a>
    <a href="#roadmap">Roadmap</a>
    <a href="#integracao">Integrações</a>
  </nav>
  <main>
    <h1 id="visao">{{product.name}}</h1>
    <p>{{product.shortPitch}}</p>

    <h2 id="dores">Dores que resolve</h2>
    {{#each product.pains}}<li>{{this}}</li>{{/each}}

    <h2 id="valor">Proposta de valor</h2>
    <p>{{product.valueProp}}</p>

    <h2 id="preco">Tabela de preços</h2>
    <pre>{{pricing.table}}</pre>

    <h2 id="arquitetura">Arquitetura</h2>
    <pre>{{tech.architecture}}</pre>

    <h2 id="suporte">Suporte</h2>
    <pre>{{support.kb}}</pre>

    <h2 id="roadmap">Roadmap</h2>
    <pre>{{roadmap.items}}</pre>

    <h2 id="integracao">Integrações</h2>
    <pre>{{integrations.summary}}</pre>

    <hr/>
    <small>Gerado automaticamente em {{meta.generatedAt}}</small>
  </main>
</body>
</html>
`

const DIMENSION_MD = `# {{dimension.title}}

{{dimension.body}}

---
*Gerado automaticamente em {{meta.generatedAt}}*
`

const KIT_MD = `# {{kit.title}}

{{kit.body}}

---
*Gerado automaticamente em {{meta.generatedAt}}*
`

const INDEX_CATALOGO_MD = `# Catálogo completo

{{#each products}}
## {{this.name}}
- Slug: {{this.slug}}
- Status: {{this.status}}
- Pitch: {{this.shortPitch}}
{{/each}}

---
*Gerado automaticamente em {{meta.generatedAt}}*
`

// Templates JSON usam placeholders string — o renderer resolve
const ERP_EXPORT_JSON = {
  produto: {
    tipo_receita_despesa: 'RECEITA',
    ativo: true,
    grupo_codigo: '{{erp.grupoCodigo}}',
    grupo_descricao: '{{erp.grupoDescricao}}',
    codigo: '{{erp.codigo}}',
    descricao: '{{erp.descricao}}',
    tipo_servico_codigo: '{{erp.tipoServicoCodigo}}',
    tipo_servico_descricao: '{{erp.tipoServicoDescricao}}',
    unidade_padrao: '{{erp.unidadePadrao}}',
    unidade_descricao: '{{erp.unidadeDescricao}}',
    tem_iss: '{{erp.temISS}}',
    centro_resultado: '{{erp.centroResultado}}',
    codigo_nbs: '{{erp.codigoNBS}}',
    ncm_valido: '{{erp.ncmValido}}',
    calcular_comissao: '{{erp.calcularComissao}}',
    perc_comissao_vendedor: '{{erp.percComissaoVendedor}}',
    perc_comissao_gerente: '{{erp.percComissaoGerente}}'
  },
  pricing: {
    currency: '{{pricing.currency}}',
    monthly_fee: '{{pricing.monthlyFee}}',
    plan: '{{pricing.planName}}'
  },
  metadata: {
    gerado_em: '{{meta.generatedAt}}',
    versao_produto: '{{meta.productVersion}}'
  }
}

const PARTNER_EXPORT_JSON = {
  offer: {
    offerType: '{{partner.offerType}}',
    title: '{{partner.title}}',
    shortDescription: '{{partner.shortDescription}}',
    longDescription: '{{partner.longDescription}}',
    industries: '{{partner.industries}}',
    categories: '{{partner.categories}}',
    markets: '{{partner.markets}}',
    languages: '{{partner.languages}}',
    keywords: '{{partner.keywords}}',
    solutionAreas: '{{partner.solutionAreas}}',
    plans: '{{partner.plans}}',
    contact: '{{partner.contact}}'
  },
  metadata: {
    gerado_em: '{{meta.generatedAt}}',
    versao_produto: '{{meta.productVersion}}'
  }
}

const templates: DocTemplateSeed[] = [
  { name: 'README_v1', type: 'README', templateMd: README_MD },
  { name: 'INDEX_HTML_v1', type: 'INDEX_HTML', templateHtml: INDEX_HTML },

  { name: 'DIMENSION_MD_v1', type: 'DIMENSION', templateMd: DIMENSION_MD },
  { name: 'KIT_MD_v1', type: 'KIT', templateMd: KIT_MD },

  { name: 'CATALOGO_COMPLETO_MD_v1', type: 'INDEX', templateMd: INDEX_CATALOGO_MD },

  { name: 'ERP_EXPORT_JSON_v1', type: 'EXPORT_ERP', templateJson: ERP_EXPORT_JSON },
  { name: 'PARTNER_EXPORT_JSON_v1', type: 'EXPORT_PARTNER', templateJson: PARTNER_EXPORT_JSON },
]

async function upsertCapabilities() {
  for (const c of capabilities) {
    await prisma.capability.upsert({
      where: { code: c.code },
      update: { name: c.name, description: c.description },
      create: { code: c.code, name: c.name, description: c.description },
    })
  }
}

async function upsertTemplate(t: DocTemplateSeed) {
  // Compatível com schema onde DocTemplate.name NÃO é unique.
  // Se name for unique, pode otimizar para prisma.docTemplate.upsert.
  const existing = await prisma.docTemplate.findFirst({ where: { name: t.name } })

  if (existing) {
    await prisma.docTemplate.update({
      where: { id: existing.id },
      data: {
        type: t.type,
        templateMd: t.templateMd,
        templateHtml: t.templateHtml,
        templateJson: t.templateJson,
      },
    })
    return
  }

  await prisma.docTemplate.create({
    data: {
      name: t.name,
      type: t.type,
      templateMd: t.templateMd,
      templateHtml: t.templateHtml,
      templateJson: t.templateJson,
    },
  })
}

async function upsertTemplates() {
  for (const t of templates) {
    await upsertTemplate(t)
  }
}

async function upsertProducts() {
  for (const p of PRODUCTS_TO_SEED) {
    const existing = await prisma.product.findUnique({ where: { slug: p.slug } })

    if (existing) {
      await prisma.product.update({
        where: { slug: p.slug },
        data: p,
      })
      console.log(`  ✓ Atualizado: ${p.nomeComercial}`)
    } else {
      await prisma.product.create({ data: p })
      console.log(`  ✓ Criado: ${p.nomeComercial}`)
    }
  }
}

async function main() {
  console.log('Seeding: products (SANKHYA_CATALOG)...')
  await upsertProducts()

  console.log('Seeding: capabilities...')
  await upsertCapabilities()

  console.log('Seeding: doc templates...')
  await upsertTemplates()

  console.log('\n✅ Seed concluído com sucesso.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
