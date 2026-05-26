import { SolutionPackV4 } from "@/lib/types"
import { Clock, Activity, Cpu } from "lucide-react"

interface TelemetryCardProps {
  durationMs: number
  telemetry?: SolutionPackV4["telemetry"]
}

export function TelemetryCard({ durationMs, telemetry }: TelemetryCardProps) {
  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms.toFixed(0)}ms`
    return `${(ms / 1000).toFixed(2)}s`
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <h3 className="mb-6 flex items-center gap-2 text-lg font-semibold text-gray-900">
        <Activity className="h-5 w-5 text-cyan-600" />
        Telemetria
      </h3>

      <div className="space-y-4">
        {/* Execution Duration */}
        <div className="rounded-lg bg-cyan-50 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-cyan-600" />
              <span className="text-sm font-medium text-cyan-900">Tempo de Execução</span>
            </div>
            <span className="text-lg font-semibold text-cyan-600">
              {formatDuration(durationMs)}
            </span>
          </div>
        </div>

        {/* Token Usage */}
        {telemetry?.tokenUsage && (
          <div className="rounded-lg bg-blue-50 p-4">
            <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-blue-900">
              <Cpu className="h-4 w-4" />
              Uso de Tokens
            </h4>
            {telemetry.tokenUsage.total && (
              <div className="space-y-2 text-sm text-blue-800">
                <div className="flex items-center justify-between">
                  <span>Total de Input:</span>
                  <span className="font-mono font-semibold">
                    {telemetry.tokenUsage.total.input.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Total de Output:</span>
                  <span className="font-mono font-semibold">
                    {telemetry.tokenUsage.total.output.toLocaleString()}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Model Routing */}
        {telemetry?.modelRouting && Object.keys(telemetry.modelRouting).length > 0 && (
          <div>
            <p className="mb-3 text-sm font-medium text-gray-700">Modelos Utilizados</p>
            <div className="space-y-2">
              {(Object.entries(telemetry.modelRouting) as [string, string][]).map(([step, model]) => (
                <div
                  key={step}
                  className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-2 text-sm"
                >
                  <span className="text-gray-700">{step}</span>
                  <span className="font-mono text-xs text-gray-600">{model}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
