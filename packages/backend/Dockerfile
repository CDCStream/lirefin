# syntax=docker/dockerfile:1.7

# ---- Build stage --------------------------------------------------------
# Build context MUST be the monorepo root (set via railway.json's
# `dockerfilePath`). We copy workspace manifests first so `pnpm install`
# can be cached when only source files change.
FROM node:22-alpine AS builder

WORKDIR /app
RUN corepack enable && corepack prepare pnpm@9.12.0 --activate

# Workspace manifests + lockfile (deterministic install)
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml .npmrc tsconfig.base.json ./
COPY packages/shared/package.json packages/shared/
COPY packages/backend/package.json packages/backend/

RUN pnpm install --frozen-lockfile --filter @fni/backend... --filter @fni/shared

# Now bring in the actual sources and compile.
COPY packages/shared packages/shared
COPY packages/backend packages/backend

RUN pnpm --filter @fni/backend build

# ---- Runtime stage ------------------------------------------------------
# tsup bundles `@fni/shared` into the output (`noExternal: ["@fni/shared"]`),
# so the runtime image only needs the backend's external deps.
FROM node:22-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production
RUN corepack enable && corepack prepare pnpm@9.12.0 --activate

COPY --from=builder /app/packages/backend/dist ./dist
COPY --from=builder /app/packages/backend/package.json ./package.json
COPY --from=builder /app/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=builder /app/.npmrc ./.npmrc

# Install only this package's runtime deps. `@fni/shared` is bundled, so we
# strip the workspace-protocol dep before installing.
RUN node -e "const fs=require('fs');const p=require('./package.json');delete p.dependencies['@fni/shared'];fs.writeFileSync('./package.json',JSON.stringify(p,null,2));"
RUN pnpm install --prod --no-frozen-lockfile

# Railway sets PORT at runtime; the server reads it via config.ts.
EXPOSE 8787
CMD ["node", "dist/server.js"]
