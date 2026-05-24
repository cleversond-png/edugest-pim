/**
 * matchingAgentV3.ts — MatchingAgent V3 (score + dependências + mapeamento Sankhya)
 *
 * Objetivo
 * - Mantém o motor V2 (candidatos + score + evidências + dependências)
 * - Enriquecer a saída com dados do catálogo Sankhya: código ERP, grupo, tipo, modelo contratado e faturamento
 * - Dependências comerciais são resolvidas e incluídas no bundle (product_ids) para evitar MISSING_DEPENDENCY
 */

export type Candidate = {
  product_id: string
  score: number
  reasons: string[]
}

export type SankhyaProduct = {
  /** slug neutro usado pelo runtime */
  product_id: string
  /** descrição faturável/contratável (nome oficial) */
  name: string
  /** código no ERP Sankhya (campo "Código") */
  erp_code: string
  /** código do grupo (campo "Grupo") quando disponível */
  group_code?: string
  /** descrição do grupo (campo "Descrição (Grupo Produto)") quando disponível */
  group_name?: string
  /** Tipo Produto PM (campo "Tipo Produto PM") */
  pm_type?: string
  /** Modelo Contratado (campo "Modelo Contratado") */
  contract_model?: string
  /** Modelo Faturamento (campo "Modelo Faturamento") */
  billing_model?: string
  /** Dependência Comercial (Nenhuma/Condicional) */
  dependency_type?: 'Nenhuma' | 'Condicional'
  /** Produto base preferencial (se houver) */
  base_preferred?: string
  /** Observação/Regra PM */
  notes?: string
}

export type MatchingV3Result = {
  product_ids: string[]
  required_dependencies: string[]
  confidence: number
  candidates: Candidate[]
  /** itens já enriquecidos com dados Sankhya */
  products: SankhyaProduct[]
  justification: string
}

type DepRule = {
  dependencyType: 'Nenhuma' | 'Condicional'
  baseProductRef?: string
  notes: string
  evidence: {
    requiresIntegrationActive: boolean
  }
}

// -----------------------------------------------------
// IDs/Slugs neutros (fonte: seu catálogo saneado)
// -----------------------------------------------------

export const PRODUCT = {
  INTEGRADOR: 'integrador-provisionador',
  AGENDA: 'agenda-inteligente',
  RELATORIOS: 'relatorios-inteligentes',
  CENTRO_OPERACOES: 'centro-operacoes',
  NUCLEO_EXPERIENCIA: 'nucleo-experiencia',
  PORTAL_SHAREPOINT: 'portal-institucional-sharepoint',
  INTRANET_SHAREPOINT: 'intranet-sharepoint',
  FORMACAO: 'formacao-microsoft',
  SUPORTE_M365: 'suporte-m365',
  CONSULTORIA: 'consultoria-especializada',
  BOOKING_HORAS: 'booking-horas',
  LIC_A1: 'licenciamento-m365-a1',
  LIC_A3: 'licenciamento-m365-a3',
  LIC_A5: 'licenciamento-m365-a5',
  COPILOT: 'copilot-m365',
} as const

export type ProductId = (typeof PRODUCT)[keyof typeof PRODUCT]

// -----------------------------------------------------
// Catálogo Sankhya (mapeamento mínimo) — a partir da planilha
// Aba 01_Cadastro_Sankhya_PM e Aba 04_Dependencias
// -----------------------------------------------------

