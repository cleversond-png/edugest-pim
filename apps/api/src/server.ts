/**
 * server.ts — Fastify bootstrap + route registration
 */

import 'dotenv/config'
import Fastify from 'fastify'
import { logger } from './utils/logger'
import { authMiddleware } from './middleware/auth'
import { errorHandler } from './middleware/errorHandler'
import { registerHealthRoute } from './routes/health'
import { registerAnalyzeRoute } from './routes/analyze'
import { registerPublishRoute } from './routes/publish'
import { initializeGraphClient } from './services/graph'

const PORT = parseInt(process.env.PORT || '3000', 10)
const HOST = process.env.HOST || '0.0.0.0'

async function main() {
  const app = Fastify({
    logger: false,
  })

  // Initialize Graph client if credentials available (optional — for future SharePoint integration)
  const hasGraphCreds = process.env.AZURE_TENANT_ID && process.env.AZURE_CLIENT_ID &&
    (process.env.AZURE_CLIENT_SECRET || (process.env.GRAPH_USERNAME && process.env.GRAPH_PASSWORD))
  const hasSharePointConfig = process.env.SHAREPOINT_SITE_ID && process.env.SHAREPOINT_DRIVE_ID

  if (hasGraphCreds && hasSharePointConfig) {
    try {
      await initializeGraphClient({
        tenantId: process.env.AZURE_TENANT_ID!,
        clientId: process.env.AZURE_CLIENT_ID!,
        clientSecret: process.env.AZURE_CLIENT_SECRET,
        username: process.env.GRAPH_USERNAME,
        password: process.env.GRAPH_PASSWORD,
        siteId: process.env.SHAREPOINT_SITE_ID!,
        driveId: process.env.SHAREPOINT_DRIVE_ID!,
      })
      logger.info('Microsoft Graph client initialized')
    } catch (err: any) {
      logger.warn({ error: err.message }, 'Graph client initialization failed')
    }
  }

  app.setErrorHandler(errorHandler)

  app.register(async (fastify) => {
    fastify.addHook('onRequest', authMiddleware)

    await registerHealthRoute(fastify)
    await registerAnalyzeRoute(fastify)
    await registerPublishRoute(fastify)

    fastify.get('/api/status', async () => ({
      message: 'API is ready',
    }))
  })

  try {
    await app.listen({ port: PORT, host: HOST })
    logger.info(`✅ Server running at http://${HOST}:${PORT}`)
  } catch (err) {
    logger.error(err, 'Failed to start server')
    process.exit(1)
  }
}

main()
