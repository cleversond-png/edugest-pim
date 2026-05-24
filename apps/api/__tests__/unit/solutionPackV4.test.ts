/**
 * solutionPackV4.test.ts — Unit tests for SolutionPackV4 transformation
 */

import { transformToV4 } from '../../src/services/solutionPackV4'
import { OrchestratorResult } from '@edugest-pim/core'

jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-execution-id-12345'),
}))

describe('SolutionPackV4 Transformation — transformToV4', () => {
  let mockTimer: () => number

  beforeEach(() => {
    mockTimer = jest.fn(() => 250)
  })

  test('returns SolutionPackV4 with executionId and opportunityId', () => {
    const mockResult: OrchestratorResult = {
      status: 'PARTIAL_SUCCESS',
      steps: [],
    }

    const result = transformToV4(mockResult, 'opp-001', mockTimer)

    expect(result.executionId).toBe('mock-execution-id-12345')
    expect(result.opportunityId).toBe('opp-001')
    expect(result.status).toBe('PARTIAL_SUCCESS')
    expect(result.durationMs).toBe(250)
  })

  test('builds diagnosis with pains, objectives, constraints', () => {
    const mockResult: OrchestratorResult = {
      status: 'PARTIAL_SUCCESS',
      steps: [
        {
          step: 'DiagnosisAgent',
          status: 'SUCCESS',
          durationMs: 100,
          attempts: 1,
          output: {
            pains: ['Pain 1', 'Pain 2'],
            objectives: ['Obj 1', 'Obj 2'],
            constraints: ['Constraint 1'],
            complexity: 'ALTA',
          },
        },
      ],
    }

    const result = transformToV4(mockResult, 'opp-001', mockTimer)

    expect(result.diagnosis).toBeDefined()
    expect(result.diagnosis.pains).toEqual(['Pain 1', 'Pain 2'])
    expect(result.diagnosis.objectives).toEqual(['Obj 1', 'Obj 2'])
    expect(result.diagnosis.constraints).toEqual(['Constraint 1'])
    expect(result.diagnosis.complexity).toBe('ALTA')
  })

  test('builds recommendation with products and intelligence score', () => {
    const mockResult: OrchestratorResult = {
      status: 'PARTIAL_SUCCESS',
      steps: [
        {
          step: 'MatchingAgent',
          status: 'SUCCESS',
          durationMs: 100,
          attempts: 1,
          output: {
            confidence: 0.85,
            products: [
              { name: 'Product A', erp_code: 'PA001', product_id: 'prod-a' },
            ],
            required_dependencies: ['Dependency 1'],
            justification: 'This is the best solution',
          },
        },
      ],
    }

    const result = transformToV4(mockResult, 'opp-001', mockTimer)

    expect(result.recommendation).toBeDefined()
    expect(result.recommendation.business.products).toHaveLength(1)
    expect(result.recommendation.business.products[0].name).toBe('Product A')
    expect(result.recommendation.business.required_dependencies).toEqual(['Dependency 1'])
    expect(result.recommendation.intelligence.score).toBe(0.85)
  })

  test('includes errors when steps fail', () => {
    const mockResult: OrchestratorResult = {
      status: 'FAILED',
      steps: [
        {
          step: 'DiagnosisAgent',
          status: 'FAILED',
          durationMs: 100,
          attempts: 2,
          error: { code: 'TIMEOUT', message: 'Step timed out' },
        },
      ],
    }

    const result = transformToV4(mockResult, 'opp-001', mockTimer)

    expect(result.errors).toBeDefined()
    expect(result.errors).toHaveLength(1)
    if (result.errors) {
      expect(result.errors[0].step).toBe('DiagnosisAgent')
      expect(result.errors[0].code).toBe('TIMEOUT')
      expect(result.errors[0].attempts).toBe(2)
    }
  })

  test('createdAt is ISO string', () => {
    const mockResult: OrchestratorResult = {
      status: 'PARTIAL_SUCCESS',
      steps: [],
    }

    const result = transformToV4(mockResult, 'opp-001', mockTimer)

    expect(result.createdAt).toBeDefined()
    expect(typeof result.createdAt).toBe('string')
    expect(new Date(result.createdAt)).toBeInstanceOf(Date)
  })
})
