import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

describe('Products API', () => {
  let createdProductId: string

  beforeAll(async () => {
    // Clean up test data
    await prisma.product.deleteMany({
      where: { slug: { startsWith: 'test-' } },
    })
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  describe('Product CRUD', () => {
    it('should create a new product', async () => {
      const result = await prisma.product.create({
        data: {
          slug: 'test-product-1',
          codigo: 'BB-TEST-001',
          nomeComercial: 'Test Product 1',
          descricaoComercialCurta: 'A test product',
          status: 'ATIVO',
          tipoProduto: 'SAAS_BB',
          modeloContratado: 'SUBSCRICAO',
          modeloFaturamento: 'RECORRENTE',
          dependenciaComercial: 'NENHUMA',
        },
      })

      expect(result.slug).toBe('test-product-1')
      expect(result.codigo).toBe('BB-TEST-001')
      expect(result.nomeComercial).toBe('Test Product 1')
      expect(result.status).toBe('ATIVO')
      createdProductId = result.id
    })

    it('should update a product', async () => {
      const updated = await prisma.product.update({
        where: { id: createdProductId },
        data: {
          descricaoComercialCurta: 'Updated description',
        },
      })

      expect(updated.descricaoComercialCurta).toBe('Updated description')
    })

    it('should fetch a product by slug', async () => {
      const product = await prisma.product.findUnique({
        where: { slug: 'test-product-1' },
      })

      expect(product).not.toBeNull()
      expect(product?.nomeComercial).toBe('Test Product 1')
    })

    it('should list products with pagination', async () => {
      const result = await prisma.product.findMany({
        where: { status: 'ATIVO' },
        skip: 0,
        take: 10,
      })

      expect(Array.isArray(result)).toBe(true)
    })

    it('should prevent duplicate slugs', async () => {
      try {
        await prisma.product.create({
          data: {
            slug: 'test-product-1', // duplicate
            codigo: 'BB-TEST-002',
            nomeComercial: 'Another Product',
            descricaoComercialCurta: 'Test',
            status: 'ATIVO',
            tipoProduto: 'SAAS_BB',
            modeloContratado: 'SUBSCRICAO',
            modeloFaturamento: 'RECORRENTE',
            dependenciaComercial: 'NENHUMA',
          },
        })
        fail('Should have thrown an error for duplicate slug')
      } catch (error: any) {
        expect(error.code).toBe('P2002')
      }
    })

    it('should handle fiscal status blocking', async () => {
      const product = await prisma.product.create({
        data: {
          slug: 'test-product-blocked',
          codigo: 'BB-TEST-003',
          nomeComercial: 'Blocked Product',
          descricaoComercialCurta: 'Test',
          status: 'RASCUNHO',
          tipoProduto: 'SAAS_BB',
          modeloContratado: 'SUBSCRICAO',
          modeloFaturamento: 'RECORRENTE',
          dependenciaComercial: 'NENHUMA',
          fiscalStatus: 'A_VALIDAR',
        },
      })

      expect(product.fiscalStatus).toBe('A_VALIDAR')
    })

    it('should support product dependencies', async () => {
      const baseProduct = await prisma.product.findFirst()
      if (!baseProduct) throw new Error('No base product found')

      const dependentProduct = await prisma.product.create({
        data: {
          slug: 'test-product-dependent',
          codigo: 'BB-TEST-004',
          nomeComercial: 'Dependent Product',
          descricaoComercialCurta: 'Test',
          status: 'ATIVO',
          tipoProduto: 'SAAS_BB',
          modeloContratado: 'SUBSCRICAO',
          modeloFaturamento: 'RECORRENTE',
          dependenciaComercial: 'RECOMENDADO',
          produtoBase: baseProduct.slug,
        },
      })

      expect(dependentProduct.dependenciaComercial).toBe('RECOMENDADO')
      expect(dependentProduct.produtoBase).toBe(baseProduct.slug)
    })
  })

  describe('Product Seeding', () => {
    it('should have seeded all 15 products', async () => {
      const count = await prisma.product.count()
      expect(count).toBeGreaterThanOrEqual(15)
    })

    it('should have INTEGRADOR product', async () => {
      const product = await prisma.product.findUnique({
        where: { slug: 'integrador-provisionador' },
      })
      expect(product).not.toBeNull()
      expect(product?.codigo).toBe('105101')
    })

    it('should have SUPORTE_M365 product', async () => {
      const product = await prisma.product.findUnique({
        where: { slug: 'suporte-m365' },
      })
      expect(product).not.toBeNull()
      expect(product?.codigo).toBe('109101')
    })
  })
})
