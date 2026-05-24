/**
 * server.test.ts — Unit tests for server bootstrap
 */

describe('Server Bootstrap — Integration with routes and middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.resetModules()

    // Clear environment variables
    delete process.env.PORT
    delete process.env.HOST
    delete process.env.API_KEY
    delete process.env.AZURE_TENANT_ID
    delete process.env.AZURE_CLIENT_ID
    delete process.env.AZURE_CLIENT_SECRET
    delete process.env.SHAREPOINT_SITE_ID
    delete process.env.SHAREPOINT_DRIVE_ID
    delete process.env.GRAPH_USERNAME
    delete process.env.GRAPH_PASSWORD
  })

  afterEach(() => {
    jest.resetModules()
  })

  test('server module loads without error', () => {
    // Mock Fastify to prevent actual server startup
    jest.mock('fastify', () => {
      return jest.fn(() => ({
        setErrorHandler: jest.fn(),
        register: jest.fn(),
        listen: jest.fn().mockResolvedValue(undefined),
        close: jest.fn().mockResolvedValue(undefined),
      }))
    })

    jest.mock('../../src/utils/logger', () => ({
      logger: {
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
        debug: jest.fn(),
      },
    }))

    jest.mock('../../src/routes/health', () => ({
      registerHealthRoute: jest.fn(),
    }))

    jest.mock('../../src/routes/analyze', () => ({
      registerAnalyzeRoute: jest.fn(),
    }))

    jest.mock('../../src/routes/publish', () => ({
      registerPublishRoute: jest.fn(),
    }))

    jest.mock('../../src/services/graph', () => ({
      initializeGraphClient: jest.fn(),
      getGraphClient: jest.fn(),
    }))

    // This test verifies server.ts can be required without errors
    expect(() => {
      require('../../src/server')
    }).not.toThrow()
  })
})
