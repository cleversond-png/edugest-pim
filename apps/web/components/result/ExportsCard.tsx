import { SolutionPackV4 } from "@/lib/types"
import { Database, AlertTriangle, CheckCircle2 } from "lucide-react"

interface ExportsCardProps {
  exports: SolutionPackV4["exports"]
}

export function ExportsCard({ exports }: ExportsCardProps) {
  const isErpBlocked = exports?.erp?.blocked

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <h3 className="mb-6 flex items-center gap-2 text-lg font-semibold text-gray-900">
        <Database className="h-5 w-5 text-indigo-600" />
        Exportações ERP
      </h3>

      <div className="space-y-4">
        {isErpBlocked ? (
          <div className="flex items-start gap-3 rounded-lg border border-yellow-200 bg-yellow-50 p-4">
            <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-yellow-700" />
            <div>
              <h4 className="font-medium text-yellow-900">
                ERP Bloqueado
              </h4>
              <p className="mt-1 text-sm text-yellow-800">
                A exportação ERP não está disponível neste momento.
              </p>
              {exports?.erp?.blockedReasons && exports.erp.blockedReasons.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {exports.erp.blockedReasons.map((reason: string, i: number) => (
                    <li key={i} className="text-xs text-yellow-700">
                      • {reason}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        ) : (
          <>
            {exports?.erp?.payload && (
              <>
                <div className="rounded-lg bg-green-50 p-4 mb-4">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <p className="text-sm font-medium text-green-900">
                      Pronto para Sankhya
                    </p>
                  </div>
                  <p className="mt-1 text-xs text-green-700">
                    O payload foi validado e está pronto para exportação.
                  </p>
                </div>

                <div className="rounded-lg bg-indigo-50 p-4">
                  <h4 className="mb-3 text-sm font-medium text-indigo-900">Payload ERP</h4>
                  <pre className="max-h-64 overflow-auto rounded bg-white p-3 text-xs text-gray-700">
                    {JSON.stringify(exports.erp.payload, null, 2)}
                  </pre>
                </div>
              </>
            )}
          </>
        )}

        {!exports?.erp && (
          <div className="rounded-lg bg-gray-50 p-4 text-center">
            <p className="text-sm text-gray-600">
              Nenhuma exportação ERP disponível
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
