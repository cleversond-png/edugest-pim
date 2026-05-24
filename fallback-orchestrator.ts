/**
 * fallback-orchestrator.ts — Orquestrador com Retry + Fallback (EduGest‑PIM)
 *
 * Objetivo
 * - Executar etapas do runtime com:
 *   1) retry com backoff (falhas transitórias)
 *   2) fallback de modelo (quando aplicável)
 *   3) reexecução seletiva por etapa quando guardrails falharem
 *   4) suporte a PARTIAL_SUCCESS (persistir o que deu certo)
 *
 * Este design segue o padrão de "timeout+retry" e "fallback handler" documentado em testes internos com LangTrace:
 * - tentativa do modelo principal duas vezes, depois fallback
 * - e cenários de falha do principal e do fallback
 * 
 * Referência: <File>Big Brain e FIEP - SuperLiga AI - Desenvolvimento e Customizações v2.docx</File> e correlatos. citeturn21search265turn21search266turn21search268
 */

import { guardrailsPre, guardrailsPost, formatGuardrailIssues, GuardrailsOptions, GuardrailIssue } from './guardrails'

// ─────────────────────────────────────────────────────────────
// Tipos
// ─────────────────────────────────────────────────────────────

export type StepName =
  | 'ValidateInput'
  | 'ContextAssembly'
  | 'DiagnosisAgent'
  | 'MatchingAgent'
  | 'SolutionArchitectAgent'
  | 'SalesNarrativeAgent'
  | 'MarketingDeckAgent'
  | 'ERPSankhyaMapperAgent'
  | 'PartnerCenterMapperAgent'
  | 'DocsPublisherAgent'
  | 'PersistSolutionPack'

export type StepStatus = 'SUCCESS' | 'FAILED' | 'SKIPPED' | 'FALLBACK_SUCCESS' | 'PARTIAL'

export type StepResult<T = any> = {
  step: StepName
  status: StepStatus
  attempts: number
  usedModelAlias?: string
  durationMs: number
  error?: { message: string; code?: string }
  output?: T
}

export type OrchestratorResult = {
  status: 'SUCCESS' | 'PARTIAL_SUCCESS' | 'FAILED'
  steps: StepResult[]
  solutionPack?: any
  issues?: GuardrailIssue[]
}

export type StepContext = {
  opportunityContext: any
  // objetos compartilhados
  retrievalContext?: any
  diagnosis?: any
  matching?: any
  presales?: any
  sales?: any
  marketing?: any
  exports?: any
  docs?: any
  telemetry?: { modelRouting: any; tokenUsage: any }
  // catálogo permitido
  allowedProducts?: { ids?: string[]; slugs?: string[] }
}

export type RuntimeConfig = {
  maxRetries: number
  baseBackoffMs: number
  timeoutMs: number
  // mapeia etapa -> alias de modelo (principal)
  modelAliases: Partial<Record<StepName, string>>
  // mapeia etapa -> alias fallback (opcional)
  fallbackModelAliases?: Partial<Record<StepName, string>>
  // se true, aplica guardrails pós pipeline e reexecuta etapas quando possível
  enablePostGuardrailRecovery: boolean
}

export type StepFn<TOut = any> = (ctx: StepContext, modelAlias?: string) => Promise<TOut>

export type StepRegistry = Partial<Record<StepName, StepFn>>

// ─────────────────────────────────────────────────────────────
// Utilitários
// ─────────────────────────────────────────────────────────────

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

function isTransientError(err: any): boolean {
  const msg = String(err?.message || err || '')
  // Heurística simples para falhas transitórias
  return /timeout|timed out|rate limit|429|temporar|econnreset|fetch failed|overloaded/i.test(msg)
}

function nowMs() {
  return Date.now()
}

function collectIssuesByCode(issues: GuardrailIssue[]) {
  const set = new Set(issues.map((i) => i.code))
  return {
    has: (code: string) => set.has(code),
    any: (...codes: string[]) => codes.some((c) => set.has(c)),
  }
}

// Decide quais etapas tentar reexecutar baseado nos guardrails
function decideRecoveryPlan(issues: GuardrailIssue[]): StepName[] {
  const c = collectIssuesByCode(issues)

  // Ordem importa: reexecutar o mínimo necessário
  // 1) JSON/schema/estrutura: refazer mapeadores (ERP/Partner) ou deck
  if (c.any('SCHEMA_INVALID')) {
    // Geralmente o schema inválido vem de agentes que deveriam gerar JSON estrito
    return ['ERPSankhyaMapperAgent', 'PartnerCenterMapperAgent', 'MarketingDeckAgent']
  }

  // 2) Produto fora do catálogo: refazer matching
  if (c.any('UNKNOWN_PRODUCT')) {
    return ['MatchingAgent']
  }

  // 3) Dependência faltando: refazer matching com enforcement
  if (c.any('MISSING_DEPENDENCY')) {
    return ['MatchingAgent']
  }

  // 4) Deck fraco (avisos): refazer deck
  if (c.any('DECK_INVALID', 'DECK_SLIDE_COUNT', 'DECK_MISSING_KEY_SLIDES')) {
    return ['MarketingDeckAgent']
  }

  // 5) Telemetria faltando (warn) não precisa reexecutar LLM
  return []
}

