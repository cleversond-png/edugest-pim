/**
 * orchestrator.test.ts — Unit tests for orchestrator wrapper service
 */

import { executeOrchestrator } from '../../src/services/orchestrator'
import { OrchestratorResult } from '@edugest-pim/core'

jest.mock('../../src/utils/logger', () => ({
  logger: {
    error: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
  },
}))

jest.mock('@edugest-pim/core', () => ({
  FallbackOrchestrator: jest.fn().mockImplementation(() => ({
    run: jest.fn(),
  })),
  stepRegistry: {},
  guardrailsPre: {},
  guardrailsPost: {},
}))

describe('Orchestrator Service — executeOrchestrator', () => {
  let mockOrchestrator: any

  beforeEach(() => {
    jest.clearAllMocks()
    const { FallbackOrchestrator } = require('@edugest-pim/core')
    mockOrchestrator = FallbackOrchestrator.mock.results[0]?.value
  })

  test('executes orchestrator with provided context', async () => {
    const { FallbackOrchestrator } = require('@edugest-pim/core')

    const mockRun = jest.fn().mockResolvedValueOnce({
      status: 'SUCCESS',
      steps: [
        {
          step: 'DiagnosisAgent',
          status: 'SUCCESS',
          durationMs: 100,
          attempts: 1,
        },
      ],
    })

    FallbackOrchestrator.mockImplementationOnce(() => ({
      run: mockRun,
    }))

    const context = {
      opportunityId: 'opp-001',
      transcript: { text: 'Test transcript' },
    }

    const result = await executeOrchestrator(context)

    expect(result.status).toBe('SUCCESS')
    expect(result.steps).toHaveLength(1)
  })

  test('returns PARTIAL_SUCCESS status from orchestrator', async () => {
    const { FallbackOrchestrator } = require('@edugest-pim/core')

    FallbackOrchestrator.mockImplementationOnce(() => ({
      run: jest.fn().mockResolvedValueOnce({
        status: 'PARTIAL_SUCCESS',
        steps: [
          {
            step: 'DiagnosisAgent',
            status: 'SUCCESS',
            durationMs: 50,
            attempts: 1,
          },
          {
            step: 'MatchingAgent',
            status: 'FAILED',
            durationMs: 100,
            attempts: 2,
            error: { code: 'TIMEOUT', message: 'Step timed out' },
          },
        ],
      }),
    }))

    const context = { opportunityId: 'opp-001' }
    const result = await executeOrchestrator(context)

    expect(result.status).toBe('PARTIAL_SUCCESS')
    expect(result.steps).toHaveLength(2)
  })

  test('handles orchestrator timeout with global timeout', async () => {
    const { FallbackOrchestrator } = require('@edugest-pim/core')

    FallbackOrchestrator.mockImplementationOnce(() => ({
      run: jest.fn().mockImplementationOnce(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  status: 'SUCCESS',
                  steps: [],
                }),
              5000
            )
          )
      ),
    }))

    const context = { opportunityId: 'opp-001' }
    const result = await executeOrchestrator(context, 100) // 100ms timeout

    // Should timeout and return FAILED
    expect(result.status).toBe('FAILED')
    expect(result.issues).toBeDefined()
    expect(result.issues).toHaveLength(1)
    expect(result.issues?.[0].code).toBe('ORCHESTRATOR_ERROR')
  })

  test('catches orchestrator errors and returns FAILED', async () => {
    const { FallbackOrchestrator } = require('@edugest-pim/core')

    FallbackOrchestrator.mockImplementationOnce(() => ({
      run: jest
        .fn()
        .mockRejectedValueOnce(new Error('Orchestrator execution failed')),
    }))

    const context = { opportunityId: 'opp-001' }
    const result = await executeOrchestrator(context)

    expect(result.status).toBe('FAILED')
    expect(result.steps).toEqual([])
    expect(result.issues).toBeDefined()
    expect(result.issues?.[0]).toEqual(
      expect.objectContaining({
        code: 'ORCHESTRATOR_ERROR',
        severity: 'ERROR',
        message: 'Orchestrator execution failed',
      })
    )
  })

  test('logs detailed step execution on success', async () => {
    const { logger } = require('../../src/utils/logger')
    const { FallbackOrchestrator } = require('@edugest-pim/core')

    FallbackOrchestrator.mockImplementationOnce(() => ({
      run: jest.fn().mockResolvedValueOnce({
        status: 'SUCCESS',
        steps: [
          {
            step: 'DiagnosisAgent',
            status: 'SUCCESS',
            durationMs: 100,
            attempts: 1,
          },
        ],
      }),
    }))

    const context = { opportunityId: 'opp-001' }
    await executeOrchestrator(context)

    expect(logger.debug).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'SUCCESS',
        steps: expect.arrayContaining([
          expect.objectContaining({
            step: 'DiagnosisAgent',
            status: 'SUCCESS',
          }),
        ]),
      }),
      'Orchestrator execution complete'
    )
  })

  test('logs error on orchestrator failure', async () => {
    const { logger } = require('../../src/utils/logger')
    const { FallbackOrchestrator } = require('@edugest-pim/core')

    FallbackOrchestrator.mockImplementationOnce(() => ({
      run: jest
        .fn()
        .mockRejectedValueOnce(new Error('Critical failure')),
    }))

    const context = { opportunityId: 'opp-001' }
    await executeOrchestrator(context)

    expect(logger.error).toHaveBeenCalledWith(
      expect.objectContaining({
        error: 'Critical failure',
      }),
      'Orchestrator failed'
    )
  })

  test('uses custom timeout when provided', async () => {
    const { FallbackOrchestrator } = require('@edugest-pim/core')

    let timeoutMs: number = 0
    FallbackOrchestrator.mockImplementationOnce(() => ({
      run: jest.fn().mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            setTimeout(() => {
              resolve({
                status: 'SUCCESS',
                steps: [],
              })
            }, 50)
          })
      ),
    }))

    const context = { opportunityId: 'opp-001' }
    const customTimeout = 150
    const result = await executeOrchestrator(context, customTimeout)

    // Should succeed because 50ms < 150ms timeout
    expect(result.status).toBe('SUCCESS')
  })

  test('returns steps array with execution details', async () => {
    const { FallbackOrchestrator } = require('@edugest-pim/core')

    FallbackOrchestrator.mockImplementationOnce(() => ({
      run: jest.fn().mockResolvedValueOnce({
        status: 'SUCCESS',
        steps: [
          {
            step: 'DiagnosisAgent',
            status: 'SUCCESS',
            durationMs: 50,
            attempts: 1,
            output: { pains: ['Pain 1'], objectives: ['Obj 1'] },
          },
          {
            step: 'MatchingAgent',
            status: 'SUCCESS',
            durationMs: 75,
            attempts: 1,
            output: { products: ['Product A'] },
          },
        ],
      }),
    }))

    const context = { opportunityId: 'opp-001' }
    const result = await executeOrchestrator(context)

    expect(result.steps).toHaveLength(2)
    expect(result.steps[0].step).toBe('DiagnosisAgent')
    expect(result.steps[0].durationMs).toBe(50)
    expect(result.steps[1].step).toBe('MatchingAgent')
  })

  test('handles missing error message gracefully', async () => {
    const { FallbackOrchestrator } = require('@edugest-pim/core')

    FallbackOrchestrator.mockImplementationOnce(() => ({
      run: jest.fn().mockRejectedValueOnce(new Error()),
    }))

    const context = { opportunityId: 'opp-001' }
    const result = await executeOrchestrator(context)

    expect(result.status).toBe('FAILED')
    expect(result.issues?.[0].message).toBe('Unknown orchestrator error')
  })
})
