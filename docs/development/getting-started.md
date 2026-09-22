# Getting started

## Requirements

- Node.js 22
- pnpm 11.19.0
- Docker Desktop with Docker Compose for PostgreSQL or container workflows

The repository pins pnpm through `packageManager` and Node's major version in
`.nvmrc`.

## Install and run

```bash
pnpm install --frozen-lockfile
pnpm dev
```

The Next.js app runs on <http://localhost:3000>. The NestJS API runs on
<http://localhost:3001>; `GET /` is the generated example endpoint.

Use `pnpm dev:web` or `pnpm dev:api` to run one application. The API reads
`PORT` from its process environment and defaults to `3001`.

## Environment

Copy the root `.env.example` to `.env` for Docker Compose settings. The web app
loads its own Next.js environment file from `apps/web`; copy
`apps/web/.env.example` to `apps/web/.env.local` when needed. Copy
`apps/api/.env.example` to `apps/api/.env` for API settings. Local API scripts
load that file with Node's `--env-file-if-exists` option. All real environment
files are ignored by Git.

Example database credentials are for local development only. No production
credentials belong in the repository.
