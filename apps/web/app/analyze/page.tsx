"use client"

import { useState } from "react"
import { TranscriptForm } from "@/components/form/TranscriptForm"
import { analyzeAction } from "./actions"

export default function AnalyzePage() {
  const [isLoading, setIsLoading] = useState(false)
  const [globalError, setGlobalError] = useState<string | null>(null)

  const handleAnalyze = async (data: {
    transcriptText: string
    clientName: string
    colorScheme: string
  }) => {
    setIsLoading(true)
    setGlobalError(null)

    try {
      await analyzeAction(data.transcriptText, data.clientName, data.colorScheme)
    } catch (error) {
      setGlobalError(
        error instanceof Error
          ? error.message
          : "Erro ao analisar. Tente novamente."
      )
      setIsLoading(false)
    }
  }

  return (
    <div className="flex flex-col flex-1 bg-gradient-to-br from-blue-50 to-indigo-100">
      <header className="border-b border-gray-200 bg-white shadow-sm">
        <div className="mx-auto max-w-3xl px-6 py-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Análise de Oportunidade
          </h1>
          <p className="mt-2 text-gray-600">
            Descreva a conversa com o cliente para receber uma análise automática de soluções
          </p>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12">
        {globalError && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {globalError}
          </div>
        )}

        <div className="rounded-lg border border-gray-200 bg-white p-8 shadow-sm">
          <TranscriptForm onSubmit={handleAnalyze} isLoading={isLoading} />
        </div>

        <div className="mt-8 rounded-lg bg-blue-50 p-6 text-sm text-blue-900">
          <h3 className="mb-3 font-semibold">💡 Dica</h3>
          <p>
            Para melhores resultados, inclua informações sobre dores, objetivos,
            contexto técnico e restrições mencionadas na conversa.
          </p>
        </div>
      </main>
    </div>
  )
}
