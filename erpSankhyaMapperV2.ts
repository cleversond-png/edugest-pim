/**
 * erpSankhyaMapperV2.ts — ERPSankhyaMapperAgent V2 (usando Schema V4)
 *
 * Objetivo
 * - Consumir recommendation.business.products (V4) OU recommendation.products (V3) e gerar exports.erp
 * - Montar payload "ERP-ready" com itens, códigos, grupos e modelos de faturamento
 * - Marcar blocked=true quando houver campos fiscais/cadastro pendentes (preenche "A VALIDAR")
 *
 * Observação
 * - Este mapper não chama LLM.
 */

export type ErpLineItemV2 = {
  product_id: string
  erp_code: string
  description: string
  group_code?: string
  group_name?: string

  pm_type?: string
  contract_model?: string
  billing_model?: string

  dependency_type?: 'Nenhuma' | 'Condicional'
  base_preferred?: string
  is_dependency?: boolean

  // defaults para proposta
  quantity: number

  // campos fiscais/cadastro (quando desconhecidos ficam como "A VALIDAR")
  fiscal: {
    tipo_servico: string
    iss: string
    nbs: string
    ncm: string
  }

  unit: {
    code: 'UN' | 'HORA' | 'LICENCA'
    description: 'UNIDADE' | 'HORA' | 'LICENCA'
  }
}

export type ErpExportV2 = {
  blocked: boolean
  blockedReasons?: string[]
  payload: {
    schema_version: 'v2'
    items: ErpLineItemV2[]
    summary: {
      items_count: number
      has_dependencies: boolean
      billing_modes: string[]
    }
  }
}

type SankhyaProduct = {
  product_id: string
  name: string
  erp_code: string
  group_code?: string
  group_name?: string
  pm_type?: string
  contract_model?: string
  billing_model?: string
  dependency_type?: 'Nenhuma' | 'Condicional'
  base_preferred?: string
  notes?: string
}

function uniq(arr: string[]) {
  return Array.from(new Set((arr || []).map((s) => (s || '').trim()).filter(Boolean)))
}

function asArray<T>(v: any): T[] {
  return Array.isArray(v) ? (v as T[]) : []
}

function pickProducts(solutionPack: any): SankhyaProduct[] {
  // V4: recommendation.business.products
  const v4 = solutionPack?.recommendation?.business?.products
  if (Array.isArray(v4) && v4.length) return v4

  // V3: recommendation.products
  const v3 = solutionPack?.recommendation?.products
  if (Array.isArray(v3) && v3.length) return v3

  return []
}

function pickRequiredDependencies(solutionPack: any): string[] {
  // V4: recommendation.business.required_dependencies
  const v4 = solutionPack?.recommendation?.business?.required_dependencies
  if (Array.isArray(v4)) return v4.map(String)

  // V3: recommendation.required_dependencies
  const v3 = solutionPack?.recommendation?.required_dependencies
  if (Array.isArray(v3)) return v3.map(String)

  return []
}

function inferUnit(p: SankhyaProduct): { code: 'UN' | 'HORA' | 'LICENCA'; description: 'UNIDADE' | 'HORA' | 'LICENCA' } {
  const pm = (p.pm_type || '').toLowerCase()
  const contract = (p.contract_model || '').toLowerCase()
  const name = (p.name || '').toLowerCase()

  if (contract.includes('crédito') || name.includes('booking') || pm.includes('banco de horas')) {
    return { code: 'HORA', description: 'HORA' }
  }
  if (pm.includes('licenciamento') || name.includes('licenciamento') || name.includes('copilot')) {
    return { code: 'LICENCA', description: 'LICENCA' }
  }
  return { code: 'UN', description: 'UNIDADE' }
}

function buildLineItem(p: SankhyaProduct, isDependency: boolean): ErpLineItemV2 {
  const unit = inferUnit(p)

  // Como não temos tipo de serviço/NBS/NCM completos aqui, marcamos como A VALIDAR
  const fiscal = {
    tipo_servico: 'A VALIDAR',
    iss: 'A VALIDAR',
    nbs: 'A VALIDAR',
    ncm: 'A VALIDAR',
  }

  return {
    product_id: p.product_id,
    erp_code: String(p.erp_code),
    description: p.name,
    group_code: p.group_code,
    group_name: p.group_name,

    pm_type: p.pm_type,
    contract_model: p.contract_model,
    billing_model: p.billing_model,

    dependency_type: p.dependency_type,
    base_preferred: p.base_preferred,
    is_dependency: isDependency,

    quantity: 1,
    fiscal,
    unit,
  }
}

export function erpSankhyaMapperV2(solutionPack: any): ErpExportV2 {
  const products = pickProducts(solutionPack)
  const deps = pickRequiredDependencies(solutionPack)

  // Fallback: se não houver products enriquecidos, tenta montar itens apenas por product_ids
  const productIds = asArray<string>(solutionPack?.recommendation?.product_ids || solutionPack?.recommendation?.business?.product_ids).map(String)

  const items: ErpLineItemV2[] = []

  if (products.length) {
    for (const p of products) {
      items.push(buildLineItem(p, deps.includes(p.product_id)))
    }
  } else {
    // Sem mapeamento Sankhya: cria itens mínimos (bloqueado)
    for (const pid of productIds) {
      items.push({
        product_id: pid,
        erp_code: 'A VALIDAR',
        description: pid,
        quantity: 1,
        is_dependency: deps.includes(pid),
        fiscal: { tipo_servico: 'A VALIDAR', iss: 'A VALIDAR', nbs: 'A VALIDAR', ncm: 'A VALIDAR' },
        unit: { code: 'UN', description: 'UNIDADE' },
      })
    }
  }

  // Bloqueia se houver qualquer "A VALIDAR" (alinha com guardrail ensureERPBlockedWhenAValidar)
  const serialized = JSON.stringify(items)
  const hasAValidar = serialized.includes('A VALIDAR')

  const blockedReasons: string[] = []
  if (hasAValidar) {
    blockedReasons.push('Campos fiscais/cadastro pendentes (A VALIDAR). Validar com Fiscal/Cadastro/Financeiro antes de exportar.')
  }

  const billing_modes = uniq(items.map((i) => i.billing_model || 'A VALIDAR'))

  return {
    blocked: hasAValidar,
    blockedReasons: blockedReasons.length ? blockedReasons : undefined,
    payload: {
      schema_version: 'v2',
      items,
      summary: {
        items_count: items.length,
        has_dependencies: deps.length > 0,
        billing_modes,
      },
    },
  }
}

// Adapter para o stepRegistry / runtime (mantém compatibilidade com exports.erp)
export function erpSankhyaMapperAgentV2(ctx: any): { blocked: boolean; payload: any; blockedReasons?: string[] } {
  // ctx pode ter solutionPack montado ou dados parciais.
  // Preferimos a estrutura consolidada (solutionPack), mas aceitamos montar on-the-fly.
  const solutionPack = ctx?.solutionPack || {
    diagnosis: ctx?.diagnosis,
    recommendation: ctx?.matching,
  }

  const out = erpSankhyaMapperV2(solutionPack)
  return { blocked: out.blocked, payload: out.payload, blockedReasons: out.blockedReasons }
}
