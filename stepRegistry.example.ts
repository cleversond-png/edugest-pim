/**
 * stepRegistry.example.ts — Registro de etapas (agents) para uso com FallbackOrchestrator
 *
 * Objetivo:
 * - Implementar DiagnosisAgent (lógica determinística) e MatchingAgent (baseado no diagnóstico)
 * - Manter demais etapas como stubs (mocks) para evoluir incrementalmente
 *
 * Observações:
 * - IDs/Slugs retornados aqui são neutros (sem marca) e podem ser mapeados depois para Product.id no banco.
 * - Dependências comerciais seguem a matriz (ex.: Agenda/Relatórios/Centro de Operações dependem do Integrador de forma condicional).
 */

import { StepRegistry } from "./fallback-orchestrator";
import { matchingAgentV2 } from "./matchingAgentV2";
import { matchingAgentV3 } from "./matchingAgentV3";
import { erpSankhyaMapperAgentV2 } from "./erpSankhyaMapperV2";

type Maturity = "BAIXA" | "MEDIA" | "ALTA" | "NAO_EVIDENCIADO";
type Complexity = "BAIXA" | "MEDIA" | "ALTA" | "NAO_EVIDENCIADO";

// =====================================================
// Helpers gerais
// =====================================================

function normalize(text: string) {
  return (text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

function uniq(arr: string[]) {
  return Array.from(new Set((arr || []).map((s) => (s || "").trim()).filter(Boolean)));
}

function hasAny(text: string, terms: string[]) {
  const t = (text || "").toLowerCase();
  return (terms || []).some((term) => term && t.includes(term.toLowerCase()));
}

function pickFirst<T>(arr: T[]) {
  return arr && arr.length ? arr[0] : null;
}

// =====================================================
// DiagnosisAgent (determinístico, sem IA)
// =====================================================

function extractPains(textNorm: string) {
  // Dores: palavras típicas de problema operacional
  const painKeywords = [
    "retrabalho",
    "manual",
    "demora",
    "lento",
    "erro",
    "inconsistente",
    "sem visibilidade",
    "sem controle",
    "risco",
    "falta de",
    "dificuldade",
    "problema",
  ];

  const sentences = textNorm
    .split(/[\n\.!\?]+/)
    .map((s) => s.trim())
    .filter(Boolean);

  const pains = sentences
    .filter((s) => painKeywords.some((k) => s.includes(k)))
    .map((s) => (s.length > 140 ? s.slice(0, 140) + "..." : s));

  return uniq(pains).slice(0, 6);
}

function extractObjectives(textNorm: string) {
  // Objetivos: padrões simples de intenção
  const patterns: RegExp[] = [
    /(?:quer|precisa|objetivo|busca|gostaria|pretende)\s+(?:de\s+)?([^\.\n]{10,140})/gi,
  ];

  const out: string[] = [];
  for (const re of patterns) {
    const matches = textNorm.match(re);
    if (!matches) continue;
    for (const m of matches) {
      const cleaned = m
        .replace(/\s+/g, " ")
        .replace(/^(quer|precisa|objetivo|busca|gostaria|pretende)\s+/i, "")
        .trim();
      if (cleaned.length > 6) out.push(cleaned);
      if (out.length >= 6) break;
    }
    if (out.length >= 6) break;
  }
  return uniq(out).slice(0, 6);
}

function extractConstraints(textNorm: string) {
  const constraints: string[] = [];

  if (hasAny(textNorm, ["prazo", "urgente", "semana", "mes", "data", "cronograma"])) {
    constraints.push("Prazo mencionado (validar datas e SLA interno)");
  }

  if (hasAny(textNorm, ["orcamento", "budget", "custo", "preco", "valor"])) {
    constraints.push("Orçamento/Preço mencionado (validar faixa e modelo de contratação)");
  }

  if (hasAny(textNorm, ["lgpd", "compliance", "seguranca", "auditoria", "politica", "governanca"])) {
    constraints.push("Requisitos de segurança/compliance mencionados (validar escopo)");
  }

  if (hasAny(textNorm, ["integracao", "integrada", "integrado", "integrar", "integra", "api", "erp", "crm", "graph", "conector", "totvs", "sge"])) {
    constraints.push("Integrações citadas (mapear sistemas e campos necessários)");
  }

  return uniq(constraints);
}

function scoreMaturity(textNorm: string): Maturity {
  const lowSignals = ["nao tem", "sem", "manual", "planilha", "desorganizado", "bagunca", "sem padrao"];
  const midSignals = ["parcial", "em partes", "alguns", "iniciamos", "implantando", "migrando"];
  const highSignals = ["governanca", "padrao", "processo", "auditoria", "politica", "controle", "centralizado", "automatizado"];

  const score = (hasAny(textNorm, highSignals) ? 2 : 0) + (hasAny(textNorm, midSignals) ? 1 : 0) + (hasAny(textNorm, lowSignals) ? -1 : 0);

  if (score >= 2) return "ALTA";
  if (score == 1) return "MEDIA";
  if (score <= 0 && hasAny(textNorm, lowSignals)) return "BAIXA";
  return "NAO_EVIDENCIADO";
}

function scoreComplexity(textNorm: string): Complexity {
  const high = ["integracao", "integrada", "integrado", "integrar", "integra", "multi", "tenant", "sso", "identidade", "seguranca", "compliance", "erp", "crm", "api", "migracao"];
  const mid = ["portal", "intranet", "sharepoint", "teams", "automacao", "workflow", "dashboard", "relatorio", "relatórios"];
  const low = ["treinamento", "workshop", "ajuste simples", "configuracao"];

  const score = (hasAny(textNorm, high) ? 2 : 0) + (hasAny(textNorm, mid) ? 1 : 0) + (hasAny(textNorm, low) ? -1 : 0);

  if (score >= 2) return "ALTA";
  if (score == 1) return "MEDIA";
  if (score <= 0 && hasAny(textNorm, low)) return "BAIXA";
  return "NAO_EVIDENCIADO";
}

function extractSignals(textNorm: string) {
  const signals: string[] = [];

  if (hasAny(textNorm, ["decisor", "diretoria", "reitor", "gestor", "patrocinador"])) {
    signals.push("Há menção de decisor/sponsor (confirmar acesso e envolvimento)");
  } else {
    signals.push("Decisor não evidenciado (confirmar acesso ao decisor)");
  }

  if (hasAny(textNorm, ["prazo", "data", "cronograma", "plano", "execucao"])) {
    signals.push("Há indícios de cronograma/plano (confirmar datas e responsáveis)");
  }

  return uniq(signals);
}

function diagnoseFromTranscript(opportunityContext: any) {
  const rawText = opportunityContext?.transcript?.text || "";
  const t = normalize(rawText);

  const pains = extractPains(t);
  const objectives = extractObjectives(t);
  const constraints = extractConstraints(t);

  const maturity = scoreMaturity(t);
  const complexity = scoreComplexity(t);

  const scenario_summary = t || "Não evidenciado";
  const signals = extractSignals(t);

  const success_criteria: string[] = [];
  if (hasAny(t, ["sucesso", "criterio", "aceite", "kpi", "meta"])) {
    success_criteria.push("Critérios de sucesso mencionados (extrair e formalizar)");
  } else {
    success_criteria.push("Critérios de sucesso não evidenciados (definir com o cliente)");
  }

  return {
    scenario_summary,
    pains: pains.length ? pains : ["não evidenciado"],
    objectives: objectives.length ? objectives : ["não evidenciado"],
    constraints: constraints.length ? constraints : ["não evidenciado"],
    maturity,
    complexity,
    signals,
    success_criteria,
  };
}

// =====================================================
// MatchingAgent (baseado no diagnóstico)
// =====================================================

// IDs/Slugs neutros (sem marca) — alinhados aos nomes da matriz.
const PRODUCT = {
  INTEGRADOR: "integrador-provisionador",
  AGENDA: "agenda-inteligente",
  RELATORIOS: "relatorios-inteligentes",
  CENTRO_OPERACOES: "centro-operacoes",
  NUCLEO_EXPERIENCIA: "nucleo-experiencia",
  PORTAL_SHAREPOINT: "portal-institucional-sharepoint",
  INTRANET_SHAREPOINT: "intranet-sharepoint",
  FORMACAO: "formacao-microsoft",
  SUPORTE_M365: "suporte-m365",
  CONSULTORIA: "consultoria-especializada",
  BOOKING_HORAS: "booking-horas",
  LIC_A1: "licenciamento-m365-a1",
  LIC_A3: "licenciamento-m365-a3",
  LIC_A5: "licenciamento-m365-a5",
  COPILOT: "copilot-m365",
} as const;

// Dependências comerciais (conforme matriz): Agenda/Relatórios/Centro dependem do Integrador de forma condicional.
const DEPENDENCY_RULES: Record<string, { type: "Nenhuma" | "Condicional"; base?: string; note: string }> = {
  [PRODUCT.AGENDA]: {
    type: "Condicional",
    base: PRODUCT.INTEGRADOR,
    note: "Requer integração educacional ativa (dependência condicional do Integrador).",
  },
  [PRODUCT.RELATORIOS]: {
    type: "Condicional",
    base: PRODUCT.INTEGRADOR,
    note: "Requer integração educacional ativa (dependência condicional do Integrador).",
  },
  [PRODUCT.CENTRO_OPERACOES]: {
    type: "Condicional",
    base: PRODUCT.INTEGRADOR,
    note: "Requer integração educacional ativa (dependência condicional do Integrador).",
  },
};

function matchFromDiagnosis(ctx: any) {
  const diagnosis = ctx?.diagnosis || {};
  const transcript = ctx?.opportunityContext?.transcript?.text || "";
  const text = normalize(transcript);

  const pains = normalize((diagnosis.pains || []).join(" "));
  const objectives = normalize((diagnosis.objectives || []).join(" "));
  const constraints = normalize((diagnosis.constraints || []).join(" "));

  const wantsSharePoint = hasAny(text, ["sharepoint", "intranet", "portal", "site"]) || hasAny(objectives, ["intranet", "portal", "sharepoint"]);
  const wantsIntranet = hasAny(text, ["intranet"]) || hasAny(objectives, ["intranet"]);
  const wantsPortal = hasAny(text, ["portal", "institucional"]) || hasAny(objectives, ["portal"]);

  const wantsAgenda = hasAny(text, ["agenda", "agendar", "agendamento", "aula", "calendario", "calendário"]) || hasAny(objectives, ["agenda", "agendar", "agendamento"]);
  const wantsReports = hasAny(text, ["relatorio", "relatorios", "relatório", "relatórios", "dashboard", "insights", "indicador"]) || hasAny(objectives, ["relatorio", "dashboard", "insights"]);
  const wantsOperationsCenter = hasAny(text, ["centro de operacoes", "centro de operações", "monitoramento", "tempo real", "observabilidade"]);

  const wantsTraining = hasAny(text, ["treinamento", "formacao", "formação", "capacitar"]) || hasAny(objectives, ["treinamento", "formacao", "formação"]);
  const wantsSupport = hasAny(text, ["suporte", "atendimento", "chamado", "ticket"]) || hasAny(pains, ["problema", "erro", "inconsistente"]);

  const wantsLicensing = hasAny(text, ["licenca", "licença", "licenciamento", "a1", "a3", "a5"]) || hasAny(objectives, ["licenca", "licenciamento"]);
  const wantsCopilot = hasAny(text, ["copilot"]) || hasAny(objectives, ["copilot"]);

  // ✅ correção: inclui 'integrada' e variações
  const mentionsIntegration = hasAny(text, [
    "integracao",
    "integração",
    "integrada",
    "integrado",
    "integrar",
    "integra",
    "api",
    "erp",
    "crm",
    "conector",
    "totvs",
    "sge",
  ]) || constraints.includes("integra");

  const mentionsSecurity = hasAny(text, ["seguranca", "segurança", "governanca", "governança", "compliance", "lgpd"]) || hasAny(objectives, ["seguranca", "governanca", "compliance"]);

  const product_ids: string[] = [];
  const required_dependencies: string[] = [];
  const notes: string[] = [];

  // 1) Copilot / Licensing
  if (wantsCopilot) {
    product_ids.push(PRODUCT.COPILOT);
    notes.push("Objetivo menciona Copilot.");
  }

  if (wantsLicensing) {
    if (hasAny(text, ["a5"])) product_ids.push(PRODUCT.LIC_A5);
    else if (hasAny(text, ["a3"])) product_ids.push(PRODUCT.LIC_A3);
    else if (hasAny(text, ["a1"])) product_ids.push(PRODUCT.LIC_A1);
    else product_ids.push(PRODUCT.LIC_A3);
    notes.push("Objetivo menciona licenciamento.");
  }

  // 2) SharePoint
  if (wantsSharePoint) {
    if (wantsIntranet) product_ids.push(PRODUCT.INTRANET_SHAREPOINT);
    else if (wantsPortal) product_ids.push(PRODUCT.PORTAL_SHAREPOINT);
    else product_ids.push(PRODUCT.INTRANET_SHAREPOINT);
    notes.push("Objetivo menciona portal/intranet/SharePoint.");

    // Se há integração explícita, sugerir Integrador como dependência/base (não é dependência da Intranet em si,
    // mas é necessário para cumprir o objetivo 'integrada ao sistema acadêmico').
    if (mentionsIntegration) {
      required_dependencies.push(PRODUCT.INTEGRADOR);
      notes.push("Intranet com integração mencionada → requer Integrador.");
    }
  }

  // 3) Agenda / Relatórios / Centro de Operações
  if (wantsAgenda) {
    product_ids.push(PRODUCT.AGENDA);
    notes.push("Objetivo menciona agenda/agendamento.");
  }

  if (wantsReports) {
    if (mentionsIntegration) {
      product_ids.push(PRODUCT.RELATORIOS);
      notes.push("Relatórios solicitados e há indício de integração.");
    } else {
      product_ids.push(PRODUCT.NUCLEO_EXPERIENCIA);
      notes.push("Relatórios solicitados, mas integração não evidenciada → sugere solução analítica independente.");
    }
  }

  if (wantsOperationsCenter) {
    if (mentionsIntegration) {
      product_ids.push(PRODUCT.CENTRO_OPERACOES);
      notes.push("Monitoramento solicitado e há indício de integração.");
    } else {
      product_ids.push(PRODUCT.NUCLEO_EXPERIENCIA);
      notes.push("Monitoramento solicitado, mas integração não evidenciada → sugere solução analítica independente.");
    }
  }

  // 4) Serviços
  if (wantsTraining) {
    product_ids.push(PRODUCT.FORMACAO);
    notes.push("Necessidade de formação/treinamento mencionada.");
  }

  if (wantsSupport) {
    product_ids.push(PRODUCT.SUPORTE_M365);
    notes.push("Necessidade de suporte/atendimento mencionada.");
  }

  if (mentionsSecurity && product_ids.length === 0) {
    product_ids.push(PRODUCT.CONSULTORIA);
    notes.push("Segurança/governança mencionada → sugere consultoria especializada.");
  }

  // 5) Dependências comerciais condicional (Agenda/Relatórios/Centro)
  for (const pid of product_ids) {
    const rule = DEPENDENCY_RULES[pid];
    if (rule?.type === "Condicional" && rule.base) {
      required_dependencies.push(rule.base);
      notes.push(rule.note);
    }
  }

  // 6) Integração pura
  if (mentionsIntegration && product_ids.length === 0) {
    product_ids.push(PRODUCT.INTEGRADOR);
    notes.push("Integração explicitamente mencionada → recomenda Integrador como base.");
  }

  const finalProducts = uniq(product_ids).slice(0, 3);
  const finalDeps = uniq(required_dependencies).slice(0, 3);

  const justificationParts: string[] = [];
  const obj = pickFirst(diagnosis.objectives || []);
  const con = pickFirst(diagnosis.constraints || []);
  if (obj && obj !== "não evidenciado") justificationParts.push(`Objetivo: ${obj}.`);
  if (con && con !== "não evidenciado") justificationParts.push(`Restrição: ${con}.`);
  if (notes.length) justificationParts.push(`Notas: ${notes.join(" ")}`);

  return {
    product_ids: finalProducts.length ? finalProducts : [PRODUCT.CONSULTORIA],
    required_dependencies: finalDeps,
    justification: justificationParts.join(" ").trim() || "Recomendação baseada no diagnóstico extraído da transcrição.",
  };
}

// =====================================================
// Step Registry
// =====================================================

export const stepRegistry: StepRegistry = {
  async ContextAssembly(ctx, model) {
    // (MVP) ainda mockado — depois buscar no catálogo real.
    return {
      keywords: ["educação", "m365", "segurança"],
      products: [],
    };
  },

  async DiagnosisAgent(ctx, model) {
    return diagnoseFromTranscript(ctx.opportunityContext);
  },

  async MatchingAgent(ctx, model) {
    return matchingAgentV3(ctx, { topN: 3 });
  },

  async SolutionArchitectAgent(ctx, model) {
    return {
      architecture: "High-level architecture",
      risks: [],
    };
  },

  async SalesNarrativeAgent(ctx, model) {
    return {
      pitch: "Proposta de valor clara",
      objections: ["Preço", "Prazo"],
    };
  },

  async MarketingDeckAgent(ctx, model) {
    return {
      slide_contents: [
        { slide: 1, title: "Cenário" },
        { slide: 2, title: "Dores" },
        { slide: 3, title: "Solução" },
      ],
    };
  },

  async ERPSankhyaMapperAgent(ctx, model) {
  return erpSankhyaMapperAgentV2(ctx);
  },
  

  async PartnerCenterMapperAgent(ctx, model) {
    return {
      payload: {
        title: "Oferta gerada automaticamente",
      },
    };
  },

  async DocsPublisherAgent(ctx, model) {
    return {
      files: [
        {
          path: "README.md",
          contentType: "markdown",
          content: "# Produto gerado",
        },
      ],
    };
  },

  async PersistSolutionPack(ctx, model) {
    return true;
  },
};
