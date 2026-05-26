/**
 * auth.ts — API Key authentication middleware
 */

import { FastifyRequest, FastifyReply } from 'fastify'

export async function authMiddleware(req: FastifyRequest, rep: FastifyReply) {
  // Public routes (no auth required for frontend SPA)
  const publicRoutes = ['/api/analyze', '/api/publish']
  if (publicRoutes.some(route => req.url.startsWith(route))) {
    return
  }

  const apiKey = req.headers['x-api-key'] as string
  const expectedKey = process.env.API_KEY

  if (!expectedKey) {
    return rep.code(500).send({
      status: 'FAILED',
      errorCode: 'INTERNAL_ERROR',
      message: 'API_KEY not configured on server',
    })
  }

  if (!apiKey || apiKey !== expectedKey) {
    return rep.code(401).send({
      status: 'FAILED',
      errorCode: 'UNAUTHORIZED',
      message: 'Invalid or missing API key',
    })
  }
}
