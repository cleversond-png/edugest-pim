/**
 * orchestrator.ts — Wrapper around FallbackOrchestrator for API
 */

import {
  FallbackOrchestrator,
  stepRegistry,
  guardrailsPre,
  guardrailsPost,
  OrchestratorResult,
  StepContext,
} from '@edugest-pim/core'
import { logger } from '../utils/logger'

const STEP_TIMEOUT_MS = 90_000
const GLOBAL_TIMEOUT_MS = 120_000

export async function executeOrchestrator(opportunityContext: any, timeout = GLOBAL_TIMEOUT_MS): Promise<OrchestratorResult> {
  const orchestrator = new FallbackOrchestrator(
    {
      maxRetries: 2,
      baseBackoffMs: 500,
      timeoutMs: STEP_TIMEOUT_MS,
      modelAliases: {
        DiagnosisAgent: 'FAST_TEXT',
        MatchingAgent: 'REASONING',
        SolutionArchitectAgent: 'REASONING',
        SalesNarrativeAgent: 'WRITER',
        MarketingDeckAgent: 'WRITER',
        ERPSankhyaMapperAgent: 'JSON_STRICT',
        PartnerCenterMapperAgent: 'JSON_STRICT',
      },
      fallbackModelAliases: {
        MarketingDeckAgent: 'WRITER',
        ERPSankhyaMapperAgent: 'JSON_STRICT',
        PartnerCenterMapperAgent: 'JSON_STRICT',
        MatchingAgent: 'REASONING',
      },
      enablePostGuardrailRecovery: true,
    },
    stepRegistry,
    {
      bannedTerms: [],
      allowedProducts: undefined,
      maxRecommendedProducts: 5,
      enforceDependencies: true,
      requireTelemetry: false,
    }
  )

  const ctx: StepContext = {
    opportunityContext,
    allowedProducts: undefined,
  }

  let result: OrchestratorResult

  try {
    result = await Promise.race([
      orchestrator.run(ctx),
      new Promise<OrchestratorResult>((_, reject) =>
        setTimeout(() => reject(new Error('Global pipeline timeout')), timeout)
      ),
    ])
  } catch (err: any) {
    logger.error({ error: err.message }, 'Orchestrator failed')
    return {
      status: 'FAILED',
      steps: [],
      issues: [
        {
          code: 'ORCHESTRATOR_ERROR',
          severity: 'ERROR',
          message: err.message || 'Unknown orchestrator error',
        },
      ],
    }
  }

  // Log detailed step execution for debugging
  logger.debug(
    {
      status: result.status,
      steps: result.steps.map(s => ({
        step: s.step,
        status: s.status,
        attempts: s.attempts,
        durationMs: s.durationMs,
        error: s.error,
      })),
      issues: result.issues,
    },
    'Orchestrator execution complete'
  )

  return result
}
