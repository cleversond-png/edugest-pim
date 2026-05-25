"use client"

import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import { Search, Plus, Filter } from "lucide-react"

interface Product {
  id: string
  slug: string
  nomeComercial: string
  descricaoComercialCurta: string
  tipoProduto: string
  natureza: string
  status: string
  produtoCore: boolean
  codigo: string
}

const TIPO_OPTIONS = [
  { value: "SAAS_BB", label: "SaaS Big Brain" },
  { value: "SERVICO_PROFISSIONAL", label: "Serviço Profissional" },
  { value: "LICENCIAMENTO", label: "Licenciamento" },
  { value: "CREDITO", label: "Crédito" },
  { value: "HARDWARE", label: "Hardware" },
]

const STATUS_OPTIONS = [
  { value: "ATIVO", label: "Ativo" },
  { value: "INATIVO", label: "Inativo" },
  { value: "RASCUNHO", label: "Rascunho" },
]

const NATUREZA_OPTIONS = [
  { value: "CORE", label: "Core" },
  { value: "MODULAR", label: "Modular" },
  { value: "DEPENDENTE", label: "Dependente" },
]

const PERFIL_OPTIONS = [
  { value: "ESCOLA_PEQUENA", label: "Escola Pequena" },
  { value: "ESCOLA_MEDIA", label: "Escola Média" },
  { value: "REDE_GRANDE", label: "Rede / Grande" },
]

