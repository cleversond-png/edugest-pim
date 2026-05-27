/**
 * productAiCompleter.ts — IA-powered field generation for products
 * Generates financeiro fields automatically
 */

import Anthropic from "@anthropic-ai/sdk"
import { PrismaClient, Product } from "@prisma/client"

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

interface GeneratedFinanceiro {
  precoBaseUnitario: number
  margemSugerida: number
  descontoMaximo: number
  faixasPreco: Array<{
    perfil: string
    qtdMinima: number
    qtdMaxima: number
    precoUnitario: number
    descricaoFaixa: string
  }>
  pacotesCredito?: Array<{
    nome: string
    horas: number
    precoTotal: number
    desconto: number
  }>
}

/**
 * Gera preços e estrutura financeira baseado em produto + tipo + público
 */
export async function generateFinanceiroFields(product: Product): Promise<GeneratedFinanceiro> {
  const prompt = `Você é especialista em precificação de produtos educacionais SaaS no contexto do Banco do Brasil.

Recebeu um produto com os seguintes dados:
- Nome: "${product.nomeComercial}"
- Tipo: ${product.tipoProduto}
- Modelo de Contratação: ${product.modeloContratado}
- Modelo de Faturamento: ${product.modeloFaturamento}
- Dores Atendidas: ${product.doresAtendidas.join(", ")}
- Público-Alvo: ${product.publicoAlvo.join(", ")}
- Diferenciais: ${product.diferenciais.join(", ")}

Baseado nestes dados:
1. Estime um preço base unitário em BRL para entrada do produto
2. Sugira uma margem comercial apropriada (%)
3. Determine desconto máximo aceitável para negociação
4. Crie faixas de preço diferenciadas por público-alvo
5. Se contratação = CREDITO, gere pacotes de crédito

Retorne em JSON válido (sem markdown code blocks):
{
  "precoBaseUnitario": <número>,
  "margemSugerida": <número 0-100>,
  "descontoMaximo": <número 0-50>,
  "faixasPreco": [
    {
      "perfil": "ESCOLA_PEQUENA|ESCOLA_MEDIA|REDE_GRANDE",
      "qtdMinima": <número>,
      "qtdMaxima": <número>,
      "precoUnitario": <número>,
      "descricaoFaixa": "<descrição>"
    }
  ],
  "pacotesCredito": [
    {
      "nome": "<nome>",
      "horas": <número>,
      "precoTotal": <número>,
      "desconto": <número 0-30>
    }
  ]
}

IMPORTANTE:
- Preços realistas para mercado educacional brasileiro
- Margens entre 15% e 40% dependendo de tipo
- Descontos máximos variam por tipo (SaaS: 20%, Serviços: 40%)
- Faixas devem ser progressivas e com desconto para volumes
- Pacotes de crédito apenas se houver contratação = CREDITO`

  const message = await anthropic.messages.create({
    model: "claude-opus-4-7",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: prompt,
      },
    ],
  })

  const content = message.content[0]
  if (content.type !== "text") {
    throw new Error("Unexpected response type from Claude")
  }

  let jsonText = content.text
  // Remove markdown code blocks if present
  if (jsonText.includes("```json")) {
    jsonText = jsonText.replace(/```json\n?/g, "").replace(/```\n?/g, "")
  } else if (jsonText.includes("```")) {
    jsonText = jsonText.replace(/```\n?/g, "")
  }

  const generated: GeneratedFinanceiro = JSON.parse(jsonText.trim())

  // Ensure faixasPreco is always present
  if (!generated.faixasPreco || generated.faixasPreco.length === 0) {
    generated.faixasPreco = [
      {
        perfil: "ESCOLA_PEQUENA",
        qtdMinima: 1,
        qtdMaxima: 10,
        precoUnitario: generated.precoBaseUnitario,
        descricaoFaixa: "Para escolas pequenas",
      },
      {
        perfil: "ESCOLA_MEDIA",
        qtdMinima: 11,
        qtdMaxima: 50,
        precoUnitario: Math.round(generated.precoBaseUnitario * 0.85 * 100) / 100,
        descricaoFaixa: "Desconto para escolas médias",
      },
      {
        perfil: "REDE_GRANDE",
        qtdMinima: 51,
        qtdMaxima: 99999,
        precoUnitario: Math.round(generated.precoBaseUnitario * 0.7 * 100) / 100,
        descricaoFaixa: "Desconto premium para grandes redes",
      },
    ]
  }

  // Only generate pacotes if CREDITO model
  if (product.modeloContratado !== "CREDITO") {
    delete generated.pacotesCredito
  }

  return generated
}

/**
 * Completa um produto com campos gerados por IA
 * Chamado em background após criação do produto
 */
export async function completeProductWithAI(
  prisma: PrismaClient,
  productId: string
): Promise<Product> {
  const product = await prisma.product.findUniqueOrThrow({ where: { id: productId } })

  try {
    // Generate financeiro fields
    const financeiro = await generateFinanceiroFields(product)

    // Build update data conditionally
    const updateData: any = {
      precoBaseUnitario: financeiro.precoBaseUnitario,
      margemSugerida: financeiro.margemSugerida,
      descontoMaximo: financeiro.descontoMaximo,
      faixasPreco: financeiro.faixasPreco,
    }

    // Only include pacotesCredito if present
    if (financeiro.pacotesCredito && financeiro.pacotesCredito.length > 0) {
      updateData.pacotesCredito = financeiro.pacotesCredito
    }

    const updated = await prisma.product.update({
      where: { id: productId },
      data: updateData,
    })

    console.log(`[AI] ✅ Generated financeiro fields for product ${productId}`)
    return updated
  } catch (error) {
    console.error(`[AI] ❌ Failed to generate financeiro for ${productId}:`, error)
    // Return product unchanged on error — don't block the flow
    return product
  }
}
