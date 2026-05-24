import { notFound } from "next/navigation"
import { SolutionPackV4 } from "@/lib/types"
import { DiagnosisCard } from "@/components/result/DiagnosisCard"
import { RecommendationCard } from "@/components/result/RecommendationCard"
import { ExportsCard } from "@/components/result/ExportsCard"
import { TelemetryCard } from "@/components/result/TelemetryCard"
import { PublishButton } from "@/components/result/PublishButton"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

interface ResultPageProps {
  params: {
    executionId: string
  }
  searchParams: {
    data?: string
  }
}

export default function ResultPage({ params, searchParams }: ResultPageProps) {
  const { executionId } = params

  // Decode SolutionPackV4 from URL params (passed from server action redirect)
  let solutionPack: SolutionPackV4 | null = null
  let opportunityId = ""

  if (searchParams.data) {
    try {
      const decoded = JSON.parse(Buffer.from(searchParams.data, "base64").toString("utf-8"))
      solutionPack = decoded.solutionPack
      opportunityId = decoded.opportunityId
    } catch (e) {
      console.error("Failed to decode solution pack", e)
    }
  }

  // If no data found, show error
  if (!solutionPack) {
    return (
      <div className="flex flex-col flex-1 bg-gray-50">
        <header className="border-b border-gray-200 bg-white shadow-sm">
          <div className="mx-auto max-w-4xl px-6 py-6">
            <Link
              href="/analyze"
              className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar para Análise
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">Resultado</h1>
          </div>
        </header>

        <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-12">
          <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-6 text-center">
            <p className="text-sm text-yellow-900">
              Nenhum resultado encontrado. Tente novamente.
            </p>
            <Link
              href="/analyze"
              className="mt-4 inline-block rounded-lg bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Nova Análise
            </Link>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="flex flex-col flex-1 bg-gray-50">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white shadow-sm">
        <div className="mx-auto max-w-4xl px-6 py-6">
          <Link
            href="/analyze"
            className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar para Análise
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Resultado da Análise</h1>
          <p className="mt-2 text-sm text-gray-600">
            ID de Execução: <span className="font-mono">{executionId}</span>
          </p>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-12">
        <div className="space-y-6">
          {/* Diagnosis */}
          {solutionPack.diagnosis && (
            <DiagnosisCard diagnosis={solutionPack.diagnosis} />
          )}

          {/* Recommendation */}
          {solutionPack.recommendation && (
            <RecommendationCard recommendation={solutionPack.recommendation} />
          )}

          {/* Exports */}
          {solutionPack.exports && (
            <ExportsCard exports={solutionPack.exports} />
          )}

          {/* Telemetry */}
          <TelemetryCard
            durationMs={solutionPack.durationMs}
            telemetry={solutionPack.telemetry}
          />

          {/* Publish Button */}
          <PublishButton
            executionId={executionId}
            opportunityId={opportunityId}
            solutionPack={solutionPack}
          />
        </div>
      </main>
    </div>
  )
}
