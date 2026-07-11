# Environment variables

Create a local `.env` file (already gitignored — never commit it) with the
following keys. No real client/insured-person data or production secrets
should ever be placed in this repo — see `.cursor/rules/90-project-context.mdc`
and `.cursor/rules/10-security-popia.mdc`.

```bash
# --- Database (Neon Postgres + PostGIS) ---
# Pooled connection string — used by the app runtime (serverless-safe).
DATABASE_URL="postgresql://user:password@host-pooler.neon.tech/africa_risk_map?sslmode=require"
# Direct/unpooled connection string — used only for migrations.
DIRECT_URL="postgresql://user:password@host.neon.tech/africa_risk_map?sslmode=require"

# --- Auth (Clerk) ---
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_xxxxxxxx"
CLERK_SECRET_KEY="sk_test_xxxxxxxx"
NEXT_PUBLIC_CLERK_SIGN_IN_URL="/sign-in"
NEXT_PUBLIC_CLERK_SIGN_UP_URL="/sign-up"

# --- Error tracking (Sentry) ---
NEXT_PUBLIC_SENTRY_DSN=""
SENTRY_AUTH_TOKEN=""
SENTRY_ORG=""
SENTRY_PROJECT=""

# --- Background jobs (Inngest) ---
INNGEST_EVENT_KEY=""
INNGEST_SIGNING_KEY=""

# --- AI provider (Anthropic) — Structure Chat / ai-news-monitor ---
# Optional. When empty, Structure Chat uses the fixture drafter (CI/demo-safe).
ANTHROPIC_API_KEY=""

# --- Basemap tiles (Cloudflare R2) — production PMTiles hosting ---
R2_ACCOUNT_ID=""
R2_ACCESS_KEY_ID=""
R2_SECRET_ACCESS_KEY=""
R2_BUCKET_NAME=""
R2_PUBLIC_BASE_URL=""

# --- MapLibre style URL (optional; defaults to Carto Dark Matter GL for local/demo) ---
NEXT_PUBLIC_MAP_STYLE_URL="https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json"
```

## Setup steps

1. Provision a free [Neon](https://neon.tech) Postgres project, enable the
   `postgis` extension, and copy both the pooled and direct connection strings.
2. Create a free [Clerk](https://clerk.com) application, enable email
   OTP/magic-link sign-in, and copy the publishable/secret keys.
3. Run `npx prisma migrate deploy` (or `npx prisma migrate dev` locally) once
   `DATABASE_URL`/`DIRECT_URL` are set, to apply `prisma/migrations/`.
4. Sentry, Inngest, Anthropic, and R2 keys are only required once their
   respective to-dos are implemented — leave blank until then.
5. `NEXT_PUBLIC_MAP_STYLE_URL` is optional; omit it to use the documented
   dark basemap default for local Risk Register map development.
6. For live user invites (`createClerkUserDirectory`), customize the Clerk
   session token with `{ "metadata": "{{user.public_metadata}}" }` so role and
   scope reach `getAuthContext()` — see `docs/user-admin.md`. Until then the
   `/clients` and `/admin/users` surfaces use fixture directories.
