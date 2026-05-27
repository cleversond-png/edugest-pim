"use client"

import { useState } from "react"
import { ChevronDown, ChevronUp, AlertCircle, Loader2 } from "lucide-react"
import { createProductAction } from "@/app/products/new/actions"

interface FormData {
  nomeComercial: string
  codigo: string
  tipoProduto: string
  status: string
  descricaoComercialCurta: string
  doresAtendidas: string[]
  publicoAlvo: string[]
  diferenciais: string[]
  codigoNBS: string
  temISS: string
  aliquotaISS: string
  modeloContratado: string
  modeloFaturamento: string
  modeloDeployment: string
  requisitosMinimos: string[]
  tecnologiasBase: string[]
  slaAtendimento: string
  kbArticles: string[]
}

const INITIAL_STATE: FormData = {
  nomeComercial: "",
  codigo: "",
  tipoProduto: "SAAS_BB",
  status: "RASCUNHO",
  descricaoComercialCurta: "",
  doresAtendidas: [],
  publicoAlvo: [],
  diferenciais: [],
  codigoNBS: "",
  temISS: "A_VALIDAR",
  aliquotaISS: "",
  modeloContratado: "SUBSCRICAO",
  modeloFaturamento: "RECORRENTE",
  modeloDeployment: "CLOUD",
  requisitosMinimos: [],
  tecnologiasBase: [],
  slaAtendimento: "",
  kbArticles: [],
}

interface BlockState {
  identidade: boolean
  comercial: boolean
  erp: boolean
  tecnico: boolean
  suporte: boolean
}

