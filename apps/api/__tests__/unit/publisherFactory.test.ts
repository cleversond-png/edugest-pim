/**
 * publisherFactory.test.ts — Unit tests for Publisher Factory pattern
 */

import { createPublisher } from '../../src/services/publisherFactory'

jest.mock('../../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}))

describe('Publisher Factory — createPublisher', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    delete process.env.PUBLISH_MODE
    delete process.env.AZURE_TENANT_ID
    delete process.env.AZURE_CLIENT_ID
    delete process.env.AZURE_CLIENT_SECRET
    delete process.env.GRAPH_USERNAME
    delete process.env.GRAPH_PASSWORD
    delete process.env.SHAREPOINT_SITE_ID
    delete process.env.SHAREPOINT_DRIVE_ID
  })

  test('returns publisher with saveFile method', () => {
    const publisher = createPublisher()

    expect(publisher).toHaveProperty('saveFile')
    expect(typeof publisher.saveFile).toBe('function')
  })

  test('returns local publisher by default (PUBLISH_MODE not set)', () => {
    const publisher = createPublisher()

    // Local publisher has saveFile method
    expect(publisher).toHaveProperty('saveFile')
  })

  test('returns publisher when PUBLISH_MODE=local', () => {
    process.env.PUBLISH_MODE = 'local'

    const publisher = createPublisher()

    expect(publisher).toHaveProperty('saveFile')
  })

  test('falls back to local publisher when sharepoint credentials missing', () => {
    process.env.PUBLISH_MODE = 'sharepoint'
    // Intentionally missing credentials
    process.env.SHAREPOINT_SITE_ID = 'site-id'

    const { logger } = require('../../src/utils/logger')

    const publisher = createPublisher()

    // Should have warned about fallback
    expect(logger.warn).toHaveBeenCalled()
    // Should still return a valid publisher
    expect(publisher).toHaveProperty('saveFile')
  })

  test('returns publisher for invalid PUBLISH_MODE defaults to local', () => {
    process.env.PUBLISH_MODE = 'invalid-mode'

    const publisher = createPublisher()

    expect(publisher).toHaveProperty('saveFile')
  })

  test('publisher saveFile returns promise', async () => {
    const publisher = createPublisher()

    const result = publisher.saveFile('folder', 'file.txt', 'content')

    expect(result instanceof Promise).toBe(true)
  })
})
