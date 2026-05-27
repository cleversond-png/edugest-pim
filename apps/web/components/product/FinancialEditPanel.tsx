"use client"

import { useState } from "react"
import { AlertCircle, CheckCircle2, Loader2, RefreshCw, X } from "lucide-react"

interface FaixaPreco {
  perfil: string
  qtdMinima: number
  qtdMaxima: number
  precoUnitario: number
  descricaoFaixa: string
}

interface PacoteCredito {
  nome: string
  horas: number
  precoTotal: number
  desconto: number
}

interface FinancialData {
  precoBaseUnitario?: number
  margemSugerida?: number
  descontoMaximo?: number
  faixasPreco?: FaixaPreco[]
  pacotesCredito?: PacoteCredito[]
}

export function FinancialEditPanel({
  slug,
  initialData,
  modeloContratado,
}: {
  slug: string
  initialData: FinancialData
  modeloContratado: string
}) {
  const [data, setData] = useState<FinancialData>(initialData)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isRegenerating, setIsRegenerating] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  const handleSave = async () => {
    setIsSaving(true)
    setMessage(null)

    try {
      const response = await fetch(`/api/products/${slug}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          precoBaseUnitario: data.precoBaseUnitario,
          margemSugerida: data.margemSugerida,
          descontoMaximo: data.descontoMaximo,
          faixasPreco: data.faixasPreco,
          pacotesCredito: data.pacotesCredito,
        }),
      })

      if (!response.ok) {
        throw new Error("Falha ao salvar")
      }

      setMessage({ type: "success", text: "✅ Financeiro atualizado com sucesso!" })
      setIsEditing(false)
    } catch (error) {
      setMessage({ type: "error", text: `❌ Erro: ${error instanceof Error ? error.message : "Desconhecido"}` })
    } finally {
      setIsSaving(false)
    }
  }

  const handleRegenerate = async () => {
    setIsRegenerating(true)
    setMessage(null)

    try {
      const response = await fetch(`/api/products/${slug}/regenerate-financial`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        throw new Error("Falha ao regenerar")
      }

      const result = await response.json()
      setData({
        precoBaseUnitario: result.precoBaseUnitario,
        margemSugerida: result.margemSugerida,
        descontoMaximo: result.descontoMaximo,
        faixasPreco: result.faixasPreco,
        pacotesCredito: result.pacotesCredito,
      })

      setMessage({ type: "success", text: "✅ Financeiro regenerado por IA!" })
      setIsEditing(false)
    } catch (error) {
      setMessage({ type: "error", text: `❌ Erro: ${error instanceof Error ? error.message : "Desconhecido"}` })
    } finally {
      setIsRegenerating(false)
    }
  }

  return (
    <div className="rounded-lg border border-amber-200 bg-gradient-to-br from-amber-50 to-yellow-50 p-6 shadow-sm">
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-amber-200">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-bold text-amber-900">💰 Financeiro (Gerado por IA)</h2>
          <span className="text-xs bg-amber-200 text-amber-900 px-2 py-1 rounded-full font-medium">
            Crítico - Revisar
          </span>
        </div>
        <div className="flex gap-2">
          {!isEditing && (
            <>
              <button
                onClick={() => setIsEditing(true)}
                className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 text-sm font-medium transition"
              >
                ✏️ Editar
              </button>
              <button
                onClick={handleRegenerate}
                disabled={isRegenerating}
                className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-50 text-sm font-medium transition flex items-center gap-2"
              >
                {isRegenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Regenerando...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    Regenerar IA
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>

      {message && (
        <div
          className={`mb-4 p-4 rounded-lg flex items-start gap-3 ${
            message.type === "success" ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"
          }`}
        >
          {message.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          )}
          <p className={`text-sm ${message.type === "success" ? "text-green-800" : "text-red-800"}`}>
            {message.text}
          </p>
        </div>
      )}

      <div className="space-y-6">
        {/* Preço Base */}
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-amber-900 mb-2">
              Preço Base Unitário (BRL)
            </label>
            {isEditing ? (
              <input
                type="number"
                step="0.01"
                value={data.precoBaseUnitario || ""}
                onChange={e => setData({ ...data, precoBaseUnitario: e.target.valueAsNumber })}
                className="w-full px-3 py-2 border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500"
              />
            ) : (
              <div className="px-3 py-2 bg-amber-100 rounded-lg border border-amber-300 text-lg font-semibold text-amber-900">
                R$ {data.precoBaseUnitario?.toFixed(2) || "—"}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-amber-900 mb-2">Margem Sugerida (%)</label>
            {isEditing ? (
              <input
                type="number"
                step="0.5"
                min="0"
                max="100"
                value={data.margemSugerida || ""}
                onChange={e => setData({ ...data, margemSugerida: e.target.valueAsNumber })}
                className="w-full px-3 py-2 border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500"
              />
            ) : (
              <div className="px-3 py-2 bg-amber-100 rounded-lg border border-amber-300 text-lg font-semibold text-amber-900">
                {data.margemSugerida || "—"}%
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-amber-900 mb-2">Desconto Máximo (%)</label>
            {isEditing ? (
              <input
                type="number"
                step="0.5"
                min="0"
                max="100"
                value={data.descontoMaximo || ""}
                onChange={e => setData({ ...data, descontoMaximo: e.target.valueAsNumber })}
                className="w-full px-3 py-2 border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500"
              />
            ) : (
              <div className="px-3 py-2 bg-amber-100 rounded-lg border border-amber-300 text-lg font-semibold text-amber-900">
                {data.descontoMaximo || "—"}%
              </div>
            )}
          </div>
        </div>

        {/* Faixas de Preço */}
        <div>
          <h3 className="text-sm font-semibold text-amber-900 mb-3">Faixas de Preço por Público</h3>
          <div className="space-y-3">
            {data.faixasPreco?.map((faixa, i) => (
              <div key={i} className="bg-white rounded-lg border border-amber-300 p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <span className="font-medium text-amber-900">
                    {faixa.perfil === "ESCOLA_PEQUENA"
                      ? "🏫 Escolas Pequenas"
                      : faixa.perfil === "ESCOLA_MEDIA"
                        ? "🏢 Escolas Médias"
                        : "🏛️ Redes Grandes"}
                  </span>
                  {isEditing && (
                    <button
                      onClick={() => {
                        setData({
                          ...data,
                          faixasPreco: data.faixasPreco?.filter((_, idx) => idx !== i),
                        })
                      }}
                      className="text-red-600 hover:text-red-700"
                    >
                      <X size={18} />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-3 text-sm">
                  <div>
                    <label className="text-xs text-gray-600 font-medium">Qtd. Mín.</label>
                    {isEditing ? (
                      <input
                        type="number"
                        value={faixa.qtdMinima}
                        onChange={e => {
                          const newFaixas = [...(data.faixasPreco || [])]
                          newFaixas[i].qtdMinima = e.target.valueAsNumber
                          setData({ ...data, faixasPreco: newFaixas })
                        }}
                        className="w-full px-2 py-1 border border-gray-300 rounded mt-1"
                      />
                    ) : (
                      <div className="text-gray-900 font-medium mt-1">{faixa.qtdMinima}</div>
                    )}
                  </div>

                  <div>
                    <label className="text-xs text-gray-600 font-medium">Qtd. Máx.</label>
                    {isEditing ? (
                      <input
                        type="number"
                        value={faixa.qtdMaxima}
                        onChange={e => {
                          const newFaixas = [...(data.faixasPreco || [])]
                          newFaixas[i].qtdMaxima = e.target.valueAsNumber
                          setData({ ...data, faixasPreco: newFaixas })
                        }}
                        className="w-full px-2 py-1 border border-gray-300 rounded mt-1"
                      />
                    ) : (
                      <div className="text-gray-900 font-medium mt-1">{faixa.qtdMaxima}</div>
                    )}
                  </div>

                  <div>
                    <label className="text-xs text-gray-600 font-medium">Preço Unit. (R$)</label>
                    {isEditing ? (
                      <input
                        type="number"
                        step="0.01"
                        value={faixa.precoUnitario}
                        onChange={e => {
                          const newFaixas = [...(data.faixasPreco || [])]
                          newFaixas[i].precoUnitario = e.target.valueAsNumber
                          setData({ ...data, faixasPreco: newFaixas })
                        }}
                        className="w-full px-2 py-1 border border-gray-300 rounded mt-1"
                      />
                    ) : (
                      <div className="text-gray-900 font-medium mt-1">{faixa.precoUnitario.toFixed(2)}</div>
                    )}
                  </div>
                </div>

                {isEditing && (
                  <input
                    type="text"
                    value={faixa.descricaoFaixa}
                    onChange={e => {
                      const newFaixas = [...(data.faixasPreco || [])]
                      newFaixas[i].descricaoFaixa = e.target.value
                      setData({ ...data, faixasPreco: newFaixas })
                    }}
                    placeholder="Descrição da faixa"
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                  />
                )}
                {!isEditing && (
                  <p className="text-xs text-gray-600 italic">{faixa.descricaoFaixa}</p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Pacotes de Crédito */}
        {modeloContratado === "CREDITO" && data.pacotesCredito && data.pacotesCredito.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-amber-900 mb-3">Pacotes de Crédito</h3>
            <div className="space-y-3">
              {data.pacotesCredito.map((pacote, i) => (
                <div key={i} className="bg-white rounded-lg border border-amber-300 p-4 grid grid-cols-4 gap-3 items-end">
                  <div>
                    <label className="block text-xs text-gray-600 font-medium mb-1">Nome</label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={pacote.nome}
                        onChange={e => {
                          const newPacotes = [...(data.pacotesCredito || [])]
                          newPacotes[i].nome = e.target.value
                          setData({ ...data, pacotesCredito: newPacotes })
                        }}
                        className="w-full px-2 py-1 border border-gray-300 rounded"
                      />
                    ) : (
                      <div className="text-gray-900 font-medium">{pacote.nome}</div>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs text-gray-600 font-medium mb-1">Horas</label>
                    {isEditing ? (
                      <input
                        type="number"
                        value={pacote.horas}
                        onChange={e => {
                          const newPacotes = [...(data.pacotesCredito || [])]
                          newPacotes[i].horas = e.target.valueAsNumber
                          setData({ ...data, pacotesCredito: newPacotes })
                        }}
                        className="w-full px-2 py-1 border border-gray-300 rounded"
                      />
                    ) : (
                      <div className="text-gray-900 font-medium">{pacote.horas}h</div>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs text-gray-600 font-medium mb-1">Preço Total (R$)</label>
                    {isEditing ? (
                      <input
                        type="number"
                        step="0.01"
                        value={pacote.precoTotal}
                        onChange={e => {
                          const newPacotes = [...(data.pacotesCredito || [])]
                          newPacotes[i].precoTotal = e.target.valueAsNumber
                          setData({ ...data, pacotesCredito: newPacotes })
                        }}
                        className="w-full px-2 py-1 border border-gray-300 rounded"
                      />
                    ) : (
                      <div className="text-gray-900 font-medium">{pacote.precoTotal.toFixed(2)}</div>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs text-gray-600 font-medium mb-1">Desconto (%)</label>
                    {isEditing ? (
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        max="100"
                        value={pacote.desconto}
                        onChange={e => {
                          const newPacotes = [...(data.pacotesCredito || [])]
                          newPacotes[i].desconto = e.target.valueAsNumber
                          setData({ ...data, pacotesCredito: newPacotes })
                        }}
                        className="w-full px-2 py-1 border border-gray-300 rounded"
                      />
                    ) : (
                      <div className="text-gray-900 font-medium">{pacote.desconto}%</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      {isEditing && (
        <div className="flex gap-3 mt-6 pt-6 border-t border-amber-200">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-medium py-3 rounded-lg transition flex items-center justify-center gap-2"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Salvando...
              </>
            ) : (
              <>✓ Salvar Alterações</>
            )}
          </button>
          <button
            onClick={() => {
              setIsEditing(false)
              setData(initialData)
            }}
            className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-900 font-medium py-3 rounded-lg transition"
          >
            ✕ Cancelar
          </button>
        </div>
      )}
    </div>
  )
}
