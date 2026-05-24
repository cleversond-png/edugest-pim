import { logger } from '../utils/logger'
import { IPublisher, PublishedFile } from './publisher.interface'

export class SharePointPublisher implements IPublisher {
  private accessToken: string | null = null
  private tokenExpiry: number = 0
  private driveId: string
  private tenantId: string
  private clientId: string
  private clientSecret: string

  constructor(
    tenantId: string,
    clientId: string,
    clientSecret: string,
    driveId: string
  ) {
    this.tenantId = tenantId
    this.clientId = clientId
    this.clientSecret = clientSecret
    this.driveId = driveId
  }

  private async getAccessToken(): Promise<string> {
    // Return cached token if still valid
    if (this.accessToken && Date.now() < this.tokenExpiry) {
      return this.accessToken
    }

    const tokenUrl = `https://login.microsoftonline.com/${this.tenantId}/oauth2/v2.0/token`
    const body = new URLSearchParams({
      client_id: this.clientId,
      client_secret: this.clientSecret,
      grant_type: 'client_credentials',
      scope: 'https://graph.microsoft.com/.default',
    })

    try {
      const response = await fetch(tokenUrl, {
        method: 'POST',
        body: body.toString(),
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      })

      const data = (await response.json()) as any
      if (data.error) {
        throw new Error(`Token error: ${data.error_description}`)
      }

      this.accessToken = data.access_token as string
      this.tokenExpiry = Date.now() + (data.expires_in - 60) * 1000
      return this.accessToken
    } catch (err: any) {
      logger.error({ error: err.message }, 'Failed to get SharePoint access token')
      throw err
    }
  }

  async saveFile(folderPath: string, filename: string, content: string): Promise<PublishedFile> {
    try {
      const token = await this.getAccessToken()

      // First, ensure folder exists
      const folderName = folderPath.split('/').pop()
      if (folderName) {
        await this.ensureFolder(token, folderName)
      }

      // Get folder item ID
      const folderId = await this.getFolderId(token, folderName || '')

      // Upload file
      const uploadUrl = `https://graph.microsoft.com/v1.0/drives/${this.driveId}/items/${folderId}:/${filename}:/content`

      const uploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/octet-stream',
        },
        body: content,
      })

      if (!uploadResponse.ok) {
        throw new Error(`Upload failed: ${uploadResponse.statusText}`)
      }

      const fileData = (await uploadResponse.json()) as any
      const webUrl = fileData.webUrl

      logger.debug({ filename, folderPath, webUrl }, 'File uploaded to SharePoint')
      return { name: filename, path: webUrl }
    } catch (err: any) {
      logger.error({ filename, folderPath, error: err.message }, 'Failed to upload file to SharePoint')
      throw err
    }
  }

  private async ensureFolder(token: string, folderName: string): Promise<void> {
    try {
      const createUrl = `https://graph.microsoft.com/v1.0/drives/${this.driveId}/root/children`
      const response = await fetch(createUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: folderName,
          folder: {},
        }),
      })

      if (response.status === 409) {
        // Folder already exists
        return
      }

      if (!response.ok) {
        throw new Error(`Folder creation failed: ${response.statusText}`)
      }
    } catch (err: any) {
      logger.warn({ folderName, error: err.message }, 'Folder creation failed (may already exist)')
    }
  }

  private async getFolderId(token: string, folderName: string): Promise<string> {
    const listUrl = `https://graph.microsoft.com/v1.0/drives/${this.driveId}/root/children?$filter=name eq '${folderName}'`
    const response = await fetch(listUrl, {
      headers: { Authorization: `Bearer ${token}` },
    })

    const data = (await response.json()) as any
    if (data.value && data.value.length > 0) {
      return data.value[0].id
    }

    throw new Error(`Folder not found: ${folderName}`)
  }
}

export function createSharePointPublisher(): IPublisher {
  const tenantId = process.env.AZURE_TENANT_ID
  const clientId = process.env.AZURE_CLIENT_ID
  const clientSecret = process.env.AZURE_CLIENT_SECRET
  const driveId = process.env.SHAREPOINT_DRIVE_ID

  if (!tenantId || !clientId || !clientSecret || !driveId) {
    throw new Error('Missing required SharePoint configuration (AZURE_TENANT_ID, AZURE_CLIENT_ID, AZURE_CLIENT_SECRET, SHAREPOINT_DRIVE_ID)')
  }

  return new SharePointPublisher(tenantId, clientId, clientSecret, driveId)
}
