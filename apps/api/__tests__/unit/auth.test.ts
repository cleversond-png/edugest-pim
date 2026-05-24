/**
 * auth.test.ts — Unit tests for API Key authentication middleware
 */

import { FastifyRequest, FastifyReply } from 'fastify'
import { authMiddleware } from '../../src/middleware/auth'

describe('Auth Middleware — X-Api-Key Validation', () => {
  let mockRequest: Partial<FastifyRequest>
  let mockReply: Partial<FastifyReply>

  beforeEach(() => {
    mockRequest = {
      headers: {},
    }

    mockReply = {
      code: jest.fn().mockReturnThis(),
      send: jest.fn(),
    }

    process.env.API_KEY = 'test-secret-key'
  })

  afterEach(() => {
    delete process.env.API_KEY
  })

  test('valid API key passes through without error', async () => {
    mockRequest.headers = {
      'x-api-key': 'test-secret-key',
    }

    await authMiddleware(mockRequest as FastifyRequest, mockReply as FastifyReply)

    expect(mockReply.code).not.toHaveBeenCalled()
    expect(mockReply.send).not.toHaveBeenCalled()
  })

  test('missing API key returns 401 UNAUTHORIZED', async () => {
    mockRequest.headers = {}

    await authMiddleware(mockRequest as FastifyRequest, mockReply as FastifyReply)

    expect(mockReply.code).toHaveBeenCalledWith(401)
    expect(mockReply.send).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'FAILED',
        errorCode: 'UNAUTHORIZED',
        message: expect.stringContaining('Invalid or missing API key'),
      })
    )
  })

  test('invalid API key returns 401 UNAUTHORIZED', async () => {
    mockRequest.headers = {
      'x-api-key': 'wrong-key',
    }

    await authMiddleware(mockRequest as FastifyRequest, mockReply as FastifyReply)

    expect(mockReply.code).toHaveBeenCalledWith(401)
    expect(mockReply.send).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'FAILED',
        errorCode: 'UNAUTHORIZED',
      })
    )
  })

  test('missing API_KEY env variable returns 500 INTERNAL_ERROR', async () => {
    delete process.env.API_KEY

    mockRequest.headers = {
      'x-api-key': 'any-key',
    }

    await authMiddleware(mockRequest as FastifyRequest, mockReply as FastifyReply)

    expect(mockReply.code).toHaveBeenCalledWith(500)
    expect(mockReply.send).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'FAILED',
        errorCode: 'INTERNAL_ERROR',
        message: expect.stringContaining('not configured'),
      })
    )
  })
})
