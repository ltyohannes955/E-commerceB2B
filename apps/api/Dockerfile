# syntax=docker/dockerfile:1
FROM node:22.23.2-bookworm-slim AS base

RUN npm install --global pnpm@11.19.0
WORKDIR /app

FROM base AS dependencies

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm install --filter @e-commerce/api --prod --frozen-lockfile --fetch-retries=5 --fetch-timeout=600000 --network-concurrency=4

FROM base AS builder

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm install --filter @e-commerce/api --frozen-lockfile --fetch-retries=5 --fetch-timeout=600000 --network-concurrency=4
COPY . .
RUN pnpm --filter @e-commerce/api build

FROM node:22.23.2-bookworm-slim AS runner

ENV NODE_ENV=production
ENV PORT=3001
WORKDIR /app

COPY --from=dependencies --chown=node:node /app/node_modules ./node_modules
COPY --from=dependencies --chown=node:node /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=builder --chown=node:node /app/apps/api/package.json ./apps/api/package.json
COPY --from=builder --chown=node:node /app/apps/api/dist ./apps/api/dist

USER node
EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 CMD ["node", "-e", "fetch('http://127.0.0.1:3001/api/health').then((response) => process.exit(response.ok ? 0 : 1)).catch(() => process.exit(1))"]
CMD ["node", "apps/api/dist/main.js"]
