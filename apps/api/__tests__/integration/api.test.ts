/**
 * api.test.ts — End-to-End integration tests for full API pipeline
 */

import Fastify, { FastifyInstance } from 'fastify'
import { registerHealthRoute } from '../../src/routes/health'
import { registerAnalyzeRoute } from '../../src/routes/analyze'
import { registerPublishRoute } from '../../src/routes/publish'
import { authMiddleware } from '../../src/middleware/auth'
import analyzeRequest from '../fixtures/analyzeRequest.json'

jest.mock('../../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}))

jest.mock('../../src/services/orchestrator')
jest.mock('../../src/services/solutionPackV4')
jest.mock('../../src/services/publisherFactory')
jest.mock('../../src/schemas/validators')
jest.mock('../../src/services/graph', () => ({
  getGraphClient: jest.fn(() => ({
    checkHealth: jest.fn().mockResolvedValue(true),
  })),
}))

describe('API E2E Pipeline — Health + Analyze + Publish', () => {
  let app: FastifyInstance
  let mockExecuteOrchestrator: any
  let mockTransformToV4: any
  let mockCreatePublisher: any
  let mockValidators: any

  const mockSolutionPack = {
    executionId: '00e02027-545b-494c-ba9d-fa251791e73b',
    opportunityId: 'test-opp-001',
    status: 'PARTIAL_SUCCESS',
    durationMs: 150,
    diagnosis: {
      pains: ['Falta de visibilidade'],
      objectives: ['Integração'],
      constraints: [],
      complexity: 'ALTA',
    },
    recommendation: {
      business: {
        products: [
          { name: 'Intranet', erp_code: 'SP001' },
        ],
        required_dependencies: [],
      },
      intelligence: { score: 0.85 },
    },
    exports: {
      erp: {
        blocked: false,
        payload: null,
      },
    },
  }

  beforeEach(async () => {
    jest.clearAllMocks()

    mockExecuteOrchestrator = require('../../src/services/orchestrator').executeOrchestrator
    mockTransformToV4 = require('../../src/services/solutionPackV4').transformToV4
    mockCreatePublisher = require('../../src/services/publisherFactory').createPublisher
    mockValidators = require('../../src/schemas/validators')

    // Default validators
    mockValidators.validateOpportunityContext = jest.fn(() => true)
    mockValidators.validateSolutionPack = jest.fn(() => true)
    mockValidators.formatValidationErrors = jest.fn(() => [])

    // Setup mock orchestrator
    mockExecuteOrchestrator.mockResolvedValue({
      status: 'PARTIAL_SUCCESS',
      steps: [
        { step: 'DiagnosisAgent', status: 'SUCCESS', durationMs: 50, attempts: 1 },
        { step: 'MatchingAgent', status: 'SUCCESS', durationMs: 100, attempts: 1 },
      ],
    })

    // Setup mock transformer
    mockTransformToV4.mockReturnValue(mockSolutionPack)

    // Setup mock publisher
    const mockPublisher = {
      saveFile: jest.fn()
        .mockResolvedValueOnce({ name: 'solutionPack.json', path: 'local://path1' })
        .mockResolvedValueOnce({ name: 'erp_payload.json', path: 'local://path2' })
        .mockResolvedValueOnce({ name: 'summary.md', path: 'local://path3' })
        .mockResolvedValueOnce({ name: 'recommendation.md', path: 'local://path4' }),
    }
    mockCreatePublisher.mockReturnValue(mockPublisher)

    // Create app with all routes
    app = Fastify()
    process.env.API_KEY = 'test-key'
    process.env.AZURE_CLIENT_ID = 'test-client'
    process.env.SHAREPOINT_SITE_ID = 'test-site'

    await registerHealthRoute(app)
    await registerAnalyzeRoute(app)
    await registerPublishRoute(app)
  })

  afterEach(async () => {
    await app.close()
    delete process.env.API_KEY
    delete process.env.AZURE_CLIENT_ID
    delete process.env.SHAREPOINT_SITE_ID
  })

  test('E2E: GET /api/health returns healthy status', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/health',
    })

    expect(response.statusCode).toBe(200)
    const body = JSON.parse(response.payload)
    expect(body.status).toBe('ok')
    expect(body.services).toBeDefined()
  })

  test('E2E: POST /api/analyze with valid request returns solutionPack', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/analyze',
      payload: analyzeRequest,
    })

    expect(response.statusCode).toBe(200)
    const body = JSON.parse(response.payload)
    expect(body.status).toBe('PARTIAL_SUCCESS')
    expect(body.solutionPack).toBeDefined()
    expect(body.executionId).toBe(mockSolutionPack.executionId)
  })

  test('E2E: POST /api/publish with valid solutionPack returns 4 files', async () => {
    const publishPayload = {
      executionId: '00e02027-545b-494c-ba9d-fa251791e73b',
      opportunityId: 'test-opp-001',
      solutionPack: mockSolutionPack,
    }

    const response = await app.inject({
      method: 'POST',
      url: '/api/publish',
      payload: publishPayload,
    })

    expect(response.statusCode).toBe(200)
    const body = JSON.parse(response.payload)
    expect(body.status).toBe('SUCCESS')
    expect(body.files).toHaveLength(4)
    expect(body.publishedAt).toBeDefined()
  })

  test('E2E: Analyze then publish pipeline flow', async () => {
    // Step 1: Health check
    const healthResponse = await app.inject({
      method: 'GET',
      url: '/api/health',
    })
    expect(healthResponse.statusCode).toBe(200)

    // Step 2: Analyze
    const analyzeResponse = await app.inject({
      method: 'POST',
      url: '/api/analyze',
      payload: analyzeRequest,
    })
    expect(analyzeResponse.statusCode).toBe(200)
    const analyzeBody = JSON.parse(analyzeResponse.payload)

    // Step 3: Publish using analyze output
    const publishPayload = {
      executionId: analyzeBody.executionId,
      opportunityId: analyzeBody.opportunityId,
      solutionPack: analyzeBody.solutionPack,
    }

    const publishResponse = await app.inject({
      method: 'POST',
      url: '/api/publish',
      payload: publishPayload,
    })
    expect(publishResponse.statusCode).toBe(200)
    const publishBody = JSON.parse(publishResponse.payload)
    expect(publishBody.status).toBe('SUCCESS')
    expect(publishBody.files).toHaveLength(4)
  })

  test('E2E: Pipeline handles orchestrator error gracefully', async () => {
    mockExecuteOrchestrator.mockResolvedValue({
      status: 'FAILED',
      steps: [],
      issues: [{ code: 'ERROR', message: 'Test error' }],
    })

    mockTransformToV4.mockReturnValue({
      ...mockSolutionPack,
      status: 'FAILED',
      errors: [{ code: 'ERROR', message: 'Test error' }],
    })

    const response = await app.inject({
      method: 'POST',
      url: '/api/analyze',
      payload: analyzeRequest,
    })

    const body = JSON.parse(response.payload)
    expect(body.status).toBe('FAILED')
  })

  test('E2E: Pipeline validates both input and output schemas', async () => {
    mockValidators.validateOpportunityContext = jest.fn(() => true)
    mockValidators.validateSolutionPack = jest.fn(() => true)

    const response = await app.inject({
      method: 'POST',
      url: '/api/analyze',
      payload: analyzeRequest,
    })

    expect(response.statusCode).toBe(200)
    expect(mockValidators.validateOpportunityContext).toHaveBeenCalled()
    expect(mockValidators.validateSolutionPack).toHaveBeenCalled()
  })

  test('E2E: Response includes all required fields for downstream processing', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/analyze',
      payload: analyzeRequest,
    })

    const body = JSON.parse(response.payload)
    expect(body).toHaveProperty('status')
    expect(body).toHaveProperty('executionId')
    expect(body).toHaveProperty('opportunityId')
    expect(body).toHaveProperty('durationMs')
    expect(body).toHaveProperty('solutionPack')
    expect(body).toHaveProperty('steps')
  })

  test('E2E: Publish endpoint uses output from analyze endpoint', async () => {
    // Analyze
    const analyzeResponse = await app.inject({
      method: 'POST',
      url: '/api/analyze',
      payload: analyzeRequest,
    })
    const analyzeData = JSON.parse(analyzeResponse.payload)

    // Verify analyze output structure
    expect(analyzeData.solutionPack.diagnosis).toBeDefined()
    expect(analyzeData.solutionPack.recommendation).toBeDefined()

    // Publish with analyze output
    const publishResponse = await app.inject({
      method: 'POST',
      url: '/api/publish',
      payload: {
        executionId: analyzeData.executionId,
        opportunityId: analyzeData.opportunityId,
        solutionPack: analyzeData.solutionPack,
      },
    })

    expect(publishResponse.statusCode).toBe(200)
  })
})
