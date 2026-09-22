# Phase 0 — Repository, Docker, CI, and PR Workflow

## Goal

Establish a reliable engineering workflow before business functionality is developed. Every phase is implemented on a separate branch, reviewed through a pull request, and verified automatically before merging into `main`.

Phase 0 prepares deployable Docker images but does not deploy the application.

## 1. Branching workflow

`main` must remain stable. Phase branches use:

```text
phase/01-authentication
phase/02-catalog
phase/03-cart-rfq
phase/04-orders-payments
```

Smaller units of work may use `feature/*` or `fix/*` branches.

Workflow:

1. Create a branch from the latest `main`.
2. Implement one defined unit of work.
3. Run local checks.
4. Push the branch.
5. Open a pull request into `main`.
6. Wait for required checks.
7. Review code and test results.
8. Squash merge.
9. Delete the merged branch.

Direct pushes to `main` are disabled.

## 2. Pull request structure

Every pull request includes a summary, related phase, changes, database and environment changes, security considerations, tests, screenshots for UI changes, manual verification steps, and known limitations.

Add:

```text
.github/
├── workflows/
│   └── ci.yml
├── pull_request_template.md
└── dependabot.yml
```

## 3. Required PR checks

### `quality`

- Workspace validation
- ESLint
- TypeScript type checking
- Formatting check
- Prisma schema validation beginning in Phase 1

### `unit-tests`

- Backend unit tests
- Frontend unit tests
- Next.js component and route-handler tests with Vitest and Testing Library
- Test coverage report
- Deterministic non-watch CI configuration

### `integration-tests`

Initially starts a temporary PostgreSQL service and runs the generated API integration and end-to-end tests. These tests do not query the database until Phase 1 introduces Prisma migrations and database-backed integration cases.

### `build`

- NestJS production build
- Next.js production build
- Required build-time environment validation
- Workspace package resolution

Pull requests do not build or publish production images. Docker remains
available for local development and verification.

## 4. Root commands

Standardize:

```bash
pnpm dev
pnpm build
pnpm lint
pnpm typecheck
pnpm format
pnpm format:check
pnpm test
pnpm test:unit
pnpm test:integration
pnpm test:e2e
pnpm docker:build
pnpm docker:up
pnpm docker:down
pnpm check
```

`pnpm check` runs formatting verification, linting, type checking, unit tests, and production builds.

## 5. CI environment

GitHub Actions uses Node.js 22, the pnpm version pinned in the root package, frozen-lockfile installation, safe dependency/build caching, a PostgreSQL service container for integration tests, minimal workflow permissions, and concurrency cancellation for superseded PR runs.

CI does not depend on production secrets. Test credentials are created inside the workflow.

## 6. Docker foundation

Create:

```text
apps/web/Dockerfile
apps/api/Dockerfile
.dockerignore
compose.yaml
compose.ci.yaml
```

### Web container

- Multi-stage build
- Next.js standalone output
- Node.js 22 Debian slim
- Non-root runtime user
- Internal port `3000`
- Health endpoint
- Production-only runtime files

### API container

- Multi-stage build
- NestJS compiled output
- Node.js 22 Debian slim
- Non-root runtime user
- Internal port `3001`
- `/health` endpoint
- Production-only runtime files
- Prisma support added in Phase 1

### Compose services

- `web`
- `api`
- `postgres`

PostgreSQL is available from Phase 0; Prisma schema and migrations begin in Phase 1.

Local startup:

```bash
docker compose up --build
```

## 7. Health checks

Provide:

```text
GET /api/health
GET /_health
```

The API health response initially checks application availability. Phase 1 adds database connectivity. Health responses never reveal secrets, configuration values, or internal error stacks.

## 8. Environment files

Add root, web, and API `.env.example` files. Phase 0 covers ports, the public API URL, PostgreSQL development values, application environment, and logging level. Later phases update the examples in the same pull requests that introduce new variables.

Real `.env` files remain ignored.

## 9. Main-branch protection

Configure `main` to require:

- A pull request before merging
- Required status checks
- Branch up to date before merging
- Conversation resolution
- No force pushes
- No branch deletion
- Linear history
- Squash merging

Required checks:

```text
quality
unit-tests
integration-tests
build
```

The initial solo-development configuration requires zero human approvals while retaining all automated checks. Human approval becomes mandatory when collaborators join.

## 10. Dependency management

Dependabot creates scheduled pull requests for pnpm dependencies, GitHub Actions, and Docker base images. Dependency PRs use the same checks as feature work. Major versions never merge automatically, and the lockfile changes only for intentional dependency updates.

## 11. Repository documentation

Add:

```text
CONTRIBUTING.md
docs/development/
├── getting-started.md
├── branch-and-pr-workflow.md
├── docker-development.md
├── testing.md
└── troubleshooting.md
```

Documentation covers installation, local and Docker execution, testing, branches and pull requests, failed checks, environment variables, and later database migrations.

## 12. Security checks

Include secret scanning, dependency vulnerability reporting, minimal GitHub Actions permissions, pinned major Action versions, no production secrets in CI, and no sensitive values in logs.

Low-severity findings may initially warn. Confirmed high or critical findings block merging.

## 13. Phase completion workflow

Every phase requires:

1. Approved specification under `docs/`
2. Dedicated phase branch
3. Implementation commits
4. Automated tests
5. Pull request
6. Passing required checks
7. Review against acceptance criteria
8. Squash merge into `main`
9. Stable `main` before the next phase

## 14. Acceptance criteria

Phase 0 is complete when:

- Web and API Docker images remain available for local builds.
- The local Compose stack starts successfully.
- Web and API health checks pass.
- Root quality and test commands work.
- Every PR runs all required checks.
- Failing quality, test, or application builds prevent merging.
- Direct pushes to `main` are blocked.
- Pull requests use the repository template.
- Dependency updates arrive as pull requests.
- Development and PR documentation is complete.
- Nothing deploys automatically.

## Not included

- Production server creation
- Domain configuration or HTTPS
- Production secrets or database
- Container-registry publishing
- Automatic deployment
- Authentication functionality
- Catalog or marketplace functionality
- Business database models

Production deployment, TLS, backups, monitoring, image publishing, and rollback procedures are completed during release preparation after Phase 4.
