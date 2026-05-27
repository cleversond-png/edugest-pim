import { NextRequest } from "next/server"
import { proxyApiRequest } from "@/lib/server-api"

export async function POST(request: NextRequest) {
  return proxyApiRequest(request, "/api/apresentacoes/gerar", {
    method: "POST",
    body: await request.text(),
  })
}
