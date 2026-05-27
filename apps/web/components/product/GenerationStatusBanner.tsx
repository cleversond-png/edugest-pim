"use client"

import { useEffect, useState } from "react"
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react"

interface GenerationStatus {
  isGenerating: boolean
  progress: "ai-content" | "docs-sharepoint" | "complete"
  message: string
}

export function GenerationStatusBanner({ slug }: { slug: string }) {
  const [status, setStatus] = useState<GenerationStatus>({
    isGenerating: true,
    progress: "ai-content",
    message: "Gerando conteúdo IA e documentação para o Copilot...",
  })

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const response = await fetch(`/api/products/${slug}`)
        if (!response.ok) return

        const data = await response.json()
        const product = data.data || data

        // Check if AI content is generated (presence of contextoGeral indicates AI completion)
        const hasAiContent = Boolean(product.contextoGeral)
        // Check if copilot tags were extracted (indicates docs published)
        const hasDocsTags = Array.isArray(product.tagsCopilot) && product.tagsCopilot.length > 0

        if (!hasAiContent) {
          setStatus({
            isGenerating: true,
            progress: "ai-content",
            message: "📝 Etapa 1/2: Gerando conteúdo com IA...",
          })
        } else if (!hasDocsTags) {
          setStatus({
            isGenerating: true,
            progress: "docs-sharepoint",
            message: "📤 Etapa 2/2: Publicando documentação no SharePoint...",
          })
        } else {
          setStatus({
            isGenerating: false,
            progress: "complete",
            message: "✅ Produto pronto! Documentação disponível para o Copilot.",
          })
        }
      } catch (error) {
        console.error("Error checking status:", error)
      }
    }

    // Check immediately
    checkStatus()

    // Poll every 2 seconds while generating
    const interval = setInterval(() => {
      checkStatus()
    }, 2000)

    return () => clearInterval(interval)
  }, [slug])

  if (!status.isGenerating) {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 p-4 flex gap-3 items-start">
        <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-sm text-green-800 font-medium">{status.message}</p>
          <p className="text-xs text-green-700 mt-1">
            A documentação foi publicada no SharePoint e está indexada pelo Copilot.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 flex gap-3 items-start animate-pulse">
      <Loader2 className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5 animate-spin" />
      <div className="flex-1">
        <p className="text-sm text-blue-800 font-medium">{status.message}</p>
        <p className="text-xs text-blue-700 mt-1">
          {status.progress === "ai-content"
            ? "Isso pode levar ~15-30 segundos. Aguarde..."
            : "Sincronizando com SharePoint. Aguarde..."}
        </p>
      </div>
    </div>
  )
}
