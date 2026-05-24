/**
 * fallback-orchestrator.ts — Orquestrador com Retry + Fallback (EduGest‑PIM)
 *
 * Objetivo
 * - Executar etapas do runtime com:
 *   1) retry com backoff (falhas transitórias)
 *   2) fallback de modelo (quando aplicável)
 *   3) reexecução seletiva por etapa quando guardrails falharem
 *   4) suporte a PARTIAL_SUCCESS (persistir o que deu certo)
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
  retrievalContext?: any
  diagnosis?: any
  matching?: any
  presales?: any
  sales?: any
  marketing?: any
  exports?: any
  docs?: any
  telemetry?: { modelRouting: any; tokenUsage: any }
  allowedProducts?: { ids?: string[]; slugs?: string[] }
}

export type RuntimeConfig = {
  maxRetries: number
  baseBackoffMs: number
  timeoutMs: number
  modelAliases: Partial<Record<StepName, string>>
  fallbackModelAliases?: Partial<Record<StepName, string>>
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

function decideRecoveryPlan(issues: GuardrailIssue[]): StepName[] {
  const c = collectIssuesByCode(issues)

  if (c.any('SCHEMA_INVALID')) {
    return ['ERPSankhyaMapperAgent', 'PartnerCenterMapperAgent', 'MarketingDeckAgent']
  }

  if (c.any('UNKNOWN_PRODUCT')) {
    return ['MatchingAgent']
  }

  if (c.any('MISSING_DEPENDENCY')) {
    return ['MatchingAgent']
  }

  if (c.any('DECK_INVALID', 'DECK_SLIDE_COUNT', 'DECK_MISSING_KEY_SLIDES')) {
    return ['MarketingDeckAgent']
  }

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

  async run(initialCtx: StepContext): Promise<OrchestratorResult> {
    const results: StepResult[] = []

    const pre = guardrailsPre(initialCtx.opportunityContext, this.guardrailOpts)
    if (!pre.ok) {
      return {
        status: 'FAILED',
        steps: results,
        issues: pre.issues,
      }
    }

    const ctx = { ...initialCtx } as StepContext

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
      if (!this.steps[step]) {
        results.push({ step, status: 'SKIPPED', attempts: 0, durationMs: 0 })
        continue
      }

      const r = await this.executeStepWithRetryAndFallback(step, ctx)
      results.push(r)

      if (r.status === 'FAILED') {
        if (['ContextAssembly', 'DiagnosisAgent', 'MatchingAgent'].includes(step)) {
          return { status: 'FAILED', steps: results }
        }
      } else {
        this.applyStepOutputToContext(step, r.output, ctx)
      }
    }

    const solutionPack = this.buildSolutionPack(ctx)

    const post = guardrailsPost(solutionPack, {
      ...this.guardrailOpts,
      allowedProducts: ctx.allowedProducts ?? this.guardrailOpts.allowedProducts,
    })

    if (!post.ok && this.config.enablePostGuardrailRecovery) {
      const plan = decideRecoveryPlan(post.issues)
      if (plan.length) {
        for (const step of plan) {
          if (!this.steps[step]) continue
          const rr = await this.executeStepWithRetryAndFallback(step, ctx, true)
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

      return {
        status: 'PARTIAL_SUCCESS',
        steps: results,
        solutionPack,
        issues: post.issues,
      }
    }

    return {
      status: post.ok ? 'SUCCESS' : 'PARTIAL_SUCCESS',
      steps: results,
      solutionPack,
      issues: post.ok ? undefined : post.issues,
    }
  }

  private async executeStepWithRetryAndFallback(step: StepName, ctx: StepContext, forceFallback = false): Promise<StepResult> {
    const fn = this.steps[step]!
    const primaryAlias = this.config.modelAliases[step]
    const fallbackAlias = this.config.fallbackModelAliases?.[step]

    const start = nowMs()
    let attempts = 0

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
        // continue
      }
    }

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
