/**
 * errorHandler.test.ts — Unit tests for global error handler middleware
 */

import { FastifyError, FastifyRequest, FastifyReply } from 'fastify'
import { errorHandler } from '../../src/middleware/errorHandler'

jest.mock('../../src/utils/logger', () => ({
  logger: {
    error: jest.fn(),
  },
}))

describe('Error Handler — errorHandler middleware', () => {
  let mockRequest: Partial<FastifyRequest>
  let mockReply: Partial<FastifyReply>
  let mockError: Partial<FastifyError>

  beforeEach(() => {
    jest.clearAllMocks()

    mockRequest = {
      url: '/api/test',
    }

    mockReply = {
      code: jest.fn().mockReturnThis(),
      send: jest.fn(),
    }

    mockError = {
      statusCode: 500,
      code: 'INTERNAL_ERROR',
      message: 'Something went wrong',
    }

    process.env.NODE_ENV = 'production'
  })

  afterEach(() => {
    delete process.env.NODE_ENV
  })

  test('handles error with statusCode', async () => {
    mockError.statusCode = 400

    await errorHandler(mockError as FastifyError, mockRequest as FastifyRequest, mockReply as FastifyReply)

    expect(mockReply.code).toHaveBeenCalledWith(400)
  })

  test('defaults to 500 when statusCode missing', async () => {
    mockError.statusCode = undefined

    await errorHandler(mockError as FastifyError, mockRequest as FastifyRequest, mockReply as FastifyReply)

    expect(mockReply.code).toHaveBeenCalledWith(500)
  })

  test('uses error code in response', async () => {
    mockError.code = 'VALIDATION_ERROR'

    await errorHandler(mockError as FastifyError, mockRequest as FastifyRequest, mockReply as FastifyReply)

    expect(mockReply.send).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'FAILED',
        errorCode: 'VALIDATION_ERROR',
      })
    )
  })

  test('uses INTERNAL_ERROR when code missing', async () => {
    mockError.code = undefined

    await errorHandler(mockError as FastifyError, mockRequest as FastifyRequest, mockReply as FastifyReply)

    expect(mockReply.send).toHaveBeenCalledWith(
      expect.objectContaining({
        errorCode: 'INTERNAL_ERROR',
      })
    )
  })

  test('includes error message in response', async () => {
    mockError.message = 'Database connection failed'

    await errorHandler(mockError as FastifyError, mockRequest as FastifyRequest, mockReply as FastifyReply)

    expect(mockReply.send).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Database connection failed',
      })
    )
  })

  test('excludes stack trace in production', async () => {
    process.env.NODE_ENV = 'production'
    const { logger } = require('../../src/utils/logger')

    mockError.stack = 'Error stack trace here'

    await errorHandler(mockError as FastifyError, mockRequest as FastifyRequest, mockReply as FastifyReply)

    expect(logger.error).toHaveBeenCalledWith(
      expect.objectContaining({
        stack: undefined,
      }),
      expect.any(String)
    )
  })

  test('includes stack trace in development', async () => {
    process.env.NODE_ENV = 'development'
    const { logger } = require('../../src/utils/logger')

    mockError.stack = 'Error at line 42'

    await errorHandler(mockError as FastifyError, mockRequest as FastifyRequest, mockReply as FastifyReply)

    expect(logger.error).toHaveBeenCalledWith(
      expect.objectContaining({
        stack: 'Error at line 42',
      }),
      expect.any(String)
    )
  })

  test('logs error with request details', async () => {
    const { logger } = require('../../src/utils/logger')

    await errorHandler(mockError as FastifyError, mockRequest as FastifyRequest, mockReply as FastifyReply)

    expect(logger.error).toHaveBeenCalledWith(
      expect.objectContaining({
        errorCode: 'INTERNAL_ERROR',
        message: 'Something went wrong',
        statusCode: 500,
        url: '/api/test',
      }),
      'Request error'
    )
  })

  test('response always has FAILED status', async () => {
    mockError.message = 'Test error'

    await errorHandler(mockError as FastifyError, mockRequest as FastifyRequest, mockReply as FastifyReply)

    expect(mockReply.send).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'FAILED',
      })
    )
  })
})
