import { Product } from '@prisma/client'
import { generateWithAI, hasAnthropicKey } from './aiClientWrapper'

type PublicoAlvo = 'FINANCEIRO' | 'COMERCIAL' | 'PRE_VENDA' | 'MARKETING' | 'SUPORTE' | 'ONBOARDING'

// Generate MASTER.md (direct mapping, no AI)
export function generateMasterMd(product: Product): string {
  const formatArray = (arr: any[] | null) => arr && arr.length > 0 ? arr.map(i => `- ${i}`).join('\n') : 'Não informado'
  const formatJson = (obj: any) => obj ? JSON.stringify(obj, null, 2) : 'Não informado'

  return `---
produto: ${product.nomeComercial}
codigo: ${product.codigo}
slug: ${product.slug}
versao: ${product.versao}
status: ${product.status}
atualizado: ${product.updatedAt.toISOString()}
geradoEm: ${new Date().toISOString()}
---

# ${product.nomeComercial}

**Código**: ${product.codigo} | **Tipo**: ${product.tipoProduto} | **Natureza**: ${product.natureza} | **Status**: ${product.status}

---

## Identidade

- **Nome Comercial**: ${product.nomeComercial}
- **Nome Interno**: ${product.nomeInterno || 'Não informado'}
- **Categoria**: ${product.categoria}/${product.subcategoria || 'N/A'}
- **Produto Core**: ${product.produtoCore ? 'Sim' : 'Não'}
- **Integra Jornada**: ${product.integraJornada ? 'Sim' : 'Não'}

## Descrição Comercial

${product.descricaoComercialCurta || 'Não informada'}

## Proposta de Valor

${product.proposta_valor || 'Não informada'}

## Dores Atendidas

${formatArray(product.doresAtendidas)}

## Público-Alvo

${formatArray(product.publicoAlvo)}

## Diferenciais

${formatArray(product.diferenciais)}

## Dependência Comercial

- **Tipo**: ${product.dependenciaComercial}
- **Produto Base**: ${product.produtoBase || 'Nenhuma'}
- **Observações**: ${product.observacoesComerciais || 'Não informadas'}

## Perfis de Cliente

${formatArray(product.perfilCliente)}

---

## Financeiro / ERP

- **Modelo Contratado**: ${product.modeloContratado}
- **Modelo Faturamento**: ${product.modeloFaturamento}
- **Tipo de Receita**: ${product.tipoReceita}
- **Unidade de Medida**: ${product.unidadeMedida}
- **Gera ARR**: ${product.geraARR ? 'Sim' : 'Não'}
- **Centro de Resultado**: ${product.centroResultado || 'Não informado'}
- **Grupo Código**: ${product.grupoCodigo} — ${product.grupoDescricao}

---

## Fiscal

- **Código NBS**: ${product.codigoNBS || 'A_VALIDAR'}
- **Tem ISS**: ${product.temISS}
- **Alíquota ISS**: ${product.aliquotaISS || 'N/A'}%
- **Código de Serviço**: ${product.codigoServico || 'A_VALIDAR'}
- **Status Fiscal**: ${product.fiscalStatus}
- **Observações Fiscais**: ${product.observacoesFiscais || 'Não informadas'}

---

## Técnico

- **Arquitetura HLD**: ${product.arquiteturaHLD || 'Não informada'}
- **Requisitos Mínimos**: ${formatArray(product.requisitosMinimos)}
- **Tecnologias Base**: ${formatArray(product.tecnologiasBase)}
- **Modelo de Deployment**: ${product.modeloDeployment}
- **Integrações Suportadas**: ${formatArray(product.integracoesSuportadas)}
- **Limitações Conhecidas**: ${product.limitacoesConhecidas || 'Não informadas'}
- **Tempo de Implementação**: ${product.tempoImplementacao || 'A definir'}

---

## Suporte

- **SLA**: ${product.slaAtendimento || 'Não informado'}
- **FAQ**: ${formatJson(product.faq)}
- **Problemas Conhecidos**: ${formatArray(product.problemasConhecidos)}
- **Troubleshooting**: ${product.troubleshootingGuia || 'Não informado'}

---

## Marketing

- **Short Pitch**: ${product.shortPitch || 'Não informado'}
- **Cases**: ${formatJson(product.cases)}
- **Objeções**: ${formatJson(product.objecoesRespostas)}
- **Script de Venda**: ${product.scriptVenda || 'Não informado'}

---

## Onboarding

${product.contextoGeral || 'Não informado'}

**Por que existe**: ${product.porQueExiste || 'Não informado'}

**Para quem é**: ${product.paraquemE || 'Não informado'}

**Não confundir com**: ${product.naoConfundirCom || 'Não informado'}

**Roadmap**: ${product.roadmapPublico || 'Não informado'}

---

## Origem

- **Tipo**: ${product.origemTipo || 'Interno'}
- **Descrição**: ${product.origemDescricao || 'Não informada'}
- **Segmento**: ${product.origemClienteSegmento || 'Não informado'}
- **Data**: ${product.origemData || 'Não informada'}
- **Responsável**: ${product.origemResponsavel || 'Não informado'}

---

## Tags Copilot

${formatArray(product.tagsCopilot)}
`
}

