/**
 * publish.test.ts — Unit tests for POST /api/publish
 */

import Fastify, { FastifyInstance } from 'fastify'
import { registerPublishRoute } from '../../src/routes/publish'
import publishRequest from '../fixtures/publishRequest.json'

jest.mock('../../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}))

jest.mock('../../src/services/publisherFactory')

describe('Publish Route — POST /api/publish', () => {
  let app: FastifyInstance
  let mockCreatePublisher: any

  beforeEach(async () => {
    jest.clearAllMocks()
    mockCreatePublisher = require('../../src/services/publisherFactory').createPublisher

    app = Fastify()
    await registerPublishRoute(app)
  })

  afterEach(async () => {
    await app.close()
  })

  test('valid publish request returns 200 SUCCESS with 4 files', async () => {
    const mockPublisher = {
      saveFile: jest.fn()
        .mockResolvedValueOnce({ name: 'solutionPack.json', path: 'file://path1' })
        .mockResolvedValueOnce({ name: 'erp_payload.json', path: 'file://path2' })
        .mockResolvedValueOnce({ name: 'summary.md', path: 'file://path3' })
        .mockResolvedValueOnce({ name: 'recommendation.md', path: 'file://path4' }),
    }

    mockCreatePublisher.mockReturnValue(mockPublisher)

    const response = await app.inject({
      method: 'POST',
      url: '/api/publish',
      payload: publishRequest,
    })

    expect(response.statusCode).toBe(200)
    const body = JSON.parse(response.payload)
    expect(body.status).toBe('SUCCESS')
    expect(body.files).toHaveLength(4)
  })

  test('missing required fields returns 400', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/publish',
      payload: {
        opportunityId: 'test-opp-001',
      },
    })

    expect(response.statusCode).toBe(400)
    const body = JSON.parse(response.payload)
    expect(body.status).toBe('FAILED')
    expect(body.error).toContain('required')
  })

  test('missing opportunityId returns 400', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/publish',
      payload: {
        executionId: 'exec-123',
        solutionPack: {},
      },
    })

    expect(response.statusCode).toBe(400)
    const body = JSON.parse(response.payload)
    expect(body.status).toBe('FAILED')
  })

  test('missing solutionPack returns 400', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/publish',
      payload: {
        executionId: 'exec-123',
        opportunityId: 'test-opp-001',
      },
    })

    expect(response.statusCode).toBe(400)
    const body = JSON.parse(response.payload)
    expect(body.status).toBe('FAILED')
  })

  test('publisher error returns 500 FAILED', async () => {
    const mockPublisher = {
      saveFile: jest.fn().mockRejectedValue(new Error('Publisher connection failed')),
    }

    mockCreatePublisher.mockReturnValue(mockPublisher)

    const response = await app.inject({
      method: 'POST',
      url: '/api/publish',
      payload: publishRequest,
    })

    expect(response.statusCode).toBe(500)
    const body = JSON.parse(response.payload)
    expect(body.status).toBe('FAILED')
    expect(body.error).toContain('Publisher connection failed')
  })

  test('response includes publishedAt timestamp', async () => {
    const mockPublisher = {
      saveFile: jest.fn()
        .mockResolvedValueOnce({ name: 'solutionPack.json', path: 'file://path1' })
        .mockResolvedValueOnce({ name: 'erp_payload.json', path: 'file://path2' })
        .mockResolvedValueOnce({ name: 'summary.md', path: 'file://path3' })
        .mockResolvedValueOnce({ name: 'recommendation.md', path: 'file://path4' }),
    }

    mockCreatePublisher.mockReturnValue(mockPublisher)

    const response = await app.inject({
      method: 'POST',
      url: '/api/publish',
      payload: publishRequest,
    })

    const body = JSON.parse(response.payload)
    expect(body.publishedAt).toBeDefined()
    expect(typeof body.publishedAt).toBe('string')
    expect(new Date(body.publishedAt)).toBeInstanceOf(Date)
  })

  test('response includes files array with names and URLs', async () => {
    const mockPublisher = {
      saveFile: jest.fn()
        .mockResolvedValueOnce({ name: 'solutionPack.json', path: 'local://Opportunity_test-opp-001/solutionPack.json' })
        .mockResolvedValueOnce({ name: 'erp_payload.json', path: 'local://Opportunity_test-opp-001/erp_payload.json' })
        .mockResolvedValueOnce({ name: 'summary.md', path: 'local://Opportunity_test-opp-001/summary.md' })
        .mockResolvedValueOnce({ name: 'recommendation.md', path: 'local://Opportunity_test-opp-001/recommendation.md' }),
    }

    mockCreatePublisher.mockReturnValue(mockPublisher)

    const response = await app.inject({
      method: 'POST',
      url: '/api/publish',
      payload: publishRequest,
    })

    const body = JSON.parse(response.payload)
    expect(body.files).toBeDefined()
    expect(Array.isArray(body.files)).toBe(true)
    expect(body.files[0]).toHaveProperty('name')
    expect(body.files[0]).toHaveProperty('webUrl')
    expect(body.files[0].name).toBe('solutionPack.json')
  })

  test('publisher saveFile is called 4 times with correct file names', async () => {
    const mockPublisher = {
      saveFile: jest.fn()
        .mockResolvedValueOnce({ name: 'solutionPack.json', path: 'file://path1' })
        .mockResolvedValueOnce({ name: 'erp_payload.json', path: 'file://path2' })
        .mockResolvedValueOnce({ name: 'summary.md', path: 'file://path3' })
        .mockResolvedValueOnce({ name: 'recommendation.md', path: 'file://path4' }),
    }

    mockCreatePublisher.mockReturnValue(mockPublisher)

    const response = await app.inject({
      method: 'POST',
      url: '/api/publish',
      payload: publishRequest,
    })

    expect(mockPublisher.saveFile).toHaveBeenCalledTimes(4)
    expect(mockPublisher.saveFile).toHaveBeenNthCalledWith(
      1,
      'Opportunity_test-opp-001',
      'solutionPack.json',
      expect.any(String)
    )
    expect(mockPublisher.saveFile).toHaveBeenNthCalledWith(
      2,
      'Opportunity_test-opp-001',
      'erp_payload.json',
      expect.any(String)
    )
    expect(mockPublisher.saveFile).toHaveBeenNthCalledWith(
      3,
      'Opportunity_test-opp-001',
      'summary.md',
      expect.any(String)
    )
    expect(mockPublisher.saveFile).toHaveBeenNthCalledWith(
      4,
      'Opportunity_test-opp-001',
      'recommendation.md',
      expect.any(String)
    )
  })

  test('response includes solutionPack data in first file', async () => {
    const mockPublisher = {
      saveFile: jest.fn()
        .mockResolvedValueOnce({ name: 'solutionPack.json', path: 'file://path1' })
        .mockResolvedValueOnce({ name: 'erp_payload.json', path: 'file://path2' })
        .mockResolvedValueOnce({ name: 'summary.md', path: 'file://path3' })
        .mockResolvedValueOnce({ name: 'recommendation.md', path: 'file://path4' }),
    }

    mockCreatePublisher.mockReturnValue(mockPublisher)

    await app.inject({
      method: 'POST',
      url: '/api/publish',
      payload: publishRequest,
    })

    const firstCall = mockPublisher.saveFile.mock.calls[0]
    const savedContent = JSON.parse(firstCall[2])
    expect(savedContent).toHaveProperty('diagnosis')
    expect(savedContent).toHaveProperty('recommendation')
    expect(savedContent).toHaveProperty('exports')
  })
})
