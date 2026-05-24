/**
 * graph.ts — Microsoft Graph client for SharePoint integration
 */

import { Client } from '@microsoft/microsoft-graph-client'
import { ClientSecretCredential } from '@azure/identity'
import { logger } from '../utils/logger'

export interface GraphConfig {
  tenantId: string
  clientId: string
  clientSecret?: string
  siteId: string
  driveId: string
  username?: string
  password?: string
}

export class GraphClient {
  private client: Client | null = null
  private config: GraphConfig

  constructor(config: GraphConfig) {
    this.config = config
  }

  async initialize(): Promise<void> {
    try {
      // Suporte para ROPC (Resource Owner Password Credentials) - autenticação de usuário
      if (this.config.username && this.config.password) {
        this.client = Client.initWithMiddleware({
          authProvider: {
            getAccessToken: async () => {
              const tokenResponse = await fetch(`https://login.microsoftonline.com/${this.config.tenantId}/oauth2/v2.0/token`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({
                  client_id: this.config.clientId,
                  username: this.config.username!,
                  password: this.config.password!,
                  grant_type: 'password',
                  scope: 'https://graph.microsoft.com/.default',
                }),
              })
              const data = await tokenResponse.json() as any
              if (!data.access_token) throw new Error(`Token request failed: ${data.error_description}`)
              return data.access_token
            },
          },
        })
        logger.debug('Microsoft Graph client initialized (user credentials)')
      } else if (this.config.clientSecret) {
        // Fallback para ClientSecretCredential
        const credential = new ClientSecretCredential(
          this.config.tenantId,
          this.config.clientId,
          this.config.clientSecret
        )

        this.client = Client.initWithMiddleware({
          authProvider: {
            getAccessToken: async () => {
              const token = await credential.getToken('https://graph.microsoft.com/.default')
              return token.token
            },
          },
        })
        logger.debug('Microsoft Graph client initialized (service principal)')
      } else {
        throw new Error('Neither clientSecret nor username/password provided')
      }
    } catch (err: any) {
      logger.error({ error: err.message }, 'Failed to initialize Graph client')
      throw err
    }
  }

  async checkHealth(): Promise<boolean> {
    if (!this.client) {
      logger.warn('Graph client not initialized')
      return false
    }

    try {
      await this.client.api(`/sites/${this.config.siteId}`).get()
      return true
    } catch (err: any) {
      logger.error({ error: err.message }, 'Graph health check failed')
      return false
    }
  }

  async uploadFile(
    folderPath: string,
    fileName: string,
    content: string
  ): Promise<{ id: string; webUrl: string }> {
    if (!this.client) throw new Error('Graph client not initialized')

    try {
      const itemPath = `${folderPath}/${fileName}`
      const response = await this.client
        .api(`/drives/${this.config.driveId}/root:${itemPath}:/content`)
        .put(Buffer.from(content, 'utf-8'))

      logger.debug({ fileName, folderPath }, 'File uploaded to SharePoint')
      return {
        id: response.id,
        webUrl: response.webUrl,
      }
    } catch (err: any) {
      logger.error({ error: err.message, fileName, folderPath }, 'Failed to upload file')
      throw err
    }
  }

  async createFolder(folderPath: string): Promise<{ id: string }> {
    if (!this.client) throw new Error('Graph client not initialized')

    try {
      const parts = folderPath.split('/').filter(Boolean)
      let currentPath = ''

      for (const part of parts) {
        currentPath += `/${part}`
        try {
          // Check if folder exists
          await this.client
            .api(`/drives/${this.config.driveId}/root:${currentPath}`)
            .get()
        } catch (err: any) {
          if (err.status === 404) {
            // Create folder
            const parentPath = currentPath.substring(0, currentPath.lastIndexOf('/')) || '/'
            const response = await this.client
              .api(`/drives/${this.config.driveId}/root:${parentPath}:/children`)
              .post({
                name: part,
                folder: {},
                '@microsoft.graph.conflictBehavior': 'rename',
              })

            logger.debug({ folderPath: currentPath }, 'Folder created')
          } else {
            throw err
          }
        }
      }

      const finalItem = await this.client
        .api(`/drives/${this.config.driveId}/root:${currentPath}`)
        .get()

      return { id: finalItem.id }
    } catch (err: any) {
      logger.error({ error: err.message, folderPath }, 'Failed to create folder')
      throw err
    }
  }
}

// Singleton instance
let graphClientInstance: GraphClient | null = null

export async function initializeGraphClient(config: GraphConfig): Promise<GraphClient> {
  if (!graphClientInstance) {
    graphClientInstance = new GraphClient(config)
    await graphClientInstance.initialize()
  }
  return graphClientInstance
}

export function getGraphClient(): GraphClient {
  if (!graphClientInstance) {
    throw new Error('Graph client not initialized. Call initializeGraphClient first.')
  }
  return graphClientInstance
}
