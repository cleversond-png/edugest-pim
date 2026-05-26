import { RecommendationOutput, Candidate } from "@/lib/types"
import { Lightbulb, Package, Zap } from "lucide-react"

interface RecommendationCardProps {
  recommendation: RecommendationOutput
}

export function RecommendationCard({ recommendation }: RecommendationCardProps) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <h3 className="mb-6 flex items-center gap-2 text-lg font-semibold text-gray-900">
        <Lightbulb className="h-5 w-5 text-yellow-600" />
        Recomendação
      </h3>

      <div className="space-y-6">
        {/* Intelligence Block */}
        <div className="rounded-lg bg-blue-50 p-4">
          <h4 className="mb-4 flex items-center gap-2 text-sm font-semibold text-blue-900">
            <Zap className="h-4 w-4" />
            Análise Inteligente
          </h4>

          <div className="mb-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-blue-800">Score de Aderência:</span>
              <span className="text-lg font-bold text-blue-600">
                {(recommendation.intelligence.score * 100).toFixed(0)}%
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-blue-200">
              <div
                className="h-full bg-blue-600 transition-all duration-500"
                style={{ width: `${recommendation.intelligence.score * 100}%` }}
              />
            </div>
          </div>

          {recommendation.intelligence.candidates.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-medium text-blue-700">Candidatos:</p>
              <div className="space-y-1">
                {recommendation.intelligence.candidates.map((candidate: Candidate) => (
                  <div
                    key={candidate.product_id}
                    className="flex items-center justify-between text-sm text-blue-800"
                  >
                    <span>{candidate.product_id}</span>
                    <span className="font-semibold">
                      {(candidate.score * 100).toFixed(0)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Business Block */}
        <div className="rounded-lg bg-green-50 p-4">
          <h4 className="mb-4 flex items-center gap-2 text-sm font-semibold text-green-900">
            <Package className="h-4 w-4" />
            Solução Proposta
          </h4>

          {recommendation.business.products.length > 0 && (
            <div className="mb-4">
              <p className="mb-2 text-xs font-medium text-green-700">Produtos:</p>
              <div className="space-y-2">
                {recommendation.business.products.map((product) => (
                  <div
                    key={product.product_id}
                    className="rounded border border-green-200 bg-white p-2 text-sm text-green-900"
                  >
                    <p className="font-medium">{product.name}</p>
                    <p className="text-xs text-green-700">{product.erp_code}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {recommendation.business.required_dependencies.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-medium text-green-700">Dependências:</p>
              <div className="space-y-1">
                {recommendation.business.required_dependencies.map((dep, i: number) => (
                  <div key={i} className="text-xs text-green-800">
                    • {dep}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Strategy Block */}
        <div className="rounded-lg bg-purple-50 p-4">
          <h4 className="mb-3 text-sm font-semibold text-purple-900">Estratégia</h4>
          <div className="space-y-3 text-sm text-purple-900">
            {recommendation.strategy.summary && (
              <div>
                <p className="mb-1 font-medium">Resumo:</p>
                <p className="text-purple-800">{recommendation.strategy.summary}</p>
              </div>
            )}
            {recommendation.strategy.justification && (
              <div>
                <p className="mb-1 font-medium">Justificativa:</p>
                <p className="text-purple-800">{recommendation.strategy.justification}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
