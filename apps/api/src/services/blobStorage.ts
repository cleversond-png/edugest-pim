/**
 * blobStorage.ts — Azure Blob Storage publisher (substitui SharePoint/Graph)
 *
 * Os documentos gerados (docs de produto + apresentações) são armazenados em um
 * container privado. Os links retornados são URLs SAS de leitura (assinadas).
 */

import { BlobServiceClient, BlobSASPermissions, BlockBlobClient } from '@azure/storage-blob'
import { logger } from '../utils/logger'

const SAS_VALIDITY_DAYS = 365

function getContainerName(): string {
  return process.env.AZURE_STORAGE_CONTAINER || 'pim-docs'
}

function getContainerClient() {
  const conn = process.env.AZURE_STORAGE_CONNECTION_STRING
  if (!conn) {
    throw new Error('AZURE_STORAGE_CONNECTION_STRING not set')
  }
  const service = BlobServiceClient.fromConnectionString(conn)
  return service.getContainerClient(getContainerName())
}

function contentTypeFor(fileName: string): string {
  if (fileName.endsWith('.md')) return 'text/markdown; charset=utf-8'
  if (fileName.endsWith('.html')) return 'text/html; charset=utf-8'
  if (fileName.endsWith('.json')) return 'application/json; charset=utf-8'
  if (fileName.endsWith('.pptx'))
    return 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  return 'application/octet-stream'
}

async function sasUrl(blob: BlockBlobClient): Promise<string> {
  const expiresOn = new Date(Date.now() + SAS_VALIDITY_DAYS * 24 * 60 * 60 * 1000)
  return blob.generateSasUrl({
    permissions: BlobSASPermissions.parse('r'),
    expiresOn,
  })
}

async function uploadText(blobPath: string, content: string): Promise<BlockBlobClient> {
  const blob = getContainerClient().getBlockBlobClient(blobPath)
  await blob.upload(content, Buffer.byteLength(content, 'utf-8'), {
    blobHTTPHeaders: { blobContentType: contentTypeFor(blobPath) },
  })
  return blob
}

async function uploadBinary(blobPath: string, buffer: Buffer): Promise<BlockBlobClient> {
  const blob = getContainerClient().getBlockBlobClient(blobPath)
  await blob.uploadData(buffer, {
    blobHTTPHeaders: { blobContentType: contentTypeFor(blobPath) },
  })
  return blob
}

/**
 * Publica os documentos de um produto no Blob Storage.
 * Mantém a mesma assinatura da versão SharePoint (graph.ts).
 * Retorna o prefixo (container/slug) onde os arquivos foram gravados.
 */
export async function publishProductDocuments(
  productSlug: string,
  files: Array<{ name: string; content: string; folder: string }>
): Promise<string> {
  try {
    for (const file of files) {
      const blobPath = file.folder
        ? `${productSlug}/${file.folder}/${file.name}`
        : `${productSlug}/${file.name}`
      await uploadText(blobPath, file.content)
      logger.info({ blobPath }, 'Product document published to Blob Storage')
    }
    return `${getContainerName()}/${productSlug}`
  } catch (error: any) {
    logger.error({ error: error.message, productSlug }, 'Failed to publish product documents to Blob')
    throw error
  }
}

/**
 * Publica uma apresentação (.pptx) e retorna a URL SAS de leitura.
 */
export async function uploadPresentation(fileName: string, buffer: Buffer): Promise<string> {
  const blob = await uploadBinary(`_apresentacoes/${fileName}`, buffer)
  const url = await sasUrl(blob)
  logger.info({ fileName }, 'Presentation published to Blob Storage')
  return url
}

export async function checkBlobHealth(): Promise<boolean> {
  try {
    await getContainerClient().getProperties()
    return true
  } catch (err: any) {
    logger.error({ error: err.message }, 'Blob Storage health check failed')
    return false
  }
}
