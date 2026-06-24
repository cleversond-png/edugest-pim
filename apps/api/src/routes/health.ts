/**
 * health.ts — GET /api/health
 */

import { FastifyInstance } from 'fastify'
import { logger } from '../utils/logger'

export type HealthResponse = {
  status: 'ok' | 'degraded' | 'down'
  version: string
  timestamp: string
  services: {
    database?: 'ok' | 'unreachable'
    storage?: 'ok' | 'unreachable' | 'not_configured'
  }
}

export async function registerHealthRoute(app: FastifyInstance) {
  app.get<{ Reply: HealthResponse }>('/api/health', async (req, rep) => {
    const services: HealthResponse['services'] = {}

    // Database check
    services.database = process.env.DATABASE_URL ? 'ok' : 'unreachable'

    // Storage (Azure Blob) check
    if (!process.env.AZURE_STORAGE_CONNECTION_STRING) {
      services.storage = 'not_configured'
    } else {
      try {
        const { checkBlobHealth } = await import('../services/blobStorage')
        services.storage = (await checkBlobHealth()) ? 'ok' : 'unreachable'
      } catch (err: any) {
        services.storage = 'unreachable'
      }
    }

    const hasError = Object.values(services).includes('unreachable')
    const status = hasError ? 'degraded' : 'ok'

    const response: HealthResponse = {
      status,
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      services,
    }

    return response
  })

  logger.info('Health route registered')
}
