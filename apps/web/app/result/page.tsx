import { Suspense } from "react"
import ResultPageContent from "./result-content"

export const dynamic = 'force-dynamic'

export default function ResultPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <ResultPageContent />
    </Suspense>
  )
}

function LoadingFallback() {
  return (
    <div className="flex flex-col flex-1 bg-gray-50">
      <header className="border-b border-gray-200 bg-white shadow-sm">
        <div className="mx-auto max-w-4xl px-6 py-6">
          <h1 className="text-2xl font-bold text-gray-900">Carregando...</h1>
        </div>
      </header>
      <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-12">
        <div className="text-center text-gray-500">Processando resultado...</div>
      </main>
    </div>
  )
}
