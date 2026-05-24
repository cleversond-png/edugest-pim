/**
 * health.test.ts — Unit tests for GET /api/health
 */

import Fastify, { FastifyInstance } from 'fastify'
import { registerHealthRoute } from '../../src/routes/health'

jest.mock('../../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}))

jest.mock('../../src/services/graph', () => ({
  getGraphClient: jest.fn(),
}))

describe('Health Route — GET /api/health', () => {
  let app: FastifyInstance

  beforeEach(async () => {
    app = Fastify()
    await registerHealthRoute(app)
  })

  afterEach(async () => {
    await app.close()
  })

  test('returns 200 with ok status and services when all healthy', async () => {
    const { getGraphClient } = require('../../src/services/graph')
    getGraphClient.mockReturnValue({
      checkHealth: jest.fn().mockResolvedValue(true),
    })

    process.env.AZURE_CLIENT_ID = 'test-client-id'
    process.env.SHAREPOINT_SITE_ID = 'test-site-id'

    const response = await app.inject({
      method: 'GET',
      url: '/api/health',
    })

    expect(response.statusCode).toBe(200)
    const body = JSON.parse(response.payload)
    expect(body.status).toBe('ok')
    expect(body.version).toBe('1.0.0')
    expect(body.timestamp).toBeDefined()
    expect(body.services).toBeDefined()
  })

  test('returns services object with correct properties', async () => {
    const { getGraphClient } = require('../../src/services/graph')
    getGraphClient.mockReturnValue({
      checkHealth: jest.fn().mockResolvedValue(true),
    })

    process.env.AZURE_CLIENT_ID = 'test-client-id'
    process.env.SHAREPOINT_SITE_ID = 'test-site-id'
    process.env.DATABASE_URL = 'postgresql://test'

    const response = await app.inject({
      method: 'GET',
      url: '/api/health',
    })

    const body = JSON.parse(response.payload)
    expect(body.services.database).toBe('ok')
    expect(body.services.graph).toBe('ok')
  })

  test('returns degraded status when graph service is unreachable', async () => {
    const { getGraphClient } = require('../../src/services/graph')
    getGraphClient.mockReturnValue({
      checkHealth: jest.fn().mockResolvedValue(false),
    })

    process.env.AZURE_CLIENT_ID = 'test-client-id'
    process.env.SHAREPOINT_SITE_ID = 'test-site-id'

    const response = await app.inject({
      method: 'GET',
      url: '/api/health',
    })

    const body = JSON.parse(response.payload)
    expect(body.status).toBe('degraded')
    expect(body.services.graph).toBe('unreachable')
  })

  test('returns not_configured for graph when credentials missing', async () => {
    delete process.env.AZURE_CLIENT_ID
    delete process.env.SHAREPOINT_SITE_ID

    const response = await app.inject({
      method: 'GET',
      url: '/api/health',
    })

    const body = JSON.parse(response.payload)
    expect(body.services.graph).toBe('not_configured')
    expect(body.status).toBe('ok')
  })

  test('handles graph checkHealth exception gracefully', async () => {
    const { getGraphClient } = require('../../src/services/graph')
    getGraphClient.mockReturnValue({
      checkHealth: jest.fn().mockRejectedValue(new Error('Network error')),
    })

    process.env.AZURE_CLIENT_ID = 'test-client-id'
    process.env.SHAREPOINT_SITE_ID = 'test-site-id'

    const response = await app.inject({
      method: 'GET',
      url: '/api/health',
    })

    const body = JSON.parse(response.payload)
    expect(body.services.graph).toBe('unreachable')
    expect(body.status).toBe('degraded')
  })
})
