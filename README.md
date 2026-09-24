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
    pnpm db:seed              Ensure admin account and optional catalog fixtures exist
    pnpm docker:build         Build local production images
    pnpm docker:up            Build and start the Compose stack
    pnpm docker:down          Stop the Compose stack

Phase 2 adds the public catalog and administrator product management. Run `pnpm db:migrate` after PostgreSQL is available and configure the admin seed values in `.env`. Set `CATALOG_SEED_ENABLED=true` only for local development or CI to load the deterministic demo catalog; production should leave it disabled. Catalog images are stored as optimized WebP binaries in PostgreSQL and served from `/api/product-images/:id` through the same-origin web proxy.

Phase 3 adds authenticated carts, multi-draft quote requests, administrator quotations, quote revisions, and printable quote views. Cart and quotation mutations require an authenticated customer or administrator session and use the existing same-origin API proxy. Quote emails use the console outbox by default; configure `EMAIL_TRANSPORT=smtp` and the SMTP variables when a mail transport is available. Checkout, orders, inventory reservation, and payments remain deferred to Phase 4.

Health endpoints are GET /_health and GET /api/health. GET / preserves the
generated NestJS example.

Read docs/development/getting-started.md and
docs/phase-00-engineering-foundation.md before contributing.
