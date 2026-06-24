/**
 * apresentacoes.ts — Presentation generation endpoints
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import Ajv from 'ajv'
import { gerarApresentacao, ApresentacaoInput } from '../services/pptxGenerator'
import { uploadPresentation } from '../services/blobStorage'
import { logger } from '../utils/logger'

const ajv = new Ajv()

const apresentacaoInputSchema = {
  type: 'object',
  properties: {
    nomeCliente: { type: 'string', minLength: 1, maxLength: 200 },
    perfilCliente: { enum: ['ESCOLA_PEQUENA', 'ESCOLA_MEDIA', 'REDE_GRANDE'] },
    logoCliente: { type: 'string', nullable: true },
    dorCliente: { type: 'string', nullable: true },
    produtosAdicionais: { type: 'array', items: { type: 'string' }, nullable: true },
    produtosRemovidos: { type: 'array', items: { type: 'string' }, nullable: true },
    nomeComercial: { type: 'string', nullable: true },
    emailComercial: { type: 'string', nullable: true }
  },
  required: ['nomeCliente', 'perfilCliente'],
  additionalProperties: false
}

const validateInput = ajv.compile(apresentacaoInputSchema)

// In-memory store for generated presentations (for download links)
const apresentacoesStore = new Map<string, Buffer>()

export async function registerApresentacoesRoute(app: FastifyInstance) {
  // POST /api/apresentacoes/gerar
  app.post<{ Body: ApresentacaoInput }>('/api/apresentacoes/gerar', async (req: FastifyRequest<{ Body: ApresentacaoInput }>, res: FastifyReply) => {
    try {
      const body = req.body as ApresentacaoInput

      if (!validateInput(body)) {
        return res.status(400).send({
          errorCode: 'VALIDATION_ERROR',
          message: 'Invalid input',
          details: validateInput.errors
        })
      }

      logger.info({ nomeCliente: body.nomeCliente, perfilCliente: body.perfilCliente }, 'Generating presentation')

      const { buffer, response } = await gerarApresentacao(body)

      // Store buffer for download
      apresentacoesStore.set(response.nomeArquivo, buffer)

      return res.status(200).send(response)
    } catch (err: any) {
      logger.error({ error: err.message, stack: err.stack }, 'Failed to generate presentation')
      return res.status(500).send({
        errorCode: 'GENERATION_FAILED',
        message: 'Failed to generate presentation',
        details: err.message
      })
    }
  })

  // GET /api/apresentacoes/download/:fileName
  app.get<{ Params: { fileName: string } }>('/api/apresentacoes/download/:fileName', async (req: FastifyRequest<{ Params: { fileName: string } }>, res: FastifyReply) => {
    try {
      const { fileName } = req.params as { fileName: string }
      const buffer = apresentacoesStore.get(fileName)

      if (!buffer) {
        return res.status(404).send({
          errorCode: 'NOT_FOUND',
          message: 'Presentation not found'
        })
      }

      res.type('application/vnd.openxmlformats-officedocument.presentationml.presentation')
      res.header('Content-Disposition', `attachment; filename="${fileName}"`)
      return res.send(buffer)
    } catch (err: any) {
      logger.error({ error: err.message }, 'Failed to download presentation')
      return res.status(500).send({
        errorCode: 'DOWNLOAD_FAILED',
        message: 'Failed to download presentation'
      })
    }
  })

  // POST /api/apresentacoes/gerar-e-publicar
  app.post<{ Body: ApresentacaoInput }>('/api/apresentacoes/gerar-e-publicar', async (req: FastifyRequest<{ Body: ApresentacaoInput }>, res: FastifyReply) => {
    try {
      const body = req.body as ApresentacaoInput

      if (!validateInput(body)) {
        return res.status(400).send({
          errorCode: 'VALIDATION_ERROR',
          message: 'Invalid input',
          details: validateInput.errors
        })
      }

      logger.info({ nomeCliente: body.nomeCliente }, 'Generating and publishing presentation')

      const { buffer, response } = await gerarApresentacao(body)

      // Upload to Blob Storage
      try {
        const downloadUrl = await uploadPresentation(response.nomeArquivo, buffer)

        logger.info({ downloadUrl }, 'Presentation published to Blob Storage')

        return res.status(200).send({
          ...response,
          downloadUrl
        })
      } catch (storageErr: any) {
        logger.warn({ error: storageErr.message }, 'Failed to upload to Blob Storage, but PPTX was generated')

        // Still return success with warning
        return res.status(200).send({
          ...response,
          status: 'PARTIAL_SUCCESS',
          avisos: [...response.avisos, {
            produto: 'STORAGE',
            tipo: 'UPLOAD_FAILED',
            mensagem: 'Apresentação gerada mas falhou upload ao Blob Storage'
          }]
        })
      }
    } catch (err: any) {
      logger.error({ error: err.message }, 'Failed to generate and publish presentation')
      return res.status(500).send({
        errorCode: 'GENERATION_FAILED',
        message: 'Failed to generate presentation',
        details: err.message
      })
    }
  })
}
