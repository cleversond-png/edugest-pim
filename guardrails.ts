/**
 * guardrails.ts — Guardrails para evitar erros de IA (EduGest‑PIM)
 *
 * Objetivo:
 * - Validar estruturalmente (JSON Schema) e semanticamente (regras de negócio)
 * - Bloquear persistência/publicação quando houver risco alto
 * - Padronizar fallback e mensagens de erro
 *
 * Nota: Este arquivo não faz chamada de LLM — ele é executado ANTES e DEPOIS do runtime.
 */

import fs from "fs";
import path from "path";
import Ajv from "ajv";
import addFormats from "ajv-formats";

export type Severity = "INFO" | "WARN" | "ERROR";

export type GuardrailIssue = {
  code: string;
  severity: Severity;
  message: string;
  path?: string;
  hint?: string;
};

export type GuardrailsResult = {
  ok: boolean;
  issues: GuardrailIssue[];
};

export type GuardrailsOptions = {
  /**
   * Lista de termos proibidos (produto deve ser neutro e migrável).
   * Ex.: ["bigbrain", "big brain"]
   */
  bannedTerms?: string[];

  /**
   * Produtos permitidos para recomendação (IDs e/ou slugs), vindos do catálogo carregado no runtime.
   * Se informado, o guardrail bloqueia qualquer recomendação fora dessa lista.
   */
  allowedProducts?: { ids?: string[]; slugs?: string[] };

  /**
   * Máximo de produtos que a recomendação pode incluir (controle de escopo e custo).
   */
  maxRecommendedProducts?: number;

  /**
   * Regras de dependência já resolvidas pelo runtime (ex.: required_dependencies).
   * Se o matching retornar dependências e elas não estiverem presentes em product_ids/bundle, vira erro.
   */
  enforceDependencies?: boolean;

  /**
   * Se true, exige telemetria (modelRouting + tokenUsage).
   */
  requireTelemetry?: boolean;
};

// ─────────────────────────────────────────────────────────────
// JSON Schema validation
// ─────────────────────────────────────────────────────────────

const ajv = new Ajv({
  allErrors: true,
  strict: false,
  allowUnionTypes: true,
});

addFormats(ajv);

const SCHEMA_DIR = path.join(process.cwd(), "schemas");

const SCHEMA_MAP: Record<string, string> = {
  opportunity_context: "opportunity_context.schema.json",
  solution_pack: "solution_pack.schema.json",
  render_result: "render_result.schema.json",
};

function loadJson(filePath: string): any {
  const raw = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(raw);
}

function loadSchema(schemaKey: keyof typeof SCHEMA_MAP): any {
  const schemaFile = SCHEMA_MAP[schemaKey];
  const schemaPath = path.join(SCHEMA_DIR, schemaFile);

  if (!fs.existsSync(schemaPath)) {
    throw new Error(`Schema não encontrado: ${schemaPath}`);
  }

  return loadJson(schemaPath);
}

/**
 * ✅ FIX: evita erro "schema already exists" no AJV
 * - reutiliza schema já registrado via ajv.getSchema(schemaId)
 * - adiciona apenas uma vez via ajv.addSchema(schema, schemaId)
 */
export function validateSchema(
  schemaKey: keyof typeof SCHEMA_MAP,
  payload: any
): GuardrailIssue[] {
  const schema = loadSchema(schemaKey);

  // AJV precisa de um ID estável para cachear e não duplicar
  const schemaId: string =
    schema?.$id ||
    schema?.id ||
    `local://${String(schemaKey)}`;

  // tenta reaproveitar se já existe
  let validateFn = ajv.getSchema(schemaId);

  if (!validateFn) {
    // adiciona uma única vez (se já existir, AJV não vai duplicar aqui porque estamos checando acima)
    ajv.addSchema(schema, schemaId);
    validateFn = ajv.getSchema(schemaId);
  }

  if (!validateFn) {
    // fallback extremo (não deveria acontecer)
    const fallbackValidate = ajv.compile(schema);
    const ok = fallbackValidate(payload);
    if (ok) return [];
    const errors = fallbackValidate.errors ?? [];
    return errors.map((e) => ({
      code: "SCHEMA_INVALID",
      severity: "ERROR",
      message: `${e.instancePath || "/"} ${e.message}`,
      path: e.instancePath || "/",
      hint: e.params ? JSON.stringify(e.params) : undefined,
    }));
  }

  const ok = validateFn(payload);
  if (ok) return [];

  const errors = validateFn.errors ?? [];
  return errors.map((e: any) => ({
    code: "SCHEMA_INVALID",
    severity: "ERROR",
    message: `${e.instancePath || "/"} ${e.message}`,
    path: e.instancePath || "/",
    hint: e.params ? JSON.stringify(e.params) : undefined,
  }));
}

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

