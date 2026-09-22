# Troubleshooting

## Port already in use

Set `WEB_PORT`, `API_PORT`, or `POSTGRES_PORT` in the root `.env` for Docker
Compose. When running the API directly, set `PORT`; the default is `3001`.

## Frozen lockfile install fails

Run `pnpm install` after an intentional dependency or workspace-manifest
change, review the resulting single root `pnpm-lock.yaml`, and include it in
the same change. CI always uses `pnpm install --frozen-lockfile`.

## Docker services do not become healthy

Run `docker compose ps` and `docker compose logs web api postgres`. Check that
Docker Desktop is running, required host ports are free, and local environment
values are valid. The API's Phase 0 health endpoint checks application
availability only; it does not check PostgreSQL connectivity.

## CI failed

Open the failed job logs, reproduce the named command locally, and push a fix
to the same phase branch. For Docker failures, use the local Compose commands
and preserve the logs before removing containers.
