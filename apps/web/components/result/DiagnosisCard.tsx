import { DiagnosisOutput } from "@/lib/types"
import { AlertCircle, Target, ZapOff } from "lucide-react"

interface DiagnosisCardProps {
  diagnosis: DiagnosisOutput
}

export function DiagnosisCard({ diagnosis }: DiagnosisCardProps) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <h3 className="mb-6 flex items-center gap-2 text-lg font-semibold text-gray-900">
        <AlertCircle className="h-5 w-5 text-blue-600" />
        Diagnóstico
      </h3>

      <div className="space-y-6">
        {/* Pains */}
        <div>
          <h4 className="mb-3 text-sm font-medium text-gray-700">Dores Identificadas</h4>
          <div className="space-y-2">
            {diagnosis.pains.length > 0 ? (
              diagnosis.pains.map((pain, i) => (
                <div key={i} className="flex items-start gap-2 text-sm text-gray-600">
                  <span className="mt-1 inline-block h-1.5 w-1.5 rounded-full bg-red-500 flex-shrink-0" />
                  {pain}
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500">Nenhuma dor identificada</p>
            )}
          </div>
        </div>

        {/* Objectives */}
        <div>
          <h4 className="mb-3 text-sm font-medium text-gray-700">Objetivos</h4>
          <div className="space-y-2">
            {diagnosis.objectives.length > 0 ? (
              diagnosis.objectives.map((obj, i) => (
                <div key={i} className="flex items-start gap-2 text-sm text-gray-600">
                  <Target className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-600" />
                  {obj}
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500">Nenhum objetivo identificado</p>
            )}
          </div>
        </div>

        {/* Maturity & Complexity */}
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-lg bg-gray-50 p-4">
            <p className="text-xs font-medium text-gray-600">Maturidade</p>
            <p className="mt-1 text-lg font-semibold text-gray-900">
              {diagnosis.maturity}
            </p>
          </div>
          <div className="rounded-lg bg-gray-50 p-4">
            <p className="text-xs font-medium text-gray-600">Complexidade</p>
            <p className="mt-1 text-lg font-semibold text-gray-900">
              {diagnosis.complexity}
            </p>
          </div>
        </div>

        {/* Context */}
        <div>
          <h4 className="mb-3 text-sm font-medium text-gray-700">Contexto</h4>
          <p className="text-sm text-gray-600">{diagnosis.context}</p>
        </div>

        {/* Not Evidenced */}
        {diagnosis.notEvidenced.length > 0 && (
          <div>
            <h4 className="mb-3 text-sm font-medium text-gray-700">Não Evidenciado</h4>
            <div className="space-y-2">
              {diagnosis.notEvidenced.map((item, i) => (
                <div key={i} className="flex items-start gap-2 text-sm text-gray-600">
                  <ZapOff className="mt-0.5 h-4 w-4 flex-shrink-0 text-yellow-600" />
                  {item}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
