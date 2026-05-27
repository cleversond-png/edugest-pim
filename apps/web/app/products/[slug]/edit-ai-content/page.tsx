import { notFound } from "next/navigation"
import { GenerationStatusBanner } from "@/components/product/GenerationStatusBanner"
import { FinancialEditPanel } from "@/components/product/FinancialEditPanel"

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"
const API_KEY = process.env.API_KEY

interface FaixaPreco {
  perfil: string
  qtdMinima: number
  qtdMaxima: number
  precoUnitario: number
  descricaoFaixa: string
}

interface PacoteCredito {
  nome: string
  horas: number
  precoTotal: number
  desconto: number
}

interface ProductData {
  id: string
  slug: string
  nomeComercial: string
  status: string
  modeloContratado?: string
  precoBaseUnitario?: number
  margemSugerida?: number
  descontoMaximo?: number
  faixasPreco?: FaixaPreco[]
  pacotesCredito?: PacoteCredito[]
  contextoGeral?: string
  porQueExiste?: string
  paraquemE?: string
  naoConfundirCom?: string
  roadmapPublico?: string
  cases?: any[]
  objecoesRespostas?: any[]
  scriptVenda?: string
  faq?: any[]
  problemasConhecidos?: string[]
  troubleshootingGuia?: string
}

interface ApiResponse {
  data: ProductData
}

async function getProduct(slug: string): Promise<ProductData | null> {
  try {
    const response = await fetch(`${API_BASE}/api/products/${slug}`, {
      headers: {
        "X-Api-Key": API_KEY || "",
      },
      cache: "no-store",
    })

    if (!response.ok) {
      return null
    }

    const result: ApiResponse = await response.json()
    return result.data
  } catch {
    return null
  }
}

export default async function EditAiContentPage({ params }: { params: { slug: string } }) {
  const product = await getProduct(params.slug)

  if (!product) {
    notFound()
  }

  return (
    <div className="flex flex-col flex-1 bg-gradient-to-br from-blue-50 to-indigo-100">
      <header className="border-b border-gray-200 bg-white shadow-sm">
        <div className="mx-auto max-w-5xl px-6 py-8">
          <h1 className="text-3xl font-bold text-gray-900">Revisar Conteúdo Gerado</h1>
          <p className="mt-2 text-gray-600">{product.nomeComercial}</p>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-8 space-y-6">
        {/* Generation Status Banner */}
        <GenerationStatusBanner slug={params.slug} />

        {/* Financial Panel — DESTAQUE PRINCIPAL */}
        <FinancialEditPanel
          slug={params.slug}
          modeloContratado={product.modeloContratado || "SUBSCRICAO"}
          initialData={{
            precoBaseUnitario: product.precoBaseUnitario,
            margemSugerida: product.margemSugerida,
            descontoMaximo: product.descontoMaximo,
            faixasPreco: product.faixasPreco as FaixaPreco[] | undefined,
            pacotesCredito: product.pacotesCredito as PacoteCredito[] | undefined,
          }}
        />

        {/* Onboarding Section */}
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-xl font-bold text-gray-900">📝 Onboarding</h2>
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Contexto Geral</h3>
              <p className="text-gray-600 text-sm whitespace-pre-wrap">{product.contextoGeral || "—"}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Por Que Existe</h3>
              <p className="text-gray-600 text-sm whitespace-pre-wrap">{product.porQueExiste || "—"}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Para Quem É</h3>
              <p className="text-gray-600 text-sm whitespace-pre-wrap">{product.paraquemE || "—"}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Não Confundir Com</h3>
              <p className="text-gray-600 text-sm whitespace-pre-wrap">{product.naoConfundirCom || "—"}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Roadmap Público</h3>
              <p className="text-gray-600 text-sm whitespace-pre-wrap">{product.roadmapPublico || "—"}</p>
            </div>
          </div>
        </div>

        {/* Marketing Section */}
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-xl font-bold text-gray-900">💼 Marketing</h2>
          <div className="space-y-4">
            {product.cases && product.cases.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Cases</h3>
                <div className="space-y-2">
                  {product.cases.map((c, i) => (
                    <div key={i} className="text-xs bg-gray-50 p-3 rounded border border-gray-200">
                      <p className="font-medium text-gray-900">{c.cliente}</p>
                      <p className="text-gray-600">Desafio: {c.desafio}</p>
                      <p className="text-gray-600">Solução: {c.solucao}</p>
                      <p className="text-gray-600">Resultado: {c.resultado}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {product.scriptVenda && (
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Script de Venda</h3>
                <p className="text-gray-600 text-xs whitespace-pre-wrap bg-gray-50 p-3 rounded border border-gray-200">
                  {product.scriptVenda}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Support Section */}
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-xl font-bold text-gray-900">📞 Suporte</h2>
          <div className="space-y-4">
            {product.faq && product.faq.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">FAQ</h3>
                <div className="space-y-2">
                  {product.faq.map((q, i) => (
                    <div key={i} className="text-xs bg-gray-50 p-3 rounded border border-gray-200">
                      <p className="font-medium text-gray-900">P: {q.pergunta}</p>
                      <p className="text-gray-600">R: {q.resposta}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {product.troubleshootingGuia && (
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Troubleshooting</h3>
                <p className="text-gray-600 text-xs whitespace-pre-wrap bg-gray-50 p-3 rounded border border-gray-200">
                  {product.troubleshootingGuia}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4">
          <a
            href={`/products/${product.slug}`}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-lg text-center"
          >
            ✓ Publicar Produto
          </a>
          <a
            href="/products"
            className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-900 font-medium py-3 rounded-lg text-center"
          >
            ← Voltar
          </a>
        </div>
      </main>
    </div>
  )
}
