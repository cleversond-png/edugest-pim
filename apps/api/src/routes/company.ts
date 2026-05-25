import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function registerCompanyRoute(app: FastifyInstance) {
  // GET /api/company — Get company profile
  app.get('/api/company', async (req: FastifyRequest, res: FastifyReply) => {
    try {
      const profile = await prisma.companyProfile.findFirst()

      if (!profile) {
        return res.status(404).send({
          errorCode: 'NOT_FOUND',
          message: 'Company profile not configured',
        })
      }

      res.send(profile)
    } catch (error) {
      console.error('Error fetching company profile:', error)
      res.status(500).send({
        errorCode: 'INTERNAL_ERROR',
        message: 'Failed to fetch company profile',
      })
    }
  })

  // POST /api/company — Create or update company profile
  app.post('/api/company', async (req: FastifyRequest, res: FastifyReply) => {
    try {
      const body = req.body as any

      if (!body.nomeEmpresa) {
        return res.status(400).send({
          errorCode: 'VALIDATION_ERROR',
          message: 'nomeEmpresa is required',
        })
      }

      // Check if profile exists
      const existing = await prisma.companyProfile.findFirst()

      let profile
      if (existing) {
        // Update existing
        profile = await prisma.companyProfile.update({
          where: { id: existing.id },
          data: body,
        })
      } else {
        // Create new
        profile = await prisma.companyProfile.create({
          data: body,
        })
      }

      res.status(201).send(profile)
    } catch (error) {
      console.error('Error creating/updating company profile:', error)
      res.status(500).send({
        errorCode: 'INTERNAL_ERROR',
        message: 'Failed to save company profile',
      })
    }
  })

  // PUT /api/company/:id — Update company profile by ID
  app.put('/api/company/:id', async (req: FastifyRequest, res: FastifyReply) => {
    try {
      const { id } = req.params as { id: string }
      const body = req.body as any

      const profile = await prisma.companyProfile.update({
        where: { id },
        data: body,
      })

      res.send(profile)
    } catch (error: any) {
      if (error.code === 'P2025') {
        return res.status(404).send({
          errorCode: 'NOT_FOUND',
          message: 'Company profile not found',
        })
      }
      console.error('Error updating company profile:', error)
      res.status(500).send({
        errorCode: 'INTERNAL_ERROR',
        message: 'Failed to update company profile',
      })
    }
  })

  console.log('Company profile routes registered')
}
