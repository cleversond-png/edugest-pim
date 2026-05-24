/**
 * analyze.test.ts — Unit tests for POST /api/analyze
 */

import Fastify, { FastifyInstance } from 'fastify'
import { registerAnalyzeRoute } from '../../src/routes/analyze'
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
jest.mock('../../src/schemas/validators')

describe('Analyze Route — POST /api/analyze', () => {
  let app: FastifyInstance
  let mockExecuteOrchestrator: any
  let mockTransformToV4: any
  let mockValidators: any

  beforeEach(async () => {
    jest.clearAllMocks()

    mockExecuteOrchestrator = require('../../src/services/orchestrator').executeOrchestrator
    mockTransformToV4 = require('../../src/services/solutionPackV4').transformToV4
    mockValidators = require('../../src/schemas/validators')

    // Default mock behavior
    mockValidators.validateOpportunityContext = jest.fn(() => true)
    mockValidators.validateSolutionPack = jest.fn(() => true)
    mockValidators.formatValidationErrors = jest.fn(() => [])

    app = Fastify()
    await registerAnalyzeRoute(app)
  })

  afterEach(async () => {
    await app.close()
  })

  test('valid request returns 200 with PARTIAL_SUCCESS status', async () => {
    const mockSolutionPack = {
      executionId: '00e02027-545b-494c-ba9d-fa251791e73b',
      opportunityId: 'test-opp-001',
      status: 'PARTIAL_SUCCESS',
      durationMs: 150,
      diagnosis: { pains: [], objectives: [], constraints: [] },
      recommendation: { business: { products: [] } },
      exports: { erp: { blocked: false, payload: null } },
    }

    mockExecuteOrchestrator.mockResolvedValue({
      status: 'PARTIAL_SUCCESS',
      steps: [],
    })

    mockTransformToV4.mockReturnValue(mockSolutionPack)

    const response = await app.inject({
      method: 'POST',
      url: '/api/analyze',
      payload: analyzeRequest,
    })

    expect(response.statusCode).toBe(200)
    const body = JSON.parse(response.payload)
    expect(body.status).toBe('PARTIAL_SUCCESS')
    expect(body.solutionPack).toBeDefined()
  })

  test('missing opportunityId returns 400 MISSING_OPPORTUNITY_ID', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/analyze',
      payload: {
        transcript: { text: 'Some text' },
      },
    })

    expect(response.statusCode).toBe(400)
    const body = JSON.parse(response.payload)
    expect(body.errorCode).toBe('MISSING_OPPORTUNITY_ID')
  })

  test('empty transcript returns 422 EMPTY_TRANSCRIPT', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/analyze',
      payload: {
        opportunityId: 'test-opp-001',
        transcript: { text: '   ' },
      },
    })

    expect(response.statusCode).toBe(422)
    const body = JSON.parse(response.payload)
    expect(body.errorCode).toBe('EMPTY_TRANSCRIPT')
  })

  test('invalid input schema returns 400 INVALID_INPUT', async () => {
    mockValidators.validateOpportunityContext = jest.fn(() => false)
    mockValidators.formatValidationErrors = jest.fn(() => [
      { path: '/opportunityId', message: 'is required' },
    ])

    const response = await app.inject({
      method: 'POST',
      url: '/api/analyze',
      payload: { invalid: 'data' },
    })

    expect(response.statusCode).toBe(400)
    const body = JSON.parse(response.payload)
    expect(body.errorCode).toBe('INVALID_INPUT')
  })

  test('response contains executionId, opportunityId, durationMs', async () => {
    const mockSolutionPack = {
      executionId: '00e02027-545b-494c-ba9d-fa251791e73b',
      opportunityId: 'test-opp-001',
      status: 'PARTIAL_SUCCESS',
      durationMs: 150,
      diagnosis: { pains: [], objectives: [], constraints: [] },
      recommendation: { business: { products: [] } },
      exports: { erp: { blocked: false, payload: null } },
    }

    mockExecuteOrchestrator.mockResolvedValue({
      status: 'PARTIAL_SUCCESS',
      steps: [],
    })

    mockTransformToV4.mockReturnValue(mockSolutionPack)

    const response = await app.inject({
      method: 'POST',
      url: '/api/analyze',
      payload: analyzeRequest,
    })

    const body = JSON.parse(response.payload)
    expect(body.executionId).toBe('00e02027-545b-494c-ba9d-fa251791e73b')
    expect(body.opportunityId).toBe('test-opp-001')
    expect(body.durationMs).toBeDefined()
    expect(typeof body.durationMs).toBe('number')
  })

  test('response includes solutionPack with diagnosis, recommendation, exports', async () => {
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
        },
      },
      exports: {
        erp: {
          blocked: false,
          payload: null,
        },
      },
    }

    mockExecuteOrchestrator.mockResolvedValue({
      status: 'PARTIAL_SUCCESS',
      steps: [],
    })

    mockTransformToV4.mockReturnValue(mockSolutionPack)

    const response = await app.inject({
      method: 'POST',
      url: '/api/analyze',
      payload: analyzeRequest,
    })

    const body = JSON.parse(response.payload)
    expect(body.solutionPack.diagnosis).toBeDefined()
    expect(body.solutionPack.diagnosis.pains).toBeDefined()
    expect(body.solutionPack.recommendation).toBeDefined()
    expect(body.solutionPack.recommendation.business).toBeDefined()
    expect(body.solutionPack.exports).toBeDefined()
  })

  test('response includes steps array with step details', async () => {
    const mockSolutionPack = {
      executionId: '00e02027-545b-494c-ba9d-fa251791e73b',
      opportunityId: 'test-opp-001',
      status: 'PARTIAL_SUCCESS',
      durationMs: 450,
      diagnosis: { pains: [], objectives: [], constraints: [] },
      recommendation: { business: { products: [] } },
      exports: { erp: { blocked: false, payload: null } },
    }

    mockExecuteOrchestrator.mockResolvedValue({
      status: 'PARTIAL_SUCCESS',
      steps: [
        { step: 'DiagnosisAgent', status: 'SUCCESS', durationMs: 100, attempts: 1 },
        { step: 'MatchingAgent', status: 'SUCCESS', durationMs: 200, attempts: 1 },
        { step: 'ERPSankhyaMapperAgent', status: 'SUCCESS', durationMs: 150, attempts: 1 },
      ],
    })

    mockTransformToV4.mockReturnValue(mockSolutionPack)

    const response = await app.inject({
      method: 'POST',
      url: '/api/analyze',
      payload: analyzeRequest,
    })

    const body = JSON.parse(response.payload)
    expect(body.steps).toBeDefined()
    expect(Array.isArray(body.steps)).toBe(true)
    expect(body.steps.length).toBe(3)
    expect(body.steps[0].step).toBe('DiagnosisAgent')
    expect(body.steps[0].status).toBe('SUCCESS')
    expect(body.steps[0].durationMs).toBe(100)
  })

  test('orchestrator error returns appropriate error response', async () => {
    const mockSolutionPack = {
      executionId: '00e02027-545b-494c-ba9d-fa251791e73b',
      opportunityId: 'test-opp-001',
      status: 'FAILED',
      durationMs: 100,
      diagnosis: { pains: [], objectives: [], constraints: [] },
      recommendation: { business: { products: [] } },
      exports: { erp: { blocked: false, payload: null } },
      errors: [{ code: 'ORCHESTRATOR_ERROR', message: 'Orchestrator failed' }],
    }

    mockExecuteOrchestrator.mockResolvedValue({
      status: 'FAILED',
      steps: [],
      issues: [{ code: 'ORCHESTRATOR_ERROR', message: 'Orchestrator failed' }],
    })

    mockTransformToV4.mockReturnValue(mockSolutionPack)

    const response = await app.inject({
      method: 'POST',
      url: '/api/analyze',
      payload: analyzeRequest,
    })

    const body = JSON.parse(response.payload)
    expect(body.status).toBe('FAILED')
  })

  test('invalid V4 output returns 500 INTERNAL_ERROR', async () => {
    mockExecuteOrchestrator.mockResolvedValue({
      status: 'PARTIAL_SUCCESS',
      steps: [],
    })

    mockTransformToV4.mockReturnValue({ invalid: 'structure' })
    mockValidators.validateSolutionPack = jest.fn(() => false)

    const response = await app.inject({
      method: 'POST',
      url: '/api/analyze',
      payload: analyzeRequest,
    })

    expect(response.statusCode).toBe(500)
    const body = JSON.parse(response.payload)
    expect(body.errorCode).toBe('INTERNAL_ERROR')
  })
})