export function ProductFormV2() {
  const [data, setData] = useState<FormData>(INITIAL_STATE)
  const [blocks, setBlocks] = useState<BlockState>({
    identidade: true,
    comercial: false,
    erp: false,
    tecnico: false,
    suporte: false,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const toggleBlock = (block: keyof BlockState) => {
    setBlocks((prev) => ({ ...prev, [block]: !prev[block] }))
  }

  const updateField = <K extends keyof FormData>(field: K, value: FormData[K]) => {
    setData((prev) => ({ ...prev, [field]: value }))
  }

  const addTagToArray = (field: "doresAtendidas" | "publicoAlvo" | "diferenciais" | "requisitosMinimos" | "tecnologiasBase" | "kbArticles", tag: string) => {
    if (tag.trim()) {
      setData((prev) => ({
        ...prev,
        [field]: [...prev[field], tag.trim()],
      }))
    }
  }

  const removeTagFromArray = (field: "doresAtendidas" | "publicoAlvo" | "diferenciais" | "requisitosMinimos" | "tecnologiasBase" | "kbArticles", index: number) => {
    setData((prev) => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index),
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const result = await createProductAction({
        nomeComercial: data.nomeComercial,
        codigo: data.codigo,
        tipoProduto: data.tipoProduto as any,
        status: data.status as any,
        descricaoComercialCurta: data.descricaoComercialCurta,
        doresAtendidas: data.doresAtendidas,
        publicoAlvo: data.publicoAlvo,
        diferenciais: data.diferenciais,
        codigoNBS: data.codigoNBS,
        temISS: data.temISS as any,
        aliquotaISS: data.aliquotaISS ? parseFloat(data.aliquotaISS) : undefined,
        modeloContratado: data.modeloContratado as any,
        modeloFaturamento: data.modeloFaturamento as any,
        modeloDeployment: data.modeloDeployment as any,
        requisitosMinimos: data.requisitosMinimos,
        tecnologiasBase: data.tecnologiasBase,
        slaAtendimento: data.slaAtendimento,
        kbArticles: data.kbArticles,
      })

      if (result.success) {
        // Redirect to generated content review page
        window.location.href = `/products/${result.slug}/edit-ai-content`
      } else {
        setError(result.error || "Erro ao criar produto")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 flex gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* BLOCO IDENTIDADE */}
      <div className="rounded-lg border border-gray-200">
        <button
          type="button"
          onClick={() => toggleBlock("identidade")}
          className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50"
        >
          <h3 className="font-semibold text-gray-900">📝 Identidade</h3>
          {blocks.identidade ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
        </button>
        {blocks.identidade && (
          <div className="border-t border-gray-200 px-6 py-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="Nome Comercial *"
                value={data.nomeComercial}
                onChange={(e) => updateField("nomeComercial", e.target.value)}
                className="col-span-2 px-3 py-2 border border-gray-300 rounded-md text-sm placeholder:text-gray-600"
                required
              />
              <input
                type="text"
                placeholder="Código Sankhya *"
                value={data.codigo}
                onChange={(e) => updateField("codigo", e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm placeholder:text-gray-600"
                required
              />
              <select
                value={data.tipoProduto}
                onChange={(e) => updateField("tipoProduto", e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm bg-white"
                required
              >
                <option value="SAAS_BB">SaaS BB</option>
                <option value="SERVICO_PROFISSIONAL">Serviço Profissional</option>
                <option value="LICENCIAMENTO">Licenciamento</option>
                <option value="CREDITO">Crédito</option>
              </select>
              <select
                value={data.status}
                onChange={(e) => updateField("status", e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm bg-white"
              >
                <option value="RASCUNHO">Rascunho</option>
                <option value="ATIVO">Ativo</option>
                <option value="INATIVO">Inativo</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* BLOCO COMERCIAL */}
      <div className="rounded-lg border border-gray-200">
        <button
          type="button"
          onClick={() => toggleBlock("comercial")}
          className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50"
        >
          <h3 className="font-semibold text-gray-900">💰 Comercial</h3>
          {blocks.comercial ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
        </button>
        {blocks.comercial && (
          <div className="border-t border-gray-200 px-6 py-4 space-y-4">
            <textarea
              placeholder="O que resolve? (até 280 caracteres)"
              value={data.descricaoComercialCurta}
              onChange={(e) => updateField("descricaoComercialCurta", e.target.value.slice(0, 280))}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm placeholder:text-gray-600"
            />

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-2">Dores Atendidas</label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  placeholder="Digite e pressione Enter"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault()
                      addTagToArray("doresAtendidas", e.currentTarget.value)
                      e.currentTarget.value = ""
                    }
                  }}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm placeholder:text-gray-600"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {data.doresAtendidas.map((tag, i) => (
                  <span key={i} className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs flex items-center gap-2">
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeTagFromArray("doresAtendidas", i)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-2">Público-alvo</label>
              <div className="space-y-2">
                {["ESCOLA_PEQUENA", "ESCOLA_MEDIA", "REDE_GRANDE"].map((perfil) => (
                  <label key={perfil} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={data.publicoAlvo.includes(perfil)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          addTagToArray("publicoAlvo", perfil)
                        } else {
                          setData((prev) => ({
                            ...prev,
                            publicoAlvo: prev.publicoAlvo.filter((p) => p !== perfil),
                          }))
                        }
                      }}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">{perfil.replace(/_/g, " ")}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-2">Diferenciais (máx 3)</label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  placeholder="Digite e pressione Enter"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && data.diferenciais.length < 3) {
                      e.preventDefault()
                      addTagToArray("diferenciais", e.currentTarget.value)
                      e.currentTarget.value = ""
                    }
                  }}
                  disabled={data.diferenciais.length >= 3}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm placeholder:text-gray-600 disabled:bg-gray-100"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {data.diferenciais.map((tag, i) => (
                  <span key={i} className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs flex items-center gap-2">
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeTagFromArray("diferenciais", i)}
                      className="text-green-600 hover:text-green-800"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* BLOCO ERP / FISCAL */}
      <div className="rounded-lg border border-gray-200">
        <button
          type="button"
          onClick={() => toggleBlock("erp")}
          className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50"
        >
          <h3 className="font-semibold text-gray-900">💼 ERP / Fiscal</h3>
          {blocks.erp ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
        </button>
        {blocks.erp && (
          <div className="border-t border-gray-200 px-6 py-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="Código NBS *"
                value={data.codigoNBS}
                onChange={(e) => updateField("codigoNBS", e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm placeholder:text-gray-600"
                required
              />
              <select
                value={data.temISS}
                onChange={(e) => updateField("temISS", e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm bg-white"
                required
              >
                <option value="A_VALIDAR">ISS - A Validar</option>
                <option value="SIM">Tem ISS</option>
                <option value="NAO">Sem ISS</option>
              </select>
              {data.temISS === "SIM" && (
                <input
                  type="number"
                  placeholder="Alíquota ISS %"
                  value={data.aliquotaISS}
                  onChange={(e) => updateField("aliquotaISS", e.target.value)}
                  step="0.01"
                  min="0"
                  max="100"
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm placeholder:text-gray-600"
                />
              )}
              <select
                value={data.modeloContratado}
                onChange={(e) => updateField("modeloContratado", e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm bg-white"
                required
              >
                <option value="SUBSCRICAO">Subscrição</option>
                <option value="PONTUAL">Pontual</option>
                <option value="CREDITO">Crédito</option>
                <option value="CONSUMO">Consumo</option>
              </select>
              <select
                value={data.modeloFaturamento}
                onChange={(e) => updateField("modeloFaturamento", e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm bg-white"
                required
              >
                <option value="RECORRENTE">Recorrente</option>
                <option value="PONTUAL">Pontual</option>
                <option value="VARIAVEL">Variável</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* BLOCO TÉCNICO */}
      <div className="rounded-lg border border-gray-200">
        <button
          type="button"
          onClick={() => toggleBlock("tecnico")}
          className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50"
        >
          <h3 className="font-semibold text-gray-900">🔧 Técnico (Básico)</h3>
          {blocks.tecnico ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
        </button>
        {blocks.tecnico && (
          <div className="border-t border-gray-200 px-6 py-4 space-y-4">
            <div>
              <select
                value={data.modeloDeployment}
                onChange={(e) => updateField("modeloDeployment", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white"
              >
                <option value="CLOUD">Cloud</option>
                <option value="HYBRID">Híbrido</option>
                <option value="ON_PREMISE">On-Premise</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-2">Requisitos Mínimos</label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  placeholder="Ex: Node.js 18+, PostgreSQL 13+"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault()
                      addTagToArray("requisitosMinimos", e.currentTarget.value)
                      e.currentTarget.value = ""
                    }
                  }}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm placeholder:text-gray-600"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {data.requisitosMinimos.map((tag, i) => (
                  <span key={i} className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-xs flex items-center gap-2">
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeTagFromArray("requisitosMinimos", i)}
                      className="text-purple-600 hover:text-purple-800"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-2">Tecnologias Base</label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  placeholder="Ex: React, Next.js, TypeScript"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault()
                      addTagToArray("tecnologiasBase", e.currentTarget.value)
                      e.currentTarget.value = ""
                    }
                  }}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm placeholder:text-gray-600"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {data.tecnologiasBase.map((tag, i) => (
                  <span key={i} className="bg-indigo-100 text-indigo-800 px-3 py-1 rounded-full text-xs flex items-center gap-2">
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeTagFromArray("tecnologiasBase", i)}
                      className="text-indigo-600 hover:text-indigo-800"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* BLOCO SUPORTE */}
      <div className="rounded-lg border border-gray-200">
        <button
          type="button"
          onClick={() => toggleBlock("suporte")}
          className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50"
        >
          <h3 className="font-semibold text-gray-900">📞 Suporte</h3>
          {blocks.suporte ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
        </button>
        {blocks.suporte && (
          <div className="border-t border-gray-200 px-6 py-4 space-y-4">
            <input
              type="text"
              placeholder="SLA Atendimento (ex: 8h úteis)"
              value={data.slaAtendimento}
              onChange={(e) => updateField("slaAtendimento", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm placeholder:text-gray-600"
            />

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-2">Links KB</label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  placeholder="Paste link e pressione Enter"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault()
                      addTagToArray("kbArticles", e.currentTarget.value)
                      e.currentTarget.value = ""
                    }
                  }}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm placeholder:text-gray-600"
                />
              </div>
              <div className="space-y-1">
                {data.kbArticles.map((url, i) => (
                  <div key={i} className="flex items-center justify-between text-xs bg-gray-50 p-2 rounded">
                    <a href={url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline truncate">
                      {url}
                    </a>
                    <button
                      type="button"
                      onClick={() => removeTagFromArray("kbArticles", i)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* BOTÕES */}
      <div className="flex gap-4">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-3 rounded-lg flex items-center justify-center gap-2"
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          {loading ? "Salvando..." : "Salvar e Gerar Conteúdo"}
        </button>
      </div>
    </form>
  )
}
