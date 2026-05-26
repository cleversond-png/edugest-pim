"use server"

import { SolutionPackV4 } from "@/lib/types"
import { publishSolutionPack } from "@/lib/api"

export async function publishAction(
  executionId: string,
  opportunityId: string,
  solutionPack: SolutionPackV4
) {
  const result = await publishSolutionPack({
    executionId,
    opportunityId,
    solutionPack,
  })

  return {
    success: true,
    webUrls: result.webUrls || {},
  }
}
