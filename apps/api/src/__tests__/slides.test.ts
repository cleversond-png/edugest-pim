import { PrismaClient, SlideType } from '@prisma/client'

const prisma = new PrismaClient()

describe('ProductSlides CRUD', () => {
  let product: any
  let createdSlideIds: string[] = []

  beforeAll(async () => {
    // Use existing product from seed
    product = await prisma.product.findFirst({
      where: { slug: 'integrador-provisionador' },
    })
    if (!product) throw new Error('Test product not found')
  })

  afterAll(async () => {
    // Cleanup created slides
    if (createdSlideIds.length > 0) {
      await prisma.productSlide.deleteMany({
        where: { id: { in: createdSlideIds } },
      })
    }
    await prisma.$disconnect()
  })

  describe('ProductSlide creation', () => {
    it('should create a slide for a product', async () => {
      const slide = await prisma.productSlide.create({
        data: {
          productId: product.id,
          titulo: 'Visão Geral — Integrador Big Brain',
          tipo: 'VISAO_GERAL',
          ordem: 1,
          conteudo: '• Integra sistemas educacionais ao Microsoft 365\n• Provisionamento automático',
          notasApresentador: 'Enfatizar integração bidirecional',
          ativo: true,
        },
      })

      expect(slide.titulo).toBe('Visão Geral — Integrador Big Brain')
      expect(slide.tipo).toBe('VISAO_GERAL')
      expect(slide.ordem).toBe(1)
      expect(slide.ativo).toBe(true)

      createdSlideIds.push(slide.id)
    })

    it('should create multiple slides with different types', async () => {
      const slideTypes: SlideType[] = ['COMO_FUNCIONA', 'DIFERENCIAIS', 'CASES', 'INTEGRACAO', 'ROADMAP']

      for (let i = 0; i < slideTypes.length; i++) {
        const slide = await prisma.productSlide.create({
          data: {
            productId: product.id,
            titulo: `Slide ${slideTypes[i]}`,
            tipo: slideTypes[i],
            ordem: i + 2,
            conteudo: `Conteúdo do slide ${slideTypes[i]}`,
          },
        })
        createdSlideIds.push(slide.id)
        expect(slide.tipo).toBe(slideTypes[i])
      }
    })
  })

  describe('ProductSlide retrieval', () => {
    it('should retrieve all slides for a product', async () => {
      const slides = await prisma.productSlide.findMany({
        where: { productId: product.id },
        orderBy: { ordem: 'asc' },
      })

      expect(slides.length).toBeGreaterThan(0)
      expect(slides[0].ordem).toBeLessThanOrEqual(slides[slides.length - 1].ordem)
    })

    it('should retrieve only active slides', async () => {
      const slides = await prisma.productSlide.findMany({
        where: { productId: product.id, ativo: true },
      })

      expect(slides.every(s => s.ativo)).toBe(true)
    })

    it('should retrieve slides by type', async () => {
      const slides = await prisma.productSlide.findMany({
        where: { productId: product.id, tipo: 'VISAO_GERAL' },
      })

      expect(slides.every(s => s.tipo === 'VISAO_GERAL')).toBe(true)
    })

    it('should retrieve single slide by ID', async () => {
      const firstSlide = await prisma.productSlide.findFirst({
        where: { productId: product.id },
      })

      expect(firstSlide).not.toBeNull()

      const retrieved = await prisma.productSlide.findUnique({
        where: { id: firstSlide!.id },
      })

      expect(retrieved?.id).toBe(firstSlide?.id)
    })
  })

  describe('ProductSlide updates', () => {
    it('should update slide content', async () => {
      const original = await prisma.productSlide.findFirst({
        where: { productId: product.id },
      })

      expect(original).not.toBeNull()

      const updated = await prisma.productSlide.update({
        where: { id: original!.id },
        data: {
          conteudo: 'Novo conteúdo atualizado',
          notasApresentador: 'Novas notas',
        },
      })

      expect(updated.conteudo).toBe('Novo conteúdo atualizado')
      expect(updated.notasApresentador).toBe('Novas notas')
    })

    it('should toggle slide active status', async () => {
      const slide = await prisma.productSlide.findFirst({
        where: { productId: product.id },
      })

      expect(slide).not.toBeNull()

      const toggled = await prisma.productSlide.update({
        where: { id: slide!.id },
        data: { ativo: !slide!.ativo },
      })

      expect(toggled.ativo).toBe(!slide!.ativo)
    })
  })

  describe('ProductSlide reordering', () => {
    it('should maintain order by ordem field', async () => {
      const slides = await prisma.productSlide.findMany({
        where: { productId: product.id },
        orderBy: { ordem: 'asc' },
      })

      if (slides.length > 1) {
        const newOrder = [slides[slides.length - 1].id, ...slides.slice(0, -1).map(s => s.id)]

        for (let i = 0; i < newOrder.length; i++) {
          await prisma.productSlide.update({
            where: { id: newOrder[i] },
            data: { ordem: i + 1 },
          })
        }

        const reordered = await prisma.productSlide.findMany({
          where: { productId: product.id },
          orderBy: { ordem: 'asc' },
        })

        expect(reordered[0].id).toBe(slides[slides.length - 1].id)
      }
    })
  })

  describe('ProductSlide deletion', () => {
    it('should delete a slide', async () => {
      const slide = await prisma.productSlide.findFirst({
        where: { productId: product.id },
      })

      expect(slide).not.toBeNull()

      const slideId = slide!.id

      await prisma.productSlide.delete({
        where: { id: slideId },
      })

      const deleted = await prisma.productSlide.findUnique({
        where: { id: slideId },
      })

      expect(deleted).toBeNull()

      // Remove from cleanup list
      createdSlideIds = createdSlideIds.filter(id => id !== slideId)
    })

    it('should handle cascade delete when product is deleted', async () => {
      // Create a test product with slides
      const testProduct = await prisma.product.create({
        data: {
          slug: `test-cascade-${Date.now()}`,
          codigo: `BB-TEST-CASCADE-${Date.now()}`,
          nomeComercial: 'Test Cascade Product',
          status: 'RASCUNHO',
          tipoProduto: 'SAAS_BB',
          modeloContratado: 'SUBSCRICAO',
          modeloFaturamento: 'RECORRENTE',
          dependenciaComercial: 'NENHUMA',
        },
      })

      const testSlide = await prisma.productSlide.create({
        data: {
          productId: testProduct.id,
          titulo: 'Test Slide for Cascade',
          tipo: 'VISAO_GERAL',
          ordem: 1,
          conteudo: 'Test content',
        },
      })

      // Delete product — cascade should delete slides
      await prisma.product.delete({ where: { id: testProduct.id } })

      // Verify slide was deleted
      const deletedSlide = await prisma.productSlide.findUnique({
        where: { id: testSlide.id },
      })

      expect(deletedSlide).toBeNull()
    })
  })
})
