# Throughline GitHub App integration prompt

Paste the text below into Cursor in the Throughline project. It builds Path
B+ from [`docs/connect-guardrails.md`](./connect-guardrails.md): a GitHub App
that lets Throughline keep watching a connected project after
`guardrail-prescription.json` (see
[`docs/throughline-lifecycle-prompt.md`](./throughline-lifecycle-prompt.md))
has already been issued, instead of only ever seeing a one-time snapshot.

Read [`docs/project-lifecycle.md`](./project-lifecycle.md) and the
`lifecycleStages` block in [`guardrail-layers.json`](../guardrail-layers.json)
before running this prompt — the stage-mapping function this prompt builds
must match that data exactly, not re-derive its own rules.

This is a substantially bigger piece of work than the earlier integration
prompts: it adds Throughline's **first database** and **first webhook
receiver**. Two things in it are genuinely blocking and cannot be automated —
they are called out explicitly as STEP 0 and flagged again in HARD STOPS.

---

## PROMPT (copy everything below this line)

```
I need you to add a GitHub App integration so this project can monitor a
connected repository's development — CI/security health and lifecycle-stage
progression — without ever touching the repository beyond reading it. Work
through the steps below in order. Run npm run typecheck, npm run lint, and
npm run test after each step and fix any failures before continuing.

---

BACKGROUND

This project already vendors cursor-guardrails' guardrail-layers.json and
computes deterministic output via classifyRisk() and getGuardrailProfile() —
both pure functions, no AI, no network call. The one and only place AI is
called is app/api/propose/route.ts, deliberately isolated.

This prompt adds a parallel, equally deterministic path: reading facts about
a connected GitHub repository (check-run results, PR review state, merge
status) and mapping them to (a) a health summary and (b) which of the 8
lifecycle stages in guardrail-layers.json's lifecycleStages block the project
is currently in. Never let this path call the AI route, and never let it
call Claude to "interpret" anything — every fact used must come straight off
the GitHub API/webhook payload.

This requires two things Throughline does not have yet: persistence (a
database) and a webhook receiver. Both are new surface area — build them
narrowly and read-only-by-design.

---

STEP 0 — Two things you must do by hand before continuing (cannot be automated)

0a. Register a GitHub App (GitHub Settings -> Developer settings -> GitHub
    Apps -> New GitHub App). Use these settings:
      - Webhook URL: https://<your-throughline-deployment>/api/webhooks/github
        (a placeholder is fine if not deployed yet — update it later)
      - Webhook secret: generate one, store it, you will need it in step 0c
      - Permissions (repository, all others "No access"):
          Contents: Read-only
          Pull requests: Read-only
          Checks: Read-only
          Commit statuses: Read-only
          Metadata: Read-only (mandatory minimum, GitHub requires it)
      - Subscribe to events: push, pull_request, check_run, check_suite,
        status, release, installation, installation_repositories
      - Where can this GitHub App be installed: "Only on this account" unless
        you specifically need it available to other GitHub orgs
    After creating it, generate a private key (downloads a .pem file) and
    note the App ID and Client ID.

0b. Choose a persistence provider if you have not already. This prompt
    assumes a managed serverless Postgres (e.g. Neon) — schemas below use
    plain SQL and an ordinary Postgres client, nothing provider-specific — but
    swap providers freely if you prefer a different one; only the connection
    setup in STEP 1 changes.

0c. Add these as environment secrets (never commit them):
      GITHUB_APP_ID
      GITHUB_APP_PRIVATE_KEY        (the full .pem contents)
      GITHUB_APP_WEBHOOK_SECRET
      DATABASE_URL                  (from your chosen provider)
    Confirm these exist in your deployment environment before continuing —
    do not hardcode fallback values anywhere in source.

---

STEP 1 — Persistence layer

1a. Add a database client for your chosen provider (e.g. `pg` or the
    provider's driver) as a dependency.

1b. Create the schema (adapt syntax if your provider needs it, the shape
    should not change):

  CREATE TABLE github_installations (
    id BIGINT PRIMARY KEY,              -- GitHub's installation id
    account_login TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );

  CREATE TABLE github_repo_connections (
    id SERIAL PRIMARY KEY,
    installation_id BIGINT NOT NULL REFERENCES github_installations(id),
    repo_full_name TEXT NOT NULL UNIQUE,   -- "owner/repo"
    connected_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );

  CREATE TABLE github_events (
    id SERIAL PRIMARY KEY,
    repo_full_name TEXT NOT NULL,
    event_type TEXT NOT NULL,              -- "check_run", "pull_request", etc.
    delivery_id TEXT NOT NULL UNIQUE,      -- GitHub's X-GitHub-Delivery header, dedupe key
    facts JSONB NOT NULL,                  -- deterministic facts extracted in STEP 3, never the raw payload
    received_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );

  CREATE TABLE project_status (
    repo_full_name TEXT PRIMARY KEY,
    stage INT NOT NULL,
    stage_name TEXT NOT NULL,
    health JSONB NOT NULL,                 -- { verify: "success"|"failure"|"pending"|"unknown", secretScan: ..., sast: ... }
    guardrail_version_current TEXT,
    guardrail_version_latest TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );

1c. Add a thin data-access module (e.g. src/lib/db.ts) exposing typed
    functions for each table — insertEvent, upsertProjectStatus,
    getProjectStatus, recordInstallation, recordRepoConnection. Keep SQL
    parameterised everywhere (no string-built queries) — this is a hard
    requirement, not a style preference (REQ carried over from
    60-backend-api.mdc's "parameterised queries only" rule in cursor-guardrails).

---

STEP 2 — Vendor the updated manifest

2a. Re-fetch guardrail-layers.json from cursor-guardrails into wherever this
    project already vendors it (per docs/throughline-integration-prompt.md),
    picking up the new lifecycleStages and ciCheckNames blocks. Confirm the
    vendored guardrailVersion is >= 1.4.0.

2b. Add a typed accessor next to getGuardrailProfile(), e.g.
    getLifecycleStages(): reads manifest.lifecycleStages, returns it typed.
    Do not copy the stage table into a second hardcoded structure anywhere —
    always read it from the vendored manifest.

---

STEP 3 — Webhook receiver (deterministic ingestion, no AI, no trust without verification)

Create app/api/webhooks/github/route.ts:

3a. Verify the signature first, before parsing anything else. GitHub signs
    the raw body with GITHUB_APP_WEBHOOK_SECRET using HMAC-SHA256, sent in
    the X-Hub-Signature-256 header. Compute the HMAC over the raw request
    body and compare using a constant-time comparison
    (crypto.timingSafeEqual, not ===). Reject with 401 on any mismatch or
    missing header, before touching the payload.

3b. Deduplicate using the X-GitHub-Delivery header as delivery_id — if a row
    with that delivery_id already exists in github_events, return 200
    immediately without reprocessing (GitHub retries deliveries).

3c. Extract ONLY these deterministic facts per event type — discard
    everything else, never store the raw payload body:
      - check_run / check_suite: { repo, sha, checkName, conclusion }
      - pull_request: { repo, number, action, merged, baseRef }
      - pull_request_review: { repo, prNumber, state }  ("approved"/"changes_requested"/...)
      - push: { repo, ref, sha }
      - installation / installation_repositories: { installationId, accountLogin, repoFullName, action }

3d. Write the extracted facts to github_events, then call the stage-mapping
    function from STEP 4 and upsert project_status for that repo.

3e. Return 200 quickly (GitHub expects a fast response). If STEP 4's mapping
    needs to be slower, queue it rather than blocking the webhook response —
    but do not add this complexity unless you actually observe timeouts;
    a synchronous call is fine to start.

---

STEP 4 — Deterministic stage-mapping function (pure, tested like classifyRisk())

4a. Add src/lib/stage-mapping.ts with a pure function:

  export interface ProjectFacts {
    latestCommitSha: string | null;
    checkConclusions: Record<string, "success" | "failure" | "pending" | "unknown">; // keyed by lifecycleStages.ciCheckNames values
    hasApprovedOpenPr: boolean;
    lastMergeToDefaultBranch: { sha: string; allChecksGreen: boolean } | null;
    hasPlanFileCommit: boolean;
  }

  export function mapFactsToStage(
    facts: ProjectFacts,
    lifecycleStages: LifecycleStagesManifest,  // read from the vendored manifest, STEP 2
  ): { stage: number; stageName: string } {
    // Walk lifecycleStages.stages and return the HIGHEST stage whose
    // detectionSignals are satisfied by `facts`. This is a rule table
    // lookup, not a model call — same input must always yield the same
    // output. Encode the same precedence as the table in
    // cursor-guardrails' guardrail-layers.json -> lifecycleStages; do not
    // invent different logic here.
  }

4b. This function must never make a network call, never call the AI route,
    never use Date.now()/Math.random() internally. Build ProjectFacts from
    github_events query results in the caller (STEP 3d), not inside this
    function.

4c. Add tests (e.g. src/lib/stage-mapping.test.ts) covering at minimum:
    - all checks unknown -> stage 3 (Build)
    - verify check success only -> stage 4 (Verify)
    - verify + secretScan + sast all success -> stage 5 (Secure)
    - + an approved open PR -> stage 6 (Review)
    - + merged to default branch with all checks green on the merge commit
      -> stage 7 (Release)
    - identical input twice -> byte-identical output (determinism)

---

STEP 5 — Installation flow

5a. Add a "Connect a GitHub repository" action that links to
    https://github.com/apps/<your-app-slug>/installations/new — GitHub
    handles the installation UI itself, you do not build it.

5b. Handle the "installation" and "installation_repositories" webhook events
    (already routed to app/api/webhooks/github/route.ts in STEP 3) to record
    rows in github_installations and github_repo_connections. This is how a
    connection becomes visible to Throughline — there is no separate manual
    "register this repo" step, installation IS the opt-in.

---

STEP 6 — Dashboard

6a. Add a view (e.g. a project detail page) that reads project_status for a
    connected repo_full_name and shows: current stage name, health per check
    (verify/secretScan/sast), guardrail-version drift
    (guardrail_version_current vs guardrail_version_latest — compare against
    the vendored manifest's own guardrailVersion), and updated_at.

6b. This view is read-only. Do not add any action here that writes back to
    the connected GitHub repository — Path B+ is deliberately observe-only.

---

STEP 7 — Verify and commit

7a. Run: npm run typecheck — fix all errors before continuing.
7b. Run: npm run lint — fix all errors before continuing.
7c. Run: npm run test — fix all failures before continuing.
7d. Stage all changes and create a commit:

    git add -A
    git commit -m "feat(github-app): add GitHub App integration for live project monitoring

    - Add Postgres persistence for installations, repo connections,
      webhook events, and computed project status
    - Add a signature-verified GitHub webhook receiver, extracting only
      deterministic facts, never the raw payload
    - Add a pure stage-mapping function deriving lifecycle stage from
      those facts, keyed off cursor-guardrails' vendored lifecycleStages
    - Add a per-repo installation flow and a read-only status dashboard
    - Add determinism tests for the stage-mapping function"

7e. Open a PR and confirm CI passes before merging.

---

HARD STOPS

- Do not skip webhook signature verification for any reason, including
  during local testing against a real GitHub App — use a tool like a
  webhook proxy with the real secret, never a code path that bypasses
  verification.
- Do not request write, admin, or any permission beyond the read-only scopes
  listed in STEP 0 — if a future feature seems to need more, stop and raise
  it as a separate, explicitly-approved change.
- Do not let this integration write anything back to the connected
  repository, ever. Read-only, always.
- Do not let the stage-mapping function or webhook ingestion call the AI
  route, Claude, or any model. Both must stay pure/deterministic, same as
  classifyRisk() and getGuardrailProfile().
- Do not store the raw webhook payload body anywhere — extract and store
  only the specific deterministic fields listed in STEP 3c.
- Do not build any auto-install, org-wide, or "install on all repos" flow —
  every connection is one explicit installation action per repo.
- Do not hardcode secrets (webhook secret, private key, database URL)
  anywhere in source — environment variables only, and confirm they are
  git-ignored.
- Do not disable TypeScript strict mode or any ESLint rule to make this
  compile. Fix the cause of every error.
- Do not skip the test step. If tests fail after your changes, fix them.
```
