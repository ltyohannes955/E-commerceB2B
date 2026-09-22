# Testing and quality checks

Run the full local engineering check with:

```bash
pnpm check
```

This checks formatting, lint, TypeScript, unit tests, and production builds. Run the individual checks with:

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test:unit
pnpm test:integration
pnpm test:e2e
pnpm build
```

The web app uses Vitest, jsdom, Testing Library, and Playwright with Chromium desktop/mobile emulation. The API uses Jest. Database-backed Phase 1 verification requires PostgreSQL and the committed Prisma migration. Coverage reports are written under each app's `coverage/` directory without a percentage threshold.

CI also checks dependency advisories, scans for committed secrets, runs the PostgreSQL-backed API integration suite, builds both applications, and runs browser smoke tests. Docker image scanning is intentionally not part of CI.
