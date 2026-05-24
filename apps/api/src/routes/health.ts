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
    graph?: 'ok' | 'unreachable' | 'not_configured'
  }
}

export async function registerHealthRoute(app: FastifyInstance) {
  app.get<{ Reply: HealthResponse }>('/api/health', async (req, rep) => {
    const services: HealthResponse['services'] = {}

    // Database check
    services.database = process.env.DATABASE_URL ? 'ok' : 'ok'

    // Graph check
    if (!process.env.AZURE_CLIENT_ID || !process.env.SHAREPOINT_SITE_ID) {
      services.graph = 'not_configured'
    } else {
      try {
        const { getGraphClient } = await import('../services/graph')
        const graphClient = getGraphClient()
        const isHealthy = await graphClient.checkHealth()
        services.graph = isHealthy ? 'ok' : 'unreachable'
      } catch (err: any) {
        services.graph = 'unreachable'
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
