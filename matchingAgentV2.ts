/**
 * matchingAgentV2.ts — MatchingAgent V2 (score + dependências Sankhya)
 *
 * - Gera candidatos com score e razões
 * - Seleciona Top N por score
 * - Resolve dependências comerciais conforme matriz Sankhya (Condicional/Nenhuma)
 * - Garante que dependências apareçam em product_ids (evita MISSING_DEPENDENCY no guardrail)
 */

export type Candidate = {
  product_id: string
  score: number
  reasons: string[]
}

export type MatchingV2Result = {
  product_ids: string[]
  required_dependencies: string[]
  confidence: number
  candidates: Candidate[]
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
// Catálogo mínimo (slugs neutros) + regras de dependência
// Fonte: matriz Sankhya (aba 04_Dependencias)
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

export const DEPENDENCY_RULES: Record<string, DepRule> = {
  [PRODUCT.AGENDA]: {
    dependencyType: 'Condicional',
    baseProductRef: PRODUCT.INTEGRADOR,
    notes: 'Requer integração educacional ativa, preferencialmente via Integrador/Provisionador.',
    evidence: { requiresIntegrationActive: true },
  },
  [PRODUCT.RELATORIOS]: {
    dependencyType: 'Condicional',
    baseProductRef: PRODUCT.INTEGRADOR,
    notes: 'Requer integração educacional ativa, preferencialmente via Integrador/Provisionador.',
    evidence: { requiresIntegrationActive: true },
  },
  [PRODUCT.CENTRO_OPERACOES]: {
    dependencyType: 'Condicional',
    baseProductRef: PRODUCT.INTEGRADOR,
    notes: 'Requer integração educacional ativa, preferencialmente via Integrador/Provisionador.',
    evidence: { requiresIntegrationActive: true },
  },
}

// -----------------------------------------------------
// Helpers
// -----------------------------------------------------

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

function uniq(arr: string[]) {
  return Array.from(new Set((arr || []).map((s) => (s || '').trim()).filter(Boolean)))
}

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n))
}

function pickFirst<T>(arr: T[] | undefined | null): T | null {
  return arr && arr.length ? arr[0] : null
}

