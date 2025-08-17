# 10x Astro Starter

A modern, opinionated starter template for building fast, accessible, and AI-friendly web applications.

## Tech Stack

### Core Technologies
- [Astro](https://astro.build/) v5.5.5 - Modern web framework for building fast, content-focused websites
- [React](https://react.dev/) v19.0.0 - UI library for building interactive components
- [TypeScript](https://www.typescriptlang.org/) v5 - Type-safe JavaScript
- [Tailwind CSS](https://tailwindcss.com/) v4.0.17 - Utility-first CSS framework

### Backend & Database
- [Supabase](https://supabase.com/) - Backend-as-a-Service with PostgreSQL database
- [Node.js](https://nodejs.org/) - Server-side runtime for data collection services

### Testing Framework
- [Vitest](https://vitest.dev/) v3.2.4 - Fast unit testing framework with TypeScript support
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/) - Testing utilities for React components
- [Playwright](https://playwright.dev/) - Cross-browser end-to-end testing
- [Supertest](https://github.com/ladjs/supertest) - HTTP assertion library for API testing
- [jsdom](https://github.com/jsdom/jsdom) - DOM environment for unit testing
- Coverage reporting with c8/v8 provider

## Prerequisites

- Node.js v22.14.0 (as specified in `.nvmrc`)
- npm (comes with Node.js)

## Getting Started

1. Clone the repository:

```bash
git clone https://github.com/przeprogramowani/10x-astro-starter.git
cd 10x-astro-starter
```

2. Install dependencies:

```bash
npm install
```

3. Run the development server:

```bash
npm run dev
```

4. Build for production:

```bash
npm run build
```

## Available Scripts

### Development
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint issues

### Testing
- `npm run test` - Run tests in watch mode (development)
- `npm run test:unit` - Run all unit tests once
- `npm run test:unit:watch` - Run unit tests in watch mode
- `npm run test:unit:ui` - Run unit tests with Vitest UI
- `npm run test:coverage` - Generate test coverage report
- `npm run test:e2e` - Run end-to-end tests with Playwright
- `npm run test:e2e:ui` - Run E2E tests with Playwright UI
- `npm run test:e2e:debug` - Debug E2E tests step by step
- `npm run test:e2e:headed` - Run E2E tests in headed mode (visible browser)
- `npm run test:e2e:report` - Show detailed E2E test report
- `npm run test:all` - Run all tests (unit + E2E)
- `npm run test:ci` - Run complete test suite for CI/CD

## Project Structure

```md
arbitrage/
├── src/
│   ├── layouts/              # Astro layouts
│   ├── pages/                # Astro pages & API routes
│   │   └── api/              # API endpoints
│   ├── components/           # UI components (Astro & React)
│   │   └── __tests__/        # Component unit tests
│   ├── lib/                  # Utility libraries
│   │   └── __tests__/        # Library unit tests
│   ├── services/             # Business logic services
│   │   └── __tests__/        # Service unit tests
│   └── constants/            # Application constants
├── tests/                    # Global test configuration
│   └── setup.ts              # Vitest global setup
├── e2e/                      # End-to-end tests
│   ├── utils/                # E2E test utilities and helpers
│   ├── auth.spec.ts          # Authentication flow tests
│   └── dashboard.spec.ts     # Dashboard functionality tests
├── docs/                     # Documentation
│   ├── testing-guide.md      # Comprehensive testing guide
│   └── github-workflows.md   # GitHub Actions documentation
├── .github/workflows/        # CI/CD workflows
│   ├── test.yml              # Main testing pipeline
│   ├── pull-request.yml      # PR validation with comments
│   └── publish-data.yml      # Data collection and publishing
├── vitest.config.ts          # Vitest configuration
├── playwright.config.ts      # Playwright configuration
└── public/                   # Public assets
```

## AI Development Support

This project is configured with AI development tools to enhance the development experience, providing guidelines for:

- Project structure
- Coding practices
- Frontend development
- Styling with Tailwind
- Accessibility best practices
- Astro and React guidelines

### Cursor IDE

The project includes AI rules in `.cursor/rules/` directory that help Cursor IDE understand the project structure and provide better code suggestions.

### GitHub Copilot

AI instructions for GitHub Copilot are available in `.github/copilot-instructions.md`

### Windsurf

The `.windsurfrules` file contains AI configuration for Windsurf.

## Testing Environment

This project includes a comprehensive testing setup with multiple testing strategies:

### Unit Testing (Vitest)
- **Framework**: Vitest with jsdom environment
- **React Components**: React Testing Library for component testing
- **Mocking**: Built-in vi mocking capabilities
- **Coverage**: v8 provider with 70% minimum coverage threshold
- **Configuration**: `vitest.config.ts` with TypeScript path aliases

### End-to-End Testing (Playwright)
- **Browser**: Chromium/Chrome for reliable testing
- **Page Object Model**: Organized test helpers in `e2e/utils/`
- **Visual Testing**: Screenshot comparison capabilities
- **API Testing**: HTTP request interception and testing
- **Configuration**: `playwright.config.ts` with CI optimizations

### Test Organization
- **Unit Tests**: Located alongside source files in `__tests__/` directories
- **Integration Tests**: API and service integration testing
- **E2E Tests**: Complete user journey testing in `e2e/` directory
- **Test Utilities**: Reusable helpers and mock data factories

### CI/CD Integration
- **GitHub Actions**: Multiple automated workflows for different scenarios
- **PR Validation**: Fast feedback with automated status comments
- **Parallel Execution**: Unit and E2E tests run in parallel for speed
- **Coverage Reports**: Automated coverage reporting with Codecov
- **Artifact Storage**: Test results and reports archived
- **Data Publication**: Automated market data collection and publishing
- **Multi-stage Pipeline**: Lint → Unit Tests → E2E Tests → Build

### Getting Started with Testing

1. **Run all tests**: `npm run test:all`
2. **Development workflow**: `npm run test:unit:watch`
3. **Debug E2E tests**: `npm run test:e2e:debug`
4. **View coverage**: `npm run test:coverage`
5. **Test documentation**: See `docs/testing-guide.md`

### Test Coverage Goals
- **Minimum**: 70% line coverage across all modules
- **Critical Logic**: 80%+ coverage for business logic
- **Utilities**: 100% coverage for utility functions

## Contributing

Please follow the AI guidelines, coding practices, and testing requirements defined in the configuration files when contributing to this project. All code changes should include appropriate tests and maintain the coverage thresholds.

## License

MIT
