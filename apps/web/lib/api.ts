import { SolutionPackV4 } from "./types"

const API_URL = process.env.NEXT_PUBLIC_API_URL || process.env.API_URL || "http://localhost:3000"
const API_KEY = process.env.NEXT_PUBLIC_API_KEY || process.env.API_KEY || ""

export interface CrmPayload {
  [key: string]: string | number | boolean | null
}

export interface Constraints {
  [key: string]: string | number | boolean | null
}

export interface ClientBranding {
  clientName?: string
  color?: string
  [key: string]: string | undefined
}

export interface AnalyzeRequest {
  opportunityId: string
  transcript: {
    text: string
    language?: string
    source?: string
  }
  crmPayload?: CrmPayload
  constraints?: Constraints
  clientBranding?: ClientBranding
}

export interface AnalyzeResponse {
  success: boolean
  executionId: string
  solutionPack: SolutionPackV4
  telemetry?: {
    duration: number
    steps: number
  }
}

export interface PublishRequest {
  executionId: string
  opportunityId: string
  solutionPack: SolutionPackV4
}

export interface PublishResponse {
  success: boolean
  message: string
  webUrls?: {
    solutionPack: string
    erp_payload: string
    summary: string
    recommendation: string
  }
}

export async function analyzeTranscript(req: AnalyzeRequest): Promise<AnalyzeResponse> {
  const response = await fetch(`${API_URL}/api/analyze`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Api-Key": API_KEY,
    },
    body: JSON.stringify(req),
  })

  if (!response.ok) {
    throw new Error(`Analyze failed: ${response.statusText}`)
  }

  return response.json()
}

export async function publishSolutionPack(req: PublishRequest): Promise<PublishResponse> {
  const response = await fetch(`${API_URL}/api/publish`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Api-Key": API_KEY,
    },
    body: JSON.stringify(req),
  })

  if (!response.ok) {
    throw new Error(`Publish failed: ${response.statusText}`)
  }

  return response.json()
}
