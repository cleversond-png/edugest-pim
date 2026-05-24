/**
 * errorHandler.ts — Global error handler
 */

import { FastifyError, FastifyRequest, FastifyReply } from 'fastify'
import { logger } from '../utils/logger'

export type ErrorResponse = {
  status: 'FAILED'
  errorCode: string
  message: string
  details?: any[]
}

export async function errorHandler(err: FastifyError, req: FastifyRequest, rep: FastifyReply) {
  const statusCode = err.statusCode || 500

  logger.error(
    {
      errorCode: err.code || 'INTERNAL_ERROR',
      message: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
      statusCode,
      url: req.url,
    },
    'Request error'
  )

  const response: ErrorResponse = {
    status: 'FAILED',
    errorCode: err.code || 'INTERNAL_ERROR',
    message: err.message || 'Unknown error',
  }

  rep.code(statusCode).send(response)
}