// ─────────────────────────────────────────────────────────────
// Classe principal
// ─────────────────────────────────────────────────────────────

export class FallbackOrchestrator {
  constructor(
    private readonly config: RuntimeConfig,
    private readonly steps: StepRegistry,
    private readonly guardrailOpts: GuardrailsOptions,
  ) {}

  /**
   * Executa o pipeline completo com guardrails + recovery.
   */
  async run(initialCtx: StepContext): Promise<OrchestratorResult> {
    const results: StepResult[] = []

    // 0) Guardrails PRE (entrada)
    const pre = guardrailsPre(initialCtx.opportunityContext, this.guardrailOpts)
    if (!pre.ok) {
      return {
        status: 'FAILED',
        steps: results,
        issues: pre.issues,
      }
    }

    // 1) Pipeline base
    const ctx = { ...initialCtx } as StepContext

    // Ordem base (MVP)
    const baseOrder: StepName[] = [
      'ValidateInput',
      'ContextAssembly',
      'DiagnosisAgent',
      'MatchingAgent',
      'SolutionArchitectAgent',
      'SalesNarrativeAgent',
      'MarketingDeckAgent',
      'ERPSankhyaMapperAgent',
      'PartnerCenterMapperAgent',
      'DocsPublisherAgent',
      'PersistSolutionPack',
    ]

    for (const step of baseOrder) {
      // Algumas etapas podem ser não implementadas no MVP (ex.: PersistSolutionPack)
      if (!this.steps[step]) {
        results.push({ step, status: 'SKIPPED', attempts: 0, durationMs: 0 })
        continue
      }

      // Execução com retry + fallback
      const r = await this.executeStepWithRetryAndFallback(step, ctx)
      results.push(r)

      if (r.status === 'FAILED') {
        // Falha dura: decide se seguimos (PARTIAL) ou paramos.
        // Regra simples: se falhar numa etapa essencial antes do Matching, aborta.
        if (['ContextAssembly', 'DiagnosisAgent', 'MatchingAgent'].includes(step)) {
          return { status: 'FAILED', steps: results }
        }
        // Depois disso, permitimos PARTIAL
      } else {
        // Propagar outputs para o ctx
        this.applyStepOutputToContext(step, r.output, ctx)
      }
    }

    // 2) Monta solutionPack consolidado
    const solutionPack = this.buildSolutionPack(ctx)

    // 3) Guardrails POST
    const post = guardrailsPost(solutionPack, {
      ...this.guardrailOpts,
      allowedProducts: ctx.allowedProducts ?? this.guardrailOpts.allowedProducts,
    })

    if (!post.ok && this.config.enablePostGuardrailRecovery) {
      // 4) Recovery seletivo
      const plan = decideRecoveryPlan(post.issues)
      if (plan.length) {
        for (const step of plan) {
          if (!this.steps[step]) continue
          const rr = await this.executeStepWithRetryAndFallback(step, ctx, /*forceFallback*/ true)
          results.push(rr)
          if (rr.status !== 'FAILED') {
            this.applyStepOutputToContext(step, rr.output, ctx)
          }
        }

        const recoveredPack = this.buildSolutionPack(ctx)
        const post2 = guardrailsPost(recoveredPack, {
          ...this.guardrailOpts,
          allowedProducts: ctx.allowedProducts ?? this.guardrailOpts.allowedProducts,
        })

        return {
          status: post2.ok ? 'SUCCESS' : 'PARTIAL_SUCCESS',
          steps: results,
          solutionPack: recoveredPack,
          issues: post2.ok ? undefined : post2.issues,
        }
      }

      // Sem plano de recovery → retorna parcial com issues
      return {
        status: 'PARTIAL_SUCCESS',
        steps: results,
        solutionPack,
        issues: post.issues,
      }
    }

    // 5) Resultado final
    return {
      status: post.ok ? 'SUCCESS' : 'PARTIAL_SUCCESS',
      steps: results,
      solutionPack,
      issues: post.ok ? undefined : post.issues,
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Execução de etapa com retry/fallback
  // ─────────────────────────────────────────────────────────────

  private async executeStepWithRetryAndFallback(step: StepName, ctx: StepContext, forceFallback = false): Promise<StepResult> {
    const fn = this.steps[step]!
    const primaryAlias = this.config.modelAliases[step]
    const fallbackAlias = this.config.fallbackModelAliases?.[step]

    const start = nowMs()
    let attempts = 0

    // 1) Se forceFallback e existe fallbackAlias, tenta direto no fallback
    if (forceFallback && fallbackAlias) {
      attempts++
      try {
        const out = await this.runWithTimeout(fn, ctx, fallbackAlias)
        return {
          step,
          status: 'FALLBACK_SUCCESS',
          attempts,
          usedModelAlias: fallbackAlias,
          durationMs: nowMs() - start,
          output: out,
        }
      } catch (err: any) {
        // Cai para execução normal abaixo
      }
    }

    // 2) Tenta modelo primário com retry (maxRetries)
    const maxRetries = Math.max(0, this.config.maxRetries)
    let lastErr: any = null

    for (let i = 0; i <= maxRetries; i++) {
      attempts++
      try {
        const out = await this.runWithTimeout(fn, ctx, primaryAlias)
        return {
          step,
          status: 'SUCCESS',
          attempts,
          usedModelAlias: primaryAlias,
          durationMs: nowMs() - start,
          output: out,
        }
      } catch (err: any) {
        lastErr = err
        if (!isTransientError(err) || i === maxRetries) break
        const backoff = this.config.baseBackoffMs * Math.pow(2, i)
        await sleep(backoff)
      }
    }

    // 3) Fallback (se existir)
    if (fallbackAlias) {
      try {
        attempts++
        const out = await this.runWithTimeout(fn, ctx, fallbackAlias)
        return {
          step,
          status: 'FALLBACK_SUCCESS',
          attempts,
          usedModelAlias: fallbackAlias,
          durationMs: nowMs() - start,
          output: out,
        }
      } catch (err: any) {
        lastErr = err
      }
    }

    // 4) Falha
    return {
      step,
      status: 'FAILED',
      attempts,
      usedModelAlias: fallbackAlias ? `${primaryAlias}→${fallbackAlias}` : primaryAlias,
      durationMs: nowMs() - start,
      error: { message: String(lastErr?.message || lastErr || 'Erro desconhecido') },
    }
  }

  private async runWithTimeout(fn: StepFn, ctx: StepContext, modelAlias?: string) {
    const timeoutMs = this.config.timeoutMs
    if (!timeoutMs || timeoutMs <= 0) return fn(ctx, modelAlias)

    return await Promise.race([
      fn(ctx, modelAlias),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), timeoutMs)),
    ])
  }

  private applyStepOutputToContext(step: StepName, output: any, ctx: StepContext) {
    switch (step) {
      case 'ContextAssembly':
        ctx.retrievalContext = output
        break
      case 'DiagnosisAgent':
        ctx.diagnosis = output
        break
      case 'MatchingAgent':
        ctx.matching = output
        break
      case 'SolutionArchitectAgent':
        ctx.presales = output
        break
      case 'SalesNarrativeAgent':
        ctx.sales = output
        break
      case 'MarketingDeckAgent':
        ctx.marketing = output
        break
      case 'ERPSankhyaMapperAgent':
      case 'PartnerCenterMapperAgent':
        ctx.exports = { ...(ctx.exports || {}), [step]: output }
        break
      case 'DocsPublisherAgent':
        ctx.docs = output
        break
      default:
        break
    }
  }

  private buildSolutionPack(ctx: StepContext) {
    // Normaliza exports
    const erp = ctx.exports?.ERPSankhyaMapperAgent ?? ctx.exports?.erp
    const partner = ctx.exports?.PartnerCenterMapperAgent ?? ctx.exports?.partner

    return {
      diagnosis: ctx.diagnosis ?? {},
      recommendation: ctx.matching ?? {},
      presales: ctx.presales ?? null,
      sales: ctx.sales ?? null,
      marketing: ctx.marketing ?? null,
      exports: {
        erp: erp ?? { blocked: false, payload: {} },
        partner: partner ?? { payload: {} },
      },
      docs: ctx.docs ?? null,
      telemetry: ctx.telemetry ?? { modelRouting: {}, tokenUsage: {} },
    }
  }
}

