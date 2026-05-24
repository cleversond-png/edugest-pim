/**
 * publish.ts — POST /api/publish
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { createPublisher } from '../services/publisherFactory'
import { logger } from '../utils/logger'
import { startTimer } from '../utils/timer'

type PublishRequest = {
  executionId: string
  opportunityId: string
  solutionPack: any
}

type PublishResponse = {
  status: 'SUCCESS' | 'FAILED'
  publishedAt?: string
  files?: Array<{ name: string; webUrl: string }>
  message?: string
  error?: string
}

export async function registerPublishRoute(app: FastifyInstance) {
  app.post<{ Body: PublishRequest; Reply: PublishResponse }>(
    '/api/publish',
    async (req: FastifyRequest<{ Body: PublishRequest }>, rep: FastifyReply) => {
      const timer = startTimer()
      const body = req.body

      if (!body.executionId || !body.opportunityId || !body.solutionPack) {
        logger.warn({ opportunityId: body.opportunityId }, 'Missing required fields in publish request')
        return rep.code(400).send({
          status: 'FAILED',
          error: 'executionId, opportunityId, and solutionPack are required',
        })
      }

      try {
        const publisher = createPublisher()
        const folderPath = `Opportunity_${body.opportunityId}`

        // Save solutionPack.json
        const packResult = await publisher.saveFile(
          folderPath,
          'solutionPack.json',
          JSON.stringify(body.solutionPack, null, 2)
        )
        const files: Array<{ name: string; webUrl: string }> = [
          { name: packResult.name, webUrl: packResult.path }
        ]

        // Save erp_payload.json
        const erpPayload = body.solutionPack.exports?.erp?.payload ?? null
        const erpResult = await publisher.saveFile(
          folderPath,
          'erp_payload.json',
          JSON.stringify(erpPayload, null, 2)
        )
        files.push({ name: erpResult.name, webUrl: erpResult.path })

        // Save summary.md
        const summary = buildSummary(body.solutionPack, body.opportunityId)
        const summaryResult = await publisher.saveFile(folderPath, 'summary.md', summary)
        files.push({ name: summaryResult.name, webUrl: summaryResult.path })

        // Save recommendation.md
        const recommendation = buildRecommendation(body.solutionPack)
        const recResult = await publisher.saveFile(folderPath, 'recommendation.md', recommendation)
        files.push({ name: recResult.name, webUrl: recResult.path })

        logger.info(
          { opportunityId: body.opportunityId, executionId: body.executionId, fileCount: files.length, durationMs: timer() },
          'Solution pack published locally'
        )

        return rep.code(200).send({
          status: 'SUCCESS',
          publishedAt: new Date().toISOString(),
          files,
        })
      } catch (err: any) {
        logger.error(
          { opportunityId: body.opportunityId, error: err.message, durationMs: timer() },
          'Failed to publish solution pack'
        )

        return rep.code(500).send({
          status: 'FAILED',
          error: err.message || 'Failed to publish solution pack',
        })
      }
    }
  )

  logger.info('Publish route registered')
}

function buildSummary(solutionPack: any, opportunityId: string): string {
  const diagnosis = solutionPack.diagnosis || {}
  const recommendation = solutionPack.recommendation || {}

  return `# EduGest-PIM — Summary

**Opportunity ID:** ${opportunityId}

## Diagnosis

### Objectives
${(diagnosis.objectives || []).map((o: string) => `- ${o}`).join('\n') || '- Not evidenced'}

### Constraints
${(diagnosis.constraints || []).map((c: string) => `- ${c}`).join('\n') || '- None identified'}

### Complexity
${diagnosis.complexity || 'Not Evidenced'}

## Recommendation

### Products
${
  (recommendation.business?.products || [])
    .map((p: any) => `- **${p.name}** (${p.erp_code}): ${p.contract_model}`)
    .join('\n') || '- No products recommended'
}

### Confidence
${Math.round((recommendation.intelligence?.score || 0) * 100)}%

---

Generated: ${new Date().toISOString()}
`
}

function buildRecommendation(solutionPack: any): string {
  const recommendation = solutionPack.recommendation || {}
  const business = recommendation.business || {}
  const strategy = recommendation.strategy || {}

  return `# Recommendation

## Executive Summary
${strategy.summary || 'Solution analysis in progress'}

## Products Recommended

${
  (business.products || [])
    .map(
      (p: any) => `
### ${p.name}
- **Code:** ${p.erp_code}
- **Type:** ${p.pm_type}
- **Contract:** ${p.contract_model}
- **Billing:** ${p.billing_model}
- **Notes:** ${p.notes || 'N/A'}
`
    )
    .join('\n') || 'No products in scope'
}

## Dependencies
${(business.required_dependencies || []).map((d: string) => `- ${d}`).join('\n') || 'None'}

## Justification
${strategy.justification || 'Analysis pending'}

---

Generated: ${new Date().toISOString()}
`
}
