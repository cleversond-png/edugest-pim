"use client"

import { useState, useCallback } from "react"
import { Lock, AlertCircle, X, Plus } from "lucide-react"

interface ApresentacaoFormData {
  nomeCliente: string
  perfilCliente: "ESCOLA_PEQUENA" | "ESCOLA_MEDIA" | "REDE_GRANDE"
  logoCliente: File | null
  dorCliente: string
  produtosAdicionais: string[]
  produtosRemovidos: string[]
  nomeComercial: string
  emailComercial: string
}

const PERFIS_CLIENTE = {
  ESCOLA_PEQUENA: {
    label: "Escola Pequena (até ~500 alunos)",
    produtos: [
      "integrador-bb",
      "intranet-saas",
      "formacao-microsoft",
      "suporte-m365",
    ],
  },
  ESCOLA_MEDIA: {
    label: "Escola Média (500–2.000 alunos)",
    produtos: [
      "integrador-bb",
      "intranet-saas",
      "portal-institucional",
      "formacao-microsoft",
      "suporte-m365",
    ],
  },
  REDE_GRANDE: {
    label: "Rede / Grande (redes e grupos)",
    produtos: [
      "integrador-bb",
      "intranet-saas",
      "portal-institucional",
      "centro-operacoes",
      "hub-docente",
      "insights",
      "consultoria",
      "formacao-microsoft",
      "suporte-m365",
    ],
  },
}

const PRODUTO_OBRIGATORIO = "suporte-m365"

const TODOS_PRODUTOS = [
  { slug: "integrador-bb", nome: "Integrador Big Brain" },
  { slug: "agenda-inteligente", nome: "Agenda Inteligente" },
  { slug: "relatorios-inteligentes", nome: "Relatórios Inteligentes" },
  { slug: "centro-operacoes", nome: "Centro de Operações" },
  { slug: "nucleo-experiencias", nome: "Núcleo de Experiências" },
  { slug: "portal-institucional", nome: "Portal Institucional" },
  { slug: "intranet-saas", nome: "Intranet SaaS" },
  { slug: "hub-docente", nome: "Hub Docente" },
  { slug: "insights", nome: "Insights" },
  { slug: "impl-portal", nome: "Implementação de Portal" },
  { slug: "impl-intranet", nome: "Implementação de Intranet" },
  { slug: "suporte-m365", nome: "Suporte M365" },
  { slug: "formacao-microsoft", nome: "Formação Microsoft" },
  { slug: "consultoria", nome: "Consultoria Especializada" },
  { slug: "booking-horas", nome: "Booking de Horas" },
  { slug: "desenvolvimento-demanda", nome: "Desenvolvimento sob Demanda" },
  { slug: "m365-a1", nome: "Microsoft 365 A1" },
  { slug: "m365-a3", nome: "Microsoft 365 A3" },
  { slug: "m365-a5", nome: "Microsoft 365 A5" },
  { slug: "copilot-m365", nome: "Copilot Microsoft 365" },
]

interface Props {
  onSubmit: (data: ApresentacaoFormData) => Promise<void>
  isLoading: boolean
  availableProducts?: typeof TODOS_PRODUTOS
}