// ─────────────────────────────────────────────────────────────
// Exemplo de uso (referência)
// ─────────────────────────────────────────────────────────────

/**
 * Exemplo (pseudo):
 *
 * const orchestrator = new FallbackOrchestrator(
 *   {
 *     maxRetries: 2,
 *     baseBackoffMs: 500,
 *     timeoutMs: 90_000,
 *     modelAliases: {
 *       DiagnosisAgent: 'FAST_TEXT',
 *       MatchingAgent: 'REASONING',
 *       SolutionArchitectAgent: 'REASONING',
 *       SalesNarrativeAgent: 'WRITER',
 *       MarketingDeckAgent: 'WRITER',
 *       ERPSankhyaMapperAgent: 'JSON_STRICT',
 *       PartnerCenterMapperAgent: 'JSON_STRICT',
 *     },
 *     fallbackModelAliases: {
 *       MarketingDeckAgent: 'WRITER',
 *       ERPSankhyaMapperAgent: 'JSON_STRICT',
 *       PartnerCenterMapperAgent: 'JSON_STRICT',
 *       MatchingAgent: 'REASONING',
 *     },
 *     enablePostGuardrailRecovery: true,
 *   },
 *   stepRegistry,
 *   { bannedTerms: ['bigbrain', 'big brain'], enforceDependencies: true, requireTelemetry: true }
 * )
 *
 * const res = await orchestrator.run({ opportunityContext, allowedProducts })
 */
