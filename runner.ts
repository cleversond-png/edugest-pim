import { FallbackOrchestrator } from "./fallback-orchestrator";
import { stepRegistry } from "./stepRegistry.example";

async function main() {

  const orchestrator = new FallbackOrchestrator(
    {
      maxRetries: 2,
      baseBackoffMs: 300,
      timeoutMs: 30000,

      modelAliases: {
        DiagnosisAgent: "FAST_TEXT",
        MatchingAgent: "REASONING",
        MarketingDeckAgent: "WRITER",
        ERPSankhyaMapperAgent: "JSON_STRICT",
      },

      fallbackModelAliases: {
        MatchingAgent: "REASONING",
      },

      enablePostGuardrailRecovery: true,
    },
    stepRegistry,
    {
      bannedTerms: ["bigbrain"],
      enforceDependencies: true,
      requireTelemetry: false,
    }
  );

  // ✅ ALTERE AQUI PARA TESTAR CENÁRIOS
  const result = await orchestrator.run({
    opportunityContext: {
      opportunityId: "test-001",
      transcript: {
        text: "Cliente quer implementar uma intranet no SharePoint integrada ao sistema acadêmico com dashboards"
      }
    },

    // ✅ IMPORTANTE: liberar todos os produtos usados no Matching
    allowedProducts: {
      ids: [
        "integrador-provisionador",
        "agenda-inteligente",
        "relatorios-inteligentes",
        "centro-operacoes",
        "nucleo-experiencia",
        "portal-institucional-sharepoint",
        "intranet-sharepoint",
        "formacao-microsoft",
        "suporte-m365",
        "consultoria-especializada",
        "booking-horas",
        "licenciamento-m365-a1",
        "licenciamento-m365-a3",
        "licenciamento-m365-a5",
        "copilot-m365"
      ]
    }
  });

  // ✅ saída formatada bonita
  console.log("\n======== RESULTADO FINAL ========\n");
  console.log(JSON.stringify(result, null, 2));
  console.log("\n================================\n");
}

main();