// Generate MASTER.html
export function generateMasterHtml(product: Product): string {
  const masterMd = generateMasterMd(product)
  // Simple markdown to HTML conversion (in production, use a library like marked)
  const title = product.nomeComercial
  const htmlBody = masterMd
    .replace(/^# (.*?)$/gm, '<h1>$1</h1>')
    .replace(/^## (.*?)$/gm, '<h2>$1</h2>')
    .replace(/^### (.*?)$/gm, '<h3>$1</h3>')
    .replace(/\*\*(.*?)\*\*/gm, '<strong>$1</strong>')
    .replace(/^- (.*?)$/gm, '<li>$1</li>')
    .replace(/\n\n/g, '</p><p>')

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} — Documentação Completa</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; line-height: 1.6; max-width: 900px; margin: 0 auto; padding: 20px; }
    h1, h2, h3 { color: #0f172a; margin-top: 24px; }
    strong { color: #1e293b; }
    li { margin: 4px 0; }
    code { background: #f1f5f9; padding: 2px 6px; border-radius: 3px; }
    .metadata { background: #f8fafc; padding: 12px; border-radius: 6px; margin-bottom: 24px; }
  </style>
</head>
<body>
  <div class="metadata">
    <p><strong>Produto:</strong> ${product.nomeComercial}</p>
    <p><strong>Código:</strong> ${product.codigo} | <strong>Status:</strong> ${product.status}</p>
  </div>
  <div>${htmlBody}</div>
</body>
</html>`
}

// Build prompt for AI-generated documents
function buildDocGenerationPrompt(publico: PublicoAlvo, master: string, produtoNome: string): string {
  const instrucoes: Record<PublicoAlvo, string> = {
    FINANCEIRO: `Você é especialista em contabilidade e gestão financeira.
Escreva o documento para o time financeiro da empresa.
Priorize: classificação fiscal, tipo de receita, modelo de faturamento.
Use linguagem técnica e direta. Não use narrativa comercial.
Se algum campo fiscal estiver como "A_VALIDAR", destaque com aviso.`,

    COMERCIAL: `Você é um consultor de vendas B2B experiente.
Escreva o documento para o time comercial da empresa.
Priorize: como posicionar o produto, dependências, objeções, script de venda.
Use linguagem orientada a ação. Seja persuasivo mas honesto.`,

    PRE_VENDA: `Você é um arquiteto de soluções Microsoft.
Escreva o documento para consultores de pré-venda.
Priorize: requisitos técnicos, arquitetura, riscos, tempo de implementação.
Seja preciso com limitações — não prometa o que o produto não entrega.`,

    MARKETING: `Você é um redator de marketing B2B especializado em EdTech.
Escreva o documento para o time de marketing.
Priorize: proposta de valor, diferenciais, cases, personas.
Use linguagem inspiradora e orientada a resultado.`,

    SUPORTE: `Você é especialista em suporte técnico de software.
Escreva o documento para o time de suporte ao cliente.
Priorize: FAQ, troubleshooting, problemas conhecidos, SLA.
Seja objetivo e instrucional.`,

    ONBOARDING: `Você é responsável por integração de novos colaboradores.
Escreva o documento para novos membros da equipe.
Priorize: contexto geral, por que o produto existe, posicionamento no portfólio.
Use linguagem acessível, evite jargões técnicos.`,
  }

  return `${instrucoes[publico]}

PRODUTO: ${produtoNome}

DADOS DO CADASTRO (MASTER):
${master}

INSTRUÇÕES:
- Escreva em português do Brasil
- Use apenas informações presentes no cadastro — nunca invente dados
- Se um campo estiver vazio ou "A_VALIDAR", indique claramente
- Inclua o frontmatter YAML no início com copilot-hints específicos para este público
- Gere entre 4 e 6 copilot-hints como perguntas que o Copilot M365 pode receber sobre este produto
- Formato: Markdown puro com frontmatter YAML no início

Exemplo de frontmatter:
---
produto: ${produtoNome}
publico: ${publico}
versao: 1.0.0
atualizado: $(date -u +%Y-%m-%dT%H:%M:%SZ)
copilot-hints:
  - "pergunta 1?"
  - "pergunta 2?"
  - "pergunta 3?"
---

Escreva o conteúdo Markdown a partir daqui.`
}

// Generate vision document using Claude (or mock if key not available)
export async function generateVisionDocument(publico: PublicoAlvo, master: string, produtoNome: string): Promise<{ content: string; hints: string[] }> {
  const prompt = buildDocGenerationPrompt(publico, master, produtoNome)
  const content = await generateWithAI(prompt, { model: 'claude-opus-4-7', max_tokens: 4096 })

  // Extract copilot hints from frontmatter
  const frontmatterMatch = content.match(/---[\s\S]*?---/)
  const hints: string[] = []

  if (frontmatterMatch) {
    const hintMatches = content.match(/copilot-hints:\s*\n([\s\S]*?)(?:\n---|\n[a-z])/i)
    if (hintMatches) {
      const hintsText = hintMatches[1]
      const hintLines = hintsText.match(/- "(.+?)"/g)
      if (hintLines) {
        hints.push(...hintLines.map(h => h.replace(/- "(.+?)"/, '$1')))
      }
    }
  }

  return { content, hints }
}

// Generate ERP export JSON
export function generateErpExport(product: Product): any {
  const blocked = product.fiscalStatus === 'A_VALIDAR'
  const blockedReasons = blocked ? ['fiscalStatus: A_VALIDAR — codigoNBS não validado'] : []

  return {
    blocked,
    blockedReasons,
    generatedAt: new Date().toISOString(),
    produto: {
      codigo: product.codigo,
      nomeComercial: product.nomeComercial,
      tipoProduto: product.tipoProduto,
      grupoCodigo: product.grupoCodigo,
      grupoDescricao: product.grupoDescricao,
      modeloContratado: product.modeloContratado,
      modeloFaturamento: product.modeloFaturamento,
      unidadeMedida: product.unidadeMedida,
      tipoReceita: product.tipoReceita,
      codigoNBS: product.codigoNBS || 'A_VALIDAR',
      temISS: product.temISS,
      centroResultado: product.centroResultado,
      ativo: product.ativo,
    },
  }
}

// Generate CRM export JSON
export function generateCrmExport(product: Product): any {
  return {
    generatedAt: new Date().toISOString(),
    produto: {
      nome: product.nomeComercial,
      descricaoCurta: product.descricaoComercialCurta,
      tipoProduto: product.tipoProduto,
      modeloContratado: product.modeloContratado,
      dependencia: product.dependenciaComercial,
      perfilCliente: product.perfilCliente,
      ativo: product.ativo,
    },
  }
}

// Generate Partner Center export JSON
export function generatePartnerExport(product: Product): any {
  return {
    generatedAt: new Date().toISOString(),
    produto: {
      titulo: product.nomeComercial,
      descricaoCurta: product.descricaoComercialCurta,
      solutionAreas: product.tecnologiasBase || [],
      offerType: product.tipoProduto,
      mercados: ['BR'],
      idiomas: ['pt-BR'],
      keywords: product.tagsCopilot || [],
    },
  }
}
