// ─────────────────────────────────────────────────────────────────
// SolutionPack V4 — Contrato central de saída
// Referência: SPEC-SOLUTION-PACK-V4.md
// ─────────────────────────────────────────────────────────────────

export type Maturity = 'BAIXA' | 'MEDIA' | 'ALTA' | 'NAO_EVIDENCIADO'
export type Complexity = 'BAIXA' | 'MEDIA' | 'ALTA' | 'NAO_EVIDENCIADO'

export type DiagnosisOutput = {
  pains: string[]
  objectives: string[]
  constraints: string[]
  maturity: Maturity
  complexity: Complexity
  context: string
  notEvidenced: string[]
}

export type Candidate = {
  product_id: string
  score: number
  reasons: string[]
}

export type SankhyaProduct = {
  product_id: string
  name: string
  erp_code: string
  group_code?: string
  group_name?: string
  pm_type?: string
  contract_model?: string
  billing_model?: string
  dependency_type?: 'Nenhuma' | 'Condicional'
  base_preferred?: string
  notes?: string
}

export type IntelligenceBlock = {
  score: number
  candidates: Candidate[]
}

export type BusinessBlock = {
  products: SankhyaProduct[]
  required_dependencies: string[]
}

export type StrategyBlock = {
  summary: string
  justification: string
}

export type RecommendationOutput = {
  intelligence: IntelligenceBlock
  business: BusinessBlock
  strategy: StrategyBlock
}

export type RiskItem = {
  risk: string
  mitigation: string
  severity: 'BAIXA' | 'MEDIA' | 'ALTA'
}

export type Phase = {
  name: string
  description: string
  estimatedWeeks?: number
}

export type PresalesOutput = {
  architectureHLD: string
  requirements: string[]
  risks: RiskItem[]
  phases: Phase[]
}

export type ObjectionItem = {
  objection: string
  response: string
}

export type SalesOutput = {
  narrative: string
  objections: ObjectionItem[]
  nextSteps: string[]
}

export type SlideOutline = {
  number: number
  title: string
  content: string
  isPersonalized: boolean
}

export type MarketingOutput = {
  deckOutlineMd: string
  slides: SlideOutline[]
  clientElements: string[]
  logoPlaceholder: boolean
}

export type ERPItem = {
  product_id: string
  erp_code: string
  descricao: string
  tipoReceita: string
  ativo: boolean
  grupoCodigo?: string
  grupoDescricao?: string
  unidadePadrao?: string
  temISS?: string
  centroResultado?: string
  codigoNBS?: string
}

export type ERPPayload = {
  items: ERPItem[]
  generatedAt: string
}

export type ERPExport = {
  blocked: boolean
  blockedReasons: string[]
  payload: ERPPayload | null
}

export type PartnerItem = {
  product_id: string
  offerType: string
  title: string
  shortDescription: string
  solutionAreas: string[]
  markets: string[]
  languages: string[]
  keywords: string[]
}

export type PartnerPayload = {
  items: PartnerItem[]
  generatedAt: string
}

export type PartnerExport = {
  payload: PartnerPayload
}

export type ExportsOutput = {
  erp: ERPExport
  partner: PartnerExport
}

export type StepTokenUsage = {
  input: number
  output: number
}

export type StepName =
  | 'DiagnosisAgent'
  | 'MatchingAgent'
  | 'SolutionArchitectAgent'
  | 'SalesNarrativeAgent'
  | 'MarketingDeckAgent'
  | 'ERPSankhyaMapperAgent'
  | 'PartnerCenterMapperAgent'
  | 'DocsPublisherAgent'

export type TokenUsageMap = Record<StepName, StepTokenUsage> & {
  total: StepTokenUsage
}

export type TelemetryOutput = {
  modelRouting: Record<StepName, string>
  tokenUsage: TokenUsageMap
}

export type StepError = {
  step: StepName
  code: string
  message: string
  attempts: number
}

export type SolutionPackV4 = {
  executionId: string
  opportunityId: string
  status: 'SUCCESS' | 'PARTIAL_SUCCESS' | 'FAILED'
  durationMs: number
  createdAt: string

  diagnosis: DiagnosisOutput
  recommendation: RecommendationOutput

  presales: PresalesOutput | null
  sales: SalesOutput | null
  marketing: MarketingOutput | null

  exports: ExportsOutput
  telemetry: TelemetryOutput

  errors?: StepError[]
}
