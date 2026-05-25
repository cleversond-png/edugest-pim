import { generateMasterMd, generateMasterHtml, generateErpExport, generateCrmExport, generatePartnerExport } from '../services/docGenerator'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

describe('Document Generator', () => {
  let testProduct: any

  beforeAll(async () => {
    // Use an existing product from the seed
    testProduct = await prisma.product.findFirst({ where: { slug: 'integrador-provisionador' } })
    if (!testProduct) {
      throw new Error('Test product not found. Run seed first.')
    }
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  describe('generateMasterMd', () => {
    it('should generate master markdown with all product fields', () => {
      const md = generateMasterMd(testProduct)

      expect(md).toContain(testProduct.nomeComercial)
      expect(md).toContain(testProduct.codigo)
      expect(md).toContain(testProduct.slug)
      expect(md).toContain('---') // frontmatter
      expect(md).toContain('# ')
      expect(md).toContain('## ')
    })

    it('should include fiscal status in MASTER', () => {
      const md = generateMasterMd(testProduct)
      expect(md).toContain('Status Fiscal')
    })

    it('should format arrays properly', () => {
      const md = generateMasterMd(testProduct)
      // Should have bullet points for arrays
      expect(md).toMatch(/^- /m)
    })
  })

  describe('generateMasterHtml', () => {
    it('should generate valid HTML from product', () => {
      const html = generateMasterHtml(testProduct)

      expect(html).toContain('<!DOCTYPE html>')
      expect(html).toContain(testProduct.nomeComercial)
      expect(html).toContain('</html>')
    })

    it('should contain metadata in HTML', () => {
      const html = generateMasterHtml(testProduct)
      expect(html).toContain('metadata')
      expect(html).toContain(testProduct.codigo)
    })
  })

  describe('generateErpExport', () => {
    it('should generate ERP export with blocking rules', () => {
      const exportData = generateErpExport(testProduct)

      expect(exportData).toHaveProperty('blocked')
      expect(exportData).toHaveProperty('blockedReasons')
      expect(exportData).toHaveProperty('generatedAt')
      expect(exportData).toHaveProperty('produto')
    })

    it('should block export if fiscalStatus is A_VALIDAR', async () => {
      const uniqueSlug = `test-blocked-${Date.now()}`

      // Cleanup first if exists
      await prisma.product.deleteMany({ where: { slug: uniqueSlug } }).catch(() => {})

      const blockedProduct = await prisma.product.create({
        data: {
          slug: uniqueSlug,
          codigo: `BB-TEST-BLK-${Date.now()}`,
          nomeComercial: 'Blocked Test Product',
          status: 'RASCUNHO',
          tipoProduto: 'SAAS_BB',
          modeloContratado: 'SUBSCRICAO',
          modeloFaturamento: 'RECORRENTE',
          dependenciaComercial: 'NENHUMA',
          fiscalStatus: 'A_VALIDAR',
        },
      })

      const exportData = generateErpExport(blockedProduct)
      expect(exportData.blocked).toBe(true)
      expect(exportData.blockedReasons[0]).toContain('A_VALIDAR')

      // Cleanup
      await prisma.product.delete({ where: { slug: uniqueSlug } })
    })

    it('should include all required fields', () => {
      const exportData = generateErpExport(testProduct)
      const produto = exportData.produto

      expect(produto).toHaveProperty('codigo')
      expect(produto).toHaveProperty('nomeComercial')
      expect(produto).toHaveProperty('tipoProduto')
      expect(produto).toHaveProperty('modeloContratado')
      expect(produto).toHaveProperty('modeloFaturamento')
    })
  })

  describe('generateCrmExport', () => {
    it('should generate CRM export with product info', () => {
      const exportData = generateCrmExport(testProduct)

      expect(exportData).toHaveProperty('generatedAt')
      expect(exportData).toHaveProperty('produto')
      expect(exportData.produto).toHaveProperty('nome')
      expect(exportData.produto).toHaveProperty('descricaoCurta')
      expect(exportData.produto).toHaveProperty('perfilCliente')
    })
  })

  describe('generatePartnerExport', () => {
    it('should generate Partner Center export', () => {
      const exportData = generatePartnerExport(testProduct)

      expect(exportData).toHaveProperty('generatedAt')
      expect(exportData).toHaveProperty('produto')
      expect(exportData.produto).toHaveProperty('titulo')
      expect(exportData.produto).toHaveProperty('descricaoCurta')
      expect(exportData.produto).toHaveProperty('mercados')
      expect(exportData.produto.mercados).toContain('BR')
    })
  })
})
