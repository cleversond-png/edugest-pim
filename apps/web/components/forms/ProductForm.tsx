"use client"

import { useState, useCallback } from "react"
import { ChevronDown, ChevronUp, AlertCircle, CheckCircle } from "lucide-react"

interface ProductFormData {
  // Identidade
  nomeComercial: string
  nomeInterno: string
  tipoProduto: string
  natureza: string
  status: string
  produtoCore: boolean
  integraJornada: boolean

  // Comercial
  descricaoComercialCurta: string
  shortPitch: string
  proposta_valor: string
  doresAtendidas: string[]
  publicoAlvo: string[]
  diferenciais: string[]
  dependenciaComercial: string
  produtoBase: string
  observacoesComerciais: string
  perfilCliente: string[]

  // Financeiro
  modeloContratado: string
  modeloFaturamento: string
  tipoReceita: string
  unidadeMedida: string
  geraARR: boolean
  centroResultado: string
  grupoCodigo: string
  grupoDescricao: string
  ativo: boolean

  // Fiscal
  codigoNBS: string
  temISS: string
  aliquotaISS: number
  codigoServico: string
  regimeTributario: string
  observacoesFiscais: string
  fiscalStatus: string

  // Técnico
  arquiteturaHLD: string
  requisitosMinimos: string[]
  tecnologiasBase: string[]
  modeloDeployment: string
  integracoesSuportadas: string[]
  limitacoesConhecidas: string
  tempoImplementacao: string

  // Suporte
  slaAtendimento: string
  faq: Array<{ pergunta: string; resposta: string }>
  problemasConhecidos: string[]
  troubleshootingGuia: string
  kbArticles: string[]

  // Marketing
  cases: Array<{ cliente: string; desafio: string; solucao: string; resultado: string }>
  objecoesRespostas: Array<{ objecao: string; resposta: string; contexto?: string }>
  scriptVenda: string
  tagsCopilot: string[]

  // Onboarding
  contextoGeral: string
  porQueExiste: string
  paraquemE: string
  naoConfundirCom: string
  roadmapPublico: string

  // Origem
  origemTipo: string
  origemDescricao: string
  origemClienteSegmento: string
  origemData: string
  origemResponsavel: string
}

const INITIAL_FORM_STATE: ProductFormData = {
  nomeComercial: "",
  nomeInterno: "",
  tipoProduto: "SAAS_BB",
  natureza: "MODULAR",
  status: "RASCUNHO",
  produtoCore: false,
  integraJornada: false,

  descricaoComercialCurta: "",
  shortPitch: "",
  proposta_valor: "",
  doresAtendidas: [],
  publicoAlvo: [],
  diferenciais: [],
  dependenciaComercial: "NENHUMA",
  produtoBase: "",
  observacoesComerciais: "",
  perfilCliente: [],

  modeloContratado: "SUBSCRICAO",
  modeloFaturamento: "RECORRENTE",
  tipoReceita: "ARR",
  unidadeMedida: "UNIDADE",
  geraARR: false,
  centroResultado: "",
  grupoCodigo: "",
  grupoDescricao: "",
  ativo: true,

  codigoNBS: "",
  temISS: "A_VALIDAR",
  aliquotaISS: 0,
  codigoServico: "",
  regimeTributario: "",
  observacoesFiscais: "",
  fiscalStatus: "A_VALIDAR",

  arquiteturaHLD: "",
  requisitosMinimos: [],
  tecnologiasBase: [],
  modeloDeployment: "CLOUD",
  integracoesSuportadas: [],
  limitacoesConhecidas: "",
  tempoImplementacao: "",

  slaAtendimento: "",
  faq: [],
  problemasConhecidos: [],
  troubleshootingGuia: "",
  kbArticles: [],

  cases: [],
  objecoesRespostas: [],
  scriptVenda: "",
  tagsCopilot: [],

  contextoGeral: "",
  porQueExiste: "",
  paraquemE: "",
  naoConfundirCom: "",
  roadmapPublico: "",

  origemTipo: "INTERNO",
  origemDescricao: "",
  origemClienteSegmento: "",
  origemData: "",
  origemResponsavel: "",
}

