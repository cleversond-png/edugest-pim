"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { AlertCircle, ArrowLeft, Edit3, Trash2 } from "lucide-react"

interface Product {
  id: string
  slug: string
  nomeComercial: string
  descricaoComercialCurta?: string | null
  proposta_valor?: string | null
  tipoProduto: string
  natureza: string
  status: string
  codigo?: string | null
  modeloContratado?: string
  modeloFaturamento?: string
  tipoReceita?: string
  unidadeMedida?: string
  fiscalStatus?: string
  temISS?: string
  precoBaseUnitario?: number | string | null
  margemSugerida?: number | string | null
  descontoMaximo?: number | string | null
  createdAt?: string
  updatedAt?: string
}

export default function ProductDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const slug = params.slug as string

  const [product, setProduct] = useState<Product | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    const fetchProduct = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const response = await fetch(`/api/products/${encodeURIComponent(slug)}`)

        if (!response.ok) {
          throw new Error(`Produto não encontrado (${response.status})`)
        }

        const data = await response.json()
        setProduct(data.data || data)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro ao carregar produto")
        setProduct(null)
      } finally {
        setIsLoading(false)
      }
    }

    if (slug) fetchProduct()
  }, [slug])

  const handleDelete = async () => {
    if (!product) return

    const confirmed = window.confirm(
      `Tem certeza que deseja excluir o produto "${product.nomeComercial}"?`
    )

    if (!confirmed) return

    setIsDeleting(true)
    try {
      const response = await fetch(`/api/products/${encodeURIComponent(product.slug)}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error(`Erro ao excluir produto (${response.status})`)
      }

      router.push("/products")
      router.refresh()
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erro ao excluir produto")
      setIsDeleting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600" />
          <p className="mt-4 text-gray-600">Carregando produto...</p>
        </div>
      </div>
    )
  }

  if (error || !product) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white p-8">
        <BackLink />
        <div className="mx-auto max-w-2xl rounded-lg border-l-4 border-red-500 bg-white p-8 shadow-lg">
          <div className="flex gap-4">
            <AlertCircle className="h-6 w-6 flex-shrink-0 text-red-500" />
            <div>
              <h2 className="mb-2 text-xl font-bold text-gray-900">Produto não encontrado</h2>
              <p className="text-gray-600">{error || `Não conseguimos encontrar o produto: ${slug}`}</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <main className="mx-auto max-w-5xl p-8">
        <BackLink />

        <section className="mb-6 rounded-lg bg-white p-8 shadow-lg">
          <div className="mb-6 flex items-start justify-between gap-6">
            <div>
              <h1 className="mb-2 text-3xl font-bold text-gray-900">{product.nomeComercial}</h1>
              <p className="text-sm text-gray-500">Código: {product.codigo || "-"}</p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <StatusBadge status={product.status} />
              <Link
                href={`/products/${product.slug}/edit-ai-content`}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
              >
                <Edit3 className="h-4 w-4" />
                Revisar IA
              </Link>
            </div>
          </div>

          <div className="grid gap-6 border-t pt-6 md:grid-cols-3">
            <Field label="Tipo" value={product.tipoProduto} />
            <Field label="Natureza" value={product.natureza} />
            <Field label="Status fiscal" value={product.fiscalStatus} />
            <Field label="Modelo contratado" value={product.modeloContratado} />
            <Field label="Faturamento" value={product.modeloFaturamento} />
            <Field label="Receita" value={product.tipoReceita} />
          </div>

          <div className="mt-8 space-y-6">
            <TextBlock label="Descrição curta" value={product.descricaoComercialCurta} />
            <TextBlock label="Proposta de valor" value={product.proposta_valor} />
          </div>
        </section>

        <section className="mb-6 rounded-lg bg-white p-8 shadow-lg">
          <h2 className="mb-4 text-xl font-bold text-gray-900">Precificação</h2>
          <div className="grid gap-6 md:grid-cols-3">
            <Field label="Preço base" value={formatCurrency(product.precoBaseUnitario)} />
            <Field label="Margem sugerida" value={formatPercent(product.margemSugerida)} />
            <Field label="Desconto máximo" value={formatPercent(product.descontoMaximo)} />
          </div>
        </section>

        <div className="grid gap-4 md:grid-cols-3">
          <Link
            href="/products"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-700"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Link>
          <Link
            href={`/products/${product.slug}/edit-ai-content`}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-green-600 px-6 py-3 font-semibold text-white transition hover:bg-green-700"
          >
            <Edit3 className="h-4 w-4" />
            Editar
          </Link>
          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 px-6 py-3 font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Trash2 className="h-4 w-4" />
            {isDeleting ? "Excluindo..." : "Excluir"}
          </button>
        </div>
      </main>
    </div>
  )
}

function BackLink() {
  return (
    <Link href="/products" className="mb-8 flex items-center gap-2 text-blue-600 hover:text-blue-800">
      <ArrowLeft className="h-4 w-4" />
      Voltar ao catálogo
    </Link>
  )
}

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <h3 className="mb-1 text-xs font-semibold uppercase text-gray-500">{label}</h3>
      <p className="text-sm text-gray-900">{value || "-"}</p>
    </div>
  )
}

function TextBlock({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold text-gray-900">{label}</h3>
      <p className="whitespace-pre-wrap text-gray-700">{value || "Sem informação"}</p>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const className =
    status === "ATIVO"
      ? "bg-green-100 text-green-800"
      : status === "RASCUNHO"
        ? "bg-yellow-100 text-yellow-800"
        : "bg-gray-100 text-gray-800"

  return <span className={`rounded-full px-3 py-1 text-xs font-semibold ${className}`}>{status}</span>
}

function formatCurrency(value?: number | string | null) {
  if (value === null || value === undefined || value === "") return "-"
  const numeric = Number(value)
  if (Number.isNaN(numeric)) return String(value)
  return numeric.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}

function formatPercent(value?: number | string | null) {
  if (value === null || value === undefined || value === "") return "-"
  const numeric = Number(value)
  if (Number.isNaN(numeric)) return String(value)
  return `${numeric.toLocaleString("pt-BR")}%`
}
