# SPEC-DATA-MODEL — EduGest-PIM (Central Inteligente de Produto)

> **Objetivo**: definir o **modelo de dados final** do produto **EduGest-PIM / Central Inteligente de Produto** para sustentar:
> - Central do Produto (PIM) como **fonte única de verdade**
> - Geração de documentação (Markdown + HTML) para SharePoint
> - Exportação de dados (JSON) para ERP (padrão Sankhya) e Partner Center (sem integração direta nesta versão)
> - Agentes de IA (transcrição → diagnóstico → recomendação → proposta → outline de deck)
> - Governança, versionamento, auditoria e testes

**Premissas funcionais** (já consolidadas na spec): Central do Produto propaga para SharePoint/ERP/Partner e serve de base para IA via `.md + API`. citeturn1search1

**Premissas ERP**: o export deve atender campos padrão (cadastro e guia campo-a-campo) e respeitar governança (campos “A VALIDAR” bloqueiam export final). citeturn2search2

**SharePoint (docs)**: site alvo inicial: [Central do Produto (SharePoint)](https://eduproms.sharepoint.com/sites/novaintranet)

---

## 1) Visão de alto nível (domínios)

### 1.1 Domínio Produto (PIM)
- Produto e suas 6 dimensões: Identidade, Técnico, Comercial, Suporte, Roadmap, Integrações. citeturn1search1
- Camada “Kits” por persona: AM/Vendas, Marketing, Pré-venda.
- Capabilities do produto (para inferir solution areas e suportar matching).

### 1.2 Domínio Pricing
- Política de preço por produto (ex.: por faixa) e versões.
- Derivação de plano com base em fee mensal (regra já definida). citeturn1search1

### 1.3 Domínio Export
- ERP (Sankhya): cadastro e fiscal/comercial conforme planilha. citeturn2search2
- Partner Center: payload de offer/listing e planos (gerados a partir do produto + pricing). citeturn1search1

### 1.4 Domínio Docs
- Templates e bundle de docs (README.md, index.html, subpastas por dimensão, `_index` consolidado). citeturn1search1

### 1.5 Domínio Oportunidades (IA)
- Contexto: transcrição + dados de CRM (somente payload, sem integração).
- Execução de agentes e persistência do “Solution Pack”.

---

## 2) Padrões e boas práticas (obrigatórios)

### 2.1 Versionamento e auditabilidade
- Tudo que impacta proposta/ERP/Partner deve ter **versão**:
  - Produto (`ProductVersion`)
  - Pricing (`PricingVersion`)
  - Exports gerados (`ExportRun`)
- Auditoria: `createdAt`, `updatedAt`, `createdBy`, `updatedBy`.

### 2.2 Evitar retrabalho e drift
- `Product` contém campos “canônicos”.
- `ProductVersion` captura snapshot (imutável) usado para exports, docs e propostas.

### 2.3 Preparação para economia de tokens
- Conteúdo rico em `.md` é armazenado em entidades segmentadas (kits e dimensões) para **RAG**.
- O agente recebe somente:
  - resumo do produto
  - seções relevantes recuperadas por busca

---

## 3) Modelo de dados (ERD lógico)

### 3.1 Entidades principais
1. **Product** (cadastro principal)
2. **ProductVersion** (snapshot versionado)
3. **Capability** (taxonomia)
4. **ProductDimensionDoc** (conteúdo por dimensão)
5. **ProductKit** (AM / Marketing / Pré-venda)
6. **PricingPolicy**, **PricingVersion**, **PricingTier**, **PricingAdjustment**
7. **DependencyRule** (dependências comerciais)
8. **ERPMappingSankhya** (campos padrão + status de validação)
9. **PartnerCenterMapping** (listing, categorias, keywords, planos)
10. **DocTemplate** + **DocBuildRun** (geração e publicação)
11. **Opportunity** + **Transcript** + **SolutionPack** (execução IA)
12. **Asset** (logos, imagens, anexos)

---

## 4) Prisma Schema (PostgreSQL) — versão recomendada

> Observação: schema abaixo está pronto para iniciar migração. Ajuste nomes/DB provider conforme stack.

```prisma
// schema.prisma — EduGest-PIM

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ─────────────────────────────────────────────────────────────
// ENUMS
// ─────────────────────────────────────────────────────────────

enum ProductStatus {
  RASCUNHO
  ATIVO
  DESCONTINUADO
}

enum ProductCategory {
  SOFTWARE
  SERVICO
  LICENCIAMENTO
  CREDITO
  PROJETO
}

enum HostingModel {
  CLOUD
  LOCAL
}

enum KitType {
  SALES
  MARKETING
  PRESALES
}

enum DimensionType {
  IDENTIDADE
  TECNICO
  COMERCIAL
  SUPORTE
  ROADMAP
  INTEGRACOES
}

enum PricingModel {
  POR_FAIXA
  POR_USUARIO
  FLAT
  HORA
  CUSTOM
}

enum ValidationStatus {
  OK
  A_VALIDAR
  BLOQUEADO
}

enum ExportTarget {
  ERP_SANKHYA
  PARTNER_CENTER
  SHAREPOINT_DOCS
}

enum OpportunityMaturity {
  BAIXA
  MEDIA
  ALTA
  NAO_EVIDENCIADO
}

enum OpportunityComplexity {
  BAIXA
  MEDIA
  ALTA
  NAO_EVIDENCIADO
}

// ─────────────────────────────────────────────────────────────
// CORE — PRODUCT
// ─────────────────────────────────────────────────────────────

model Product {
  id              String        @id @default(cuid())
  name            String
  slug            String        @unique
  status          ProductStatus @default(RASCUNHO)

  category        ProductCategory
  subcategory     String?
  productTypePM   String?       // ex.: "SaaS"

  shortPitch      String?
  longDescription String?       @db.Text

  // Persona / dores / valor
  personaJson      Json?
  painsJson        Json?
  valueProp        String?      @db.Text
  differentiators  Json?

  // Capabilities (taxonomia)
  capabilities     ProductCapability[]

  // Kits e dimensões
  dimensionDocs    ProductDimensionDoc[]
  kits             ProductKit[]

  // Pricing
  pricingPolicies  PricingPolicy[]

  // Integrações (exports)
  erpMapping       ERPMappingSankhya?
  partnerMapping   PartnerCenterMapping?

  // SharePoint
  sharepointConfig SharePointConfig?

  // Dependências
  dependencyRules  DependencyRule[]

  // Versionamento
  versions         ProductVersion[]

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

model ProductVersion {
  id        String   @id @default(cuid())
  productId String
  product   Product  @relation(fields: [productId], references: [id], onDelete: Cascade)

  version   String   // semver: 1.0.0
  snapshot  Json     // snapshot completo do produto (imutável)
  notes     String?  @db.Text

  createdAt DateTime @default(now())

  @@unique([productId, version])
  @@index([productId])
}

// ─────────────────────────────────────────────────────────────
// CAPABILITIES
// ─────────────────────────────────────────────────────────────

model Capability {
  id          String @id @default(cuid())
  code        String @unique // ex: M365, TEAMS, SHAREPOINT, IDENTITY, SECURITY, AZURE
  name        String
  description String? @db.Text

  products    ProductCapability[]
}

model ProductCapability {
  id           String     @id @default(cuid())
  productId    String
  capabilityId String

  product      Product    @relation(fields: [productId], references: [id], onDelete: Cascade)
  capability   Capability @relation(fields: [capabilityId], references: [id], onDelete: Cascade)

  weight       Int?       // opcional: relevância

  @@unique([productId, capabilityId])
  @@index([productId])
  @@index([capabilityId])
}

// ─────────────────────────────────────────────────────────────
// DIMENSIONS & KITS (conteúdo rico para RAG)
// ─────────────────────────────────────────────────────────────

model ProductDimensionDoc {
  id         String        @id @default(cuid())
  productId  String
  type       DimensionType

  title      String
  markdown   String?       @db.Text
  html       String?       @db.Text
  jsonData   Json?

  product    Product       @relation(fields: [productId], references: [id], onDelete: Cascade)

  updatedAt  DateTime @updatedAt
  createdAt  DateTime @default(now())

  @@index([productId])
  @@index([type])
}

model ProductKit {
  id         String   @id @default(cuid())
  productId  String
  type       KitType

  // conteúdo riquíssimo e estruturado
  markdown   String?  @db.Text
  jsonData   Json?

  product    Product  @relation(fields: [productId], references: [id], onDelete: Cascade)

  updatedAt  DateTime @updatedAt
  createdAt  DateTime @default(now())

  @@unique([productId, type])
  @@index([productId])
}

// ─────────────────────────────────────────────────────────────
// PRICING
// ─────────────────────────────────────────────────────────────

model PricingPolicy {
  id         String      @id @default(cuid())
  productId  String
  name       String
  model      PricingModel
  currency   String      @default("BRL")

  product    Product     @relation(fields: [productId], references: [id], onDelete: Cascade)
  versions   PricingVersion[]

  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  @@index([productId])
}

model PricingVersion {
  id            String       @id @default(cuid())
  pricingPolicyId String
  pricingPolicy  PricingPolicy @relation(fields: [pricingPolicyId], references: [id], onDelete: Cascade)

  version       String
  active        Boolean      @default(true)

  tiers         PricingTier[]
  adjustments   PricingAdjustment[]

  rulesJson     Json?        // min mensal, max desconto, etc.

  validFrom     DateTime     @default(now())
  validTo       DateTime?

  createdAt     DateTime @default(now())

  @@unique([pricingPolicyId, version])
  @@index([pricingPolicyId])
  @@index([active])
}

model PricingTier {
  id            String   @id @default(cuid())
  pricingVersionId String
  pricingVersion  PricingVersion @relation(fields: [pricingVersionId], references: [id], onDelete: Cascade)

  hosting       HostingModel?

  minQty        Int
  maxQty        Int

  monthlyFee    Decimal  @db.Decimal(10,2)
  planName      String?  // BASIC/STANDARD/PREMIUM/ENTERPRISE

  includesJson  Json?

  @@index([pricingVersionId])
}

model PricingAdjustment {
  id               String   @id @default(cuid())
  pricingVersionId String
  pricingVersion   PricingVersion @relation(fields: [pricingVersionId], references: [id], onDelete: Cascade)

  code            String   // ex: DEPENDENCIA_INTEGRACAO, CLIENTE_GRANDE
  factor          Decimal  @db.Decimal(6,3) // ex: 1.200
  description     String?

  @@unique([pricingVersionId, code])
  @@index([pricingVersionId])
}

// ─────────────────────────────────────────────────────────────
// DEPENDÊNCIAS COMERCIAIS
// ─────────────────────────────────────────────────────────────

model DependencyRule {
  id           String @id @default(cuid())
  productId    String
  product      Product @relation(fields: [productId], references: [id], onDelete: Cascade)

  // regra
  dependencyType String // Nenhuma | Condicional | Obrigatoria (texto para evitar enum rígido)
  baseProductRef String? // slug/código do produto base preferencial
  conditionJson  Json?   // evidência mínima, critérios, etc.
  notes          String? @db.Text

  @@index([productId])
}

// ─────────────────────────────────────────────────────────────
// ERP — SANKHYA (EXPORT, SEM INTEGRAÇÃO DIRETA)
// ─────────────────────────────────────────────────────────────

model ERPMappingSankhya {
  id         String  @id @default(cuid())
  productId  String  @unique
  product    Product @relation(fields: [productId], references: [id], onDelete: Cascade)

  // Campos padrão (planilha)
  tipoReceitaDespesa String @default("RECEITA")
  ativo              Boolean @default(true)

  grupoCodigo         String?
  grupoDescricao      String?

  codigo              String?  // código ERP
  descricao           String?

  tipoServicoCodigo   String?
  tipoServicoDescricao String?

  unidadePadrao       String?  // UN/HORA/LICENCA
  unidadeDescricao    String?

  temISS              String?  // Tributado/Validar

  calcularComissao     Boolean?
  percComissaoVendedor Decimal? @db.Decimal(6,3)
  percComissaoGerente  Decimal? @db.Decimal(6,3)

  bloquearVendaFracionada Boolean?

  centroResultado      String?
  codigoNBS            String?
  ncmValido            String?

  // Governança/validação
  fiscalStatus         ValidationStatus @default(A_VALIDAR)
  cadastroStatus       ValidationStatus @default(A_VALIDAR)

  observacao           String? @db.Text

  updatedAt DateTime @updatedAt
  createdAt DateTime @default(now())
}

// ─────────────────────────────────────────────────────────────
// PARTNER CENTER (EXPORT, SEM INTEGRAÇÃO DIRETA)
// ─────────────────────────────────────────────────────────────

model PartnerCenterMapping {
  id         String  @id @default(cuid())
  productId  String  @unique
  product    Product @relation(fields: [productId], references: [id], onDelete: Cascade)

  offerType  String? // SaaS/ProfessionalService/etc.

  title      String?
  shortDescription String?
  longDescription  String? @db.Text

  industries Json?
  categories Json? // primary/secondary/subcategories

  markets    Json?
  languages  Json?

  keywords   Json?

  // Solution areas inferidas/ajustadas
  solutionAreas Json?

  contactJson Json?

  updatedAt DateTime @updatedAt
  createdAt DateTime @default(now())
}

// ─────────────────────────────────────────────────────────────
// SHAREPOINT — CONFIG + BUILD RUNS
// ─────────────────────────────────────────────────────────────

model SharePointConfig {
  id         String @id @default(cuid())
  productId  String @unique
  product    Product @relation(fields: [productId], references: [id], onDelete: Cascade)

  siteUrl    String
  libraryPath String? // ex: /Central do Produto/
  folderSlug  String? // pasta do produto

  lastSyncAt DateTime?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model DocTemplate {
  id        String @id @default(cuid())
  name      String
  type      String // README | INDEX_HTML | DIMENSION | KIT | INDEX

  templateMd  String? @db.Text
  templateHtml String? @db.Text
  templateJson Json?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model DocBuildRun {
  id          String @id @default(cuid())
  productId   String
  product     Product @relation(fields: [productId], references: [id], onDelete: Cascade)

  target      ExportTarget @default(SHAREPOINT_DOCS)
  status      String
  filesGenerated Int @default(0)

  outputPath  String?
  logs        String? @db.Text

  createdAt   DateTime @default(now())

  @@index([productId])
  @@index([target])
}

// ─────────────────────────────────────────────────────────────
// ASSETS
// ─────────────────────────────────────────────────────────────

model Asset {
  id        String @id @default(cuid())
  name      String
  kind      String // logo, screenshot, diagram, document
  mimeType  String?
  url       String?
  base64    String? @db.Text

  ownerType String? // Product | Opportunity
  ownerId   String?

  createdAt DateTime @default(now())
}

// ─────────────────────────────────────────────────────────────
// OPPORTUNITIES + IA EXECUTION
// ─────────────────────────────────────────────────────────────

model Opportunity {
  id          String @id @default(cuid())

  externalRef String? // id CRM (futuro)
  name        String

  crmPayload  Json?

  maturity    OpportunityMaturity @default(NAO_EVIDENCIADO)
  complexity  OpportunityComplexity @default(NAO_EVIDENCIADO)

  transcripts Transcript[]
  solutionPacks SolutionPack[]

  clientBranding Json? // nome, cores, referência da logo (Asset)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Transcript {
  id            String @id @default(cuid())
  opportunityId String
  opportunity   Opportunity @relation(fields: [opportunityId], references: [id], onDelete: Cascade)

  source        String? // Teams/Stream/Upload
  language      String? // pt-BR
  rawText       String  @db.Text

  createdAt DateTime @default(now())

  @@index([opportunityId])
}

model SolutionPack {
  id            String @id @default(cuid())
  opportunityId String
  opportunity   Opportunity @relation(fields: [opportunityId], references: [id], onDelete: Cascade)

  // snapshot do que foi usado
  inputSnapshot Json

  // outputs
  diagnosis     Json
  recommendation Json
  presales      Json
  sales         Json
  marketing     Json
  exports       Json

  deckOutlineMd String? @db.Text

  modelRouting  Json? // quais modelos foram usados em cada etapa
  tokenUsage    Json? // opcional: telemetria

  createdAt DateTime @default(now())

  @@index([opportunityId])
}
```

---

## 5) Regras de integridade (business rules)

### 5.1 Regras de pricing
- Se `PricingModel = POR_FAIXA`, deve existir ao menos 1 `PricingTier` com `minQty/maxQty`.
- Plano pode ser derivado pela regra: fee ≤ 500 → BASIC, 501–1000 → STANDARD, 1001–5000 → PREMIUM, >5000 → ENTERPRISE. citeturn1search1

### 5.2 Regras ERP (export)
- `ERPMappingSankhya.codigo` não pode ser gerado automaticamente sem governança.
- Se `fiscalStatus = A_VALIDAR` ou `cadastroStatus = A_VALIDAR`, export final deve ser marcado como bloqueado. citeturn2search2

### 5.3 Regras de docs
- Toda alteração de Produto/Kits/Dimensions deve gerar `DocBuildRun` (auditoria). citeturn1search1

---

## 6) Estratégia de economia de tokens (dados necessários no banco)

### 6.1 Estruturar conteúdo para RAG
- `ProductDimensionDoc` e `ProductKit` armazenam conteúdo por fatias.
- Agent recebe apenas IDs e trechos recuperados; não recebe catálogo inteiro.

### 6.2 Telemetria opcional
- `SolutionPack.tokenUsage` e `modelRouting` permitem observar custo e ajustar roteamento de modelos.

---

## 7) DoD (Definition of Done) — Data Model
- Migração cria tabelas acima.
- CRUD básico de Product + PricingPolicy/Version/Tiers.
- Um produto cadastrado consegue:
  - gerar docs (DocBuildRun)
  - gerar exports ERP/Partner como JSON
- Uma oportunidade com transcrição consegue persistir `SolutionPack`.

