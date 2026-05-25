import Anthropic from '@anthropic-ai/sdk'

const HAS_ANTHROPIC_KEY = !!process.env.ANTHROPIC_API_KEY

let anthropicClient: Anthropic | null = null

if (HAS_ANTHROPIC_KEY) {
  anthropicClient = new Anthropic()
}

export function hasAnthropicKey(): boolean {
  return HAS_ANTHROPIC_KEY
}

export async function generateWithAI(
  prompt: string,
  options: { model?: string; max_tokens?: number } = {}
): Promise<string> {
  if (!anthropicClient) {
    // Return mock content when API key is not available
    return generateMockContent(prompt)
  }

  const response = await anthropicClient.messages.create({
    model: options.model || 'claude-opus-4-7',
    max_tokens: options.max_tokens || 4096,
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
  })

  return response.content[0].type === 'text' ? response.content[0].text : ''
}

function generateMockContent(prompt: string): string {
  // Detect what kind of content is being requested based on prompt keywords
  if (prompt.includes('FINANCEIRO')) {
    return generateMockFinanceDocument()
  }
  if (prompt.includes('COMERCIAL')) {
    return generateMockCommercialDocument()
  }
  if (prompt.includes('PRE_VENDA')) {
    return generateMockPresalesDocument()
  }
  if (prompt.includes('MARKETING')) {
    return generateMockMarketingDocument()
  }
  if (prompt.includes('SUPORTE')) {
    return generateMockSupportDocument()
  }
  if (prompt.includes('ONBOARDING')) {
    return generateMockOnboardingDocument()
  }

  return generateMockGenericDocument()
}

function generateMockFinanceDocument(): string {
  return `---
produto: Integrador Provisionador
publico: FINANCEIRO
geradoEm: ${new Date().toISOString()}
copilot-hints:
  - "modelo contratação recorrente"
  - "margem bruta 45%"
  - "SAC < 3 meses"
---

# Integrador Provisionador — Visão Financeira

## Resumo Executivo
Solução que automatiza o provisionamento de ambientes multi-nuvem com modelo SaaS recorrente.

## Modelo Financeiro

### Receita
- **Modelo de Faturamento**: Recorrente mensal
- **Faixa de Preço**: R$ 2.500 - R$ 5.000/mês
- **Margem Bruta Esperada**: 45-50%
- **SAC (Sales Acquisition Cost)**: < 3 meses

### Custos
- **Custo de Produção**: ~25% da receita
- **Custo de Suporte**: ~15% da receita
- **Custo de Infraestrutura**: ~15% da receita

## ROI por Segmento
- **Enterprise**: 6-8 meses
- **Mid-market**: 4-6 meses
- **SMB**: 3-4 meses

## Recomendação Financeira
✅ Produto viável para crescimento — recorrência alta, churn baixo
`
}

function generateMockCommercialDocument(): string {
  return `---
produto: Integrador Provisionador
publico: COMERCIAL
geradoEm: ${new Date().toISOString()}
copilot-hints:
  - "diferencial: zero downtime"
  - "integração pré-nativa com AWS/Azure/GCP"
  - "SLA 99.95% garantido"
---

# Integrador Provisionador — Visão Comercial

## Proposta de Valor
Provisione ambientes multi-nuvem em minutos, não horas. Integração nativa com AWS, Azure e GCP.

## Diferenciais
- ✅ Provisionamento zero-downtime
- ✅ IaC automático (Terraform gerado)
- ✅ Rollback instantâneo em 1 clique
- ✅ SLA 99.95% com 24/7 suporte

## Público-Alvo Primário
- Empresas com infra multi-nuvem
- Equipes DevOps em crescimento
- Startups de scale-up

## Dores Atendidas
- Provisionamento manual = 40+ horas/semana
- Erros de configuração = downtime
- Falta de padrão entre nuvens
- Onboarding novo dev = 2-3 semanas

## Dependências
- **Produto Base**: Integrador Principal
- **Complementos**: Monitoramento em Nuvem (opcional)

## Pricing Strategy
- Tiered pricing por número de ambientes
- Free tier: 1 ambiente (máx 30 dias)
- Starter: 5 ambientes
- Enterprise: Unlimited + dedicated support
`
}

function generateMockPresalesDocument(): string {
  return `---
produto: Integrador Provisionador
publico: PRE_VENDA
geradoEm: ${new Date().toISOString()}
copilot-hints:
  - "ROI em 4 meses"
  - "reduz time de DevOps em 60%"
  - "compatível com Terraform existente"
---

# Integrador Provisionador — Visão Pré-Venda

## Pitch de 60 segundos
"Automatize 100% do provisionamento multi-nuvem. Reduza tempo de deploy de horas para minutos. SLA 99.95%."

## Problema Identificado
A maioria das empresas com infra multi-nuvem provisiona manualmente:
- 40+ horas/semana em operações
- Taxa de erro 15-20% (falhas de config)
- Time de DevOps sobrecarregado
- Onboarding de novo dev = 2-3 semanas

## Solução
Integrador Provisionador com:
- IaC automático (Terraform)
- Validação pré-deploy
- Rollback 1-clique
- Suporte 24/7

## Proof of Concept (POC)
- **Duração**: 2 semanas
- **Escopo**: 3 ambientes (dev/staging/prod)
- **Métrica de Sucesso**: Reduzir deploy de 4h → 15min
- **Investimento POC**: R$ 5.000

## Perguntas Frequentes
- **Integra com Terraform existente?** Sim, 100% compatível
- **Suporta on-prem?** Sim, via hybrid mode
- **Quanto tempo para implementar?** 2-3 dias para infra existente

## Próximos Passos
1. Agendar demo (30 min)
2. Discutir arquitetura atual
3. Preparar POC
`
}

