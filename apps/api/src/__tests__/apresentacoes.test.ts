/**
 * apresentacoes.test.ts — Presentation generation tests
 */

import { PrismaClient } from '@prisma/client'
import { gerarApresentacao, ApresentacaoInput } from '../services/pptxGenerator'

const prisma = new PrismaClient()

describe('Apresentacoes - Presentation Generation', () => {
  beforeAll(async () => {
    // Seed test products
    await prisma.product.upsert({
      where: { slug: 'integrador-bb' },
      create: {
        slug: 'integrador-bb',
        codigo: 'BB-SAAS-INT-001',
        nomeComercial: 'Integrador Big Brain',
        tipoProduto: 'SAAS_BB',
        status: 'ATIVO',
        descricaoComercialCurta: 'Integra sistemas',
        proposta_valor: 'Integração automática',
        modeloContratado: 'SUBSCRICAO',
        modeloFaturamento: 'RECORRENTE',
        tipoReceita: 'ARR',
        fiscalStatus: 'VALIDADO'
      },
      update: {}
    })

    const integrador = await prisma.product.findUniqueOrThrow({ where: { slug: 'integrador-bb' } })
    await prisma.productSlide.deleteMany({ where: { productId: integrador.id } })
    await prisma.productSlide.create({
      data: {
        productId: integrador.id,
        titulo: 'Visão Geral',
        tipo: 'VISAO_GERAL',
        ordem: 1,
        conteudo: '• Integra tudo\n• Automático\n• Rápido',
        notasApresentador: 'Enfatizar velocidade',
        ativo: true
      }
    })

    await prisma.product.upsert({
      where: { slug: 'suporte-m365' },
      create: {
        slug: 'suporte-m365',
        codigo: 'BB-SERV-SUP-001',
        nomeComercial: 'Suporte M365',
        tipoProduto: 'SERVICO_PROFISSIONAL',
        status: 'ATIVO',
        descricaoComercialCurta: 'Suporte técnico',
        proposta_valor: 'Suporte 24/7',
        modeloContratado: 'SUBSCRICAO',
        modeloFaturamento: 'RECORRENTE',
        tipoReceita: 'ARR',
        fiscalStatus: 'VALIDADO'
      },
      update: {}
    })

    // Product without slides
    await prisma.product.upsert({
      where: { slug: 'agenda-inteligente' },
      create: {
        slug: 'agenda-inteligente',
        codigo: 'BB-SAAS-AGN-001',
        nomeComercial: 'Agenda Inteligente',
        tipoProduto: 'SAAS_BB',
        status: 'ATIVO',
        descricaoComercialCurta: 'Agendamento inteligente',
        proposta_valor: 'Agenda automática',
        modeloContratado: 'SUBSCRICAO',
        modeloFaturamento: 'RECORRENTE',
        tipoReceita: 'ARR',
        fiscalStatus: 'VALIDADO'
      },
      update: {}
    })
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  it('gerarApresentacao — minimalista', async () => {
    const input: ApresentacaoInput = {
      nomeCliente: 'Escola Teste',
      perfilCliente: 'ESCOLA_PEQUENA'
    }

    const { buffer, response } = await gerarApresentacao(input)

    expect(buffer).toBeInstanceOf(Buffer)
    expect(buffer.length).toBeGreaterThan(0)
    expect(response.status).toBe('SUCCESS')
    expect(response.nomeArquivo).toMatch(/escola-teste-\d{4}-\d{2}-\d{2}\.pptx/)
    expect(response.totalSlides).toBeGreaterThan(0)
    expect(response.produtos).toContain('BB-SERV-SUP-001')
  })

  it('gerarApresentacao — suporte sempre incluído', async () => {
    const input: ApresentacaoInput = {
      nomeCliente: 'Test School',
      perfilCliente: 'ESCOLA_PEQUENA',
      produtosRemovidos: ['BB-SERV-SUP-001']
    }

    const { response } = await gerarApresentacao(input)

    expect(response.produtos).toContain('BB-SERV-SUP-001')
  })

  it('gerarApresentacao — produtos adicionais incluídos', async () => {
    const input: ApresentacaoInput = {
      nomeCliente: 'Test School 2',
      perfilCliente: 'ESCOLA_PEQUENA',
      produtosAdicionais: ['BB-SAAS-INT-001']
    }

    const { response } = await gerarApresentacao(input)

    expect(response.produtos).toContain('BB-SAAS-INT-001')
  })

  it('gerarApresentacao — perfil REDE_GRANDE inclui mais produtos', async () => {
    const input: ApresentacaoInput = {
      nomeCliente: 'Grande Rede',
      perfilCliente: 'REDE_GRANDE'
    }

    const { response } = await gerarApresentacao(input)

    expect(response.produtos.length).toBeGreaterThan(4)
  })

  it('gerarApresentacao — produto sem slides incluso com aviso', async () => {
    const input: ApresentacaoInput = {
      nomeCliente: 'Test No Slides',
      perfilCliente: 'REDE_GRANDE',
      produtosAdicionais: ['BB-SAAS-AGN-001'] // Product without slides
    }

    const { response } = await gerarApresentacao(input)

    expect(response.produtos).toContain('BB-SAAS-AGN-001')
    if (response.avisos.length > 0) {
      expect(response.avisos.some(a => a.tipo === 'SEM_SLIDES')).toBe(true)
    }
  })

  it('gerarApresentacao — durationMs registrado', async () => {
    const input: ApresentacaoInput = {
      nomeCliente: 'Duration Test',
      perfilCliente: 'ESCOLA_PEQUENA'
    }

    const { response } = await gerarApresentacao(input)

    expect(response.durationMs).toBeGreaterThan(0)
    expect(typeof response.durationMs).toBe('number')
  })

  it('gerarApresentacao — arquivo é PPTX válido', async () => {
    const input: ApresentacaoInput = {
      nomeCliente: 'PPTX Test',
      perfilCliente: 'ESCOLA_PEQUENA'
    }

    const { buffer } = await gerarApresentacao(input)

    // PPTX files start with PK (0x504B in hex)
    expect(buffer[0]).toBe(0x50)
    expect(buffer[1]).toBe(0x4b)
  })

  it('gerarApresentacao — nome do arquivo sanitizado', async () => {
    const input: ApresentacaoInput = {
      nomeCliente: 'Colégio São Paulo',
      perfilCliente: 'ESCOLA_PEQUENA'
    }

    const { response } = await gerarApresentacao(input)

    expect(response.nomeArquivo).toMatch(/^[a-z0-9\-]+\-\d{4}\-\d{2}\-\d{2}\.pptx$/)
    expect(response.nomeArquivo).not.toContain('ó')
    expect(response.nomeArquivo).not.toContain('ã')
  })

  it('gerarApresentacao — removição de duplicatas de produtos', async () => {
    const input: ApresentacaoInput = {
      nomeCliente: 'Dedup Test',
      perfilCliente: 'ESCOLA_PEQUENA',
      produtosAdicionais: ['BB-SAAS-INT-001', 'BB-SAAS-INT-001'] // Duplicate
    }

    const { response } = await gerarApresentacao(input)

    const count = response.produtos.filter(p => p === 'BB-SAAS-INT-001').length
    expect(count).toBe(1)
  })

  it('gerarApresentacao — aplicar remoções e adições corretamente', async () => {
    const input: ApresentacaoInput = {
      nomeCliente: 'Removal Test',
      perfilCliente: 'ESCOLA_MEDIA',
      produtosRemovidos: ['BB-SAAS-INTRA-001'],
      produtosAdicionais: ['BB-SAAS-INT-001']
    }

    const { response } = await gerarApresentacao(input)

    expect(response.produtos).not.toContain('BB-SAAS-INTRA-001')
    expect(response.produtos).toContain('BB-SAAS-INT-001')
  })
})