const REQUIRED_FIELDS = {
  Identidade: ["nomeComercial", "tipoProduto"],
  Comercial: ["descricaoComercialCurta"],
  Financeiro: ["modeloContratado", "modeloFaturamento"],
  Fiscal: ["fiscalStatus"],
  Técnico: [],
  Suporte: [],
  Marketing: [],
  Onboarding: [],
  Origem: [],
}

interface Props {
  onSubmit: (data: ProductFormData) => Promise<void>
  isLoading: boolean
}

export function ProductForm({ onSubmit, isLoading }: Props) {
  const [formData, setFormData] = useState<ProductFormData>(INITIAL_FORM_STATE)
  const [expandedBlocks, setExpandedBlocks] = useState<Record<string, boolean>>({
    Identidade: true,
    Comercial: false,
    Financeiro: false,
    Fiscal: false,
    Técnico: false,
    Suporte: false,
    Marketing: false,
    Onboarding: false,
    Origem: false,
  })
  const [blockErrors, setBlockErrors] = useState<Record<string, string[]>>({})
  const [globalError, setGlobalError] = useState<string | null>(null)

  const toggleBlock = useCallback((block: string) => {
    setExpandedBlocks((prev) => ({ ...prev, [block]: !prev[block] }))
  }, [])

  const validateBlock = (block: string): boolean => {
    const required = REQUIRED_FIELDS[block as keyof typeof REQUIRED_FIELDS] || []
    const errors: string[] = []

    for (const field of required) {
      const value = formData[field as keyof ProductFormData]
      if (!value || (Array.isArray(value) && value.length === 0)) {
        errors.push(`${field} é obrigatório`)
      }
    }

    if (errors.length > 0) {
      setBlockErrors((prev) => ({ ...prev, [block]: errors }))
      return false
    }

    setBlockErrors((prev) => ({ ...prev, [block]: [] }))
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setGlobalError(null)

    // Validate all blocks
    const blocks = Object.keys(REQUIRED_FIELDS)
    let isValid = true
    for (const block of blocks) {
      if (!validateBlock(block)) {
        isValid = false
      }
    }

    if (!isValid) {
      setGlobalError("Preencha todos os campos obrigatórios antes de continuar")
      return
    }

    try {
      await onSubmit(formData)
    } catch (error) {
      setGlobalError(
        error instanceof Error ? error.message : "Erro ao criar produto"
      )
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {globalError && (
        <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4">
          <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-red-700">{globalError}</p>
        </div>
      )}

      {/* BLOCO IDENTIDADE */}
      <Block
        title="1. Identidade"
        isExpanded={expandedBlocks.Identidade}
        onToggle={() => toggleBlock("Identidade")}
        errors={blockErrors.Identidade}
      >
        <div className="space-y-4">
          <Input
            label="Nome Comercial *"
            value={formData.nomeComercial}
            onChange={(e) =>
              setFormData({ ...formData, nomeComercial: e.target.value })
            }
            placeholder="Ex: Integrador Big Brain"
          />

          <Input
            label="Nome Interno"
            value={formData.nomeInterno}
            onChange={(e) =>
              setFormData({ ...formData, nomeInterno: e.target.value })
            }
            placeholder="Ex: integrador-bb-core"
          />

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Tipo de Produto *"
              value={formData.tipoProduto}
              onChange={(e) =>
                setFormData({ ...formData, tipoProduto: e.target.value })
              }
              options={[
                { value: "SAAS_BB", label: "SaaS Big Brain" },
                { value: "SERVICO_PROFISSIONAL", label: "Serviço Profissional" },
                { value: "LICENCIAMENTO", label: "Licenciamento" },
                { value: "CREDITO", label: "Crédito" },
                { value: "HARDWARE", label: "Hardware" },
              ]}
            />

            <Select
              label="Natureza"
              value={formData.natureza}
              onChange={(e) =>
                setFormData({ ...formData, natureza: e.target.value })
              }
              options={[
                { value: "CORE", label: "Core" },
                { value: "MODULAR", label: "Modular" },
                { value: "DEPENDENTE", label: "Dependente" },
              ]}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Status"
              value={formData.status}
              onChange={(e) =>
                setFormData({ ...formData, status: e.target.value })
              }
              options={[
                { value: "RASCUNHO", label: "Rascunho" },
                { value: "ATIVO", label: "Ativo" },
                { value: "INATIVO", label: "Inativo" },
              ]}
            />

            <div className="flex items-end gap-4">
              <Checkbox
                label="Produto Core"
                checked={formData.produtoCore}
                onChange={(e) =>
                  setFormData({ ...formData, produtoCore: e.target.checked })
                }
              />
              <Checkbox
                label="Integra Jornada"
                checked={formData.integraJornada}
                onChange={(e) =>
                  setFormData({ ...formData, integraJornada: e.target.checked })
                }
              />
            </div>
          </div>
        </div>
      </Block>

      {/* BLOCO COMERCIAL */}
      <Block
        title="2. Comercial"
        isExpanded={expandedBlocks.Comercial}
        onToggle={() => toggleBlock("Comercial")}
        errors={blockErrors.Comercial}
      >
        <div className="space-y-4">
          <TextArea
            label="Descrição Comercial Curta *"
            value={formData.descricaoComercialCurta}
            onChange={(e) =>
              setFormData({ ...formData, descricaoComercialCurta: e.target.value })
            }
            placeholder="Máximo 280 caracteres"
            maxLength={280}
            rows={2}
          />

          <TextArea
            label="Short Pitch (para slides)"
            value={formData.shortPitch}
            onChange={(e) =>
              setFormData({ ...formData, shortPitch: e.target.value })
            }
            placeholder="Máximo 140 caracteres"
            maxLength={140}
            rows={2}
          />

          <TextArea
            label="Proposta de Valor"
            value={formData.proposta_valor}
            onChange={(e) =>
              setFormData({ ...formData, proposta_valor: e.target.value })
            }
            placeholder="Texto rico descrevendo a proposta"
            rows={4}
          />

          <TagInput
            label="Dores Atendidas"
            values={formData.doresAtendidas}
            onChange={(dores) =>
              setFormData({ ...formData, doresAtendidas: dores })
            }
            placeholder="Digite e pressione Enter"
          />

          <TagInput
            label="Público Alvo"
            values={formData.publicoAlvo}
            onChange={(publico) =>
              setFormData({ ...formData, publicoAlvo: publico })
            }
            placeholder="Ex: Escolas, Redes de educação"
          />

          <TagInput
            label="Diferenciais (máximo 5)"
            values={formData.diferenciais}
            onChange={(diff) =>
              setFormData({
                ...formData,
                diferenciais: diff.slice(0, 5),
              })
            }
            placeholder="Digite e pressione Enter"
          />

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Dependência Comercial"
              value={formData.dependenciaComercial}
              onChange={(e) =>
                setFormData({ ...formData, dependenciaComercial: e.target.value })
              }
              options={[
                { value: "NENHUMA", label: "Nenhuma" },
                { value: "REQUER", label: "Requer" },
                { value: "RECOMENDADO", label: "Recomendado" },
                { value: "OPCIONAL", label: "Opcional" },
              ]}
            />

            <Input
              label="Produto Base"
              value={formData.produtoBase}
              onChange={(e) =>
                setFormData({ ...formData, produtoBase: e.target.value })
              }
              placeholder="Ex: integrador-bb"
            />
          </div>

          <TextArea
            label="Observações Comerciais"
            value={formData.observacoesComerciais}
            onChange={(e) =>
              setFormData({ ...formData, observacoesComerciais: e.target.value })
            }
            placeholder="Regras comerciais ou exceções"
            rows={3}
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Perfis de Cliente
            </label>
            <div className="space-y-2">
              {[
                { value: "ESCOLA_PEQUENA", label: "Escola Pequena" },
                { value: "ESCOLA_MEDIA", label: "Escola Média" },
                { value: "REDE_GRANDE", label: "Rede / Grande" },
              ].map((option: { value: string; label: string }) => (
                <Checkbox
                  key={option.value}
                  label={option.label}
                  checked={formData.perfilCliente.includes(option.value)}
                  onChange={(e) => {
                    const newProfiles = e.target.checked
                      ? [...formData.perfilCliente, option.value]
                      : formData.perfilCliente.filter((p) => p !== option.value)
                    setFormData({ ...formData, perfilCliente: newProfiles })
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      </Block>

      {/* BLOCO FINANCEIRO */}
      <Block
        title="3. Financeiro / ERP"
        isExpanded={expandedBlocks.Financeiro}
        onToggle={() => toggleBlock("Financeiro")}
        errors={blockErrors.Financeiro}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Modelo Contratado *"
              value={formData.modeloContratado}
              onChange={(e) =>
                setFormData({ ...formData, modeloContratado: e.target.value })
              }
              options={[
                { value: "SUBSCRICAO", label: "Subscrição" },
                { value: "CREDITO", label: "Crédito" },
                { value: "PONTUAL", label: "Pontual" },
                { value: "CONSUMO", label: "Consumo" },
              ]}
            />

            <Select
              label="Modelo Faturamento *"
              value={formData.modeloFaturamento}
              onChange={(e) =>
                setFormData({ ...formData, modeloFaturamento: e.target.value })
              }
              options={[
                { value: "RECORRENTE", label: "Recorrente" },
                { value: "PONTUAL", label: "Pontual" },
                { value: "VARIAVEL", label: "Variável" },
              ]}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Tipo de Receita"
              value={formData.tipoReceita}
              onChange={(e) =>
                setFormData({ ...formData, tipoReceita: e.target.value })
              }
              options={[
                { value: "ARR", label: "ARR" },
                { value: "NRR", label: "NRR" },
                { value: "PONTUAL", label: "Pontual" },
                { value: "NA", label: "N/A" },
              ]}
            />

            <Select
              label="Unidade de Medida"
              value={formData.unidadeMedida}
              onChange={(e) =>
                setFormData({ ...formData, unidadeMedida: e.target.value })
              }
              options={[
                { value: "UNIDADE", label: "Unidade" },
                { value: "HORA", label: "Hora" },
                { value: "LICENCA", label: "Licença" },
                { value: "USUARIO", label: "Usuário" },
              ]}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Centro de Resultado"
              value={formData.centroResultado}
              onChange={(e) =>
                setFormData({ ...formData, centroResultado: e.target.value })
              }
              placeholder="Código CR"
            />

            <Input
              label="Grupo Código"
              value={formData.grupoCodigo}
              onChange={(e) =>
                setFormData({ ...formData, grupoCodigo: e.target.value })
              }
              placeholder="Código Sankhya"
            />
          </div>

          <Input
            label="Grupo Descrição"
            value={formData.grupoDescricao}
            onChange={(e) =>
              setFormData({ ...formData, grupoDescricao: e.target.value })
            }
            placeholder="Descrição do grupo"
          />

          <div className="flex items-end gap-4">
            <Checkbox
              label="Gera ARR"
              checked={formData.geraARR}
              onChange={(e) =>
                setFormData({ ...formData, geraARR: e.target.checked })
              }
            />
            <Checkbox
              label="Ativo"
              checked={formData.ativo}
              onChange={(e) =>
                setFormData({ ...formData, ativo: e.target.checked })
              }
            />
          </div>
        </div>
      </Block>

      {/* BLOCO FISCAL */}
      <Block
        title="4. Fiscal"
        isExpanded={expandedBlocks.Fiscal}
        onToggle={() => toggleBlock("Fiscal")}
        errors={blockErrors.Fiscal}
        warning={
          formData.fiscalStatus === "A_VALIDAR"
            ? "⚠️ A_VALIDAR bloqueia export ERP"
            : undefined
        }
      >
        <div className="space-y-4">
          <Input
            label="Código NBS"
            value={formData.codigoNBS}
            onChange={(e) =>
              setFormData({ ...formData, codigoNBS: e.target.value })
            }
            placeholder="Código NBS"
          />

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Tem ISS? *"
              value={formData.temISS}
              onChange={(e) =>
                setFormData({ ...formData, temISS: e.target.value })
              }
              options={[
                { value: "SIM", label: "Sim" },
                { value: "NAO", label: "Não" },
                { value: "A_VALIDAR", label: "A Validar" },
              ]}
            />

            {formData.temISS !== "NAO" && (
              <Input
                label="Alíquota ISS"
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={formData.aliquotaISS}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    aliquotaISS: parseFloat(e.target.value) || 0,
                  })
                }
                placeholder="0.00"
              />
            )}
          </div>

          <Input
            label="Código Serviço (LC 116)"
            value={formData.codigoServico}
            onChange={(e) =>
              setFormData({ ...formData, codigoServico: e.target.value })
            }
            placeholder="Código serviço"
          />

          <Input
            label="Regime Tributário"
            value={formData.regimeTributario}
            onChange={(e) =>
              setFormData({ ...formData, regimeTributario: e.target.value })
            }
            placeholder="Ex: Simples Nacional"
          />

          <TextArea
            label="Observações Fiscais"
            value={formData.observacoesFiscais}
            onChange={(e) =>
              setFormData({ ...formData, observacoesFiscais: e.target.value })
            }
            placeholder="Notas fiscais relevantes"
            rows={3}
          />

          <Select
            label="Status Fiscal *"
            value={formData.fiscalStatus}
            onChange={(e) =>
              setFormData({ ...formData, fiscalStatus: e.target.value })
            }
            options={[
              { value: "A_VALIDAR", label: "A Validar" },
              { value: "VALIDADO", label: "Validado" },
            ]}
          />
        </div>
      </Block>

      {/* BLOCO TÉCNICO */}
      <Block
        title="5. Técnico"
        isExpanded={expandedBlocks.Técnico}
        onToggle={() => toggleBlock("Técnico")}
        errors={blockErrors.Técnico}
      >
        <div className="space-y-4">
          <TextArea
            label="Arquitetura HLD"
            value={formData.arquiteturaHLD}
            onChange={(e) =>
              setFormData({ ...formData, arquiteturaHLD: e.target.value })
            }
            placeholder="Descrição de alto nível"
            rows={4}
          />

          <TagInput
            label="Requisitos Mínimos"
            values={formData.requisitosMinimos}
            onChange={(reqs) =>
              setFormData({ ...formData, requisitosMinimos: reqs })
            }
            placeholder="Ex: Node.js 18+, PostgreSQL 12+"
          />

          <TagInput
            label="Tecnologias Base"
            values={formData.tecnologiasBase}
            onChange={(techs) =>
              setFormData({ ...formData, tecnologiasBase: techs })
            }
            placeholder="Ex: SharePoint, Azure AD"
          />

          <Select
            label="Modelo de Deployment"
            value={formData.modeloDeployment}
            onChange={(e) =>
              setFormData({ ...formData, modeloDeployment: e.target.value })
            }
            options={[
              { value: "CLOUD", label: "Cloud" },
              { value: "HYBRID", label: "Híbrido" },
              { value: "ON_PREMISE", label: "On Premise" },
            ]}
          />

          <TagInput
            label="Integrações Suportadas"
            values={formData.integracoesSuportadas}
            onChange={(integrações) =>
              setFormData({ ...formData, integracoesSuportadas: integrações })
            }
            placeholder="Sistemas que integra"
          />

          <TextArea
            label="Limitações Conhecidas"
            value={formData.limitacoesConhecidas}
            onChange={(e) =>
              setFormData({ ...formData, limitacoesConhecidas: e.target.value })
            }
            placeholder="O que o produto não faz"
            rows={3}
          />

          <Input
            label="Tempo de Implementação"
            value={formData.tempoImplementacao}
            onChange={(e) =>
              setFormData({ ...formData, tempoImplementacao: e.target.value })
            }
            placeholder="Ex: 2 a 4 semanas"
          />
        </div>
      </Block>

      {/* BLOCO SUPORTE */}
      <Block
        title="6. Suporte"
        isExpanded={expandedBlocks.Suporte}
        onToggle={() => toggleBlock("Suporte")}
        errors={blockErrors.Suporte}
      >
        <div className="space-y-4">
          <Input
            label="SLA Atendimento"
            value={formData.slaAtendimento}
            onChange={(e) =>
              setFormData({ ...formData, slaAtendimento: e.target.value })
            }
            placeholder="Ex: 8h úteis"
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              FAQ
            </label>
            <FAQInput
              faqs={formData.faq}
              onChange={(faq) => setFormData({ ...formData, faq })}
            />
          </div>

          <TagInput
            label="Problemas Conhecidos"
            values={formData.problemasConhecidos}
            onChange={(probs) =>
              setFormData({ ...formData, problemasConhecidos: probs })
            }
            placeholder="Bugs e limitações"
          />

          <TextArea
            label="Guia de Troubleshooting"
            value={formData.troubleshootingGuia}
            onChange={(e) =>
              setFormData({
                ...formData,
                troubleshootingGuia: e.target.value,
              })
            }
            placeholder="Passo a passo de diagnóstico"
            rows={4}
          />

          <TagInput
            label="Artigos KB"
            values={formData.kbArticles}
            onChange={(articles) =>
              setFormData({ ...formData, kbArticles: articles })
            }
            placeholder="Links para base de conhecimento"
          />
        </div>
      </Block>

      {/* BLOCO MARKETING */}
      <Block
        title="7. Marketing"
        isExpanded={expandedBlocks.Marketing}
        onToggle={() => toggleBlock("Marketing")}
        errors={blockErrors.Marketing}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Cases de Sucesso
            </label>
            <CasesInput
              cases={formData.cases}
              onChange={(cases) => setFormData({ ...formData, cases })}
            />
          </div>

          <TextArea
            label="Script de Venda"
            value={formData.scriptVenda}
            onChange={(e) =>
              setFormData({ ...formData, scriptVenda: e.target.value })
            }
            placeholder="Roteiro de apresentação"
            rows={4}
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Objeções & Respostas
            </label>
            <ObjectionsInput
              objections={formData.objecoesRespostas}
              onChange={(objections) =>
                setFormData({ ...formData, objecoesRespostas: objections })
              }
            />
          </div>

          <TagInput
            label="Tags Copilot"
            values={formData.tagsCopilot}
            onChange={(tags) =>
              setFormData({ ...formData, tagsCopilot: tags })
            }
            placeholder="Palavras-chave para busca"
          />
        </div>
      </Block>

      {/* BLOCO ONBOARDING */}
      <Block
        title="8. Onboarding"
        isExpanded={expandedBlocks.Onboarding}
        onToggle={() => toggleBlock("Onboarding")}
        errors={blockErrors.Onboarding}
      >
        <div className="space-y-4">
          <TextArea
            label="Contexto Geral"
            value={formData.contextoGeral}
            onChange={(e) =>
              setFormData({ ...formData, contextoGeral: e.target.value })
            }
            placeholder="História e posicionamento"
            rows={3}
          />

          <TextArea
            label="Por Que Existe"
            value={formData.porQueExiste}
            onChange={(e) =>
              setFormData({ ...formData, porQueExiste: e.target.value })
            }
            placeholder="Dor original que gerou"
            rows={3}
          />

          <TextArea
            label="Para Quem É"
            value={formData.paraquemE}
            onChange={(e) =>
              setFormData({ ...formData, paraquemE: e.target.value })
            }
            placeholder="Cliente/contexto ideal"
            rows={3}
          />

          <TextArea
            label="Não Confundir Com"
            value={formData.naoConfundirCom}
            onChange={(e) =>
              setFormData({ ...formData, naoConfundirCom: e.target.value })
            }
            placeholder="Diferença de produtos similares"
            rows={3}
          />

          <TextArea
            label="Roadmap Público"
            value={formData.roadmapPublico}
            onChange={(e) =>
              setFormData({ ...formData, roadmapPublico: e.target.value })
            }
            placeholder="O que vem por aí"
            rows={3}
          />
        </div>
      </Block>

      {/* BLOCO ORIGEM */}
      <Block
        title="9. Origem"
        isExpanded={expandedBlocks.Origem}
        onToggle={() => toggleBlock("Origem")}
        errors={blockErrors.Origem}
      >
        <div className="space-y-4">
          <Select
            label="Tipo de Origem"
            value={formData.origemTipo}
            onChange={(e) =>
              setFormData({ ...formData, origemTipo: e.target.value })
            }
            options={[
              { value: "INTERNO", label: "Interno" },
              { value: "DOR_CLIENTE", label: "Dor de Cliente" },
              { value: "PARCERIA", label: "Parceria" },
              { value: "REGULATORIO", label: "Regulatório" },
            ]}
          />

          <TextArea
            label="Descrição da Origem"
            value={formData.origemDescricao}
            onChange={(e) =>
              setFormData({ ...formData, origemDescricao: e.target.value })
            }
            placeholder="Contexto da origem"
            rows={3}
          />

          <Input
            label="Segmento / Cliente Origem"
            value={formData.origemClienteSegmento}
            onChange={(e) =>
              setFormData({
                ...formData,
                origemClienteSegmento: e.target.value,
              })
            }
            placeholder="Ex: Redes de educação"
          />

          <Input
            label="Data da Origem"
            type="date"
            value={formData.origemData}
            onChange={(e) =>
              setFormData({ ...formData, origemData: e.target.value })
            }
          />

          <Input
            label="Responsável"
            value={formData.origemResponsavel}
            onChange={(e) =>
              setFormData({ ...formData, origemResponsavel: e.target.value })
            }
            placeholder="Nome de quem trouxe a demanda"
          />
        </div>
      </Block>

      {/* SUBMIT */}
      <div className="flex gap-4 pt-6">
        <button
          type="submit"
          disabled={isLoading}
          className="flex-1 rounded-lg bg-blue-600 py-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {isLoading ? "Criando..." : "Criar Produto"}
        </button>
      </div>
    </form>
  )
}

// ============ HELPER COMPONENTS ============

function Block({
  title,
  isExpanded,
  onToggle,
  errors,
  warning,
  children,
}: {
  title: string
  isExpanded: boolean
  onToggle: () => void
  errors?: string[]
  warning?: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between px-6 py-4 hover:bg-gray-50"
      >
        <h3 className="font-semibold text-gray-900">{title}</h3>
        {isExpanded ? (
          <ChevronUp className="h-5 w-5 text-gray-400" />
        ) : (
          <ChevronDown className="h-5 w-5 text-gray-400" />
        )}
      </button>

      {isExpanded && (
        <div className="border-t border-gray-200 px-6 py-4 space-y-4">
          {errors && errors.length > 0 && (
            <div className="flex items-start gap-2 rounded bg-red-50 p-3 text-sm text-red-700">
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <div>
                {errors.map((err, i: number) => (
                  <div key={i}>{err}</div>
                ))}
              </div>
            </div>
          )}
          {warning && (
            <div className="flex items-start gap-2 rounded bg-yellow-50 p-3 text-sm text-yellow-700">
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <p>{warning}</p>
            </div>
          )}
          {children}
        </div>
      )}
    </div>
  )
}

function Input({
  label,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  label: string
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>
      <input
        {...props}
        className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
      />
    </div>
  )
}

function TextArea({
  label,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: string
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>
      <textarea
        {...props}
        className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
      />
    </div>
  )
}

function Select({
  label,
  options,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & {
  label: string
  options: Array<{ value: string; label: string }>
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>
      <select
        {...props}
        className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
      >
        {options.map((opt: { value: string; label: string }) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  )
}

function Checkbox({
  label,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  label: string
}) {
  return (
    <label className="flex items-center gap-2 text-sm text-gray-700">
      <input type="checkbox" {...props} className="rounded" />
      {label}
    </label>
  )
}

function TagInput({
  label,
  values,
  onChange,
  ...props
}: {
  label: string
  values: string[]
  onChange: (values: string[]) => void
  placeholder?: string
}) {
  const [input, setInput] = useState("")

  const handleAdd = () => {
    if (input.trim() && !values.includes(input.trim())) {
      onChange([...values, input.trim()])
      setInput("")
    }
  }

  const handleRemove = (tag: string) => {
    onChange(values.filter((v) => v !== tag))
  }

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label}
      </label>
      <div className="space-y-2">
        <div className="flex gap-2">
          <input
            {...props}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === "Enter") {
                e.preventDefault()
                handleAdd()
              }
            }}
            className="flex-1 rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
          <button
            type="button"
            onClick={handleAdd}
            className="rounded bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
          >
            +
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {values.map((tag: string) => (
            <div
              key={tag}
              className="inline-flex items-center gap-2 rounded-full bg-blue-100 px-3 py-1 text-sm text-blue-700"
            >
              {tag}
              <button
                type="button"
                onClick={() => handleRemove(tag)}
                className="hover:text-blue-900"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function FAQInput({
  faqs,
  onChange,
}: {
  faqs: Array<{ pergunta: string; resposta: string }>
  onChange: (faqs: Array<{ pergunta: string; resposta: string }>) => void
}) {
  return (
    <div className="space-y-3">
      {faqs.map((faq: { pergunta: string; resposta: string }, idx: number) => (
        <div key={idx} className="rounded border border-gray-300 p-3 space-y-2">
          <input
            type="text"
            value={faq.pergunta}
            onChange={(e) => {
              const newFaqs = [...faqs]
              newFaqs[idx].pergunta = e.target.value
              onChange(newFaqs)
            }}
            placeholder="Pergunta"
            className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
          />
          <textarea
            value={faq.resposta}
            onChange={(e) => {
              const newFaqs = [...faqs]
              newFaqs[idx].resposta = e.target.value
              onChange(newFaqs)
            }}
            placeholder="Resposta"
            rows={2}
            className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
          />
          <button
            type="button"
            onClick={() => onChange(faqs.filter((_, i) => i !== idx))}
            className="text-xs text-red-600 hover:text-red-800"
          >
            Remover
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() =>
          onChange([...faqs, { pergunta: "", resposta: "" }])
        }
        className="text-sm text-blue-600 hover:text-blue-800"
      >
        + Adicionar FAQ
      </button>
    </div>
  )
}

function CasesInput({
  cases,
  onChange,
}: {
  cases: Array<{
    cliente: string
    desafio: string
    solucao: string
    resultado: string
  }>
  onChange: (
    cases: Array<{
      cliente: string
      desafio: string
      solucao: string
      resultado: string
    }>
  ) => void
}) {
  return (
    <div className="space-y-3">
      {cases.map((cse: { cliente: string; desafio: string; solucao: string; resultado: string }, idx: number) => (
        <div key={idx} className="rounded border border-gray-300 p-3 space-y-2">
          <input
            type="text"
            value={cse.cliente}
            onChange={(e) => {
              const newCases = [...cases]
              newCases[idx].cliente = e.target.value
              onChange(newCases)
            }}
            placeholder="Cliente"
            className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
          />
          <textarea
            value={cse.desafio}
            onChange={(e) => {
              const newCases = [...cases]
              newCases[idx].desafio = e.target.value
              onChange(newCases)
            }}
            placeholder="Desafio"
            rows={2}
            className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
          />
          <textarea
            value={cse.solucao}
            onChange={(e) => {
              const newCases = [...cases]
              newCases[idx].solucao = e.target.value
              onChange(newCases)
            }}
            placeholder="Solução"
            rows={2}
            className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
          />
          <textarea
            value={cse.resultado}
            onChange={(e) => {
              const newCases = [...cases]
              newCases[idx].resultado = e.target.value
              onChange(newCases)
            }}
            placeholder="Resultado"
            rows={2}
            className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
          />
          <button
            type="button"
            onClick={() => onChange(cases.filter((_, i) => i !== idx))}
            className="text-xs text-red-600 hover:text-red-800"
          >
            Remover
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() =>
          onChange([
            ...cases,
            { cliente: "", desafio: "", solucao: "", resultado: "" },
          ])
        }
        className="text-sm text-blue-600 hover:text-blue-800"
      >
        + Adicionar Case
      </button>
    </div>
  )
}

function ObjectionsInput({
  objections,
  onChange,
}: {
  objections: Array<{ objecao: string; resposta: string; contexto?: string }>
  onChange: (
    objections: Array<{ objecao: string; resposta: string; contexto?: string }>
  ) => void
}) {
  return (
    <div className="space-y-3">
      {objections.map((obj: { objecao: string; resposta: string; contexto?: string }, idx: number) => (
        <div key={idx} className="rounded border border-gray-300 p-3 space-y-2">
          <input
            type="text"
            value={obj.objecao}
            onChange={(e) => {
              const newObjs = [...objections]
              newObjs[idx].objecao = e.target.value
              onChange(newObjs)
            }}
            placeholder="Objeção"
            className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
          />
          <textarea
            value={obj.resposta}
            onChange={(e) => {
              const newObjs = [...objections]
              newObjs[idx].resposta = e.target.value
              onChange(newObjs)
            }}
            placeholder="Resposta"
            rows={2}
            className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
          />
          <input
            type="text"
            value={obj.contexto || ""}
            onChange={(e) => {
              const newObjs = [...objections]
              newObjs[idx].contexto = e.target.value
              onChange(newObjs)
            }}
            placeholder="Contexto (opcional)"
            className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
          />
          <button
            type="button"
            onClick={() => onChange(objections.filter((_, i) => i !== idx))}
            className="text-xs text-red-600 hover:text-red-800"
          >
            Remover
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() =>
          onChange([
            ...objections,
            { objecao: "", resposta: "", contexto: "" },
          ])
        }
        className="text-sm text-blue-600 hover:text-blue-800"
      >
        + Adicionar Objeção
      </button>
    </div>
  )
}
