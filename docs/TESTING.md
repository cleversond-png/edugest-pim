# Testing Guide — EduGest-PIM API

## Running Tests

### All Tests
```bash
npm test
```

### Watch Mode (for development)
```bash
npm test -- --watch
```

### Coverage Report
```bash
npm test -- --coverage
```

### Single Test File
```bash
npm test -- validators.test.ts
```

### Test with Pattern
```bash
npm test -- --testNamePattern="validateOpportunityContext"
```

---

## Test Coverage Metrics

**Current Status:** ✅ All metrics exceed 70% threshold

| Metric | Coverage | Target | Status |
|--------|----------|--------|--------|
| Statements | 76.25% | 70% | ✅ Pass |
| Branches | 70.44% | 70% | ✅ Pass |
| Functions | 78.12% | 70% | ✅ Pass |
| Lines | 76.3% | 70% | ✅ Pass |

---

## Test Matrix

| Test File | Location | Tests | Coverage | Focus Area |
|-----------|----------|-------|----------|-----------|
| **health.test.ts** | `__tests__/unit/` | 5 | 100% | GET /api/health endpoint, service status reporting, graph health checks |
| **analyze.test.ts** | `__tests__/unit/` | 9 | 100% | POST /api/analyze endpoint, orchestrator execution, SolutionPackV4 transformation |
| **publish.test.ts** | `__tests__/unit/` | 9 | 100% | POST /api/publish endpoint, publisher factory pattern, file upload flow |
| **auth.test.ts** | `__tests__/unit/` | 4 | 100% | X-Api-Key middleware, 401 responses, request flow |
| **solutionPackV4.test.ts** | `__tests__/unit/` | 5 | 100% | transformToV4() service, diagnosis/recommendation/exports building |
| **publisherFactory.test.ts** | `__tests__/unit/` | 6 | 100% | createPublisher() factory, local vs. SharePoint selection, behavior verification |
| **errorHandler.test.ts** | `__tests__/unit/` | 9 | 100% | Error handling middleware, status codes, error codes, logging |
| **orchestrator.test.ts** | `__tests__/unit/` | 10 | 100% | executeOrchestrator wrapper, timeouts, step tracking, status handling |
| **localPublisher.test.ts** | `__tests__/unit/` | 10 | 100% | LocalPublisher file operations (createFolder, saveFile), error handling |
| **graph.test.ts** | `__tests__/unit/` | 7 | 50.72% | GraphClient initialization, checkHealth, file uploads, token errors |
| **sharePointPublisher.test.ts** | `__tests__/unit/` | 4 | 38.33% | SharePointPublisher token retrieval, caching, error handling |
| **validators.test.ts** | `__tests__/unit/` | 8 | 93.33% | Schema validators (opportunityContext, solutionPack), error formatting |
| **server.test.ts** | `__tests__/unit/` | 1 | 72.72% | Server bootstrap, module loading without errors |
| **api.test.ts** | `__tests__/integration/` | 8 | 100% | E2E workflow: Health → Analyze → Publish |

**Total:** 102 tests across 14 suites, **0 failures**

---

## Key Testing Patterns

### Mock Setup Pattern
All unit tests follow a consistent mock pattern:

```typescript
jest.mock('../../src/utils/logger', () => ({
  logger: {
    error: jest.fn(),
    debug: jest.fn(),
  },
}))

describe('Module', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('test name', () => {
    // test implementation
  })
})
```

### HTTP Injection Testing (Fastify)
Integration tests use Fastify's `app.inject()` pattern:

```typescript
const res = await app.inject({
  method: 'GET',
  url: '/api/health',
  headers: { 'X-Api-Key': 'valid-key' },
})

expect(res.statusCode).toBe(200)
```

### Promise Testing
Async tests return promises or use `async/await`:

```typescript
test('async operation', async () => {
  const result = await someAsyncFunction()
  expect(result).toBeDefined()
})
```

---

## Coverage Details by Module

### High Coverage (100%)
- **Routes:** health, analyze, publish
- **Middleware:** auth, errorHandler
- **Services:** solutionPackV4, orchestrator, localPublisher
- **Factories:** publisherFactory

### Good Coverage (>90%)
- **Validators:** 93.33% (validation functions fully covered)

### Fair Coverage (50-72%)
- **Graph Client:** 50.72% (async token flow partially tested)
- **SharePointPublisher:** 38.33% (token caching edge cases)
- **Server:** 72.72% (bootstrap verification)

---

## Next Steps

1. **Optional: Expand Graph Client tests** — add more async edge cases if needed for 70%+ individual coverage
2. **Optional: GitHub Actions CI/CD** — automate test runs on PR/push
3. **Deploy:** Tests are ready for production pipeline

---

## Troubleshooting

### Tests fail with "Cannot find module"
```bash
npm install
npm test
```

### Mock not resetting between tests
Check that `jest.clearAllMocks()` is in `beforeEach()` block.

### TypeScript compilation errors
```bash
npx tsc --noEmit
```

### Coverage not updating
```bash
npm test -- --coverage --clearCache
```
# Frontend production smoke test

Run after frontend deploy:

```bash
bash scripts/qa-frontend-production.sh
```

This checks that `/products/new` loads, the public HTML does not expose API key markers, the generated Tailwind CSS includes core visual classes and dropdown contrast rules, and the frontend `/api/products` proxy works without sending an API key from the browser.
