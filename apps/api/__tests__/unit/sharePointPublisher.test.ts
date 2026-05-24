/**
 * sharePointPublisher.test.ts — Unit tests for SharePointPublisher
 */

import { SharePointPublisher } from '../../src/services/sharePointPublisher'

jest.mock('../../src/utils/logger', () => ({
  logger: {
    error: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
  },
}))

global.fetch = jest.fn()

describe('SharePointPublisher — SharePoint file operations', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(global.fetch as jest.Mock).mockClear()
  })

  describe('constructor', () => {
    test('initializes publisher with config', () => {
      const publisher = new SharePointPublisher(
        'tenant-123',
        'client-123',
        'secret-123',
        'drive-123'
      )

      expect(publisher).toBeDefined()
    })
  })

  describe('getAccessToken', () => {
    test('retrieves and caches access token', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        json: jest.fn().mockResolvedValueOnce({
          access_token: 'token-123',
          expires_in: 3600,
        }),
      })

      const publisher = new SharePointPublisher(
        'tenant-123',
        'client-123',
        'secret-123',
        'drive-123'
      )

      // Access private method via any type
      const token = await (publisher as any).getAccessToken()

      expect(token).toBe('token-123')
      expect(global.fetch).toHaveBeenCalled()
    })

    test('returns cached token if still valid', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        json: jest.fn().mockResolvedValueOnce({
          access_token: 'token-123',
          expires_in: 3600,
        }),
      })

      const publisher = new SharePointPublisher(
        'tenant-123',
        'client-123',
        'secret-123',
        'drive-123'
      )

      // First call
      const token1 = await (publisher as any).getAccessToken()
      // Second call
      const token2 = await (publisher as any).getAccessToken()

      expect(token1).toBe(token2)
      // Fetch should only be called once
      expect(global.fetch).toHaveBeenCalledTimes(1)
    })

    test('handles token error response', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        json: jest.fn().mockResolvedValueOnce({
          error: 'invalid_client',
          error_description: 'Client authentication failed',
        }),
      })

      const publisher = new SharePointPublisher(
        'tenant-123',
        'client-123',
        'bad-secret',
        'drive-123'
      )

      await expect((publisher as any).getAccessToken()).rejects.toThrow('Token error:')
    })

    test('logs error on fetch failure', async () => {
      const { logger } = require('../../src/utils/logger')
      ;(global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'))

      const publisher = new SharePointPublisher(
        'tenant-123',
        'client-123',
        'secret-123',
        'drive-123'
      )

      try {
        await (publisher as any).getAccessToken()
      } catch (err) {
        // Expected
      }

      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Network error',
        }),
        'Failed to get SharePoint access token'
      )
    })
  })
})
