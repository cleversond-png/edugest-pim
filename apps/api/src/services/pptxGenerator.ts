/**
 * pptxGenerator.ts — Generate .pptx presentations from product data
 */

import PptxGenJS from 'pptxgenjs'
import Anthropic from '@anthropic-ai/sdk'
import { PrismaClient } from '@prisma/client'
import { logger } from '../utils/logger'

const prisma = new PrismaClient()

const PERFIS_CLIENTE = {
  ESCOLA_PEQUENA: {
    label: 'Escola Pequena (até ~500 alunos)',
    produtos: ['BB-SAAS-INT-001', 'BB-SAAS-INTRA-001', 'BB-SERV-FORM-001', 'BB-SERV-SUP-001']
  },
  ESCOLA_MEDIA: {
    label: 'Escola Média (500–2.000 alunos)',
    produtos: ['BB-SAAS-INT-001', 'BB-SAAS-INTRA-001', 'BB-SAAS-PORT-001', 'BB-SERV-FORM-001', 'BB-SERV-SUP-001']
  },
  REDE_GRANDE: {
    label: 'Rede / Grande (redes e grupos)',
    produtos: ['BB-SAAS-INT-001', 'BB-SAAS-INTRA-001', 'BB-SAAS-PORT-001', 'BB-SAAS-CO-001', 'BB-SAAS-HD-001', 'BB-SAAS-INS-001', 'BB-SERV-CONS-001', 'BB-SERV-FORM-001', 'BB-SERV-SUP-001']
  }
} as const

const PRODUTO_OBRIGATORIO = 'BB-SERV-SUP-001'

export interface ApresentacaoInput {
  nomeCliente: string
  perfilCliente: keyof typeof PERFIS_CLIENTE
  logoCliente?: string // base64 or URL
  dorCliente?: string
  produtosAdicionais?: string[]
  produtosRemovidos?: string[]
  nomeComercial?: string
  emailComercial?: string
}

interface SlideAgendado {
  tipo: 'CAPA' | 'CENARIO_ATUAL' | 'DORES' | 'PRODUTO' | 'PROXIMOS_PASSOS' | 'CONTATO'
  dados: Record<string, any>
}

interface GeneratedSlides {
  cenarioAtual: string[]
  dores: string[]
}

interface ApresentacaoResponse {
  status: 'SUCCESS' | 'PARTIAL_SUCCESS'
  nomeArquivo: string
  totalSlides: number
  produtos: string[]
  avisos: Array<{ produto: string; tipo: string; mensagem: string }>
  downloadUrl: string
  durationMs: number
}

function montarListaSlides(input: ApresentacaoInput): { agenda: SlideAgendado[]; produtosCodigos: string[] } {
  const perfil = PERFIS_CLIENTE[input.perfilCliente]
  const produtosDoPerfil = [...(perfil.produtos as any as string[])]

  // Apply removals and additions
  let produtosFinal: string[] = produtosDoPerfil.filter(p => !input.produtosRemovidos?.includes(p))
  if (input.produtosAdicionais?.length) {
    produtosFinal = [...produtosFinal, ...input.produtosAdicionais]
  }

  // Ensure mandatory product is present
  if (!produtosFinal.includes(PRODUTO_OBRIGATORIO)) {
    produtosFinal.push(PRODUTO_OBRIGATORIO)
  }

  // Remove duplicates
  const produtosUnicos = [...new Set(produtosFinal)]

  // Build agenda
  const agenda: SlideAgendado[] = [
    { tipo: 'CAPA', dados: { nomeCliente: input.nomeCliente, logoCliente: input.logoCliente } },
  ]

  if (input.dorCliente) {
    agenda.push(
      { tipo: 'CENARIO_ATUAL', dados: { dor: input.dorCliente } },
      { tipo: 'DORES', dados: { dor: input.dorCliente } }
    )
  }

  // Product slides will be added after fetching from DB
  agenda.push(
    { tipo: 'PROXIMOS_PASSOS', dados: { produtos: produtosUnicos } },
    { tipo: 'CONTATO', dados: { nome: input.nomeComercial || 'Big Brain', email: input.emailComercial || 'contato@bigbrain.com.br' } }
  )

  return { agenda, produtosCodigos: produtosUnicos }
}

