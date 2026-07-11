# Deploy to Cloud Run (build/testing phase)

Checklist only — nothing here is executed by the Foundations scaffold. It
documents how the already-containerised app is deployed later. See
`.cursor/rules/62-deployment-observability.mdc` and the "Hosting" section of
`.cursor/rules/90-project-context.mdc` for the governing decisions.

## Prerequisites

- A GCP project with billing enabled (personal account for build/testing; a
  Lombard-owned project before any real client/POPIA data — hard stop).
- `gcloud` CLI authenticated (`gcloud auth login`, `gcloud config set project <id>`).
- A Postgres+PostGIS database reachable from Cloud Run: Neon (build/testing) or
  Cloud SQL (production). Have the pooled `DATABASE_URL` and direct `DIRECT_URL`.
- A Clerk application (publishable + secret keys).

## One-time setup

1. Enable APIs: `gcloud services enable run.googleapis.com artifactregistry.googleapis.com secretmanager.googleapis.com`.
2. Create an Artifact Registry Docker repo.
3. Store secrets in Secret Manager (never in the image or repo):
   `DATABASE_URL`, `DIRECT_URL`, `CLERK_SECRET_KEY`,
   `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, and (when used) `SENTRY_*`,
   `INNGEST_*`, `ANTHROPIC_API_KEY`.

## Each deploy

1. Build the container from the repo `Dockerfile` (Next.js `output: "standalone"`),
   e.g. `gcloud builds submit --tag <region>-docker.pkg.dev/<project>/<repo>/africa-risk-map`.
2. Apply any new migrations against the database using `DIRECT_URL`
   (`npx prisma migrate deploy`) before or as part of the release, keeping the
   migration backward-compatible with the previous app version for one deploy cycle.
3. Deploy, binding secrets as env vars and listening on `PORT=8080`:
   `gcloud run deploy africa-risk-map --image <...> --port 8080 --set-secrets DATABASE_URL=DATABASE_URL:latest,...`.
4. Keep staging and production as separate services with separate secrets.
5. Every deploy must be rollback-able to the prior revision (`gcloud run services update-traffic ... --to-revisions <prev>=100`).

## Not in scope for Foundations

- No live deploy is performed here.
- The production host decision (Cloud Run on a Lombard-owned project vs Vercel
  Pro fallback) is recorded in `90-project-context.mdc` and settled outside this repo.
