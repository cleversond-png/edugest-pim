"use server"

const API_BASE = process.env.API_BASE || "http://localhost:3000"

export async function gerarApresentacaoAction(formData: {
  nomeCliente: string
  perfilCliente: "ESCOLA_PEQUENA" | "ESCOLA_MEDIA" | "REDE_GRANDE"
  logoCliente: File | null
  dorCliente: string
  produtosAdicionais: string[]
  produtosRemovidos: string[]
  nomeComercial: string
  emailComercial: string
}) {
  // Converter File para base64
  let logoClienteBase64: string | undefined
  if (formData.logoCliente) {
    const buffer = await formData.logoCliente.arrayBuffer()
    logoClienteBase64 = Buffer.from(buffer).toString("base64")
  }

  const payload = {
    nomeCliente: formData.nomeCliente,
    perfilCliente: formData.perfilCliente,
    logoCliente: logoClienteBase64,
    dorCliente: formData.dorCliente || undefined,
    produtosAdicionais: formData.produtosAdicionais,
    produtosRemovidos: formData.produtosRemovidos,
    nomeComercial: formData.nomeComercial,
    emailComercial: formData.emailComercial,
  }

  const response = await fetch(`${API_BASE}/api/apresentacoes/gerar`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Api-Key": process.env.API_KEY || "",
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(
      error.message ||
        `Failed to generate presentation (status: ${response.status})`
    )
  }

  return response.json()
}
