# Docker development

## Start the full stack

Copy `.env.example` to `.env`, then run:

```bash
docker compose up --build --wait
```

The web app is exposed on port `3000`, the API on `3001`, and PostgreSQL on
`5432`. PostgreSQL data persists in the `postgres_data` named volume.

Use `docker compose down` to stop the services while keeping local database
data. Use `docker compose down --volumes` only when you intend to delete that
local database.

## Production images

Both applications use multi-stage Node.js 22 Debian slim builds and run as the
unprivileged `node` user. Next.js uses standalone output. These images are for
local verification; Phase 0 does not publish or deploy them.

## CI Compose configuration

CI uses `compose.ci.yaml` with a unique Compose project name, no published host
ports, and temporary PostgreSQL storage. CI tears down the project and removes
its volumes after the job.
