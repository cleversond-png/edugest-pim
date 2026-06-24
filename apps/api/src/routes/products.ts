import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { PrismaClient, ProductStatus, ProductType } from '@prisma/client'
import {
  generateMasterMd,
  generateMasterHtml,
  generateVisionDocument,
  generateErpExport,
  generateCrmExport,
  generatePartnerExport,
} from '../services/docGenerator'
import { publishProductDocuments } from '../services/blobStorage'
import { hasAnthropicKey } from '../services/aiClientWrapper'
import { completeProductWithAI } from '../services/productAiCompleter'

const prisma = new PrismaClient()

// Helper to generate slug from name
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
}

// Helper to generate next product code
async function generateNextProductCode(): Promise<string> {
  const lastProduct = await prisma.product.findFirst({
    where: { codigo: { startsWith: 'BB-' } },
    orderBy: { codigo: 'desc' },
  })

  if (!lastProduct || !lastProduct.codigo) {
    return 'BB-SAAS-PRD-001'
  }

  const parts = lastProduct.codigo.split('-')
  if (parts.length >= 3) {
    const seq = parseInt(parts[parts.length - 1], 10)
    parts[parts.length - 1] = String(seq + 1).padStart(3, '0')
    return parts.join('-')
  }

  return 'BB-SAAS-PRD-001'
}

// Helper: Generate AI content and docs asynchronously (fire-and-forget)
async function generateProductContentInBackground(slug: string) {
  try {
    console.log(`[BG] Starting content generation for product: ${slug}`)

    const product = await prisma.product.findUnique({ where: { slug } })
    if (!product) {
      console.error(`[BG] Product not found: ${slug}`)
      return
    }

    // Step 1: Generate AI content
    console.log(`[BG] Step 1/2: Generating AI content...`)
    const updated = await completeProductWithAI(prisma, product.id)
    console.log(`[BG] Step 1 completed: AI content generated`)

    // Step 2: Generate documentation and publish to SharePoint
    console.log(`[BG] Step 2/2: Generating documentation and publishing to SharePoint...`)
    const publicos: ('FINANCEIRO' | 'COMERCIAL' | 'PRE_VENDA' | 'MARKETING' | 'SUPORTE' | 'ONBOARDING')[] =
      ['FINANCEIRO', 'COMERCIAL', 'PRE_VENDA', 'MARKETING', 'SUPORTE', 'ONBOARDING']

    const files: any[] = []

    // Generate MASTER files
    const masterMd = generateMasterMd(updated)
    const masterHtml = generateMasterHtml(updated)

    files.push(
      { name: `${slug}-MASTER.md`, content: masterMd, folder: '' },
      { name: `${slug}-MASTER.html`, content: masterHtml, folder: '' }
    )

    // Generate vision documents
    const allHints: string[] = []
    const usingAI = hasAnthropicKey()
    console.log(`[BG] Generating vision documents (mode: ${usingAI ? 'REAL AI' : 'MOCK'})`)

    for (const publico of publicos) {
      const { content, hints } = await generateVisionDocument(publico, masterMd, updated.nomeComercial)
      files.push({
        name: `${slug}-${publico}.md`,
        content,
        folder: 'visoes',
      })
      allHints.push(...hints)
    }

    // Generate export files
    const erpExport = generateErpExport(updated)
    const crmExport = generateCrmExport(updated)
    const partnerExport = generatePartnerExport(updated)

    files.push(
      { name: `${slug}-ERP.json`, content: JSON.stringify(erpExport, null, 2), folder: 'exports' },
      { name: `${slug}-CRM.json`, content: JSON.stringify(crmExport, null, 2), folder: 'exports' },
      { name: `${slug}-Partner.json`, content: JSON.stringify(partnerExport, null, 2), folder: 'exports' }
    )

    // Update product with copilot hints
    const uniqueHints = Array.from(new Set(allHints))
    await prisma.product.update({
      where: { slug },
      data: { tagsCopilot: uniqueHints },
    })

    // Publish to SharePoint
    try {
      const sharepointFolder = await publishProductDocuments(slug, files)
      console.log(`[BG] Step 2 completed: ${files.length} files published to SharePoint at ${sharepointFolder}`)
    } catch (spError) {
      console.error(`[BG] SharePoint publish failed: ${spError}`, spError)
    }

    console.log(`[BG] ✅ Complete! Product "${slug}" is now ready for Copilot indexing`)
  } catch (error) {
    console.error(`[BG] Error in background generation for ${slug}:`, error)
  }
}

