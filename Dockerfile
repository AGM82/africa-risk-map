# syntax=docker/dockerfile:1
# Multi-stage build producing a minimal runtime image from Next.js's
# `output: "standalone"` build. Portable across Cloud Run (primary target)
# and any other standard container host (Vercel deploys from git instead and
# ignores this file entirely) — see 90-project-context.mdc "Hosting".

FROM node:22.12-slim AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

FROM base AS deps
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci

FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Build-time env vars are dummy/placeholder — no secret ever needs to be
# present to produce the build artifact; real values are injected at
# container start via Cloud Run's env/Secret Manager bindings.
ENV DATABASE_URL="postgresql://placeholder:placeholder@localhost:5432/placeholder"
ENV DIRECT_URL="postgresql://placeholder:placeholder@localhost:5432/placeholder"
ENV NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_placeholder"
ENV CLERK_SECRET_KEY="sk_test_placeholder"
RUN npx prisma generate
RUN npm run build

FROM base AS runtime
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs
COPY --from=build /app/public ./public
COPY --from=build --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/.next/static ./.next/static
USER nextjs
EXPOSE 8080
ENV PORT=8080
ENV HOSTNAME="0.0.0.0"
CMD ["node", "server.js"]
