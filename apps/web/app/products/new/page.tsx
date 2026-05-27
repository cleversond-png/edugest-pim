import { ProductFormSimplified } from "@/components/forms/ProductFormSimplified"

export default function NewProductPage() {
  return (
    <div className="flex flex-col flex-1 bg-gradient-to-br from-blue-50 to-indigo-100">
      <header className="border-b border-gray-200 bg-white shadow-sm">
        <div className="mx-auto max-w-4xl px-6 py-8">
          <h1 className="text-3xl font-bold text-gray-900">Novo Produto (Inteligência + Simplicidade)</h1>
          <p className="mt-2 text-gray-600">
            Preencha apenas 18 campos essenciais. A IA gerará automaticamente precificação, marketing e onboarding.
          </p>
        </div>
      </header>

      <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-8">
        <div className="rounded-lg border border-gray-200 bg-white p-8 shadow-sm">
          <ProductFormSimplified />
        </div>
      </main>
    </div>
  )
}
