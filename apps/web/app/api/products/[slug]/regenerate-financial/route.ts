import { NextRequest } from "next/server"
import { proxyApiRequest } from "@/lib/server-api"

type RouteContext = {
  params: Promise<{ slug: string }>
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { slug } = await context.params
  return proxyApiRequest(request, `/api/products/${encodeURIComponent(slug)}/regenerate-financial`, {
    method: "POST",
  })
}
