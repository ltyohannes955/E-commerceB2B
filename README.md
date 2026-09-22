# E-commerce Platform

Local pnpm monorepo for the E-commerce platform.

## Applications

- apps/web: Next.js frontend
- apps/api: NestJS backend

## Requirements

- Node.js 22
- pnpm 11.19.0
- Docker Desktop for database and container workflows

## Getting started

Install dependencies and start both apps:

    pnpm install --frozen-lockfile
    pnpm dev

The frontend runs on http://localhost:3000 and the API runs on
http://localhost:3001. Start PostgreSQL with Docker Compose when needed:

    docker compose up -d postgres

Start the full production-like Compose stack with:

    docker compose up --build --wait

## Commands

    pnpm dev                  Run web and API
    pnpm dev:web              Run only the frontend
    pnpm dev:api              Run only the backend
    pnpm build                Build both applications
    pnpm lint                 Lint both applications
    pnpm typecheck            Type-check both applications
    pnpm format               Format supported repository files
    pnpm format:check         Check repository formatting
    pnpm test:unit            Run frontend and backend unit tests with coverage
    pnpm test:integration     Run API integration and end-to-end tests
    pnpm test:e2e             Run Playwright browser smoke tests
    pnpm check                Run formatting, lint, type, unit, and build checks
    pnpm db:generate          Generate the Prisma client
    pnpm db:migrate           Apply local Prisma migrations
    pnpm db:seed              Ensure the configured admin account exists
    pnpm docker:build         Build local production images
    pnpm docker:up            Build and start the Compose stack
    pnpm docker:down          Stop the Compose stack

Phase 1 adds basic customer signup/login, account security, and an admin customer directory. Run `pnpm db:migrate` after PostgreSQL is available and configure the admin seed values in `.env`.

Health endpoints are GET /_health and GET /api/health. GET / preserves the
generated NestJS example.

Read docs/development/getting-started.md and
docs/phase-00-engineering-foundation.md before contributing.
