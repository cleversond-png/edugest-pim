/**
 * graph.test.ts — Unit tests for Microsoft Graph client
 */

import { GraphClient } from '../../src/services/graph'

jest.mock('../../src/utils/logger', () => ({
  logger: {
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
  },
}))

jest.mock('@microsoft/microsoft-graph-client', () => ({
  Client: {
    initWithMiddleware: jest.fn(() => ({
      api: jest.fn(),
    })),
  },
}))

jest.mock('@azure/identity', () => ({
  ClientSecretCredential: jest.fn(),
}))

describe('Graph Client — Microsoft Graph Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GraphClient initialization', () => {
    test('initializes with client secret credentials', async () => {
      const { Client } = require('@microsoft/microsoft-graph-client')
      const { ClientSecretCredential } = require('@azure/identity')

      ClientSecretCredential.mockImplementationOnce(() => ({
        getToken: jest.fn().mockResolvedValueOnce({
          token: 'mock-secret-token',
        }),
      }))

      const config = {
        tenantId: 'tenant-123',
        clientId: 'client-123',
        clientSecret: 'secret-123',
        siteId: 'site-123',
        driveId: 'drive-123',
      }

      const client = new GraphClient(config)
      await client.initialize()

      expect(Client.initWithMiddleware).toHaveBeenCalled()
      expect(ClientSecretCredential).toHaveBeenCalledWith('tenant-123', 'client-123', 'secret-123')
    })

    test('throws error when no credentials provided', async () => {
      const config = {
        tenantId: 'tenant-123',
        clientId: 'client-123',
        siteId: 'site-123',
        driveId: 'drive-123',
      }

      const client = new GraphClient(config)

      await expect(client.initialize()).rejects.toThrow('Neither clientSecret nor username/password provided')
    })
  })

  describe('checkHealth', () => {
    test('returns true when site accessible', async () => {
      const { Client } = require('@microsoft/microsoft-graph-client')
      const mockApiCall = jest.fn().mockResolvedValueOnce({ id: 'site-123' })

      Client.initWithMiddleware.mockReturnValueOnce({
        api: jest.fn(() => ({
          get: mockApiCall,
        })),
      })

      const config = {
        tenantId: 'tenant-123',
        clientId: 'client-123',
        clientSecret: 'secret-123',
        siteId: 'site-123',
        driveId: 'drive-123',
      }

      const { ClientSecretCredential } = require('@azure/identity')
      ClientSecretCredential.mockImplementationOnce(() => ({
        getToken: jest.fn().mockResolvedValueOnce({
          token: 'mock-token',
        }),
      }))

      const client = new GraphClient(config)
      await client.initialize()
      const health = await client.checkHealth()

      expect(health).toBe(true)
    })

    test('returns false when client not initialized', async () => {
      const config = {
        tenantId: 'tenant-123',
        clientId: 'client-123',
        siteId: 'site-123',
        driveId: 'drive-123',
      }

      const client = new GraphClient(config)
      const health = await client.checkHealth()

      expect(health).toBe(false)
    })

    test('returns false on API error', async () => {
      const { Client } = require('@microsoft/microsoft-graph-client')
      const mockApiCall = jest.fn().mockRejectedValueOnce(new Error('API error'))

      Client.initWithMiddleware.mockReturnValueOnce({
        api: jest.fn(() => ({
          get: mockApiCall,
        })),
      })

      const config = {
        tenantId: 'tenant-123',
        clientId: 'client-123',
        clientSecret: 'secret-123',
        siteId: 'site-123',
        driveId: 'drive-123',
      }

      const { ClientSecretCredential } = require('@azure/identity')
      ClientSecretCredential.mockImplementationOnce(() => ({
        getToken: jest.fn().mockResolvedValueOnce({
          token: 'mock-token',
        }),
      }))

      const client = new GraphClient(config)
      await client.initialize()
      const health = await client.checkHealth()

      expect(health).toBe(false)
    })
  })

  describe('uploadFile', () => {
    test('uploads file and returns id and webUrl', async () => {
      const { Client } = require('@microsoft/microsoft-graph-client')
      const mockPut = jest.fn().mockResolvedValueOnce({
        id: 'file-123',
        webUrl: 'https://sharepoint.com/file',
      })

      Client.initWithMiddleware.mockReturnValueOnce({
        api: jest.fn(() => ({
          put: mockPut,
        })),
      })

      const config = {
        tenantId: 'tenant-123',
        clientId: 'client-123',
        clientSecret: 'secret-123',
        siteId: 'site-123',
        driveId: 'drive-123',
      }

      const { ClientSecretCredential } = require('@azure/identity')
      ClientSecretCredential.mockImplementationOnce(() => ({
        getToken: jest.fn().mockResolvedValueOnce({
          token: 'mock-token',
        }),
      }))

      const client = new GraphClient(config)
      await client.initialize()
      const result = await client.uploadFile('Folder', 'file.txt', 'content')

      expect(result).toEqual({
        id: 'file-123',
        webUrl: 'https://sharepoint.com/file',
      })
    })

    test('throws error when client not initialized', async () => {
      const config = {
        tenantId: 'tenant-123',
        clientId: 'client-123',
        siteId: 'site-123',
        driveId: 'drive-123',
      }

      const client = new GraphClient(config)

      await expect(client.uploadFile('Folder', 'file.txt', 'content')).rejects.toThrow('Graph client not initialized')
    })

    test('logs error on upload failure', async () => {
      const { logger } = require('../../src/utils/logger')
      const { Client } = require('@microsoft/microsoft-graph-client')
      const mockPut = jest.fn().mockRejectedValueOnce(new Error('Upload failed'))

      Client.initWithMiddleware.mockReturnValueOnce({
        api: jest.fn(() => ({
          put: mockPut,
        })),
      })

      const config = {
        tenantId: 'tenant-123',
        clientId: 'client-123',
        clientSecret: 'secret-123',
        siteId: 'site-123',
        driveId: 'drive-123',
      }

      const { ClientSecretCredential } = require('@azure/identity')
      ClientSecretCredential.mockImplementationOnce(() => ({
        getToken: jest.fn().mockResolvedValueOnce({
          token: 'mock-token',
        }),
      }))

      const client = new GraphClient(config)
      await client.initialize()

      await expect(client.uploadFile('Folder', 'file.txt', 'content')).rejects.toThrow('Upload failed')
      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Upload failed',
          fileName: 'file.txt',
          folderPath: 'Folder',
        }),
        expect.stringContaining('Failed to upload')
      )
    })
  })
})
