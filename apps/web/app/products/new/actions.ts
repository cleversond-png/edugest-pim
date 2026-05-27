"use server"

const API_BASE = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"
const API_KEY = process.env.API_KEY

export async function createProductAction(data: {
  nomeComercial: string
  codigo: string
  tipoProduto: string
  status: string
  descricaoComercialCurta: string
  doresAtendidas: string[]
  publicoAlvo: string[]
  diferenciais: string[]
  codigoNBS: string
  temISS: string
  aliquotaISS?: number
  modeloContratado: string
  modeloFaturamento: string
  modeloDeployment: string
  requisitosMinimos: string[]
  tecnologiasBase: string[]
  slaAtendimento: string
  kbArticles: string[]
}) {
  try {
    // Step 1: Create product
    const createResponse = await fetch(`${API_BASE}/api/products`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Api-Key": API_KEY || "",
      },
      body: JSON.stringify({
        codigo: data.codigo,
        nomeComercial: data.nomeComercial,
        tipoProduto: data.tipoProduto,
        status: data.status,
        descricaoComercialCurta: data.descricaoComercialCurta,
        doresAtendidas: data.doresAtendidas,
        publicoAlvo: data.publicoAlvo,
        diferenciais: data.diferenciais,
        codigoNBS: data.codigoNBS,
        temISS: data.temISS,
        aliquotaISS: data.aliquotaISS,
        modeloContratado: data.modeloContratado,
        modeloFaturamento: data.modeloFaturamento,
        modeloDeployment: data.modeloDeployment,
        requisitosMinimos: data.requisitosMinimos,
        tecnologiasBase: data.tecnologiasBase,
        slaAtendimento: data.slaAtendimento,
        kbArticles: data.kbArticles,
      }),
    })

    if (!createResponse.ok) {
      const error = await createResponse.text()
      return {
        success: false,
        error: error || "Erro ao criar produto",
      }
    }

    const result = await createResponse.json()
    const slug = result.slug

    // Backend now automatically generates AI content + documentation (fire-and-forget)
    // No need to manually trigger anything here
    return {
      success: true,
      slug,
      id: result.id,
      _generating: true,
      _message: "✨ Produto criado! IA e documentação estão sendo gerados automaticamente. Aguarde ~30 segundos...",
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro desconhecido",
    }
  }
}
