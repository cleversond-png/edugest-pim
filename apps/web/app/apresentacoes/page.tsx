"use client"

import { useState } from "react"
import Link from "next/link"
import { ApresentacaoForm } from "@/components/forms/ApresentacaoForm"
import { gerarApresentacaoAction } from "./actions"
import { Download, ExternalLink, AlertCircle } from "lucide-react"

interface ApresentacaoResult {
  status: string
  nomeArquivo: string
  totalSlides: number
  produtos: string[]
  avisos: Array<{ produto: string; tipo: string; mensagem: string }>
  downloadUrl: string
  sharepointUrl?: string
  durationMs: number
}

export default function ApresentacoesPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [globalError, setGlobalError] = useState<string | null>(null)
  const [result, setResult] = useState<ApresentacaoResult | null>(null)

  const handleGeneratePresentacao = async (formData: any) => {
    setIsLoading(true)
    setGlobalError(null)
    setResult(null)

    try {
      const result = await gerarApresentacaoAction(formData)
      setResult(result)
    } catch (error) {
      setGlobalError(
        error instanceof Error
          ? error.message
          : "Erro ao gerar apresentação"
      )
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex flex-col flex-1 bg-gradient-to-br from-blue-50 to-indigo-100">
      <header className="border-b border-gray-200 bg-white shadow-sm">
        <div className="mx-auto max-w-4xl px-6 py-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Gerar Apresentação
          </h1>
          <p className="mt-2 text-gray-600">
            Crie uma apresentação personalizada baseada no perfil do cliente e seleção de produtos
          </p>
        </div>
      </header>

      <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-8">
        {result ? (
          <SuccessResult result={result} onReset={() => setResult(null)} />
        ) : (
          <>
            {globalError && (
              <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                ✕ {globalError}
              </div>
            )}

            <div className="rounded-lg border border-gray-200 bg-white p-8 shadow-sm">
              <ApresentacaoForm
                onSubmit={handleGeneratePresentacao}
                isLoading={isLoading}
              />
            </div>
          </>
        )}
      </main>
    </div>
  )
}

function SuccessResult({
  result,
  onReset,
}: {
  result: ApresentacaoResult
  onReset: () => void
}) {
  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-green-200 bg-green-50 p-6">
        <div className="flex items-start gap-3">
          <div className="text-2xl">✓</div>
          <div>
            <h3 className="text-lg font-semibold text-green-900">
              Apresentação gerada com sucesso!
            </h3>
            <p className="mt-1 text-sm text-green-700">
              {result.totalSlides} slides • Tempo: {result.durationMs}ms
            </p>
          </div>
        </div>
      </div>

      {result.avisos && result.avisos.length > 0 && (
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
          <div className="flex gap-3">
            <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-yellow-900 mb-2">
                Avisos:
              </p>
              <ul className="space-y-1 text-sm text-yellow-800">
                {result.avisos.map((aviso, idx) => (
                  <li key={idx}>
                    • <strong>{aviso.produto}</strong>: {aviso.mensagem}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <a
          href={result.downloadUrl}
          download={result.nomeArquivo}
          className="flex items-center justify-center gap-2 rounded-lg bg-blue-600 py-3 font-semibold text-white hover:bg-blue-700"
        >
          <Download className="h-5 w-5" />
          Baixar PPTX
        </a>

        {result.sharepointUrl && (
          <a
            href={result.sharepointUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 rounded-lg bg-gray-600 py-3 font-semibold text-white hover:bg-gray-700"
          >
            <ExternalLink className="h-5 w-5" />
            Ver no SharePoint
          </a>
        )}
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <p className="text-xs text-gray-600 mb-3">
          <strong>Produtos inclusos:</strong>
        </p>
        <div className="flex flex-wrap gap-2">
          {result.produtos.map((produto) => (
            <span
              key={produto}
              className="inline-block rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700"
            >
              {produto}
            </span>
          ))}
        </div>
      </div>

      <button
        onClick={onReset}
        className="w-full rounded-lg border border-gray-300 py-3 font-semibold text-gray-700 hover:bg-gray-50"
      >
        Gerar outra apresentação
      </button>

      <div className="text-center text-sm text-gray-600">
        Voltar para{" "}
        <Link href="/produtos" className="text-blue-600 hover:text-blue-800">
          Catálogo de Produtos
        </Link>
      </div>
    </div>
  )
}
