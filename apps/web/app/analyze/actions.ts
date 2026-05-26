"use server"

import { analyzeTranscript as apiAnalyzeTranscript } from "@/lib/api"
import { redirect } from "next/navigation"

export async function analyzeAction(
  transcriptText: string,
  clientName: string,
  colorScheme: string
) {
  try {
    const opportunityId = `opp-${Date.now()}`

    const result = await apiAnalyzeTranscript({
      opportunityId,
      transcript: {
        text: transcriptText,
        language: "pt-BR",
      },
      clientBranding: {
        clientName,
        colorScheme,
      },
    })

    // Encode solution pack and opportunity ID in base64 for URL param
    const dataPayload = {
      solutionPack: result.solutionPack,
      opportunityId,
    }
    const encoded = Buffer.from(JSON.stringify(dataPayload)).toString("base64")

    // Redirect to result page with data embedded
    redirect(`/result?id=${result.executionId}&data=${encoded}`)
  } catch (error) {
    throw new Error(
      error instanceof Error ? error.message : "Erro ao analisar transcrição"
    )
  }
}
