/**
 * analyze.ts — POST /api/analyze
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { validateOpportunityContext, validateSolutionPack, formatValidationErrors } from '../schemas/validators'
import { executeOrchestrator } from '../services/orchestrator'
import { transformToV4 } from '../services/solutionPackV4'
import { logger } from '../utils/logger'
import { startTimer } from '../utils/timer'

type AnalyzeRequest = {
  opportunityId: string
  transcript: {
    text: string
    language?: string
    source?: string
  }
  crmPayload?: any
  constraints?: any
  clientBranding?: any
}

type AnalyzeResponse = {
  status: 'SUCCESS' | 'PARTIAL_SUCCESS' | 'FAILED'
  executionId?: string
  opportunityId?: string
  durationMs?: number
  solutionPack?: any
  steps?: any[]
  errors?: any[]
  errorCode?: string
  message?: string
  details?: any[]
}

export async function registerAnalyzeRoute(app: FastifyInstance) {
  app.post<{ Body: AnalyzeRequest; Reply: AnalyzeResponse }>(
    '/api/analyze',
    async (req: FastifyRequest<{ Body: AnalyzeRequest }>, rep: FastifyReply) => {
      const timer = startTimer()
      const body = req.body

      // Validate input schema
      const isValid = validateOpportunityContext(body)
      if (!isValid) {
        const errors = formatValidationErrors(validateOpportunityContext.errors || [])
        logger.warn({ opportunityId: (body as any)?.opportunityId, errors }, 'Invalid input schema')
        return rep.code(400).send({
          status: 'FAILED',
          errorCode: 'INVALID_INPUT',
          message: 'Request body validation failed',
          details: errors,
        })
      }

      // Check required fields
      if (!body.opportunityId || body.opportunityId.length < 5) {
        logger.warn({ opportunityId: body.opportunityId }, 'Missing or invalid opportunityId')
        return rep.code(400).send({
          status: 'FAILED',
          errorCode: 'MISSING_OPPORTUNITY_ID',
          message: 'opportunityId is required and must be at least 5 characters',
        })
      }

      if (!body.transcript?.text || body.transcript.text.trim().length === 0) {
        logger.warn({ opportunityId: body.opportunityId }, 'Empty transcript')
        return rep.code(422).send({
          status: 'FAILED',
          errorCode: 'EMPTY_TRANSCRIPT',
          message: 'transcript.text is required and cannot be empty',
        })
      }

      // Execute orchestrator
      const orcResult = await executeOrchestrator(body)

      // Transform to V4
      const solutionPackV4 = transformToV4(orcResult, body.opportunityId, timer)

      // Validate output
      const v4Valid = validateSolutionPack(solutionPackV4)
      if (!v4Valid) {
        const validationErrors = validateSolutionPack.errors || []
        logger.error({
          opportunityId: body.opportunityId,
          errors: validationErrors,
          solutionPack: JSON.stringify(solutionPackV4, null, 2)
        }, 'V4 schema validation failed')
        return rep.code(500).send({
          status: 'FAILED',
          errorCode: 'INTERNAL_ERROR',
          message: 'Generated SolutionPack failed schema validation',
          details: validationErrors
        })
      }

      // Success response
      const response: AnalyzeResponse = {
        status: solutionPackV4.status as any,
        executionId: solutionPackV4.executionId,
        opportunityId: solutionPackV4.opportunityId,
        durationMs: solutionPackV4.durationMs,
        solutionPack: solutionPackV4,
        steps: orcResult.steps.map((s: any) => ({
          step: s.step,
          status: s.status,
          durationMs: s.durationMs,
          attempts: s.attempts,
          ...(s.error && { error: s.error }),
        })),
        ...(solutionPackV4.errors && { errors: solutionPackV4.errors }),
      }

      logger.info(
        {
          opportunityId: body.opportunityId,
          executionId: solutionPackV4.executionId,
          status: solutionPackV4.status,
          durationMs: solutionPackV4.durationMs,
        },
        'Analysis completed'
      )

      return response
    }
  )

  logger.info('Analyze route registered')
}
