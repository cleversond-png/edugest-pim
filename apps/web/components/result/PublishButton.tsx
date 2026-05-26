"use client"

import { useState } from "react"
import { SolutionPackV4 } from "@/lib/types"
import { Upload, Loader2, CheckCircle2, AlertCircle } from "lucide-react"
import { publishSolutionPack } from "@/lib/api"

interface PublishButtonProps {
  executionId: string
  opportunityId: string
  solutionPack: SolutionPackV4
}

export function PublishButton({
  executionId,
  opportunityId,
  solutionPack,
}: PublishButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle")
  const [error, setError] = useState<string | null>(null)
  const [webUrls, setWebUrls] = useState<Record<string, string> | null>(null)

  const handlePublish = async () => {
    setIsLoading(true)
    setError(null)
    setStatus("idle")

    try {
      const result = await publishSolutionPack({
        executionId,
        opportunityId,
        solutionPack,
      })
      setWebUrls(result.webUrls || null)
      setStatus("success")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao publicar")
      setStatus("error")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <h3 className="mb-4 text-lg font-semibold text-gray-900">
        Publicar no SharePoint
      </h3>

      {status === "idle" && (
        <>
          <p className="mb-4 text-sm text-gray-600">
            Salve esta análise no SharePoint para acesso e compartilhamento futuros.
          </p>
          <button
            onClick={handlePublish}
            disabled={isLoading}
            className="flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:bg-gray-400"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Publicando...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                Publicar Agora
              </>
            )}
          </button>
        </>
      )}

      {status === "success" && (
        <div className="space-y-4 rounded-lg bg-green-50 p-4">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-600" />
            <div>
              <h4 className="font-medium text-green-900">
                Publicado com sucesso!
              </h4>
              <p className="mt-1 text-sm text-green-800">
                Os arquivos foram salvos no SharePoint.
              </p>
            </div>
          </div>

          {webUrls && (
            <div className="mt-4 space-y-2 border-t border-green-200 pt-4">
              <p className="text-xs font-medium text-green-700">Links dos arquivos:</p>
              {Object.entries(webUrls).map(([name, url]: [string, string]) => (
                <a
                  key={name}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block truncate text-xs text-green-600 hover:underline"
                  title={url}
                >
                  📄 {name}
                </a>
              ))}
            </div>
          )}

          <button
            onClick={() => setStatus("idle")}
            className="mt-4 text-sm font-medium text-green-700 hover:text-green-800"
          >
            Fechar
          </button>
        </div>
      )}

      {status === "error" && (
        <div className="space-y-4 rounded-lg bg-red-50 p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-600" />
            <div>
              <h4 className="font-medium text-red-900">Erro ao publicar</h4>
              <p className="mt-1 text-sm text-red-800">{error}</p>
            </div>
          </div>

          <button
            onClick={() => setStatus("idle")}
            className="mt-4 text-sm font-medium text-red-700 hover:text-red-800"
          >
            Tentar Novamente
          </button>
        </div>
      )}
    </div>
  )
}