// Evidência simples de “integração ativa” a partir de transcrição + diagnóstico
function integrationEvidence(ctx: any) {
  const transcript = ctx?.opportunityContext?.transcript?.text || ''
  const diagnosis = ctx?.diagnosis || {}
  const constraints = (diagnosis.constraints || []).join(' ')

  const evidenceKeywords = [
    'integracao', 'integração', 'integrada', 'integrado', 'integrar', 'integra',
    'api', 'erp', 'crm', 'conector', 'totvs', 'sge', 'sistema academico', 'sistema acadêmico'
  ]

  const byText = hasAny(transcript, evidenceKeywords)
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

// -----------------------------------------------------
// MatchingAgent V2
// -----------------------------------------------------

export function matchingAgentV2(ctx: any, opts?: { topN?: number }): MatchingV2Result {
  const topN = opts?.topN ?? 3

  const transcript = ctx?.opportunityContext?.transcript?.text || ''
  const diagnosis = ctx?.diagnosis || {}

  const objectivesText = (diagnosis.objectives || []).join(' ')
  const painsText = (diagnosis.pains || []).join(' ')
  const constraintsText = (diagnosis.constraints || []).join(' ')

  // Flags
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

  const mentionsSecurity = hasAny(
    transcript + ' ' + objectivesText + ' ' + constraintsText,
    ['seguranca', 'segurança', 'governanca', 'governança', 'compliance', 'lgpd']
  )

  const integ = integrationEvidence(ctx)

  const candidates: Candidate[] = []

  // --- Scoring heurístico (0..1)
  if (wantsSharePoint) {
    const pid: ProductId = wantsIntranet
      ? PRODUCT.INTRANET_SHAREPOINT
      : (wantsPortal ? PRODUCT.PORTAL_SHAREPOINT : PRODUCT.INTRANET_SHAREPOINT)

    candidates.push({
      product_id: pid,
      score: 0.78,
      reasons: ['SharePoint/Portal/Intranet detectado na transcrição/objetivo'],
    })
  }

  if (wantsAgenda) {
    candidates.push({
      product_id: PRODUCT.AGENDA,
      score: integ.ok ? 0.82 : 0.62,
      reasons: [
        'Agenda/agendamento detectado',
        ...(integ.ok ? ['Integração evidenciada (forte)'] : ['Integração não evidenciada (pode exigir validação)']),
      ],
    })
  }

  if (wantsReports) {
    if (integ.ok) {
      candidates.push({
        product_id: PRODUCT.RELATORIOS,
        score: 0.85,
        reasons: ['Relatórios/Dashboards solicitados', 'Integração evidenciada (forte)'],
      })
    } else {
      candidates.push({
        product_id: PRODUCT.NUCLEO_EXPERIENCIA,
        score: 0.75,
        reasons: ['Relatórios/Dashboards solicitados', 'Integração não evidenciada → alternativa analítica independente'],
      })
    }
  }

  if (wantsOperationsCenter) {
    if (integ.ok) {
      candidates.push({
        product_id: PRODUCT.CENTRO_OPERACOES,
        score: 0.83,
        reasons: ['Monitoramento/tempo real solicitado', 'Integração evidenciada (forte)'],
      })
    } else {
      candidates.push({
        product_id: PRODUCT.NUCLEO_EXPERIENCIA,
        score: 0.70,
        reasons: ['Monitoramento solicitado', 'Integração não evidenciada → alternativa analítica independente'],
      })
    }
  }

  if (wantsCopilot) {
    candidates.push({ product_id: PRODUCT.COPILOT, score: 0.88, reasons: ['Copilot mencionado no objetivo/transcrição'] })
  }

  if (wantsLicensing) {
    let lic: ProductId = PRODUCT.LIC_A3
    if (hasAny(transcript, ['a5'])) lic = PRODUCT.LIC_A5
    else if (hasAny(transcript, ['a1'])) lic = PRODUCT.LIC_A1
    else if (hasAny(transcript, ['a3'])) lic = PRODUCT.LIC_A3

    candidates.push({ product_id: lic, score: 0.72, reasons: ['Licenciamento M365 mencionado'] })
  }

  if (wantsTraining) {
    candidates.push({ product_id: PRODUCT.FORMACAO, score: 0.62, reasons: ['Treinamento/Formação mencionado'] })
  }

  if (wantsSupport) {
    candidates.push({ product_id: PRODUCT.SUPORTE_M365, score: 0.60, reasons: ['Suporte/Atendimento mencionado (ou dores de erro)'] })
  }

  if (mentionsSecurity && candidates.length === 0) {
    candidates.push({ product_id: PRODUCT.CONSULTORIA, score: 0.58, reasons: ['Segurança/Governança mencionada → consultoria'] })
  }

  if (candidates.length === 0) {
    candidates.push({ product_id: PRODUCT.CONSULTORIA, score: 0.40, reasons: ['Sem sinais claros → consultoria (descoberta)'] })
  }

  // Consolidar candidatos por produto (mantém maior score)
  const byProduct = new Map<string, Candidate>()
  for (const c of candidates) {
    const existing = byProduct.get(c.product_id)
    if (!existing || c.score > existing.score) {
      byProduct.set(c.product_id, { ...c, reasons: uniq([...(existing?.reasons || []), ...c.reasons]) })
    } else {
      existing.reasons = uniq([...existing.reasons, ...c.reasons])
    }
  }

  const uniqueCandidates = Array.from(byProduct.values()).sort((a, b) => b.score - a.score)

  // Seleção inicial
  const selected = uniqueCandidates.slice(0, topN)

  // Resolver dependências Sankhya
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
          // penaliza score (não adiciona dependência)
          s.score = Math.max(0, s.score - 0.25)
          s.reasons = uniq([...s.reasons, 'Dependência condicional sem evidência suficiente (score penalizado)'])
        }
      }
    }
  }

  const finalDeps = uniq(required_dependencies)

  // Garante que deps estejam no bundle (evita MISSING_DEPENDENCY)
  const primaryProducts = uniq(selected.sort((a, b) => b.score - a.score).slice(0, topN).map((x) => x.product_id))
  const product_ids = uniq([...primaryProducts, ...finalDeps])

  // Confidence: média dos scores dos primários
  const conf = clamp01(
    primaryProducts.length
      ? primaryProducts
          .map((pid) => uniqueCandidates.find((c) => c.product_id === pid)?.score ?? 0.4)
          .reduce((a, b) => a + b, 0) / primaryProducts.length
      : 0.4
  )

  const obj = pickFirst(diagnosis.objectives || [])
  const con = pickFirst(diagnosis.constraints || [])

  const justification = [
    obj && obj !== 'não evidenciado' ? `Objetivo: ${obj}.` : null,
    con && con !== 'não evidenciado' ? `Restrição: ${con}.` : null,
    integ.reasons.length ? `Evidências: ${integ.reasons.join('; ')}.` : null,
    dependencyNotes.length ? `Dependências: ${uniq(dependencyNotes).join(' ')}.` : null,
    `Selecionados: ${primaryProducts.join(', ')}.`,
  ]
    .filter(Boolean)
    .join(' ')

  return {
    product_ids,
    required_dependencies: finalDeps,
    confidence: conf,
    candidates: uniqueCandidates,
    justification,
  }
}