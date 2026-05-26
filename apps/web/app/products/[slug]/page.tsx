"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, AlertCircle } from "lucide-react"

interface Product {
  id: string
  slug: string
  nomeComercial: string
  descricaoComercialCurta: string
  descricaoComercialCompleta?: string
  tipoProduto: string
  natureza: string
  status: string
  codigo: string
  produtoCore: boolean
  versao?: string
  criadoEm?: string
  atualizadoEm?: string
}

export default function ProductDetailsPage() {
  const router = useRouter()
  const params = useParams()
  const slug = params.slug as string

  const [product, setProduct] = useState<Product | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchProduct = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"
        const response = await fetch(`${API_BASE}/api/products/${slug}`, {
          headers: {
            "X-Api-Key": process.env.NEXT_PUBLIC_API_KEY || "",
          },
        })

        if (!response.ok) {
          throw new Error(`Produto não encontrado (${response.status})`)
        }

        const data = await response.json()
        setProduct(data.data || data)
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Erro ao carregar produto"
        )
        setProduct(null)
      } finally {
        setIsLoading(false)
      }
    }

    if (slug) {
      fetchProduct()
    }
  }, [slug])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Carregando produto...</p>
        </div>
      </div>
    )
  }

  if (error || !product) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white p-8">
        <Link href="/products" className="flex items-center gap-2 text-blue-600 hover:text-blue-800 mb-8">
          <ArrowLeft className="w-4 h-4" />
          Voltar ao catálogo
        </Link>

        <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-lg p-8 border-l-4 border-red-500">
          <div className="flex gap-4">
            <AlertCircle className="w-6 h-6 text-red-500 flex-shrink-0" />
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Produto não encontrado</h2>
              <p className="text-gray-600">{error || `Não conseguimos encontrar o produto: ${slug}`}</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <div className="max-w-4xl mx-auto p-8">
        {/* Header */}
        <Link href="/products" className="flex items-center gap-2 text-blue-600 hover:text-blue-800 mb-8">
          <ArrowLeft className="w-4 h-4" />
          Voltar ao catálogo
        </Link>

        {/* Product Card */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {product.nomeComercial}
              </h1>
              <p className="text-sm text-gray-500">Código: {product.codigo}</p>
            </div>
            <div className="flex flex-col gap-2">
              <span
                className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  product.status === "ATIVO"
                    ? "bg-green-100 text-green-800"
                    : product.status === "RASCUNHO"
                      ? "bg-yellow-100 text-yellow-800"
                      : "bg-gray-100 text-gray-800"
                }`}
              >
                {product.status}
              </span>
              {product.produtoCore && (
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                  Core
                </span>
              )}
            </div>
          </div>

          <div className="border-t pt-6">
            <div className="grid grid-cols-3 gap-6 mb-6">
              <div>
                <h3 className="text-xs font-semibold text-gray-500 uppercase mb-1">
                  Tipo
                </h3>
                <p className="text-sm text-gray-900">{product.tipoProduto}</p>
              </div>
              <div>
                <h3 className="text-xs font-semibold text-gray-500 uppercase mb-1">
                  Natureza
                </h3>
                <p className="text-sm text-gray-900">{product.natureza}</p>
              </div>
              <div>
                <h3 className="text-xs font-semibold text-gray-500 uppercase mb-1">
                  Versão
                </h3>
                <p className="text-sm text-gray-900">{product.versao || "—"}</p>
              </div>
            </div>

            {/* Descriptions */}
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-2">
                Descrição curta
              </h3>
              <p className="text-gray-700 mb-4">
                {product.descricaoComercialCurta || "Sem descrição"}
              </p>

              {product.descricaoComercialCompleta && (
                <>
                  <h3 className="text-sm font-semibold text-gray-900 mb-2">
                    Descrição completa
                  </h3>
                  <p className="text-gray-700">
                    {product.descricaoComercialCompleta}
                  </p>
                </>
              )}
            </div>

            {/* Timestamps */}
            <div className="border-t pt-4 text-xs text-gray-500">
              <p>Criado em: {product.criadoEm ? new Date(product.criadoEm).toLocaleDateString("pt-BR") : "—"}</p>
              <p>Atualizado em: {product.atualizadoEm ? new Date(product.atualizadoEm).toLocaleDateString("pt-BR") : "—"}</p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-4">
          <Link
            href={`/products`}
            className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition text-center"
          >
            Voltar
          </Link>
          <Link
            href={`/`}
            className="flex-1 bg-gray-200 text-gray-900 px-6 py-3 rounded-lg font-semibold hover:bg-gray-300 transition text-center"
          >
            Ir para home
          </Link>
        </div>
      </div>
    </div>
  )
}
