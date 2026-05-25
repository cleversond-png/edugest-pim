import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { PrismaClient, SlideType } from '@prisma/client'

const prisma = new PrismaClient()

export async function registerSlidesRoute(app: FastifyInstance) {
  // POST /api/products/:slug/slides — Create slide
  app.post('/api/products/:slug/slides', async (req: FastifyRequest, res: FastifyReply) => {
    try {
      const { slug } = req.params as { slug: string }
      const body = req.body as any

      // Verify product exists
      const product = await prisma.product.findUnique({ where: { slug } })
      if (!product) {
        return res.status(404).send({ errorCode: 'NOT_FOUND', message: `Product "${slug}" not found` })
      }

      // Validate required fields
      if (!body.titulo || !body.tipo || body.ordem === undefined || !body.conteudo) {
        return res.status(400).send({
          errorCode: 'VALIDATION_ERROR',
          message: 'Fields titulo, tipo, ordem, and conteudo are required',
        })
      }

      const slide = await prisma.productSlide.create({
        data: {
          productId: product.id,
          titulo: body.titulo,
          tipo: body.tipo,
          ordem: body.ordem,
          conteudo: body.conteudo,
          notasApresentador: body.notasApresentador,
          imagemUrl: body.imagemUrl,
          pptxBase64: body.pptxBase64,
          ativo: body.ativo !== false,
        },
      })

      res.status(201).send(slide)
    } catch (error: any) {
      console.error('Error creating slide:', error)
      res.status(500).send({ errorCode: 'INTERNAL_ERROR', message: 'Failed to create slide' })
    }
  })

  // GET /api/products/:slug/slides — List slides
  app.get('/api/products/:slug/slides', async (req: FastifyRequest, res: FastifyReply) => {
    try {
      const { slug } = req.params as { slug: string }
      const query = req.query as { ativo?: string; tipo?: string }

      // Verify product exists
      const product = await prisma.product.findUnique({ where: { slug } })
      if (!product) {
        return res.status(404).send({ errorCode: 'NOT_FOUND', message: `Product "${slug}" not found` })
      }

      // Build filter
      const where: any = { productId: product.id }
      if (query.ativo === 'true') where.ativo = true
      if (query.ativo === 'false') where.ativo = false
      if (query.tipo) where.tipo = query.tipo

      const slides = await prisma.productSlide.findMany({
        where,
        orderBy: { ordem: 'asc' },
      })

      res.send({
        productSlug: slug,
        totalSlides: slides.length,
        slides,
      })
    } catch (error: any) {
      console.error('Error listing slides:', error)
      res.status(500).send({ errorCode: 'INTERNAL_ERROR', message: 'Failed to list slides' })
    }
  })

  // GET /api/products/:slug/slides/:id — Get slide detail
  app.get('/api/products/:slug/slides/:id', async (req: FastifyRequest, res: FastifyReply) => {
    try {
      const { slug, id } = req.params as { slug: string; id: string }

      // Verify product exists
      const product = await prisma.product.findUnique({ where: { slug } })
      if (!product) {
        return res.status(404).send({ errorCode: 'NOT_FOUND', message: `Product "${slug}" not found` })
      }

      const slide = await prisma.productSlide.findUnique({
        where: { id },
      })

      if (!slide || slide.productId !== product.id) {
        return res.status(404).send({ errorCode: 'NOT_FOUND', message: 'Slide not found' })
      }

      res.send(slide)
    } catch (error: any) {
      console.error('Error fetching slide:', error)
      res.status(500).send({ errorCode: 'INTERNAL_ERROR', message: 'Failed to fetch slide' })
    }
  })

  // PUT /api/products/:slug/slides/:id — Update slide
  app.put('/api/products/:slug/slides/:id', async (req: FastifyRequest, res: FastifyReply) => {
    try {
      const { slug, id } = req.params as { slug: string; id: string }
      const body = req.body as any

      // Verify product exists
      const product = await prisma.product.findUnique({ where: { slug } })
      if (!product) {
        return res.status(404).send({ errorCode: 'NOT_FOUND', message: `Product "${slug}" not found` })
      }

      // Verify slide exists and belongs to product
      const existingSlide = await prisma.productSlide.findUnique({ where: { id } })
      if (!existingSlide || existingSlide.productId !== product.id) {
        return res.status(404).send({ errorCode: 'NOT_FOUND', message: 'Slide not found' })
      }

      const updatedSlide = await prisma.productSlide.update({
        where: { id },
        data: {
          titulo: body.titulo ?? existingSlide.titulo,
          tipo: body.tipo ?? existingSlide.tipo,
          ordem: body.ordem ?? existingSlide.ordem,
          conteudo: body.conteudo ?? existingSlide.conteudo,
          notasApresentador: body.notasApresentador,
          imagemUrl: body.imagemUrl,
          pptxBase64: body.pptxBase64,
          ativo: body.ativo !== undefined ? body.ativo : existingSlide.ativo,
        },
      })

      res.send(updatedSlide)
    } catch (error: any) {
      console.error('Error updating slide:', error)
      res.status(500).send({ errorCode: 'INTERNAL_ERROR', message: 'Failed to update slide' })
    }
  })

  // DELETE /api/products/:slug/slides/:id — Delete slide
  app.delete('/api/products/:slug/slides/:id', async (req: FastifyRequest, res: FastifyReply) => {
    try {
      const { slug, id } = req.params as { slug: string; id: string }

      // Verify product exists
      const product = await prisma.product.findUnique({ where: { slug } })
      if (!product) {
        return res.status(404).send({ errorCode: 'NOT_FOUND', message: `Product "${slug}" not found` })
      }

      // Verify slide exists and belongs to product
      const existingSlide = await prisma.productSlide.findUnique({ where: { id } })
      if (!existingSlide || existingSlide.productId !== product.id) {
        return res.status(404).send({ errorCode: 'NOT_FOUND', message: 'Slide not found' })
      }

      await prisma.productSlide.delete({ where: { id } })

      res.send({ message: 'Slide deleted successfully' })
    } catch (error: any) {
      console.error('Error deleting slide:', error)
      res.status(500).send({ errorCode: 'INTERNAL_ERROR', message: 'Failed to delete slide' })
    }
  })

  // POST /api/products/:slug/slides/reorder — Reorder slides
  app.post('/api/products/:slug/slides/reorder', async (req: FastifyRequest, res: FastifyReply) => {
    try {
      const { slug } = req.params as { slug: string }
      const body = req.body as { slideIds: string[] }

      // Verify product exists
      const product = await prisma.product.findUnique({ where: { slug } })
      if (!product) {
        return res.status(404).send({ errorCode: 'NOT_FOUND', message: `Product "${slug}" not found` })
      }

      // Verify all slides belong to this product
      const slides = await prisma.productSlide.findMany({
        where: { productId: product.id, id: { in: body.slideIds } },
      })

      if (slides.length !== body.slideIds.length) {
        return res.status(400).send({
          errorCode: 'INVALID_SLIDES',
          message: 'Some slides do not belong to this product',
        })
      }

      // Update ordem for each slide
      const updates = body.slideIds.map((slideId, index) =>
        prisma.productSlide.update({
          where: { id: slideId },
          data: { ordem: index + 1 },
        })
      )

      await Promise.all(updates)

      // Fetch and return reordered slides
      const reorderedSlides = await prisma.productSlide.findMany({
        where: { productId: product.id },
        orderBy: { ordem: 'asc' },
      })

      res.send({
        message: 'Slides reordered successfully',
        slides: reorderedSlides,
      })
    } catch (error: any) {
      console.error('Error reordering slides:', error)
      res.status(500).send({ errorCode: 'INTERNAL_ERROR', message: 'Failed to reorder slides' })
    }
  })

  console.log('Slides routes registered')
}