export const SANKHYA_CATALOG: Record<ProductId, SankhyaProduct> = {
  [PRODUCT.INTEGRADOR]: {
    product_id: PRODUCT.INTEGRADOR,
    name: 'INTEGRADOR BIG BRAIN / PROVISIONADOR',
    erp_code: '105101',
    group_code: '105001',
    group_name: 'INTEGRADOR',
    pm_type: 'SaaS BB',
    contract_model: 'Subscrição',
    billing_model: 'Recorrente',
    dependency_type: 'Nenhuma',
    notes: 'Produto SaaS faturável que integra sistemas educacionais ao Microsoft 365/Office 365.',
  },
  [PRODUCT.AGENDA]: {
    product_id: PRODUCT.AGENDA,
    name: 'AGENDA INTELIGENTE',
    erp_code: '105102',
    group_code: '105003',
    group_name: 'AGENDA INTELIGENTE',
    pm_type: 'SaaS BB',
    contract_model: 'Subscrição',
    billing_model: 'Recorrente',
    dependency_type: 'Condicional',
    base_preferred: PRODUCT.INTEGRADOR,
    notes: 'Requer integração educacional ativa, preferencialmente via Integrador/Provisionador.',
  },
  [PRODUCT.RELATORIOS]: {
    product_id: PRODUCT.RELATORIOS,
    name: 'RELATORIOS INTELIGENTES',
    erp_code: '105103',
    group_code: '105000',
    group_name: 'PRODUTOS PRÓPRIOS (PLATAFORMAS & PRODUTOS CORE)',
    pm_type: 'SaaS BB',
    contract_model: 'Subscrição',
    billing_model: 'Recorrente',
    dependency_type: 'Condicional',
    base_preferred: PRODUCT.INTEGRADOR,
    notes: 'Requer integração educacional ativa, preferencialmente via Integrador/Provisionador.',
  },
  [PRODUCT.CENTRO_OPERACOES]: {
    product_id: PRODUCT.CENTRO_OPERACOES,
    name: 'CENTRO DE OPERACOES',
    erp_code: '105104',
    group_code: '105007',
    group_name: 'CENTRO DE OPERAÇÕES',
    pm_type: 'SaaS BB',
    contract_model: 'Subscrição',
    billing_model: 'Recorrente',
    dependency_type: 'Condicional',
    base_preferred: PRODUCT.INTEGRADOR,
    notes: 'Requer integração educacional ativa, preferencialmente via Integrador/Provisionador.',
  },
  [PRODUCT.NUCLEO_EXPERIENCIA]: {
    product_id: PRODUCT.NUCLEO_EXPERIENCIA,
    name: 'NUCLEO DE EXPERIENCIA',
    erp_code: '105105',
    group_code: '105006',
    group_name: 'NÚCLEO DE EXPERIÊNCIA',
    pm_type: 'SaaS BB / Solução Analítica',
    contract_model: 'Subscrição',
    billing_model: 'Recorrente',
    dependency_type: 'Nenhuma',
    notes: 'Produto/solução analítica independente. Não requer Integrador.',
  },
  [PRODUCT.PORTAL_SHAREPOINT]: {
    product_id: PRODUCT.PORTAL_SHAREPOINT,
    name: 'PORTAL INSTITUCIONAL SHAREPOINT',
    erp_code: '105201',
    group_code: '108003',
    group_name: 'SQUADS & PROJETOS ESTRUTURANTES',
    pm_type: 'Serviço Profissional / SharePoint',
    contract_model: 'Pontual',
    billing_model: 'Pontual',
    dependency_type: 'Nenhuma',
    notes: 'Página/estrutura em SharePoint. Não depende do Integrador.',
  },
  [PRODUCT.INTRANET_SHAREPOINT]: {
    product_id: PRODUCT.INTRANET_SHAREPOINT,
    name: 'INTRANET SHAREPOINT',
    erp_code: '105202',
    group_code: '105005',
    group_name: 'INTRANET CORPORATIVA',
    pm_type: 'Serviço Profissional / SharePoint',
    contract_model: 'Pontual',
    billing_model: 'Pontual',
    dependency_type: 'Nenhuma',
    notes: 'Página/estrutura em SharePoint. Não depende do Integrador (mas pode exigir Integrador se houver integração citada na demanda).',
  },
  [PRODUCT.FORMACAO]: {
    product_id: PRODUCT.FORMACAO,
    name: 'FORMACAO MICROSOFT',
    erp_code: '102101',
    group_code: '102001',
    group_name: 'FORMACAO MICROSOFT',
    pm_type: 'Serviço Profissional',
    contract_model: 'Pontual',
    billing_model: 'Pontual',
    dependency_type: 'Nenhuma',
  },
  [PRODUCT.SUPORTE_M365]: {
    product_id: PRODUCT.SUPORTE_M365,
    name: 'SUPORTE AMBIENTE MICROSOFT 365',
    erp_code: '109101',
    group_code: '109001',
    group_name: 'SUPORTE E ATENDIMENTO',
    pm_type: 'Serviço Profissional',
    contract_model: 'Subscrição',
    billing_model: 'Recorrente',
    dependency_type: 'Nenhuma',
  },
  [PRODUCT.CONSULTORIA]: {
    product_id: PRODUCT.CONSULTORIA,
    name: 'CONSULTORIA ESPECIALIZADA',
    erp_code: '109501',
    group_code: '109501',
    group_name: 'CONSULTORIA',
    pm_type: 'Serviço Profissional',
    contract_model: 'Pontual',
    billing_model: 'Pontual',
    dependency_type: 'Nenhuma',
  },
  [PRODUCT.BOOKING_HORAS]: {
    product_id: PRODUCT.BOOKING_HORAS,
    name: 'BOOKING DE HORAS',
    erp_code: '108101',
    group_code: '108001',
    group_name: 'HORAS TECNICAS',
    pm_type: 'Crédito / Banco de horas',
    contract_model: 'Crédito',
    billing_model: 'Pontual ou Recorrente',
    dependency_type: 'Nenhuma',
  },
  [PRODUCT.LIC_A1]: {
    product_id: PRODUCT.LIC_A1,
    name: 'LICENCIAMENTO MICROSOFT OFFICE 365 A1',
    erp_code: '40001',
    group_code: '104005',
    group_name: 'LICENCIMANETO M 365',
    pm_type: 'Licenciamento',
    contract_model: 'Subscrição',
    billing_model: 'Recorrente',
    dependency_type: 'Nenhuma',
  },
  [PRODUCT.LIC_A3]: {
    product_id: PRODUCT.LIC_A3,
    name: 'LICENCIAMENTO MICROSOFT OFFICE 365 A3',
    erp_code: '40002',
    group_code: '104005',
    group_name: 'LICENCIMANETO M 365',
    pm_type: 'Licenciamento',
    contract_model: 'Subscrição',
    billing_model: 'Recorrente',
    dependency_type: 'Nenhuma',
  },
  [PRODUCT.LIC_A5]: {
    product_id: PRODUCT.LIC_A5,
    name: 'LICENCIAMENTO MICROSOFT OFFICE 365 A5',
    erp_code: '40003',
    group_code: '104005',
    group_name: 'LICENCIMANETO M 365',
    pm_type: 'Licenciamento',
    contract_model: 'Subscrição',
    billing_model: 'Recorrente',
    dependency_type: 'Nenhuma',
  },
  [PRODUCT.COPILOT]: {
    product_id: PRODUCT.COPILOT,
    name: 'COPILOT MICROSOFT 365',
    erp_code: '40004',
    group_code: '104005',
    group_name: 'LICENCIMANETO M 365',
    pm_type: 'Licenciamento',
    contract_model: 'Subscrição',
    billing_model: 'Recorrente',
    dependency_type: 'Nenhuma',
  },
}

