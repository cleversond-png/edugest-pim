/**
 * validators.ts — AJV schema validators (compiled at startup)
 */

import Ajv from 'ajv'
import addFormats from 'ajv-formats'
import opportunityContextSchema from './opportunity_context.schema.json'
import solutionPackSchema from './solution_pack.schema.json'

const ajv = new Ajv({
  allErrors: true,
  strict: false,
  allowUnionTypes: true,
})

addFormats(ajv)

const validateOpportunityContext = ajv.compile(opportunityContextSchema)
const validateSolutionPack = ajv.compile(solutionPackSchema)

export { validateOpportunityContext, validateSolutionPack }

export function formatValidationErrors(errors: any[] | undefined): Array<{ field: string; issue: string }> {
  if (!errors) return []
  return errors.map((err) => ({
    field: err.instancePath || '/',
    issue: err.message || 'Unknown error',
  }))
}
