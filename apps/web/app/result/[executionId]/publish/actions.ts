"use server"

import { publishSolutionPack } from "@/lib/api"
import { SolutionPackV4 } from "@/lib/types"

export async function publishAction(
  executionId: string,
  opportunityId: string,
  solutionPack: SolutionPackV4
) {
  try {
    const result = await publishSolutionPack({
      executionId,
      opportunityId,
      solutionPack,
    })

    return result
  } catch (error) {
    throw new Error(
      error instanceof Error ? error.message : "Erro ao publicar no SharePoint"
    )
  }
}