// -----------------------------------------------------
// Dependências (conforme matriz)
// -----------------------------------------------------

export const DEPENDENCY_RULES: Record<string, DepRule> = {
  [PRODUCT.AGENDA]: {
    dependencyType: 'Condicional',
    baseProductRef: PRODUCT.INTEGRADOR,
    notes: 'Requer integração educacional ativa (comprovação) — matriz Sankhya.',
    evidence: { requiresIntegrationActive: true },
  },
  [PRODUCT.RELATORIOS]: {
    dependencyType: 'Condicional',
    baseProductRef: PRODUCT.INTEGRADOR,
    notes: 'Requer integração educacional ativa (comprovação) — matriz Sankhya.',
    evidence: { requiresIntegrationActive: true },
  },
  [PRODUCT.CENTRO_OPERACOES]: {
    dependencyType: 'Condicional',
    baseProductRef: PRODUCT.INTEGRADOR,
    notes: 'Requer integração educacional ativa (comprovação) — matriz Sankhya.',
    evidence: { requiresIntegrationActive: true },
  },
}

// -----------------------------------------------------
// Helpers de matching
// -----------------------------------------------------

function uniqStr(arr: string[]) {
  return Array.from(new Set((arr || []).filter(Boolean)))
}

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n))
}

function evidenceIntegration(ctx: any) {
  const transcript = ctx?.opportunityContext?.transcript?.text || ''
  const diagnosis = ctx?.diagnosis || {}
  const constraints = (diagnosis.constraints || []).join(' ')

  const kw = [
    'integracao', 'integração', 'integrada', 'integrado', 'integrar', 'integra',
    'api', 'erp', 'crm', 'conector', 'totvs', 'sge', 'sistema academico', 'sistema acadêmico'
  ]

  const byText = hasAny(transcript, kw)
  const byConstraint = hasAny(constraints, ['integracoes citadas', 'integrações citadas'])

  const score = (byText ? 0.7 : 0) + (byConstraint ? 0.5 : 0)
  return {
    score: clamp01(score),
    ok: clamp01(score) >= 0.6,
    reasons: [
      byText ? 'Transcrição indica integração/sistemas' : null,
      byConstraint ? 'Diagnóstico indica integrações como restrição' : null,
    ].filter(Boolean) as string[],
  }
}

