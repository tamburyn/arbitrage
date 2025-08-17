# Testing Guide

This document provides comprehensive information about the testing setup and best practices for the Arbitrage application.

## Overview

Our testing strategy includes:
- **Unit Tests** - Using Vitest and React Testing Library
- **Integration Tests** - Using Supertest for API testing
- **End-to-End Tests** - Using Playwright
- **Performance Tests** - Using k6 (to be implemented)

## Technology Stack

### Unit Testing
- **Vitest** - Fast unit test framework with TypeScript support
- **React Testing Library** - Testing utilities for React components
- **jsdom** - DOM environment for testing

### E2E Testing
- **Playwright** - Cross-browser testing framework
- **Chromium** - Primary browser for testing

### API Testing
- **Supertest** - HTTP assertion library

## Project Structure

```
arbitrage/
├── tests/                      # Global test utilities and setup
│   ├── setup.ts               # Vitest global setup
│   └── api.test.ts            # API integration tests
├── src/
│   ├── components/__tests__/   # Component unit tests
│   ├── lib/__tests__/         # Library function tests
│   └── services/__tests__/    # Service layer tests
├── e2e/                       # End-to-end tests
│   ├── utils/                 # E2E test utilities
│   ├── auth.spec.ts          # Authentication flow tests
│   └── dashboard.spec.ts     # Dashboard functionality tests
├── vitest.config.ts          # Vitest configuration
└── playwright.config.ts     # Playwright configuration
```

## Running Tests

### Unit Tests
```bash
# Run all unit tests
npm run test:unit

# Run tests in watch mode
npm run test:unit:watch

# Run tests with UI
npm run test:unit:ui

# Generate coverage report
npm run test:coverage
```

### E2E Tests
```bash
# Run all E2E tests
npm run test:e2e

# Run E2E tests with UI
npm run test:e2e:ui

# Run E2E tests in headed mode (visible browser)
npm run test:e2e:headed

# Debug E2E tests
npm run test:e2e:debug

# Show test report
npm run test:e2e:report
```

### All Tests
```bash
# Run all tests
npm run test:all

# Run CI test suite
npm run test:ci
```

## Writing Tests

### Unit Tests

#### Component Testing
```typescript
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from '../Button';

describe('Button Component', () => {
  it('should render button with text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument();
  });

  it('should handle click events', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    
    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
```

#### Service Testing
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ArbitrageEngine } from '../arbitrage-engine';

vi.mock('../../../db/supabase.client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      // ... other mocked methods
    })),
  },
}));

describe('ArbitrageEngine', () => {
  let arbitrageEngine: ArbitrageEngine;

  beforeEach(() => {
    arbitrageEngine = new ArbitrageEngine();
    vi.clearAllMocks();
  });

  it('should calculate spread correctly', () => {
    const spread = arbitrageEngine.calculateSpread(50000, 50200);
    expect(spread).toBeCloseTo(0.4, 2);
  });
});
```

### E2E Tests

#### Using Page Object Model
```typescript
import { test, expect } from '@playwright/test';
import { AuthHelper } from './utils/test-helpers';

test('should login successfully', async ({ page }) => {
  const authHelper = new AuthHelper(page);
  
  await authHelper.login('test@example.com', 'password123');
  
  await expect(page).toHaveURL('/dashboard');
  await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
});
```

#### API Testing in E2E
```typescript
test('should handle API responses', async ({ page }) => {
  // Mock API response
  await page.route('**/api/arbitrage-opportunities', route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: mockOpportunities })
    });
  });

  await page.goto('/dashboard');
  await expect(page.locator('[data-testid="arbitrage-table"]')).toBeVisible();
});
```

## Test Data

### Mock Data Factories
Use the `TestDataFactory` for consistent test data:

```typescript
import { TestDataFactory } from './utils/test-helpers';

const mockUser = TestDataFactory.createUser({
  email: 'custom@example.com'
});

const mockOrderbook = TestDataFactory.createOrderbook({
  exchange_id: 'binance',
  asset_id: 'BTC'
});
```

### Global Test Utilities
Available via `global.testUtils`:

```typescript
// In tests
const mockOrderbook = global.testUtils.createMockOrderbook();
const mockUser = global.testUtils.createMockUser();
```

## Best Practices

### Unit Tests
1. **Follow AAA Pattern** - Arrange, Act, Assert
2. **One assertion per test** - Keep tests focused
3. **Mock external dependencies** - Use `vi.mock()` for isolation
4. **Use descriptive test names** - Explain what is being tested
5. **Test edge cases** - Include error conditions and boundary values

### E2E Tests
1. **Use data-testid attributes** - For reliable element selection
2. **Page Object Model** - Encapsulate page interactions
3. **Clean test data** - Use beforeEach/afterEach for setup/cleanup
4. **Test user journeys** - Focus on real user workflows
5. **Handle async operations** - Use proper waits and expectations

### General Guidelines
1. **Independent tests** - Each test should run in isolation
2. **Fast feedback** - Keep tests quick and reliable
3. **Meaningful assertions** - Test behavior, not implementation
4. **Readable tests** - Tests serve as documentation
5. **Continuous maintenance** - Update tests with code changes

## CI/CD Integration

Tests run automatically on:
- **Push to main/develop** - Full test suite
- **Pull requests** - Full test suite
- **Manual triggers** - Individual test types

### GitHub Actions Workflow
1. **Lint** - Code quality checks
2. **Unit Tests** - With coverage reporting
3. **Integration Tests** - API endpoint testing
4. **E2E Tests** - Full user journey testing
5. **Build** - Production build verification

## Coverage Requirements

- **Minimum 70%** line coverage for all modules
- **80%+ coverage** for critical business logic
- **100% coverage** for utility functions

## Debugging Tests

### Unit Tests
```bash
# Run specific test file
npm run test:unit -- utils.test.ts

# Run tests matching pattern
npm run test:unit -- --reporter=verbose --grep="Button"

# Debug with UI
npm run test:unit:ui
```

### E2E Tests
```bash
# Debug specific test
npm run test:e2e:debug -- auth.spec.ts

# Run with trace
npx playwright test --trace on

# Open trace viewer
npx playwright show-trace trace.zip
```

## Common Issues and Solutions

### Vitest Issues
- **Mock not working** - Ensure mocks are at top level
- **Import errors** - Check alias configuration in vitest.config.ts
- **Async tests failing** - Use proper async/await patterns

### Playwright Issues
- **Element not found** - Use proper waiting strategies
- **Test timeout** - Increase timeout for slow operations
- **Browser crashes** - Check memory usage and dependencies

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Playwright Documentation](https://playwright.dev/)
- [Supertest Documentation](https://github.com/ladjs/supertest)
