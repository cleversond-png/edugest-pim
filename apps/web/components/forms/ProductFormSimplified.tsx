"use client"

import { useState } from "react"
import { AlertCircle, CheckCircle2, X, Loader2 } from "lucide-react"
import { createProductAction } from "@/app/products/new/actions"
import { useRouter } from "next/navigation"

interface ProductFormData {
  // Identidade (4)
  codigo: string
  nomeComercial: string
  tipoProduto: string
  status: string

  // Comercial (4)
  descricaoComercialCurta: string
  doresAtendidas: string[]
  publicoAlvo: string[]
  diferenciais: string[]

  // Fiscal (3)
  codigoNBS: string
  temISS: string
  aliquotaISS?: number

  // Financeiro (2 — o resto é gerado por IA)
  modeloContratado: string
  modeloFaturamento: string

  // Técnico (3)
  modeloDeployment: string
  requisitosMinimos: string[]
  tecnologiasBase: string[]

  // Suporte (2)
  slaAtendimento: string
  kbArticles: string[]
}

export function ProductFormSimplified() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState<ProductFormData>({
    codigo: "",
    nomeComercial: "",
    tipoProduto: "SAAS_BB",
    status: "RASCUNHO",
    descricaoComercialCurta: "",
    doresAtendidas: [],
    publicoAlvo: [],
    diferenciais: [],
    codigoNBS: "",
    temISS: "A_VALIDAR",
    aliquotaISS: undefined,
    modeloContratado: "SUBSCRICAO",
    modeloFaturamento: "RECORRENTE",
    modeloDeployment: "CLOUD",
    requisitosMinimos: [],
    tecnologiasBase: [],
    slaAtendimento: "24 horas",
    kbArticles: [],
  })

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [currentTag, setCurrentTag] = useState("")

  const validate = () => {
    const newErrors: Record<string, string> = {}
    if (!formData.codigo.trim()) newErrors.codigo = "Código é obrigatório"
    if (!formData.nomeComercial.trim()) newErrors.nomeComercial = "Nome comercial é obrigatório"
    if (formData.doresAtendidas.length === 0) newErrors.doresAtendidas = "Adicione pelo menos uma dor"
    if (formData.publicoAlvo.length === 0) newErrors.publicoAlvo = "Selecione pelo menos um público"
    if (!formData.codigoNBS.trim()) newErrors.codigoNBS = "Código NBS é obrigatório"
    if (formData.temISS === "SIM" && !formData.aliquotaISS) newErrors.aliquotaISS = "Alíquota ISS obrigatória"

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    setLoading(true)
    try {
      const result = await createProductAction({
        nomeComercial: formData.nomeComercial,
        codigo: formData.codigo,
        tipoProduto: formData.tipoProduto,
        status: formData.status,
        descricaoComercialCurta: formData.descricaoComercialCurta,
        doresAtendidas: formData.doresAtendidas,
        publicoAlvo: formData.publicoAlvo,
        diferenciais: formData.diferenciais,
        codigoNBS: formData.codigoNBS,
        temISS: formData.temISS,
        aliquotaISS: formData.aliquotaISS,
        modeloContratado: formData.modeloContratado,
        modeloFaturamento: formData.modeloFaturamento,
        modeloDeployment: formData.modeloDeployment,
        requisitosMinimos: formData.requisitosMinimos,
        tecnologiasBase: formData.tecnologiasBase,
        slaAtendimento: formData.slaAtendimento,
        kbArticles: formData.kbArticles,
      })

      if (result.success && result.slug) {
        router.push(`/products/${result.slug}/edit-ai-content`)
      } else {
        setErrors({ submit: result.error || "Erro ao criar produto" })
      }
    } catch (error) {
      setErrors({ submit: error instanceof Error ? error.message : "Erro desconhecido" })
    } finally {
      setLoading(false)
    }
  }

  const addTag = (field: keyof ProductFormData, value: string) => {
    if (value.trim()) {
      setFormData({
        ...formData,
        [field]: [...(formData[field] as string[]), value.trim()],
      })
    }
  }

  const removeTag = (field: keyof ProductFormData, index: number) => {
    setFormData({
      ...formData,
      [field]: (formData[field] as string[]).filter((_, i) => i !== index),
    })
  }

  const toggleCheckbox = (field: string, value: string) => {
    const current = formData[field as keyof ProductFormData] as string[]
    if (current.includes(value)) {
      setFormData({
        ...formData,
        [field]: current.filter(v => v !== value),
      })
    } else {
      setFormData({
        ...formData,
        [field]: [...current, value],
      })
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-4xl mx-auto space-y-8 py-8">
      {/* ===== BLOCO 1: IDENTIDADE ===== */}
      <section className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          📝 Identidade
        </h2>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Código ERP <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.codigo}
              onChange={e => setFormData({ ...formData, codigo: e.target.value })}
              placeholder="Ex: SKU-12345"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {errors.codigo && <p className="text-xs text-red-500 mt-1">{errors.codigo}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nome Comercial <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.nomeComercial}
              onChange={e => setFormData({ ...formData, nomeComercial: e.target.value })}
              placeholder="Ex: Hub de Integração"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {errors.nomeComercial && <p className="text-xs text-red-500 mt-1">{errors.nomeComercial}</p>}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tipo de Produto <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.tipoProduto}
              onChange={e => setFormData({ ...formData, tipoProduto: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            >
              <option value="SAAS_BB">SaaS (Banco do Brasil)</option>
              <option value="SERVICO_PROFISSIONAL">Serviço Profissional</option>
              <option value="LICENCIAMENTO">Licenciamento</option>
              <option value="CREDITO">Crédito</option>
              <option value="HARDWARE">Hardware</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.status}
              onChange={e => setFormData({ ...formData, status: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            >
              <option value="RASCUNHO">Rascunho</option>
              <option value="ATIVO">Ativo</option>
              <option value="INATIVO">Inativo</option>
            </select>
          </div>
        </div>
      </section>

      {/* ===== BLOCO 2: COMERCIAL ===== */}
      <section className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          💼 Comercial
        </h2>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Descrição Comercial Curta
          </label>
          <textarea
            value={formData.descricaoComercialCurta}
            onChange={e => setFormData({ ...formData, descricaoComercialCurta: e.target.value })}
            placeholder="Resuma em 280 caracteres o que o produto faz"
            maxLength={280}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 resize-none"
            rows={2}
          />
          <p className="text-xs text-gray-500 mt-1">{formData.descricaoComercialCurta.length}/280</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Dores Atendidas <span className="text-red-500">*</span>
          </label>
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={currentTag}
              onChange={e => setCurrentTag(e.target.value)}
              onKeyPress={e => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  addTag("doresAtendidas", currentTag)
                  setCurrentTag("")
                }
              }}
              placeholder="Digite e pressione Enter"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="button"
              onClick={() => {
                addTag("doresAtendidas", currentTag)
                setCurrentTag("")
              }}
              className="px-3 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
            >
              +
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {formData.doresAtendidas.map((dor, i) => (
              <span key={i} className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm flex items-center gap-2">
                {dor}
                <button
                  type="button"
                  onClick={() => removeTag("doresAtendidas", i)}
                  className="hover:text-red-600"
                >
                  <X size={14} />
                </button>
              </span>
            ))}
          </div>
          {errors.doresAtendidas && <p className="text-xs text-red-500 mt-1">{errors.doresAtendidas}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Público-Alvo <span className="text-red-500">*</span>
          </label>
          <div className="space-y-2">
            {["ESCOLA_PEQUENA", "ESCOLA_MEDIA", "REDE_GRANDE"].map(profile => (
              <label key={profile} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.publicoAlvo.includes(profile)}
                  onChange={() => toggleCheckbox("publicoAlvo", profile)}
                  className="w-4 h-4 rounded"
                />
                <span className="text-sm text-gray-700">
                  {profile === "ESCOLA_PEQUENA" && "Escola Pequena"}
                  {profile === "ESCOLA_MEDIA" && "Escola Média"}
                  {profile === "REDE_GRANDE" && "Rede Grande"}
                </span>
              </label>
            ))}
          </div>
          {errors.publicoAlvo && <p className="text-xs text-red-500 mt-1">{errors.publicoAlvo}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Diferenciais (máx 3)
          </label>
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              placeholder="Digite um diferencial"
              onKeyPress={e => {
                if (e.key === "Enter" && formData.diferenciais.length < 3) {
                  e.preventDefault()
                  addTag("diferenciais", e.currentTarget.value)
                  e.currentTarget.value = ""
                }
              }}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {formData.diferenciais.map((dif, i) => (
              <span key={i} className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm flex items-center gap-2">
                {dif}
                <button type="button" onClick={() => removeTag("diferenciais", i)} className="hover:text-red-600">
                  <X size={14} />
                </button>
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ===== BLOCO 3: FISCAL ===== */}
      <section className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          📋 Fiscal
        </h2>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Código NBS <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.codigoNBS}
            onChange={e => setFormData({ ...formData, codigoNBS: e.target.value })}
            placeholder="Ex: 010110"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
          />
          {errors.codigoNBS && <p className="text-xs text-red-500 mt-1">{errors.codigoNBS}</p>}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tem ISS? <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.temISS}
              onChange={e => setFormData({ ...formData, temISS: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            >
              <option value="A_VALIDAR">A Validar</option>
              <option value="SIM">Sim</option>
              <option value="NAO">Não</option>
            </select>
          </div>

          {formData.temISS === "SIM" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Alíquota ISS (%)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={formData.aliquotaISS || ""}
                onChange={e => setFormData({ ...formData, aliquotaISS: e.target.valueAsNumber })}
                placeholder="Ex: 5.00"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              />
              {errors.aliquotaISS && <p className="text-xs text-red-500 mt-1">{errors.aliquotaISS}</p>}
            </div>
          )}
        </div>
      </section>

      {/* ===== BLOCO 4: FINANCEIRO ===== */}
      <section className="bg-blue-50 rounded-lg border border-blue-200 p-6 space-y-4">
        <div className="flex items-start gap-2 mb-4 pb-4 border-b border-blue-200">
          <CheckCircle2 className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-blue-900">💰 Financeiro (Inteligência IA)</h2>
            <p className="text-sm text-blue-700 mt-1">
              Preencha apenas a estratégia de contratação. Preços, margens e faixas são gerados automaticamente pela IA.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Modelo de Contratação <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.modeloContratado}
              onChange={e => setFormData({ ...formData, modeloContratado: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            >
              <option value="SUBSCRICAO">Subscrição</option>
              <option value="CREDITO">Crédito</option>
              <option value="PONTUAL">Pontual</option>
              <option value="CONSUMO">Consumo</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Modelo de Faturamento <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.modeloFaturamento}
              onChange={e => setFormData({ ...formData, modeloFaturamento: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            >
              <option value="RECORRENTE">Recorrente</option>
              <option value="PONTUAL">Pontual</option>
              <option value="VARIAVEL">Variável</option>
            </select>
          </div>
        </div>

        <div className="bg-white rounded p-4 border border-blue-100 text-sm text-blue-800">
          <p className="font-semibold mb-2">A IA irá gerar:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Preço base unitário</li>
            <li>Margem sugerida</li>
            <li>Desconto máximo</li>
            <li>Faixas de preço por público</li>
            <li>Pacotes de crédito (se aplicável)</li>
          </ul>
        </div>
      </section>

      {/* ===== BLOCO 5: TÉCNICO ===== */}
      <section className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          🔧 Técnico
        </h2>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Modelo de Deployment
          </label>
          <select
            value={formData.modeloDeployment}
            onChange={e => setFormData({ ...formData, modeloDeployment: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
          >
            <option value="CLOUD">Cloud</option>
            <option value="HYBRID">Híbrido</option>
            <option value="ON_PREMISE">On-Premise</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Requisitos Mínimos
          </label>
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              placeholder="Ex: Windows Server 2019"
              onKeyPress={e => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  addTag("requisitosMinimos", e.currentTarget.value)
                  e.currentTarget.value = ""
                }
              }}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {formData.requisitosMinimos.map((req, i) => (
              <span key={i} className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm flex items-center gap-2">
                {req}
                <button type="button" onClick={() => removeTag("requisitosMinimos", i)} className="hover:text-red-600">
                  <X size={14} />
                </button>
              </span>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Tecnologias Base
          </label>
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              placeholder="Ex: .NET, SQL Server"
              onKeyPress={e => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  addTag("tecnologiasBase", e.currentTarget.value)
                  e.currentTarget.value = ""
                }
              }}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {formData.tecnologiasBase.map((tech, i) => (
              <span key={i} className="bg-orange-100 text-orange-800 px-3 py-1 rounded-full text-sm flex items-center gap-2">
                {tech}
                <button type="button" onClick={() => removeTag("tecnologiasBase", i)} className="hover:text-red-600">
                  <X size={14} />
                </button>
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ===== BLOCO 6: SUPORTE ===== */}
      <section className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          📞 Suporte
        </h2>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            SLA de Atendimento
          </label>
          <input
            type="text"
            value={formData.slaAtendimento}
            onChange={e => setFormData({ ...formData, slaAtendimento: e.target.value })}
            placeholder="Ex: 24 horas"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Artigos de KB
          </label>
          <div className="flex gap-2 mb-2">
            <input
              type="url"
              placeholder="Ex: https://kb.edu.br/article-123"
              onKeyPress={e => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  addTag("kbArticles", e.currentTarget.value)
                  e.currentTarget.value = ""
                }
              }}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {formData.kbArticles.map((article, i) => (
              <span key={i} className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs flex items-center gap-2 max-w-xs truncate">
                <a href={article} target="_blank" rel="noopener noreferrer" className="underline">
                  KB
                </a>
                <button type="button" onClick={() => removeTag("kbArticles", i)} className="hover:text-red-600">
                  <X size={14} />
                </button>
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ERRO GLOBAL */}
      {errors.submit && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-4 flex gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-800">{errors.submit}</p>
          </div>
        </div>
      )}

      {/* BOTÃO SUBMISSÃO */}
      <div className="flex gap-4 justify-center py-8">
        <button
          type="submit"
          disabled={loading}
          className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold transition flex items-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Criando produto...
            </>
          ) : (
            <>✨ Criar Produto (IA gerará tudo mais!)</>
          )}
        </button>
      </div>
    </form>
  )
}
