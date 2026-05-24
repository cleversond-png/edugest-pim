/**
 * validators.test.ts — Unit tests for schema validators
 */

import { validateOpportunityContext, validateSolutionPack, formatValidationErrors } from '../../src/schemas/validators'

describe('Schema Validators — Input/output validation', () => {
  describe('validateOpportunityContext', () => {
    test('returns true for valid opportunity context', () => {
      const validContext = {
        opportunityId: 'opp-001',
        transcript: {
          text: 'Customer needs intranet integration',
        },
      }

      const result = validateOpportunityContext(validContext)
      expect(result).toBe(true)
    })

    test('returns false for missing opportunityId', () => {
      const invalidContext = {
        transcript: {
          text: 'Customer needs intranet',
        },
      }

      const result = validateOpportunityContext(invalidContext)
      expect(result).toBe(false)
    })

    test('returns false for missing transcript', () => {
      const invalidContext = {
        opportunityId: 'opp-001',
      }

      const result = validateOpportunityContext(invalidContext)
      expect(result).toBe(false)
    })

    test('returns false for empty transcript text', () => {
      const invalidContext = {
        opportunityId: 'opp-001',
        transcript: {
          text: '',
        },
      }

      const result = validateOpportunityContext(invalidContext)
      expect(result).toBe(false)
    })

    test('returns false for null transcript', () => {
      const invalidContext = {
        opportunityId: 'opp-001',
        transcript: null,
      }

      const result = validateOpportunityContext(invalidContext)
      expect(result).toBe(false)
    })
  })

  describe('validateSolutionPack', () => {
    test('returns true for valid SolutionPackV4', () => {
      const validPack = {
        executionId: 'exec-001',
        opportunityId: 'opp-001',
        status: 'PARTIAL_SUCCESS',
        durationMs: 100,
        createdAt: '2026-05-24T19:00:00Z',
        diagnosis: {
          pains: ['Pain 1'],
          objectives: ['Obj 1'],
          constraints: [],
          complexity: 'ALTA',
        },
        recommendation: {
          business: {
            products: [{
              product_id: 'prod-123',
              name: 'Intranet',
              erp_code: 'SP001',
              group_code: 'GRP001',
              group_name: 'Intranet',
              pm_type: 'Serviço',
              contract_model: 'Pontual',
              billing_model: 'Pontual',
              dependency_type: 'Nenhuma',
            }],
            required_dependencies: [],
          },
          intelligence: { score: 0.85, candidates: [] },
          strategy: { summary: 'Test', justification: 'Test' },
        },
        presales: { architecture: 'Test', risks: [] },
        sales: { pitch: 'Test', objections: [] },
        marketing: { slide_contents: [] },
        exports: {
          erp: {
            blocked: false,
            blockedReasons: [],
            payload: null,
          },
          partner: { payload: { items: [], generatedAt: '2026-05-24T19:00:00Z' } },
        },
        telemetry: { modelRouting: {}, tokenUsage: { total: { input: 0, output: 0 } } },
      }

      const result = validateSolutionPack(validPack as any)
      expect(result).toBe(true)
    })

    test('returns false for missing executionId', () => {
      const invalidPack = {
        opportunityId: 'opp-001',
        status: 'SUCCESS',
      }

      const result = validateSolutionPack(invalidPack)
      expect(result).toBe(false)
    })

    test('returns false for missing diagnosis', () => {
      const invalidPack = {
        executionId: 'exec-001',
        opportunityId: 'opp-001',
        status: 'SUCCESS',
        recommendation: {},
      }

      const result = validateSolutionPack(invalidPack)
      expect(result).toBe(false)
    })

    test('returns false for invalid status', () => {
      const invalidPack = {
        executionId: 'exec-001',
        opportunityId: 'opp-001',
        status: 'INVALID_STATUS',
        diagnosis: {},
      }

      const result = validateSolutionPack(invalidPack)
      expect(result).toBe(false)
    })
  })

  describe('formatValidationErrors', () => {
    test('returns formatted error array for multiple errors', () => {
      const errors = [
        { instancePath: '/opportunityId', keyword: 'required' },
        { instancePath: '/transcript', keyword: 'type' },
      ]

      const formatted = formatValidationErrors(errors as any)

      expect(Array.isArray(formatted)).toBe(true)
      expect(formatted.length).toBeGreaterThan(0)
    })

    test('returns empty array for no errors', () => {
      const errors: any[] = []

      const formatted = formatValidationErrors(errors)

      expect(formatted).toEqual([])
    })

    test('includes field in formatted error', () => {
      const errors = [{ instancePath: '/diagnosis/pains', keyword: 'type' }]

      const formatted = formatValidationErrors(errors as any)

      expect(formatted.some((e) => e.field === '/diagnosis/pains')).toBe(true)
    })
  })
})
