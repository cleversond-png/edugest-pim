/**
 * diagnosisAgent.ts — Diagnosis Agent (determinístico)
 * Extrai pains, objectives, constraints, maturity e complexity da transcrição.
 */

export type Maturity = 'BAIXA' | 'MEDIA' | 'ALTA' | 'NAO_EVIDENCIADO'
export type Complexity = 'BAIXA' | 'MEDIA' | 'ALTA' | 'NAO_EVIDENCIADO'

export type DiagnosisResult = {
  scenario_summary: string
  pains: string[]
  objectives: string[]
  constraints: string[]
  maturity: Maturity
  complexity: Complexity
  signals: string[]
  success_criteria: string[]
}

function normalize(text: string) {
  return (text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function uniq(arr: string[]) {
  return Array.from(new Set((arr || []).map((s) => (s || '').trim()).filter(Boolean)))
}

function hasAny(text: string, terms: string[]) {
  const t = (text || '').toLowerCase()
  return (terms || []).some((term) => term && t.includes(term.toLowerCase()))
}

function pickFirst<T>(arr: T[]) {
  return arr && arr.length ? arr[0] : null
}

function extractPains(textNorm: string) {
  const painKeywords = [
    'retrabalho',
    'manual',
    'demora',
    'lento',
    'erro',
    'inconsistente',
    'sem visibilidade',
    'sem controle',
    'risco',
    'falta de',
    'dificuldade',
    'problema',
  ]

  const sentences = textNorm
    .split(/[\n\.!\?]+/)
    .map((s) => s.trim())
    .filter(Boolean)

  const pains = sentences
    .filter((s) => painKeywords.some((k) => s.includes(k)))
    .map((s) => (s.length > 140 ? s.slice(0, 140) + '...' : s))

  return uniq(pains).slice(0, 6)
}

function extractObjectives(textNorm: string) {
  const patterns: RegExp[] = [
    /(?:quer|precisa|objetivo|busca|gostaria|pretende)\s+(?:de\s+)?([^\.\n]{10,140})/gi,
  ]

  const out: string[] = []
  for (const re of patterns) {
    const matches = textNorm.match(re)
    if (!matches) continue
    for (const m of matches) {
      const cleaned = m
        .replace(/\s+/g, ' ')
        .replace(/^(quer|precisa|objetivo|busca|gostaria|pretende)\s+/i, '')
        .trim()
      if (cleaned.length > 6) out.push(cleaned)
      if (out.length >= 6) break
    }
    if (out.length >= 6) break
  }
  return uniq(out).slice(0, 6)
}

function extractConstraints(textNorm: string) {
  const constraints: string[] = []

  if (hasAny(textNorm, ['prazo', 'urgente', 'semana', 'mes', 'data', 'cronograma'])) {
    constraints.push('Prazo mencionado (validar datas e SLA interno)')
  }

  if (hasAny(textNorm, ['orcamento', 'budget', 'custo', 'preco', 'valor'])) {
    constraints.push('Orçamento/Preço mencionado (validar faixa e modelo de contratação)')
  }

  if (hasAny(textNorm, ['lgpd', 'compliance', 'seguranca', 'auditoria', 'politica', 'governanca'])) {
    constraints.push('Requisitos de segurança/compliance mencionados (validar escopo)')
  }

  if (hasAny(textNorm, ['integracao', 'integrada', 'integrado', 'integrar', 'integra', 'api', 'erp', 'crm', 'graph', 'conector', 'totvs', 'sge'])) {
    constraints.push('Integrações citadas (mapear sistemas e campos necessários)')
  }

  return uniq(constraints)
}

function scoreMaturity(textNorm: string): Maturity {
  const lowSignals = ['nao tem', 'sem', 'manual', 'planilha', 'desorganizado', 'bagunca', 'sem padrao']
  const midSignals = ['parcial', 'em partes', 'alguns', 'iniciamos', 'implantando', 'migrando']
  const highSignals = ['governanca', 'padrao', 'processo', 'auditoria', 'politica', 'controle', 'centralizado', 'automatizado']

  const score = (hasAny(textNorm, highSignals) ? 2 : 0) + (hasAny(textNorm, midSignals) ? 1 : 0) + (hasAny(textNorm, lowSignals) ? -1 : 0)

  if (score >= 2) return 'ALTA'
  if (score == 1) return 'MEDIA'
  if (score <= 0 && hasAny(textNorm, lowSignals)) return 'BAIXA'
  return 'NAO_EVIDENCIADO'
}

function scoreComplexity(textNorm: string): Complexity {
  const high = ['integracao', 'integrada', 'integrado', 'integrar', 'integra', 'multi', 'tenant', 'sso', 'identidade', 'seguranca', 'compliance', 'erp', 'crm', 'api', 'migracao']
  const mid = ['portal', 'intranet', 'sharepoint', 'teams', 'automacao', 'workflow', 'dashboard', 'relatorio', 'relatórios']
  const low = ['treinamento', 'workshop', 'ajuste simples', 'configuracao']

  const score = (hasAny(textNorm, high) ? 2 : 0) + (hasAny(textNorm, mid) ? 1 : 0) + (hasAny(textNorm, low) ? -1 : 0)

  if (score >= 2) return 'ALTA'
  if (score == 1) return 'MEDIA'
  if (score <= 0 && hasAny(textNorm, low)) return 'BAIXA'
  return 'NAO_EVIDENCIADO'
}

function extractSignals(textNorm: string) {
  const signals: string[] = []

  if (hasAny(textNorm, ['decisor', 'diretoria', 'reitor', 'gestor', 'patrocinador'])) {
    signals.push('Há menção de decisor/sponsor (confirmar acesso e envolvimento)')
  } else {
    signals.push('Decisor não evidenciado (confirmar acesso ao decisor)')
  }

  if (hasAny(textNorm, ['prazo', 'data', 'cronograma', 'plano', 'execucao'])) {
    signals.push('Há indícios de cronograma/plano (confirmar datas e responsáveis)')
  }

  return uniq(signals)
}

export function diagnoseFromTranscript(opportunityContext: any): DiagnosisResult {
  const rawText = opportunityContext?.transcript?.text || ''
  const t = normalize(rawText)

  const pains = extractPains(t)
  const objectives = extractObjectives(t)
  const constraints = extractConstraints(t)

  const maturity = scoreMaturity(t)
  const complexity = scoreComplexity(t)

  const scenario_summary = t || 'Não evidenciado'
  const signals = extractSignals(t)

  const success_criteria: string[] = []
  if (hasAny(t, ['sucesso', 'criterio', 'aceite', 'kpi', 'meta'])) {
    success_criteria.push('Critérios de sucesso mencionados (extrair e formalizar)')
  } else {
    success_criteria.push('Critérios de sucesso não evidenciados (definir com o cliente)')
  }

  return {
    scenario_summary,
    pains: pains.length ? pains : ['não evidenciado'],
    objectives: objectives.length ? objectives : ['não evidenciado'],
    constraints: constraints.length ? constraints : ['não evidenciado'],
    maturity,
    complexity,
    signals,
    success_criteria,
  }
}