function norm(s: string): string {
  return (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

function deepCollectStrings(obj: any, max = 2000): string[] {
  const out: string[] = [];
  const stack: any[] = [obj];

  while (stack.length && out.length < max) {
    const cur = stack.pop();
    if (cur == null) continue;

    if (typeof cur === "string") out.push(cur);
    else if (Array.isArray(cur)) for (const it of cur) stack.push(it);
    else if (typeof cur === "object") for (const k of Object.keys(cur)) stack.push(cur[k]);
  }

  return out;
}

function hasForbiddenTerms(payload: any, bannedTerms: string[]): GuardrailIssue[] {
  if (!bannedTerms?.length) return [];

  const terms = bannedTerms.map(norm);
  const strings = deepCollectStrings(payload);
  const hits: { term: string; sample: string }[] = [];

  for (const s of strings) {
    const ns = norm(s);
    for (const t of terms) {
      if (t && ns.includes(t)) {
        hits.push({ term: t, sample: s.slice(0, 160) });
        if (hits.length >= 5) break;
      }
    }
    if (hits.length >= 5) break;
  }

  if (!hits.length) return [];

  return [
    {
      code: "FORBIDDEN_BRANDING",
      severity: "ERROR",
      message: `Conteúdo contém termos proibidos: ${hits.map((h) => h.term).join(", ")}`,
      hint: `Exemplos: ${hits.map((h) => `"${h.sample}"`).join(" | ")}`,
    },
  ];
}

function ensureTelemetry(solutionPack: any): GuardrailIssue[] {
  const telemetry = solutionPack?.telemetry;

  if (!telemetry) {
    return [
      {
        code: "MISSING_TELEMETRY",
        severity: "WARN",
        message: "Telemetria ausente (telemetry). Recomendado registrar modelRouting e tokenUsage.",
        hint: "Preencha solutionPack.telemetry = { modelRouting: {...}, tokenUsage: {...} }",
      },
    ];
  }

  const missing: string[] = [];
  if (!telemetry.modelRouting) missing.push("modelRouting");
  if (!telemetry.tokenUsage) missing.push("tokenUsage");

  if (!missing.length) return [];

  return [
    {
      code: "INCOMPLETE_TELEMETRY",
      severity: "WARN",
      message: `Telemetria incompleta: faltando ${missing.join(", ")}`,
    },
  ];
}

function ensureRecommendationInCatalog(
  solutionPack: any,
  allowed?: { ids?: string[]; slugs?: string[] },
  maxRecommended = 5
): GuardrailIssue[] {
  const rec = solutionPack?.recommendation;
  if (!rec) return [{ code: "MISSING_RECOMMENDATION", severity: "ERROR", message: "recommendation ausente" }];

  const ids: string[] = [];
  const slugs: string[] = [];

  const pushFrom = (v: any) => {
    if (!v) return;
    if (typeof v === "string") ids.push(v);

    if (Array.isArray(v)) {
      for (const it of v) {
        if (typeof it === "string") ids.push(it);
        else if (typeof it === "object" && it) {
          if (it.id) ids.push(String(it.id));
          if (it.slug) slugs.push(String(it.slug));
        }
      }
    }
  };

  pushFrom(rec.product_ids);
  pushFrom(rec.products);
  pushFrom(rec.productIds);
  pushFrom(rec.productSlugs);

  if ((!ids.length && !slugs.length) && Array.isArray(rec.candidates)) {
    for (const c of rec.candidates) {
      if (c?.product_id) ids.push(String(c.product_id));
      if (c?.slug) slugs.push(String(c.slug));
    }
  }

  const total = new Set([...ids, ...slugs]).size;
  const issues: GuardrailIssue[] = [];

  if (total > maxRecommended) {
    issues.push({
      code: "TOO_MANY_RECOMMENDATIONS",
      severity: "WARN",
      message: `Recomendação inclui muitos itens (${total}). Limite recomendado: ${maxRecommended}.`,
    });
  }

  if (!allowed || (!allowed.ids?.length && !allowed.slugs?.length)) return issues;

  const allowedIds = new Set((allowed.ids || []).map(String));
  const allowedSlugs = new Set((allowed.slugs || []).map(String));

  const unknownIds = ids.filter((x) => x && !allowedIds.has(String(x)));
  const unknownSlugs = slugs.filter((x) => x && !allowedSlugs.has(String(x)));

  if (unknownIds.length || unknownSlugs.length) {
    issues.push({
      code: "UNKNOWN_PRODUCT",
      severity: "ERROR",
      message: "Recomendação contém produto fora do catálogo permitido.",
      hint: `IDs desconhecidos: ${unknownIds.join(", ") || "-"} | Slugs desconhecidos: ${unknownSlugs.join(", ") || "-"}`,
    });
  }

  return issues;
}

function ensureDependencies(solutionPack: any): GuardrailIssue[] {
  const rec = solutionPack?.recommendation;
  if (!rec) return [];

  const required = rec.required_dependencies || rec.requiredDependencies;
  if (!required || !Array.isArray(required) || required.length === 0) return [];

  const chosen: string[] = [];
  const addChosen = (v: any) => {
    if (!v) return;
    if (typeof v === "string") chosen.push(v);
    if (Array.isArray(v)) {
      for (const it of v) {
        if (typeof it === "string") chosen.push(it);
        else if (it?.id) chosen.push(String(it.id));
        else if (it?.slug) chosen.push(String(it.slug));
      }
    }
  };

  addChosen(rec.product_ids);
  addChosen(rec.products);
  addChosen(rec.bundle);

  const chosenSet = new Set(chosen);

  const missing = required.filter((d: any) => {
    if (typeof d === "string") return !chosenSet.has(d);
    if (d?.id) return !chosenSet.has(String(d.id));
    if (d?.slug) return !chosenSet.has(String(d.slug));
    return false;
  });

  if (!missing.length) return [];

  return [
    {
      code: "MISSING_DEPENDENCY",
      severity: "ERROR",
      message: "Dependências comerciais obrigatórias não foram incluídas na recomendação.",
      hint: JSON.stringify(missing).slice(0, 400),
    },
  ];
}

function ensureDeckBasics(solutionPack: any): GuardrailIssue[] {
  const mkt = solutionPack?.marketing;
  if (!mkt) return [{ code: "MISSING_MARKETING", severity: "WARN", message: "marketing ausente (deck não gerado)" }];

  const slides = mkt.slide_contents || mkt.slideContents || mkt.slides;
  if (!Array.isArray(slides)) {
    return [{ code: "DECK_INVALID", severity: "WARN", message: "Deck sem slide_contents (array) — não é possível validar estrutura." }];
  }

  const n = slides.length;
  const issues: GuardrailIssue[] = [];

  if (n < 7 || n > 10) {
    issues.push({
      code: "DECK_SLIDE_COUNT",
      severity: "WARN",
      message: `Deck fora do range recomendado (7–10). Atual: ${n}.`,
    });
  }

  const has2 = slides.some((s: any) => s.slide === 2 || s.index === 2);
  const has3 = slides.some((s: any) => s.slide === 3 || s.index === 3);

  if (!has2 || !has3) {
    issues.push({
      code: "DECK_MISSING_KEY_SLIDES",
      severity: "WARN",
      message: "Deck não contém slide 2 (cenário atual) e/ou slide 3 (dores).",
      hint: "Obrigatório: slide 2 e 3 devem ser derivados da transcrição.",
    });
  }

  return issues;
}

function ensureERPBlockedWhenAValidar(solutionPack: any): GuardrailIssue[] {
  const erp = solutionPack?.exports?.erp;
  if (!erp) return [];

  const payloadStr = JSON.stringify(erp.payload ?? {});
  const hasAValidar = payloadStr.includes("A VALIDAR");

  if (hasAValidar && erp.blocked !== true) {
    return [
      {
        code: "ERP_SHOULD_BE_BLOCKED",
        severity: "ERROR",
        message: 'Export ERP contém campos "A VALIDAR" mas não está marcado como blocked=true.',
        hint: "Marque exports.erp.blocked=true e inclua blockedReasons.",
      },
    ];
  }

  return [];
}

// ─────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────

export function guardrailsPre(input: any, opts: GuardrailsOptions = {}): GuardrailsResult {
  const issues: GuardrailIssue[] = [];

  issues.push(...validateSchema("opportunity_context", input));
  issues.push(...hasForbiddenTerms(input, opts.bannedTerms || []));

  return { ok: !issues.some((i) => i.severity === "ERROR"), issues };
}

export function guardrailsPost(solutionPack: any, opts: GuardrailsOptions = {}): GuardrailsResult {
  const issues: GuardrailIssue[] = [];

  issues.push(...validateSchema("solution_pack", solutionPack));
  issues.push(...hasForbiddenTerms(solutionPack, opts.bannedTerms || []));

  issues.push(
    ...ensureRecommendationInCatalog(
      solutionPack,
      opts.allowedProducts,
      opts.maxRecommendedProducts ?? 5
    )
  );

  if (opts.enforceDependencies) {
    issues.push(...ensureDependencies(solutionPack));
  }

  issues.push(...ensureERPBlockedWhenAValidar(solutionPack));
  issues.push(...ensureDeckBasics(solutionPack));

  if (opts.requireTelemetry) {
    issues.push(...ensureTelemetry(solutionPack));
  }

  return { ok: !issues.some((i) => i.severity === "ERROR"), issues };
}

export function guardrailsRenderResult(renderResult: any): GuardrailsResult {
  const issues: GuardrailIssue[] = [];
  issues.push(...validateSchema("render_result", renderResult));
  return { ok: !issues.some((i) => i.severity === "ERROR"), issues };
}

export function formatGuardrailIssues(issues: GuardrailIssue[]): string {
  return issues
    .map(
      (i) =>
        `[${i.severity}] ${i.code}: ${i.message}` +
        (i.path ? ` @ ${i.path}` : "") +
        (i.hint ? ` | ${i.hint}` : "")
    )
    .join("\n");
}