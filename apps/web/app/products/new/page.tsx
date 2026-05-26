"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ProductForm } from "@/components/forms/ProductForm"
import { createProduct } from "@/lib/api"

export default function NewProductPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [globalError, setGlobalError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const handleCreateProduct = async (formData: any) => {
    setIsLoading(true)
    setGlobalError(null)
    setSuccessMessage(null)

    try {
      const result = await createProduct(formData)
      setSuccessMessage(`Produto "${result.nomeComercial}" criado com sucesso!`)

      // Redirect to product detail after 2 seconds
      setTimeout(() => {
        router.push(`/products/${result.slug}`)
      }, 2000)
    } catch (error) {
      setGlobalError(
        error instanceof Error
          ? error.message
          : "Erro ao criar produto. Tente novamente."
      )
      setIsLoading(false)
    }
  }

  return (
    <div className="flex flex-col flex-1 bg-gradient-to-br from-blue-50 to-indigo-100">
      <header className="border-b border-gray-200 bg-white shadow-sm">
        <div className="mx-auto max-w-4xl px-6 py-8">
          <h1 className="text-3xl font-bold text-gray-900">Novo Produto</h1>
          <p className="mt-2 text-gray-600">
            Preencha todos os blocos para registrar um novo produto no catálogo
          </p>
        </div>
      </header>

      <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-8">
        {successMessage && (
          <div className="mb-6 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-700">
            ✓ {successMessage}
          </div>
        )}

        {globalError && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            ✕ {globalError}
          </div>
        )}

        <div className="rounded-lg border border-gray-200 bg-white p-8 shadow-sm">
          <ProductForm onSubmit={handleCreateProduct} isLoading={isLoading} />
        </div>
      </main>
    </div>
  )
}