async function generateDynamicSlides(nomeCliente: string, perfilLabel: string, dorCliente: string): Promise<GeneratedSlides> {
  const client = new Anthropic()

  const prompt = `Você é um consultor de vendas B2B especializado em tecnologia educacional.
O comercial acabou de sair de uma reunião com este cliente:

NOME DO CLIENTE: ${nomeCliente}
PERFIL: ${perfilLabel}
DOR RELATADA: ${dorCliente}

Gere EXATAMENTE 2 seções em JSON:
1. "cenarioAtual": array de 3-4 bullets descrevendo o cenário atual do cliente (problemas, processos manuais, ineficiências)
2. "dores": array de 3-5 bullets com as dores principais em formato impactante (curto, direto)

Responda APENAS com JSON, sem texto adicional.`

  const response = await client.messages.create({
    model: 'claude-opus-4-7',
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }]
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : ''
  const parsed = JSON.parse(text) as GeneratedSlides
  return parsed
}

async function gerarPptx(agenda: SlideAgendado[], avisos: Array<{ produto: string; tipo: string; mensagem: string }>): Promise<Buffer> {
  const pptx = new PptxGenJS()

  pptx.defineLayout({ name: 'LAYOUT_WIDE', width: 10, height: 5.625 })
  pptx.layout = 'LAYOUT_WIDE'
  pptx.theme = { headFontFace: 'Segoe UI', bodyFontFace: 'Segoe UI' }

  const colors = {
    primary: '2D5DB8',
    darkText: '1F1F1F',
    lightGray: 'F5F5F5',
    white: 'FFFFFF'
  }

  for (const slide of agenda) {
    const s = pptx.addSlide()

    switch (slide.tipo) {
      case 'CAPA': {
        s.background = { color: colors.primary }
        s.addText(slide.dados.nomeCliente, {
          x: 0.5, y: 2, w: 9, h: 1.5,
          fontSize: 54, bold: true, color: colors.white, align: 'center'
        })
        const data = new Date().toLocaleDateString('pt-BR')
        s.addText(data, {
          x: 0.5, y: 4, w: 9, h: 0.5,
          fontSize: 14, color: colors.lightGray, align: 'center'
        })
        break
      }

      case 'CENARIO_ATUAL': {
        s.background = { color: colors.white }
        s.addText('Cenário Atual', {
          x: 0.5, y: 0.3, w: 9, h: 0.4,
          fontSize: 32, bold: true, color: colors.primary
        })

        const bullets = slide.dados.bullets || []
        let yPos = 0.9
        bullets.forEach((bullet: string) => {
          s.addText(`• ${bullet}`, {
            x: 0.7, y: yPos, w: 8.6, h: 0.4,
            fontSize: 14, color: colors.darkText
          })
          yPos += 0.5
        })
        break
      }

      case 'DORES': {
        s.background = { color: colors.white }
        s.addText('Dores Principais', {
          x: 0.5, y: 0.3, w: 9, h: 0.4,
          fontSize: 32, bold: true, color: colors.primary
        })

        const bullets = slide.dados.bullets || []
        let yPos = 0.9
        bullets.forEach((bullet: string) => {
          s.addText(`• ${bullet}`, {
            x: 0.7, y: yPos, w: 8.6, h: 0.4,
            fontSize: 14, color: colors.darkText, bold: true
          })
          yPos += 0.6
        })
        break
      }

      case 'PRODUTO': {
        s.background = { color: colors.white }
        s.addText(slide.dados.titulo || 'Produto', {
          x: 0.5, y: 0.3, w: 9, h: 0.4,
          fontSize: 28, bold: true, color: colors.primary
        })

        if (slide.dados.conteudo) {
          s.addText(slide.dados.conteudo, {
            x: 0.7, y: 0.9, w: 8.6, h: 3.8,
            fontSize: 12, color: colors.darkText
          })
        }
        break
      }

      case 'PROXIMOS_PASSOS': {
        s.background = { color: colors.white }
        s.addText('Próximos Passos', {
          x: 0.5, y: 0.3, w: 9, h: 0.4,
          fontSize: 32, bold: true, color: colors.primary
        })

        const produtos = slide.dados.produtos || []
        let yPos = 0.9
        produtos.forEach((prod: string) => {
          s.addText(`✓ ${prod}`, {
            x: 0.7, y: yPos, w: 8.6, h: 0.4,
            fontSize: 12, color: colors.darkText
          })
          yPos += 0.4
        })

        s.addText('Vamos começar?', {
          x: 0.5, y: 4.5, w: 9, h: 0.5,
          fontSize: 20, bold: true, color: colors.primary, align: 'center'
        })
        break
      }

      case 'CONTATO': {
        s.background = { color: colors.primary }
        s.addText('Contato', {
          x: 0.5, y: 1.5, w: 9, h: 0.5,
          fontSize: 32, bold: true, color: colors.white, align: 'center'
        })

        s.addText(slide.dados.nome, {
          x: 0.5, y: 2.3, w: 9, h: 0.3,
          fontSize: 16, color: colors.white, align: 'center'
        })

        if (slide.dados.email) {
          s.addText(slide.dados.email, {
            x: 0.5, y: 2.7, w: 9, h: 0.3,
            fontSize: 14, color: colors.lightGray, align: 'center'
          })
        }

        s.addText('www.bigbrain.com.br', {
          x: 0.5, y: 3.5, w: 9, h: 0.3,
          fontSize: 12, color: colors.lightGray, align: 'center'
        })
        break
      }
    }
  }

  const stream = await pptx.stream()
  return Buffer.from(stream as any)
}

