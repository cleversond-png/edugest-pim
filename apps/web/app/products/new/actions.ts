"use server"

const API_BASE = process.env.API_BASE || "http://localhost:3000"

export async function createProductAction(formData: {
  nomeComercial: string
  nomeInterno: string
  tipoProduto: string
  natureza: string
  status: string
  produtoCore: boolean
  integraJornada: boolean
  descricaoComercialCurta: string
  shortPitch: string
  proposta_valor: string
  doresAtendidas: string[]
  publicoAlvo: string[]
  diferenciais: string[]
  dependenciaComercial: string
  produtoBase: string
  observacoesComerciais: string
  perfilCliente: string[]
  modeloContratado: string
  modeloFaturamento: string
  tipoReceita: string
  unidadeMedida: string
  geraARR: boolean
  centroResultado: string
  grupoCodigo: string
  grupoDescricao: string
  ativo: boolean
  codigoNBS: string
  temISS: string
  aliquotaISS: number
  codigoServico: string
  regimeTributario: string
  observacoesFiscais: string
  fiscalStatus: string
  arquiteturaHLD: string
  requisitosMinimos: string[]
  tecnologiasBase: string[]
  modeloDeployment: string
  integracoesSuportadas: string[]
  limitacoesConhecidas: string
  tempoImplementacao: string
  slaAtendimento: string
  faq: Array<{ pergunta: string; resposta: string }>
  problemasConhecidos: string[]
  troubleshootingGuia: string
  kbArticles: string[]
  cases: Array<{
    cliente: string
    desafio: string
    solucao: string
    resultado: string
  }>
  objecoesRespostas: Array<{
    objecao: string
    resposta: string
    contexto?: string
  }>
  scriptVenda: string
  tagsCopilot: string[]
  contextoGeral: string
  porQueExiste: string
  paraquemE: string
  naoConfundirCom: string
  roadmapPublico: string
  origemTipo: string
  origemDescricao: string
  origemClienteSegmento: string
  origemData: string
  origemResponsavel: string
}) {
  const response = await fetch(`${API_BASE}/api/products`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Api-Key": process.env.API_KEY || "",
    },
    body: JSON.stringify(formData),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(
      error.message || `Failed to create product (status: ${response.status})`
    )
  }

  return response.json()
}