export default function ProductsCatalogPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filters
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedTipo, setSelectedTipo] = useState<string>("")
  const [selectedStatus, setSelectedStatus] = useState<string>("")
  const [selectedNatureza, setSelectedNatureza] = useState<string>("")
  const [selectedPerfil, setSelectedPerfil] = useState<string>("")
  const [showFilters, setShowFilters] = useState(false)

  const fetchProducts = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      if (selectedTipo) params.append("tipo", selectedTipo)
      if (selectedStatus) params.append("status", selectedStatus)
      if (selectedPerfil) params.append("perfil", selectedPerfil)

      const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"
      const response = await fetch(
        `${API_BASE}/api/products?${params.toString()}`,
        {
          headers: {
            "X-Api-Key": process.env.NEXT_PUBLIC_API_KEY || "",
          },
        }
      )

      if (!response.ok) {
        throw new Error(`Failed to fetch products (status: ${response.status})`)
      }

      const data = await response.json()
      setProducts(data.data || [])
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Erro ao carregar produtos"
      )
      setProducts([])
    } finally {
      setIsLoading(false)
    }
  }, [selectedTipo, selectedStatus, selectedPerfil])

  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  const filteredProducts = products.filter((product) => {
    const searchLower = searchTerm.toLowerCase()
    return (
      product.nomeComercial.toLowerCase().includes(searchLower) ||
      product.codigo.toLowerCase().includes(searchLower) ||
      product.descricaoComercialCurta.toLowerCase().includes(searchLower)
    )
  })

  const filteredByNatureza = selectedNatureza
    ? filteredProducts.filter((p) => p.natureza === selectedNatureza)
    : filteredProducts

  const hasActiveFilters =
    selectedTipo || selectedStatus || selectedNatureza || selectedPerfil

  return (
    <div className="flex flex-col flex-1 bg-gradient-to-br from-blue-50 to-indigo-100">
      <header className="border-b border-gray-200 bg-white shadow-sm">
        <div className="mx-auto max-w-6xl px-6 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Catálogo de Produtos
              </h1>
              <p className="mt-2 text-gray-600">
                {filteredByNatureza.length} produto
                {filteredByNatureza.length !== 1 ? "s" : ""} encontrado
                {filteredByNatureza.length !== 1 ? "s" : ""}
              </p>
            </div>
            <Link
              href="/products/new"
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700"
            >
              <Plus className="h-5 w-5" />
              Novo Produto
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8">
        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* SEARCH BAR */}
        <div className="mb-6 flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nome, código ou descrição..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-lg border border-gray-300 pl-10 pr-4 py-3 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-3 font-medium text-gray-700 hover:bg-gray-50"
          >
            <Filter className="h-5 w-5" />
            Filtros {hasActiveFilters && <span className="text-blue-600">●</span>}
          </button>
        </div>

        {/* FILTERS PANEL */}
        {showFilters && (
          <div className="mb-6 rounded-lg border border-gray-200 bg-white p-6">
            <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
              <Select
                label="Tipo"
                value={selectedTipo}
                onChange={setSelectedTipo}
                options={TIPO_OPTIONS}
              />
              <Select
                label="Status"
                value={selectedStatus}
                onChange={setSelectedStatus}
                options={STATUS_OPTIONS}
              />
              <Select
                label="Natureza"
                value={selectedNatureza}
                onChange={setSelectedNatureza}
                options={NATUREZA_OPTIONS}
              />
              <Select
                label="Perfil de Cliente"
                value={selectedPerfil}
                onChange={setSelectedPerfil}
                options={PERFIL_OPTIONS}
              />
            </div>
            {hasActiveFilters && (
              <button
                onClick={() => {
                  setSelectedTipo("")
                  setSelectedStatus("")
                  setSelectedNatureza("")
                  setSelectedPerfil("")
                }}
                className="mt-4 text-sm text-blue-600 hover:text-blue-800"
              >
                ✕ Limpar filtros
              </button>
            )}
          </div>
        )}

        {/* PRODUCTS GRID */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-gray-600">Carregando produtos...</p>
          </div>
        ) : filteredByNatureza.length === 0 ? (
          <div className="rounded-lg border border-gray-200 bg-white p-12 text-center">
            <p className="text-gray-600">Nenhum produto encontrado.</p>
            {hasActiveFilters && (
              <p className="mt-2 text-sm text-gray-500">
                Tente ajustar os filtros.
              </p>
            )}
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredByNatureza.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

function ProductCard({ product }: { product: Product }) {
  const tipoLabel = TIPO_OPTIONS.find((t) => t.value === product.tipoProduto)
    ?.label
  const statusLabel = STATUS_OPTIONS.find((s) => s.value === product.status)
    ?.label
  const naturezaLabel = NATUREZA_OPTIONS.find((n) => n.value === product.natureza)
    ?.label

  return (
    <Link href={`/products/${product.slug}`}>
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm transition hover:shadow-md hover:border-blue-200">
        <div className="mb-4 flex items-start justify-between">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900">
              {product.nomeComercial}
            </h3>
            <p className="text-xs text-gray-500 font-mono">{product.codigo}</p>
          </div>
          {product.status === "ATIVO" && (
            <span className="inline-block rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
              {statusLabel}
            </span>
          )}
          {product.status === "RASCUNHO" && (
            <span className="inline-block rounded-full bg-yellow-100 px-3 py-1 text-xs font-medium text-yellow-700">
              {statusLabel}
            </span>
          )}
          {product.status === "INATIVO" && (
            <span className="inline-block rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
              {statusLabel}
            </span>
          )}
        </div>

        <p className="mb-4 text-sm text-gray-600 line-clamp-2">
          {product.descricaoComercialCurta || "Sem descrição"}
        </p>

        <div className="flex flex-wrap gap-2">
          <Badge label={tipoLabel} variant="blue" />
          <Badge label={naturezaLabel} variant="purple" />
          {product.produtoCore && <Badge label="Core" variant="red" />}
        </div>
      </div>
    </Link>
  )
}

function Badge({
  label,
  variant,
}: {
  label?: string
  variant: "blue" | "purple" | "red"
}) {
  if (!label) return null

  const variants = {
    blue: "bg-blue-100 text-blue-700",
    purple: "bg-purple-100 text-purple-700",
    red: "bg-red-100 text-red-700",
  }

  return (
    <span
      className={`inline-block rounded-full px-2 py-1 text-xs font-medium ${variants[variant]}`}
    >
      {label}
    </span>
  )
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  options: Array<{ value: string; label: string }>
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
      >
        <option value="">Todos</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  )
}
