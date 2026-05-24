/**
 * solutionPackV4.ts — Transformation from OrchestratorResult to SolutionPackV4
 */

import { v4 as uuidv4 } from 'uuid'
import { OrchestratorResult, StepResult } from '@edugest-pim/core'
import { SolutionPackV4, MatchingV3Result } from '@edugest-pim/core'

export function transformToV4(
  result: OrchestratorResult,
  opportunityId: string,
  timerFn: () => number
): SolutionPackV4 {
  const executionId = uuidv4()
  const durationMs = timerFn()

  const diagnosisStep = result.steps.find((s) => s.step === 'DiagnosisAgent')
  const matchingStep = result.steps.find((s) => s.step === 'MatchingAgent')
  const erpStep = result.steps.find((s) => s.step === 'ERPSankhyaMapperAgent')
  const presalesStep = result.steps.find((s) => s.step === 'SolutionArchitectAgent')
  const salesStep = result.steps.find((s) => s.step === 'SalesNarrativeAgent')
  const marketingStep = result.steps.find((s) => s.step === 'MarketingDeckAgent')

  const errors = result.steps
    .filter((s: any) => s.status === 'FAILED')
    .map((s: any) => ({
      step: s.step,
      code: s.error?.code || 'UNKNOWN',
      message: s.error?.message || 'Unknown error',
      attempts: s.attempts,
    }))

  return {
    executionId,
    opportunityId,
    status: result.status as any,
    durationMs,
    createdAt: new Date().toISOString(),

    diagnosis: buildDiagnosis(diagnosisStep?.output),
    recommendation: buildRecommendation(matchingStep?.output),

    presales: presalesStep?.output ?? null,
    sales: salesStep?.output ?? null,
    marketing: marketingStep?.output ?? null,

    exports: buildExports(erpStep?.output, matchingStep?.output),

    telemetry: buildTelemetry(result.steps),

    errors: errors.length > 0 ? errors : undefined,
  }
}

function buildDiagnosis(output: any) {
  return {
    pains: output?.pains ?? [],
    objectives: output?.objectives ?? [],
    constraints: output?.constraints ?? [],
    maturity: output?.maturity ?? 'NAO_EVIDENCIADO',
    complexity: output?.complexity ?? 'NAO_EVIDENCIADO',
    context: output?.scenario_summary || output?.context || '',
    notEvidenced: output?.notEvidenced ?? [],
  }
}

function buildRecommendation(output: any) {
  const matchingResult = output as MatchingV3Result | undefined

  return {
    intelligence: {
      score: matchingResult?.confidence ?? 0,
      candidates: matchingResult?.candidates ?? [],
    },
    business: {
      products: matchingResult?.products ?? [],
      required_dependencies: matchingResult?.required_dependencies ?? [],
    },
    strategy: {
      summary: matchingResult?.justification?.slice(0, 300) ?? '',
      justification: matchingResult?.justification ?? '',
    },
  }
}

function buildExports(erpOutput: any, matchingOutput: any) {
  const blocked = erpOutput?.blocked ?? false
  const blockedReasons = erpOutput?.blockedReasons ?? []

  return {
    erp: {
      blocked,
      blockedReasons,
      payload: blocked ? null : (erpOutput?.payload ?? null),
    },
    partner: {
      payload: buildPartnerPayload(matchingOutput),
    },
  }
}

function buildPartnerPayload(matchingOutput: any) {
  const products = (matchingOutput?.products || []).map((p: any) => ({
    product_id: p.product_id,
    offerType: 'Solution',
    title: p.name || p.product_id,
    shortDescription: p.notes || `${p.name || p.product_id} offering`,
    solutionAreas: ['ModernWork'],
    markets: ['en-US'],
    languages: ['en-US'],
    keywords: [p.group_name || 'product'].filter(Boolean),
  }))

  return {
    items: products,
    generatedAt: new Date().toISOString(),
  }
}

function buildTelemetry(steps: StepResult[]) {
  const modelRouting: Record<string, string> = {}
  const tokenUsage: Record<string, any> = { total: { input: 0, output: 0 } }

  for (const step of steps) {
    if ((step as any).usedModelAlias) {
      modelRouting[(step as any).step] = (step as any).usedModelAlias
    }
  }

  return { modelRouting, tokenUsage } as any
}
