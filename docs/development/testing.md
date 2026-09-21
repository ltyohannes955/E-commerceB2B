# Testing and quality checks

Run the full local engineering check with:

```bash
pnpm check
```

This checks formatting, lint, TypeScript, unit tests, and production builds.
Run the individual checks with:

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test:unit
pnpm test:integration
pnpm test:e2e
pnpm build
```

The web app uses Vitest, jsdom, and Testing Library. The API uses Jest. The
current API integration and end-to-end suites exercise the generated HTTP
application; PostgreSQL starts in CI, but no database-backed logic exists
until Phase 1. Coverage reports are written under each app's `coverage/`
directory without a Phase 0 percentage threshold.

CI also checks dependency advisories, scans for committed secrets, builds and
tests the Docker Compose stack, and scans application images for high and
critical vulnerabilities.
