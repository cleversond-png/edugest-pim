"use client"

import { useState } from "react"
import { ArrowRight, Loader2 } from "lucide-react"

interface TranscriptFormProps {
  onSubmit: (data: {
    transcriptText: string
    clientName: string
    colorScheme: string
  }) => Promise<void>
  isLoading?: boolean
}

export function TranscriptForm({ onSubmit, isLoading }: TranscriptFormProps) {
  const [transcript, setTranscript] = useState("")
  const [clientName, setClientName] = useState("")
  const [colorScheme, setColorScheme] = useState("blue")
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!transcript.trim()) {
      setError("A transcrição é obrigatória")
      return
    }

    if (!clientName.trim()) {
      setError("O nome do cliente é obrigatório")
      return
    }

    try {
      await onSubmit({ transcriptText: transcript, clientName, colorScheme })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao analisar transcrição")
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="clientName" className="block text-sm font-medium text-gray-700">
          Nome do Cliente
        </label>
        <input
          id="clientName"
          type="text"
          placeholder="Ex: Acme Corporation"
          value={clientName}
          onChange={(e) => setClientName(e.target.value)}
          disabled={isLoading}
          className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-2 text-sm placeholder-gray-500 focus:border-blue-500 focus:outline-none disabled:bg-gray-50"
        />
      </div>

      <div>
        <label htmlFor="transcript" className="block text-sm font-medium text-gray-700">
          Transcrição da Conversa
        </label>
        <textarea
          id="transcript"
          placeholder="Cole aqui a transcrição da conversa com o cliente..."
          value={transcript}
          onChange={(e) => setTranscript(e.target.value)}
          disabled={isLoading}
          rows={8}
          className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-2 text-sm placeholder-gray-500 focus:border-blue-500 focus:outline-none disabled:bg-gray-50"
        />
      </div>

      <div>
        <label htmlFor="colorScheme" className="block text-sm font-medium text-gray-700">
          Esquema de Cores
        </label>
        <select
          id="colorScheme"
          value={colorScheme}
          onChange={(e) => setColorScheme(e.target.value)}
          disabled={isLoading}
          className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none disabled:bg-gray-50"
        >
          <option value="blue">Azul</option>
          <option value="green">Verde</option>
          <option value="purple">Roxo</option>
          <option value="red">Vermelho</option>
        </select>
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:bg-gray-400"
      >
        {isLoading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Analisando...
          </>
        ) : (
          <>
            Analisar
            <ArrowRight className="h-4 w-4" />
          </>
        )}
      </button>
    </form>
  )
}
