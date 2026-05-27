import { NextRequest, NextResponse } from "next/server"

const API_URL = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"

export async function proxyApiRequest(
  request: NextRequest,
  path: string,
  init?: RequestInit
) {
  const apiKey = process.env.API_KEY

  if (!apiKey) {
    return NextResponse.json(
      {
        errorCode: "SERVER_CONFIG_ERROR",
        message: "API_KEY not configured on frontend server",
      },
      { status: 500 }
    )
  }

  const url = new URL(path, API_URL)
  request.nextUrl.searchParams.forEach((value, key) => {
    url.searchParams.set(key, value)
  })

  const headers = new Headers(init?.headers)
  headers.set("X-Api-Key", apiKey)

  const contentType = request.headers.get("content-type")
  if (contentType && !headers.has("Content-Type")) {
    headers.set("Content-Type", contentType)
  }

  const response = await fetch(url, {
    ...init,
    headers,
    cache: "no-store",
  })

  const body = await response.arrayBuffer()
  const responseHeaders = new Headers()
  const responseType = response.headers.get("content-type")

  if (responseType) {
    responseHeaders.set("content-type", responseType)
  }

  return new NextResponse(body, {
    status: response.status,
    statusText: response.statusText,
    headers: responseHeaders,
  })
}
