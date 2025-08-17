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
- [Vitest](https://vitest.dev/) - Unit testing framework with TypeScript support
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/) - Testing utilities for React components
- [Playwright](https://playwright.dev/) - End-to-end testing across browsers
- [Supertest](https://github.com/ladjs/supertest) - HTTP assertion library for API testing
- [k6](https://k6.io/) - Performance and load testing

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
- `npm run test:unit` - Run unit tests with Vitest
- `npm run test:integration` - Run integration tests
- `npm run test:e2e` - Run end-to-end tests with Playwright
- `npm run test:coverage` - Generate test coverage report
- `npm run test:watch` - Run tests in watch mode

## Project Structure

```md
.
├── src/
│   ├── layouts/    # Astro layouts
│   ├── pages/      # Astro pages
│   │   └── api/    # API endpoints
│   ├── components/ # UI components (Astro & React)
│   └── assets/     # Static assets
├── public/         # Public assets
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

## Contributing

Please follow the AI guidelines and coding practices defined in the AI configuration files when contributing to this project.

## License

MIT
