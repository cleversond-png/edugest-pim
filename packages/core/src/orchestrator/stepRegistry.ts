/**
 * stepRegistry.ts — Registro de etapas para FallbackOrchestrator
 * Implementa agentes determinísticos (DiagnosisAgent, MatchingAgent, ERPSankhyaMapperAgent)
 * e stubs para agentes a implementar (SolutionArchitectAgent, SalesNarrativeAgent, etc.)
 */

import { StepRegistry } from './fallbackOrchestrator'
import { matchingAgentV3 } from '../agents/matchingAgentV3'
import { erpSankhyaMapperAgentV2 } from '../agents/erpSankhyaMapperV2'
import { diagnoseFromTranscript } from '../agents/diagnosisAgent'

export const stepRegistry: StepRegistry = {
  async ContextAssembly(ctx, model) {
    return {
      keywords: ['educação', 'm365', 'segurança'],
      products: [],
    }
  },

  async DiagnosisAgent(ctx, model) {
    return diagnoseFromTranscript(ctx.opportunityContext)
  },

  async MatchingAgent(ctx, model) {
    return matchingAgentV3(ctx, { topN: 3 })
  },

  async SolutionArchitectAgent(ctx, model) {
    return {
      architecture: 'High-level architecture',
      risks: [],
    }
  },

  async SalesNarrativeAgent(ctx, model) {
    return {
      pitch: 'Proposta de valor clara',
      objections: ['Preço', 'Prazo'],
    }
  },

  async MarketingDeckAgent(ctx, model) {
    return {
      slide_contents: [
        { slide: 1, title: 'Cenário' },
        { slide: 2, title: 'Dores' },
        { slide: 3, title: 'Solução' },
      ],
    }
  },

  async ERPSankhyaMapperAgent(ctx, model) {
    return erpSankhyaMapperAgentV2(ctx)
  },

  async PartnerCenterMapperAgent(ctx, model) {
    return {
      payload: {
        title: 'Oferta gerada automaticamente',
      },
    }
  },

  async DocsPublisherAgent(ctx, model) {
    return {
      files: [
        {
          path: 'README.md',
          contentType: 'markdown',
          content: '# Produto gerado',
        },
      ],
    }
  },

  async PersistSolutionPack(ctx, model) {
    return true
  },
}