export async function registerProductsRoute(app: FastifyInstance) {
  // POST /api/products — Create product
  app.post('/api/products', async (req: FastifyRequest, res: FastifyReply) => {
    try {
      const body = req.body as any

      // Validate required fields
      if (!body.nomeComercial) {
        return res.status(400).send({ errorCode: 'VALIDATION_ERROR', message: 'nomeComercial is required' })
      }

      // Generate slug and codigo if not provided
      const slug = generateSlug(body.nomeComercial)
      const codigo = body.codigo || (await generateNextProductCode())

      // Check if slug already exists
      const existing = await prisma.product.findUnique({ where: { slug } })
      if (existing) {
        return res.status(409).send({ errorCode: 'CONFLICT', message: `Product with slug "${slug}" already exists` })
      }

      const product = await prisma.product.create({
        data: {
          ...body,
          slug,
          codigo,
          status: body.status || ProductStatus.RASCUNHO,
          tipoProduto: body.tipoProduto || ProductType.SAAS_BB,
        },
      })

      // Trigger background content generation (fire-and-forget)
      generateProductContentInBackground(slug).catch(err =>
        console.error(`[BG] Uncaught error in generateProductContentInBackground:`, err)
      )

      res.status(201).send({
        ...product,
        _status: 'GENERATING_CONTENT',
        _message: 'Produto criado. IA e documentação sendo gerados automaticamente...',
      })
    } catch (error) {
      console.error('Error creating product:', error)
      res.status(500).send({ errorCode: 'INTERNAL_ERROR', message: 'Failed to create product' })
    }
  })

  // PUT /api/products/:slug — Update product
  app.put('/api/products/:slug', async (req: FastifyRequest, res: FastifyReply) => {
    try {
      const { slug } = req.params as { slug: string }
      const body = req.body as any

      // Find product
      const product = await prisma.product.findUnique({ where: { slug } })
      if (!product) {
        return res.status(404).send({ errorCode: 'NOT_FOUND', message: `Product with slug "${slug}" not found` })
      }

      // Prevent updating immutable fields
      if (body.codigo || body.slug) {
        return res.status(400).send({
          errorCode: 'IMMUTABLE_FIELD',
          message: 'Fields "codigo" and "slug" are immutable',
        })
      }

      const updated = await prisma.product.update({
        where: { slug },
        data: body,
      })

      res.send(updated)
    } catch (error) {
      console.error('Error updating product:', error)
      res.status(500).send({ errorCode: 'INTERNAL_ERROR', message: 'Failed to update product' })
    }
  })

  // POST /api/products/:slug/regenerate-financial — Regenerate financial fields with AI
  app.post('/api/products/:slug/regenerate-financial', async (req: FastifyRequest, res: FastifyReply) => {
    try {
      const { slug } = req.params as { slug: string }

      const product = await prisma.product.findUnique({ where: { slug } })
      if (!product) {
        return res.status(404).send({ errorCode: 'NOT_FOUND', message: `Product with slug "${slug}" not found` })
      }

      // Regenerate financeiro with AI
      const { generateFinanceiroFields } = await import('../services/productAiCompleter')
      const financeiro = await generateFinanceiroFields(product)

      // Update product with new financial fields
      const updateData: any = {
        precoBaseUnitario: financeiro.precoBaseUnitario,
        margemSugerida: financeiro.margemSugerida,
        descontoMaximo: financeiro.descontoMaximo,
        faixasPreco: financeiro.faixasPreco,
      }

      if (financeiro.pacotesCredito && financeiro.pacotesCredito.length > 0) {
        updateData.pacotesCredito = financeiro.pacotesCredito
      }

      const updated = await prisma.product.update({
        where: { slug },
        data: updateData,
      })

      res.send(updated)
    } catch (error) {
      console.error('Error regenerating financial fields:', error)
      res.status(500).send({ errorCode: 'INTERNAL_ERROR', message: 'Failed to regenerate financial fields' })
    }
  })

  // DELETE /api/products/:slug — Delete product
  app.delete('/api/products/:slug', async (req: FastifyRequest, res: FastifyReply) => {
    try {
      const { slug } = req.params as { slug: string }

      const product = await prisma.product.findUnique({ where: { slug } })
      if (!product) {
        return res.status(404).send({ errorCode: 'NOT_FOUND', message: `Product with slug "${slug}" not found` })
      }

      await prisma.product.delete({ where: { slug } })
      res.status(204).send()
    } catch (error) {
      console.error('Error deleting product:', error)
      res.status(500).send({ errorCode: 'INTERNAL_ERROR', message: 'Failed to delete product' })
    }
  })

  // GET /api/products — List products
  app.get('/api/products', async (req: FastifyRequest, res: FastifyReply) => {
    try {
      const query = req.query as {
        tipo?: string
        status?: string
        perfil?: string
        limit?: string
        offset?: string
      }

      const limit = parseInt(query.limit || '20', 10)
      const offset = parseInt(query.offset || '0', 10)

      // Build filter
      const where: any = {}
      if (query.tipo) where.tipoProduto = query.tipo
      if (query.status) where.status = query.status
      if (query.perfil) where.perfilCliente = { has: query.perfil }

      const [products, total] = await Promise.all([
        prisma.product.findMany({
          where,
          skip: offset,
          take: limit,
          select: {
            id: true,
            slug: true,
            codigo: true,
            nomeComercial: true,
            descricaoComercialCurta: true,
            status: true,
            tipoProduto: true,
            natureza: true,
            createdAt: true,
            updatedAt: true,
          },
        }),
        prisma.product.count({ where }),
      ])

      res.send({
        data: products,
        pagination: { limit, offset, total },
      })
    } catch (error) {
      console.error('Error listing products:', error)
      res.status(500).send({ errorCode: 'INTERNAL_ERROR', message: 'Failed to list products' })
    }
  })

  // GET /api/products/:slug — Get product details
  app.get('/api/products/:slug', async (req: FastifyRequest, res: FastifyReply) => {
    try {
      const { slug } = req.params as { slug: string }

      const product = await prisma.product.findUnique({
        where: { slug },
        include: {
          productSlides: true,
          versions: true,
          dependencyRules: true,
          erpMapping: true,
        },
      })

      if (!product) {
        return res.status(404).send({ errorCode: 'NOT_FOUND', message: `Product with slug "${slug}" not found` })
      }

      res.send(product)
    } catch (error) {
      console.error('Error fetching product:', error)
      res.status(500).send({ errorCode: 'INTERNAL_ERROR', message: 'Failed to fetch product' })
    }
  })

  // GET /api/products/:slug/export/erp — Export to Sankhya
  app.get('/api/products/:slug/export/erp', async (req: FastifyRequest, res: FastifyReply) => {
    try {
      const { slug } = req.params as { slug: string }

      const product = await prisma.product.findUnique({
        where: { slug },
        include: { erpMapping: true },
      })

      if (!product) {
        return res.status(404).send({ errorCode: 'NOT_FOUND', message: `Product with slug "${slug}" not found` })
      }

      // Check if export is blocked
      if (product.fiscalStatus === 'A_VALIDAR') {
        return res.status(400).send({
          errorCode: 'BLOCKED_EXPORT',
          message: 'Product cannot be exported while fiscalStatus is "A_VALIDAR"',
          product: { slug, nomeComercial: product.nomeComercial },
        })
      }

      // Build ERP payload
      const erpPayload = {
        codigo: product.codigo,
        nomeComercial: product.nomeComercial,
        tipoProduto: product.tipoProduto,
        modeloContratado: product.modeloContratado,
        modeloFaturamento: product.modeloFaturamento,
        ativo: product.ativo,
        fiscalStatus: product.fiscalStatus,
        codigoNBS: product.codigoNBS,
        temISS: product.temISS,
        aliquotaISS: product.aliquotaISS,
        erpMapping: product.erpMapping || {},
      }

      res.send({
        exportedAt: new Date().toISOString(),
        payload: erpPayload,
      })
    } catch (error) {
      console.error('Error exporting product:', error)
      res.status(500).send({ errorCode: 'INTERNAL_ERROR', message: 'Failed to export product' })
    }
  })

  // POST /api/products/:slug/generate-docs — Generate documentation
  app.post('/api/products/:slug/generate-docs', async (req: FastifyRequest, res: FastifyReply) => {
    try {
      const { slug } = req.params as { slug: string }
      const body = req.body as any

      const product = await prisma.product.findUnique({ where: { slug } })
      if (!product) {
        return res.status(404).send({ errorCode: 'NOT_FOUND', message: `Product with slug "${slug}" not found` })
      }

      const files: any[] = []
      const targets = body.targets || ['ALL']
      const shouldPublish = body.publish !== false
      const publicos: ('FINANCEIRO' | 'COMERCIAL' | 'PRE_VENDA' | 'MARKETING' | 'SUPORTE' | 'ONBOARDING')[] =
        targets.includes('ALL')
          ? ['FINANCEIRO', 'COMERCIAL', 'PRE_VENDA', 'MARKETING', 'SUPORTE', 'ONBOARDING']
          : targets

      // Generate MASTER files
      const masterMd = generateMasterMd(product)
      const masterHtml = generateMasterHtml(product)

      files.push(
        { name: `${product.slug}-MASTER.md`, content: masterMd, folder: '' },
        { name: `${product.slug}-MASTER.html`, content: masterHtml, folder: '' }
      )

      // Generate vision documents
      const allHints: string[] = []
      const usingAI = hasAnthropicKey()
      console.log(`Generating vision documents (mode: ${usingAI ? 'REAL AI' : 'MOCK'})`)

      for (const publico of publicos) {
        console.log(`  └─ Generating vision document: ${publico}`)
        const { content, hints } = await generateVisionDocument(publico, masterMd, product.nomeComercial)

        files.push({
          name: `${product.slug}-${publico}.md`,
          content,
          folder: 'visoes',
        })

        allHints.push(...hints)
      }

      // Generate export files
      const erpExport = generateErpExport(product)
      const crmExport = generateCrmExport(product)
      const partnerExport = generatePartnerExport(product)

      files.push(
        { name: `${product.slug}-ERP.json`, content: JSON.stringify(erpExport, null, 2), folder: 'exports' },
        { name: `${product.slug}-CRM.json`, content: JSON.stringify(crmExport, null, 2), folder: 'exports' },
        { name: `${product.slug}-Partner.json`, content: JSON.stringify(partnerExport, null, 2), folder: 'exports' }
      )

      // Update product with copilot hints
      const uniqueHints = Array.from(new Set(allHints))
      await prisma.product.update({
        where: { slug },
        data: { tagsCopilot: uniqueHints },
      })

      // Publish to SharePoint if requested
      let sharepointFolder = null
      if (shouldPublish) {
        try {
          sharepointFolder = await publishProductDocuments(product.slug, files)
        } catch (error) {
          console.warn('SharePoint publishing failed, but documents were generated:', error)
        }
      }

      res.status(200).send({
        status: 'SUCCESS',
        produto: product.slug,
        filesGenerated: files.length,
        hintsExtracted: uniqueHints.length,
        files: files.map(f => ({ path: `${f.folder}/${f.name}`.replace(/^\//, ''), status: 'GENERATED' })),
        sharepointFolder,
      })
    } catch (error: any) {
      console.error('Error generating documents:', error)
      res.status(500).send({
        errorCode: 'GENERATION_ERROR',
        message: error.message || 'Failed to generate documents',
      })
    }
  })

  // PUT /api/products/:slug/generate-ai-content — Generate content via IA
  app.put('/api/products/:slug/generate-ai-content', async (req: FastifyRequest, res: FastifyReply) => {
    try {
      const { slug } = req.params as { slug: string }

      const product = await prisma.product.findUnique({ where: { slug } })
      if (!product) {
        return res.status(404).send({ errorCode: 'NOT_FOUND', message: `Product with slug "${slug}" not found` })
      }

      if (product.status !== 'RASCUNHO') {
        return res.status(400).send({
          errorCode: 'INVALID_STATUS',
          message: 'Product must be in RASCUNHO status to generate AI content',
        })
      }

      console.log(`[AI] Generating content for product: ${slug}`)

      const updated = await completeProductWithAI(prisma, product.id)

      res.status(200).send({
        status: 'SUCCESS',
        message: 'AI content generated successfully',
        data: updated,
      })
    } catch (error: any) {
      console.error('Error generating AI content:', error)
      res.status(500).send({
        errorCode: 'AI_GENERATION_ERROR',
        message: error.message || 'Failed to generate AI content',
      })
    }
  })

  console.log('Products routes registered')
}