function norm(s: string) {
  return (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
}

function hasAny(text: string, terms: string[]) {
  const t = norm(text)
  return terms.some((x) => t.includes(norm(x)))
}

function pickFirst<T>(arr: T[] | undefined | null): T | null {
  return arr && arr.length ? arr[0] : null
}

function enrich(products: string[]): SankhyaProduct[] {
  return products
    .map((pid) => SANKHYA_CATALOG[pid as ProductId])
    .filter(Boolean)
}

// -----------------------------------------------------
// MatchingAgent V3
// -----------------------------------------------------

export function matchingAgentV3(ctx: any, opts?: { topN?: number }): MatchingV3Result {
  const topN = opts?.topN ?? 3

  const transcript = ctx?.opportunityContext?.transcript?.text || ''
  const diagnosis = ctx?.diagnosis || {}

  const objectivesText = (diagnosis.objectives || []).join(' ')
  const painsText = (diagnosis.pains || []).join(' ')
  const constraintsText = (diagnosis.constraints || []).join(' ')

  const integ = evidenceIntegration(ctx)

  const wantsSharePoint = hasAny(transcript + ' ' + objectivesText, ['sharepoint', 'intranet', 'portal', 'site'])
  const wantsIntranet = hasAny(transcript + ' ' + objectivesText, ['intranet'])
  const wantsPortal = hasAny(transcript + ' ' + objectivesText, ['portal', 'institucional'])

  const wantsAgenda = hasAny(transcript + ' ' + objectivesText, ['agenda', 'agendar', 'agendamento', 'aula', 'calendario', 'calendário'])
  const wantsReports = hasAny(transcript + ' ' + objectivesText, ['relatorio', 'relatorios', 'relatório', 'relatórios', 'dashboard', 'insights', 'indicador'])
  const wantsOperationsCenter = hasAny(transcript, ['centro de operacoes', 'centro de operações', 'monitoramento', 'tempo real', 'observabilidade'])

  const wantsTraining = hasAny(transcript + ' ' + objectivesText, ['treinamento', 'formacao', 'formação', 'capacitar'])
  const wantsSupport = hasAny(transcript + ' ' + painsText, ['suporte', 'atendimento', 'chamado', 'ticket', 'erro', 'inconsistente'])

  const wantsLicensing = hasAny(transcript + ' ' + objectivesText, ['licenca', 'licença', 'licenciamento', 'a1', 'a3', 'a5'])
  const wantsCopilot = hasAny(transcript + ' ' + objectivesText, ['copilot'])

  const mentionsSecurity = hasAny(transcript + ' ' + objectivesText + ' ' + constraintsText, ['seguranca', 'segurança', 'governanca', 'governança', 'compliance', 'lgpd'])

  const candidates: Candidate[] = []

  // SharePoint
  if (wantsSharePoint) {
    const pid = wantsIntranet ? PRODUCT.INTRANET_SHAREPOINT : (wantsPortal ? PRODUCT.PORTAL_SHAREPOINT : PRODUCT.INTRANET_SHAREPOINT)
    candidates.push({ product_id: pid, score: 0.78, reasons: ['SharePoint/Portal/Intranet detectado'] })

    // se o pedido cita "integrada", tratamos Integrador como necessário para entregar integração
    if (integ.ok) {
      candidates.push({ product_id: PRODUCT.INTEGRADOR, score: 0.74, reasons: ['Integração evidenciada para a intranet'] })
    }
  }

  // Agenda
  if (wantsAgenda) {
    candidates.push({
      product_id: PRODUCT.AGENDA,
      score: integ.ok ? 0.82 : 0.62,
      reasons: ['Agenda/agendamento detectado', ...(integ.ok ? ['Integração evidenciada'] : ['Integração não evidenciada'])],
    })
  }

  // Relatórios
  if (wantsReports) {
    if (integ.ok) {
      candidates.push({ product_id: PRODUCT.RELATORIOS, score: 0.85, reasons: ['Relatórios/Dashboards', 'Integração evidenciada (forte)'] })
    } else {
      candidates.push({ product_id: PRODUCT.NUCLEO_EXPERIENCIA, score: 0.75, reasons: ['Relatórios/Dashboards', 'Sem integração evidenciada → Núcleo (independente)'] })
    }
  }

  // Centro de Operações
  if (wantsOperationsCenter) {
    if (integ.ok) {
      candidates.push({ product_id: PRODUCT.CENTRO_OPERACOES, score: 0.83, reasons: ['Monitoramento/tempo real', 'Integração evidenciada (forte)'] })
    } else {
      candidates.push({ product_id: PRODUCT.NUCLEO_EXPERIENCIA, score: 0.70, reasons: ['Monitoramento', 'Sem integração evidenciada → Núcleo (independente)'] })
    }
  }

  // Licenciamento/Copilot
  if (wantsCopilot) candidates.push({ product_id: PRODUCT.COPILOT, score: 0.88, reasons: ['Copilot mencionado'] })

  if (wantsLicensing) {
    let lic: ProductId = PRODUCT.LIC_A3
    if (hasAny(transcript, ['a5'])) lic = PRODUCT.LIC_A5
    else if (hasAny(transcript, ['a1'])) lic = PRODUCT.LIC_A1
    else if (hasAny(transcript, ['a3'])) lic = PRODUCT.LIC_A3
    candidates.push({ product_id: lic, score: 0.72, reasons: ['Licenciamento M365 mencionado'] })
  }

  // Serviços
  if (wantsTraining) candidates.push({ product_id: PRODUCT.FORMACAO, score: 0.62, reasons: ['Treinamento/Formação'] })
  if (wantsSupport) candidates.push({ product_id: PRODUCT.SUPORTE_M365, score: 0.60, reasons: ['Suporte/Atendimento'] })

  // Segurança/governança → consultoria
  if (mentionsSecurity && candidates.length === 0) candidates.push({ product_id: PRODUCT.CONSULTORIA, score: 0.58, reasons: ['Segurança/Governança → consultoria'] })

  // fallback
  if (candidates.length === 0) candidates.push({ product_id: PRODUCT.CONSULTORIA, score: 0.40, reasons: ['Sem sinais claros → consultoria (descoberta)'] })

  // consolidar por produto (maior score)
  const byProduct = new Map<string, Candidate>()
  for (const c of candidates) {
    const ex = byProduct.get(c.product_id)
    if (!ex || c.score > ex.score) byProduct.set(c.product_id, c)
    else ex.reasons = uniqStr([...ex.reasons, ...c.reasons])
  }

  const uniqueCandidates = Array.from(byProduct.values()).sort((a, b) => b.score - a.score)
  const selected = uniqueCandidates.slice(0, topN)

  // dependências sankhya
  const required_dependencies: string[] = []
  const dependencyNotes: string[] = []

  for (const s of selected) {
    const rule = DEPENDENCY_RULES[s.product_id]
    if (!rule) continue

    if (rule.dependencyType === 'Condicional' && rule.baseProductRef) {
      if (rule.evidence.requiresIntegrationActive) {
        if (integ.ok) {
          required_dependencies.push(rule.baseProductRef)
          dependencyNotes.push(rule.notes)
        } else {
          s.score = Math.max(0, s.score - 0.25)
          s.reasons = uniqStr([...s.reasons, 'Dependência condicional sem evidência suficiente (score penalizado)'])
        }
      }
    }
  }

  const deps = uniqStr(required_dependencies)
  const primary = uniqStr(selected.sort((a, b) => b.score - a.score).slice(0, topN).map((x) => x.product_id))

  // ✅ deps sempre entram no bundle
  const product_ids = uniqStr([...primary, ...deps])

  const conf = clamp01(
    primary.length
      ? primary
          .map((pid) => uniqueCandidates.find((c) => c.product_id === pid)?.score ?? 0.4)
          .reduce((a, b) => a + b, 0) / primary.length
      : 0.4
  )

  const obj = pickFirst(diagnosis.objectives || [])
  const con = pickFirst(diagnosis.constraints || [])

  const justification = [
    obj && obj !== 'não evidenciado' ? `Objetivo: ${obj}.` : null,
    con && con !== 'não evidenciado' ? `Restrição: ${con}.` : null,
    integ.reasons.length ? `Evidências: ${integ.reasons.join('; ')}.` : null,
    dependencyNotes.length ? `Dependências: ${uniqStr(dependencyNotes).join(' ')}.` : null,
    `Selecionados: ${primary.join(', ')}.`,
  ].filter(Boolean).join(' ')

  return {
    product_ids,
    required_dependencies: deps,
    confidence: conf,
    candidates: uniqueCandidates,
    products: enrich(product_ids),
    justification,
  }
}
