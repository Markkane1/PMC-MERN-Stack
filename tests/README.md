# Testing Suite - Phase 3

Complete testing infrastructure for PMC MERN Stack project with unit, integration, and E2E tests.

## Folder Structure

```
tests/
├── unit/               # Unit tests for components and utilities
├── integration/        # API integration and feature tests
├── e2e/               # End-to-end tests with Cypress
├── fixtures/          # Mock data and test fixtures
├── utils/             # Test utilities and helpers
├── setup.ts           # Vitest configuration and setup
├── vitest.config.ts   # Vitest configuration
├── cypress.config.ts  # Cypress configuration
└── tsconfig.json      # TypeScript configuration for tests
```

## Testing Frameworks

- **Vitest**: Unit and integration testing (Jest-compatible)
- **React Testing Library**: Component testing
- **Cypress**: End-to-end testing

## Running Tests

### Unit Tests

```bash
# Run all unit tests
npm run test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm run test -- unit/PaymentDashboard.test.tsx
```

### Integration Tests

```bash
# Run integration tests
npm run test:integration

# Run specific integration test
npm run test -- integration/api.integration.test.ts
```

### E2E Tests

```bash
# Run all E2E tests headless
npm run test:e2e

# Run E2E tests in browser (interactive)
npm run test:e2e:open

# Run specific E2E test
npx cypress run --spec "tests/e2e/features.cy.ts"
```

## Test Coverage

- **Unit Tests**: Components, utilities, hooks
- **Integration Tests**: API endpoints, feature interactions
- **E2E Tests**: User workflows, navigation, form submission

Target coverage: 70% statements, 60% branches, 70% functions, 70% lines

## Writing Tests

### Unit Test Example

```typescript
import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import PaymentDashboard from '@/views/PaymentDashboard'

describe('PaymentDashboard', () => {
    test('should render payment status', () => {
        render(
            <BrowserRouter>
                <PaymentDashboard />
            </BrowserRouter>
        )
        expect(screen.getByText(/Payment/i)).toBeInTheDocument()
    })
})
```

### Integration Test Example

```typescript
describe('Payment API', () => {
    it('should fetch payment status', async () => {
        const response = await fetch('/api/payment/status/123')
        const data = await response.json()
        expect(data.success).toBe(true)
    })
})
```

### E2E Test Example

```typescript
describe('Payment Dashboard Flow', () => {
    it('should navigate and display payment info', () => {
        cy.login('user@example.com', 'password')
        cy.visit('/payment')
        cy.get('[data-testid=payment-status]').should('be.visible')
    })
})
```

## Test Utilities

### Mock Data

Located in `fixtures/mockData.ts`:
- `testUsers` - Test user credentials
- `mockPaymentResponse` - Payment data
- `mockApplicationResponse` - Application data
- `mockNotificationsResponse` - Notification data
- `mockLocationsResponse` - Location data
- `mockAnalyticsResponse` - Analytics data

### Test Helpers

Located in `utils/testUtils.ts`:
- `renderWithProviders()` - Render with Router
- `setupMockFetch()` - Mock fetch API
- `createMockUser()` - Create user object
- `generateTestData` - Generate random test data
- `testSelectors` - Common test selectors

## Custom Cypress Commands

```typescript
// Login
cy.login('user@example.com', 'password')

// Logout
cy.logout()

// Fill application form
cy.fillApplicationForm()

// Wait for API
cy.waitForAPI('/api/payment')

// Check notification
cy.checkNotification('Success message')
```

## Debugging Tests

### Vitest Debug Mode

```bash
node --inspect-brk ./node_modules/vitest/vitest.mjs run
```

### Cypress Debug

```bash
npm run test:e2e:open
# Use Cypress UI to inspect and debug tests
```

### VSCode Debug

Add to `.vscode/launch.json`:
```json
{
    "type": "node",
    "request": "launch",
    "name": "Debug Tests",
    "program": "${workspaceFolder}/node_modules/vitest/vitest.mjs",
    "args": ["run", "--inspect-brk"],
    "console": "integratedTerminal"
}
```

## CI/CD Integration

Tests are automatically run on:
- Pull requests
- Commits to main branch
- Pre-deployment checks

See `.github/workflows/test.yml` for CI configuration.

## Best Practices

1. **Test Organization**: Group related tests in describe blocks
2. **Naming**: Use clear, descriptive test names
3. **Setup/Teardown**: Use beforeEach/afterEach for cleanup
4. **Mocking**: Use fixtures for consistent test data
5. **Selectors**: Use data-testid for reliable element selection
6. **Assertions**: Use clear, specific assertions
7. **Async**: Handle async/await properly in tests
8. **Isolation**: Tests should be independent

## Common Issues

### Tests timeout
- Increase timeout in vitest.config.ts or cypress.config.ts
- Check for missing await/async

### Mock not working
- Ensure vi.mock() is at top of file
- Clear mocks with vi.clearAllMocks()

### Flaky tests
- Add proper waits with waitFor()
- Avoid brittle selectors
- Use data-testid instead of complex queries

## Performance

- Unit tests: ~2-3 seconds
- Integration tests: ~5-10 seconds
- E2E tests: ~30-60 seconds (depending on test count)

## Contributing

When adding new features:
1. Write tests first (TDD approach)
2. Ensure 70%+ coverage
3. Add integration tests for API changes
4. Add E2E tests for user workflows
5. Update this README if adding new test types