export function ApresentacaoForm({
  onSubmit,
  isLoading,
  availableProducts = TODOS_PRODUTOS,
}: Props) {
  const [formData, setFormData] = useState<ApresentacaoFormData>({
    nomeCliente: "",
    perfilCliente: "ESCOLA_PEQUENA",
    logoCliente: null,
    dorCliente: "",
    produtosAdicionais: [],
    produtosRemovidos: [],
    nomeComercial: "",
    emailComercial: "",
  })

  const [globalError, setGlobalError] = useState<string | null>(null)

  const perfilAtual = PERFIS_CLIENTE[formData.perfilCliente]
  const produtosDoPerfil = perfilAtual.produtos

  // Produtos finais = perfil - removidos + adicionados
  const produtosFinal = [
    ...produtosDoPerfil.filter(
      (p) => !formData.produtosRemovidos.includes(p)
    ),
    ...formData.produtosAdicionais,
  ]

  // Remove duplicatas
  const produtosUnicos = [...new Set(produtosFinal)]

  // Garante que suporte é sempre incluído
  const temObrigatorio = produtosUnicos.includes(PRODUTO_OBRIGATORIO)

  const getProdutoNome = (slug: string) => {
    return availableProducts.find((p) => p.slug === slug)?.nome || slug
  }

  const canRemoveProduto = (slug: string) => {
    return slug !== PRODUTO_OBRIGATORIO
  }

  const handleRemoveProduto = (slug: string) => {
    if (!canRemoveProduto(slug)) return

    if (formData.produtosAdicionais.includes(slug)) {
      setFormData((prev) => ({
        ...prev,
        produtosAdicionais: prev.produtosAdicionais.filter((p) => p !== slug),
      }))
    } else if (produtosDoPerfil.includes(slug)) {
      setFormData((prev) => ({
        ...prev,
        produtosRemovidos: [...prev.produtosRemovidos, slug],
      }))
    }
  }

  const handleAddProduto = (slug: string) => {
    if (!produtosUnicos.includes(slug)) {
      setFormData((prev) => ({
        ...prev,
        produtosAdicionais: [...prev.produtosAdicionais, slug],
        produtosRemovidos: prev.produtosRemovidos.filter((p) => p !== slug),
      }))
    }
  }

  const handleChangePerfil = (
    newPerfil: "ESCOLA_PEQUENA" | "ESCOLA_MEDIA" | "REDE_GRANDE"
  ) => {
    setFormData((prev) => ({
      ...prev,
      perfilCliente: newPerfil,
      produtosRemovidos: [],
      produtosAdicionais: [],
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setGlobalError(null)

    if (!formData.nomeCliente.trim()) {
      setGlobalError("Nome do cliente é obrigatório")
      return
    }

    if (!formData.nomeComercial.trim()) {
      setGlobalError("Seu nome é obrigatório")
      return
    }

    if (!formData.emailComercial.trim()) {
      setGlobalError("Seu e-mail é obrigatório")
      return
    }

    try {
      await onSubmit(formData)
    } catch (error) {
      setGlobalError(
        error instanceof Error
          ? error.message
          : "Erro ao gerar apresentação"
      )
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {globalError && (
        <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4">
          <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-red-700">{globalError}</p>
        </div>
      )}

      {/* SECTION 1: DADOS DO CLIENTE */}
      <Section title="Dados do Cliente" subtitle="Informações básicas da instituição">
        <div className="space-y-4">
          <Input
            label="Nome do Cliente *"
            value={formData.nomeCliente}
            onChange={(e) =>
              setFormData({ ...formData, nomeCliente: e.target.value })
            }
            placeholder="Ex: Colégio São Paulo"
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Logo do Cliente
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0]
                setFormData({ ...formData, logoCliente: file || null })
              }}
              className="w-full text-sm text-gray-600 file:rounded file:border file:border-gray-300 file:bg-gray-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-gray-700"
            />
            {formData.logoCliente && (
              <p className="mt-1 text-xs text-gray-500">
                ✓ {formData.logoCliente.name}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Perfil do Cliente *
            </label>
            <div className="space-y-2">
              {(
                Object.entries(PERFIS_CLIENTE) as Array<
                  [
                    "ESCOLA_PEQUENA" | "ESCOLA_MEDIA" | "REDE_GRANDE",
                    (typeof PERFIS_CLIENTE)["ESCOLA_PEQUENA"],
                  ]
                >
              ).map(([value, profile]) => (
                <label
                  key={value}
                  className="flex items-start gap-3 rounded-lg border border-gray-200 p-3 cursor-pointer hover:bg-blue-50"
                >
                  <input
                    type="radio"
                    name="perfilCliente"
                    value={value}
                    checked={formData.perfilCliente === value}
                    onChange={() =>
                      handleChangePerfil(
                        value as
                          | "ESCOLA_PEQUENA"
                          | "ESCOLA_MEDIA"
                          | "REDE_GRANDE"
                      )
                    }
                    className="mt-1"
                  />
                  <div>
                    <p className="font-medium text-gray-900">{profile.label}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </div>
      </Section>

      {/* SECTION 2: PRODUTOS PRÉ-SELECIONADOS */}
      <Section
        title="Produtos Pré-selecionados"
        subtitle={`${formData.perfilCliente === "ESCOLA_PEQUENA" ? "4" : formData.perfilCliente === "ESCOLA_MEDIA" ? "5" : "9"} produtos sugeridos para este perfil`}
      >
        <div className="space-y-3">
          {produtosUnicos.map((slug) => {
            const isObrigatorio = slug === PRODUTO_OBRIGATORIO
            const isAdicional = formData.produtosAdicionais.includes(slug)

            return (
              <div
                key={slug}
                className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 p-3"
              >
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={true}
                    disabled={true}
                    className="h-4 w-4 text-blue-600"
                  />
                  <div>
                    <p className="font-medium text-gray-900">
                      {getProdutoNome(slug)}
                    </p>
                    {isObrigatorio && (
                      <p className="text-xs text-gray-600 flex items-center gap-1 mt-0.5">
                        <Lock className="h-3 w-3" /> Obrigatório
                      </p>
                    )}
                  </div>
                </div>
                {!isObrigatorio && (
                  <button
                    type="button"
                    onClick={() => handleRemoveProduto(slug)}
                    className="text-gray-400 hover:text-red-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            )
          })}

          {!temObrigatorio && (
            <div className="flex items-start gap-2 rounded-lg bg-red-50 p-3 border border-red-200">
              <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-red-700">
                Suporte M365 é obrigatório em todas as propostas
              </p>
            </div>
          )}
        </div>
      </Section>

      {/* SECTION 3: ADICIONAR MAIS PRODUTOS */}
      <Section
        title="Adicionar Produtos"
        subtitle="Selecione produtos adicionais se necessário"
      >
        <div className="space-y-2">
          {availableProducts
            .filter((p) => !produtosUnicos.includes(p.slug))
            .map((produto) => (
              <button
                key={produto.slug}
                type="button"
                onClick={() => handleAddProduto(produto.slug)}
                className="w-full flex items-center gap-3 rounded-lg border border-gray-300 bg-white p-3 text-left hover:bg-blue-50 hover:border-blue-300"
              >
                <Plus className="h-4 w-4 text-gray-400 flex-shrink-0" />
                <span className="text-sm text-gray-900">{produto.nome}</span>
              </button>
            ))}
        </div>
      </Section>

      {/* SECTION 4: DOR DO CLIENTE */}
      <Section
        title="Contexto do Cliente"
        subtitle="Descreva a dor / necessidade principal (opcional)"
      >
        <TextArea
          label="Dor / Necessidade"
          value={formData.dorCliente}
          onChange={(e) =>
            setFormData({ ...formData, dorCliente: e.target.value })
          }
          placeholder="Ex: Precisamos reduzir o retrabalho administrativo e modernizar a comunicação interna"
          rows={4}
        />
        <p className="text-xs text-gray-500 mt-2">
          💡 Se preenchido, slides de contexto serão gerados automaticamente via IA
        </p>
      </Section>

      {/* SECTION 5: DADOS DO COMERCIAL */}
      <Section
        title="Seus Dados"
        subtitle="Informações que aparecerão no slide de contato"
      >
        <div className="space-y-4">
          <Input
            label="Seu Nome *"
            value={formData.nomeComercial}
            onChange={(e) =>
              setFormData({ ...formData, nomeComercial: e.target.value })
            }
            placeholder="Ex: João Silva"
          />

          <Input
            label="Seu E-mail *"
            type="email"
            value={formData.emailComercial}
            onChange={(e) =>
              setFormData({ ...formData, emailComercial: e.target.value })
            }
            placeholder="joao@bigbrain.com.br"
          />
        </div>
      </Section>

      {/* SUBMIT */}
      <div className="flex gap-4 pt-6">
        <button
          type="submit"
          disabled={isLoading}
          className="flex-1 rounded-lg bg-blue-600 py-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {isLoading ? "Gerando apresentação..." : "Gerar Apresentação →"}
        </button>
      </div>
    </form>
  )
}

// ============ HELPER COMPONENTS ============

function Section({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle?: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6">
      <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
      {subtitle && <p className="mt-1 text-sm text-gray-600">{subtitle}</p>}
      <div className="mt-6 space-y-4">{children}</div>
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