function sanitizeFileName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

export async function gerarApresentacao(input: ApresentacaoInput): Promise<{ buffer: Buffer; response: ApresentacaoResponse }> {
  const startTime = Date.now()
  const avisos: Array<{ produto: string; tipo: string; mensagem: string }> = []

  // Mount slide list
  const { agenda, produtosCodigos } = montarListaSlides(input)

  // Fetch product slides from database
  const produtos = await prisma.product.findMany({
    where: { codigo: { in: produtosCodigos } },
    include: { productSlides: { where: { ativo: true }, orderBy: { ordem: 'asc' } } }
  })

  // Insert dynamic slides if dorCliente provided
  if (input.dorCliente) {
    const perfil = PERFIS_CLIENTE[input.perfilCliente]
    const dynamicSlides = await generateDynamicSlides(input.nomeCliente, perfil.label, input.dorCliente)

    const cenarioIdx = agenda.findIndex(s => s.tipo === 'CENARIO_ATUAL')
    const doresIdx = agenda.findIndex(s => s.tipo === 'DORES')

    if (cenarioIdx >= 0) agenda[cenarioIdx].dados.bullets = dynamicSlides.cenarioAtual
    if (doresIdx >= 0) agenda[doresIdx].dados.bullets = dynamicSlides.dores
  }

  // Insert product slides before PROXIMOS_PASSOS
  const proximosIdx = agenda.findIndex(s => s.tipo === 'PROXIMOS_PASSOS')
  let insertPos = proximosIdx

  for (const produto of produtos) {
    if (produto.productSlides.length === 0) {
      avisos.push({
        produto: produto.codigo || '',
        tipo: 'SEM_SLIDES',
        mensagem: `${produto.nomeComercial} não tem slides cadastrados. Slide placeholder incluído.`
      })

      agenda.splice(insertPos, 0, {
        tipo: 'PRODUTO',
        dados: { titulo: `${produto.nomeComercial} - Placeholder`, conteudo: 'Slides para este produto ainda não foram cadastrados.' }
      })
      insertPos++
    } else {
      for (const slide of produto.productSlides) {
        agenda.splice(insertPos, 0, {
          tipo: 'PRODUTO',
          dados: { titulo: slide.titulo, conteudo: slide.conteudo }
        })
        insertPos++
      }
    }
  }

  // Generate PPTX
  const pptxBuffer = await gerarPptx(agenda, avisos)

  const nomeArquivo = `${sanitizeFileName(input.nomeCliente)}-${new Date().toISOString().split('T')[0]}.pptx`
  const durationMs = Date.now() - startTime

  return {
    buffer: pptxBuffer,
    response: {
      status: avisos.length > 0 ? 'PARTIAL_SUCCESS' : 'SUCCESS',
      nomeArquivo,
      totalSlides: agenda.length,
      produtos: produtosCodigos,
      avisos,
      downloadUrl: `/api/apresentacoes/download/${encodeURIComponent(nomeArquivo)}`,
      durationMs
    }
  }
}
