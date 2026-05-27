import { NextRequest } from "next/server"
import { proxyApiRequest } from "@/lib/server-api"

type RouteContext = {
  params: Promise<{ slug: string }>
}

export async function GET(request: NextRequest, context: RouteContext) {
  const { slug } = await context.params
  return proxyApiRequest(request, `/api/products/${encodeURIComponent(slug)}`)
}

export async function PUT(request: NextRequest, context: RouteContext) {
  const { slug } = await context.params
  return proxyApiRequest(request, `/api/products/${encodeURIComponent(slug)}`, {
    method: "PUT",
    body: await request.text(),
  })
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const { slug } = await context.params
  return proxyApiRequest(request, `/api/products/${encodeURIComponent(slug)}`, {
    method: "DELETE",
  })
}
