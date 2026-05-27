import { NextRequest } from "next/server"
import { proxyApiRequest } from "@/lib/server-api"

export async function GET(request: NextRequest) {
  return proxyApiRequest(request, "/api/products")
}

export async function POST(request: NextRequest) {
  return proxyApiRequest(request, "/api/products", {
    method: "POST",
    body: await request.text(),
  })
}