function generateMockMarketingDocument(): string {
  return `---
produto: Integrador Provisionador
publico: MARKETING
geradoEm: ${new Date().toISOString()}
copilot-hints:
  - "case study: 40% economia de tempo"
  - "webinar: 'Multi-cloud sem dor'"
  - "conteúdo: DevOps best practices"
---

# Integrador Provisionador — Visão Marketing

## Mensagem Principal
**Provisione multi-nuvem em minutos. Automatize o que leva horas.**

## Eixos de Conteúdo
1. **Educacional**: DevOps best practices, IaC patterns
2. **Prova Social**: Case studies de clientes Fortune 500
3. **Técnico**: Arquitetura, integração, SLA

## Campanhas Recomendadas
- LinkedIn: "DevOps trends 2026"
- Webinar: "Multi-cloud sem dor"
- Evento: Deploy talk (500 devs esperados)
- Conteúdo: Blog + whitepaper

## Personas
- **Dev Lead**: Busca eficiência da equipe
- **Arquiteto**: Busca padrão multi-nuvem
- **CTO**: Busca redução de risco

## Métrica de Sucesso
- 1.000 free signups/mês
- 15% conversion para paid
- NPS > 70

## Assets Necessários
- ✅ Demo video (2 min)
- ✅ Documentação interativa
- ✅ Case study (2-3 clientes)
- ✅ Whitepaper
`
}

function generateMockSupportDocument(): string {
  return `---
produto: Integrador Provisionador
publico: SUPORTE
geradoEm: ${new Date().toISOString()}
copilot-hints:
  - "docs: troubleshooting comum"
  - "SLA: resposta em 4h"
  - "escalação: arquiteto em 24h"
---

# Integrador Provisionador — Visão Suporte

## SLA & Garantias
- **Resposta**: 4 horas (P1), 8 horas (P2)
- **Resolução**: 24 horas (P1), 72 horas (P2)
- **Uptime**: 99.95%
- **Support**: 24/7 (phone + email)

## Problemas Comuns & Soluções

### 1. Deploy falha em staging
**Sintoma**: Error "VPC not found"
**Solução**: Validar CIDR blocks no IaC
**Docs**: [link]

### 2. Rollback não funciona
**Sintoma**: Estado anterior não recuperado
**Solução**: Verificar snapshot bucket
**Docs**: [link]

### 3. Timeout em deploy multi-região
**Sintoma**: Timeout após 30 min
**Solução**: Aumentar timeout param
**Docs**: [link]

## Escalonamento
- **Nível 1**: Suporte técnico (response 4h)
- **Nível 2**: Arquiteto (response 24h)
- **Nível 3**: Eng Principal (crítico apenas)

## Documentação Necessária
- ✅ Installation guide
- ✅ Troubleshooting guide
- ✅ API docs
- ✅ Video tutorials
- ✅ FAQ
`
}

function generateMockOnboardingDocument(): string {
  return `---
produto: Integrador Provisionador
publico: ONBOARDING
geradoEm: ${new Date().toISOString()}
copilot-hints:
  - "onboarding de 1 dia"
  - "template terraform incluído"
  - "sandbox pré-provisionada"
---

# Integrador Provisionador — Visão Onboarding

## Jornada de Onboarding (1 dia)

### Dia 0: Preparação (2h)
- Criar conta + verify email
- Receber credenciais AWS/Azure/GCP
- Assistir video intro (10 min)

### Dia 1: Hands-On (6h)
- Setup local (30 min)
  - \`npm install\`
  - \`gcloud auth\`
- Primeiro deploy (45 min)
  - Clone template Terraform
  - Deploy dev environment
  - Verificar SLA (99.95%)
- Segundo deploy (45 min)
  - Deploy staging
  - Habilitar CI/CD integration
- Rollback practice (30 min)
  - Simular falha
  - Executar rollback
  - Validar restore

### Dia 2+: Self-serve
- Docs completa disponível
- Suporte técnico 24/7
- Comunidade Slack

## Templates Incluídos
- ✅ AWS (3 arquiteturas)
- ✅ Azure (3 arquiteturas)
- ✅ GCP (2 arquiteturas)
- ✅ Hybrid (on-prem + cloud)

## Sucesso = Primeira produção em <7 dias
`
}

function generateMockGenericDocument(): string {
  return `---
produto: Integrador Provisionador
geradoEm: ${new Date().toISOString()}
copilot-hints:
  - "solução pronta para uso"
  - "totalmente integrada"
  - "suporte 24/7"
---

# Integrador Provisionador

## Descrição Geral
Solução de integração que provisiona ambientes multi-nuvem com automação completa.

## Características Principais
- Provisionamento automático de ambientes
- Suporte a múltiplas nuvens (AWS, Azure, GCP)
- IaC automático (Terraform)
- Rollback instant^aneo
- SLA 99.95%

## Benefícios
- Reduz tempo de deploy em 80%
- Elimina erros de configuração manual
- Improve produtividade do time DevOps
- Padrão multi-cloud unificado

## Próximas Ações
Agende uma demo ou inicie um POC com nossa equipe.
`
}
