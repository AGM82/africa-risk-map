# Recalibration wizard

Client-scoped **RecalibrationBatch** reconciles organisation-location headcounts
against ledger **PlanType** baselines until they match, then locks the baseline.

Canonical domain: `src/lib/recalibration/`.  
Schema: `prisma/schema.prisma` + migration `0006_recalibration`.  
UI: `/recalibration` (scoped to active client).

## Model

### RecalibrationBatch

- Belongs to a **Client** (`clientId`)
- `status`: `IN_PROGRESS` | `LOCKED`
- `baselines` JSON: `{ ESSENTIAL: number, PREMIUM: number }` (interim until CoverCategory)
- `lockedAt` / `lockedByUserId` set on successful lock
- RLS: same broker-visible-clients pattern as org-location

One open (`IN_PROGRESS`) batch per client. Reconciliation is a live sum of
`OrganisationLocation.headcount` by `assignedPlanType` for that client — no
batch↔location FK in this step.

## Reconciliation

`reconcile(locations, baselines)` in `src/lib/recalibration/reconcile.ts`:

- Per-plan `actual`, `baseline`, `delta` (actual − baseline), `balanced`
- Overall `balanced` only when every plan matches exactly
- `progressRatio` = min(1, actualTotal / baselineTotal) for the progress bar

GRAA fixture baselines: **6,503 Essential / 14 Premium** (ledger sample). Demo
org locations sum far below that — the wizard correctly shows a large remaining
delta until locations are entered.

## Service

`createRecalibrationService(repo, orgLocations, clientBroker, audit)`:

| Method                               | Who                                                          |
| ------------------------------------ | ------------------------------------------------------------ |
| `listBatches` / `getProgress`        | Any role (client-scoped read; create-on-miss requires write) |
| `getOrCreateOpenBatch` / `lockBatch` | `INSURER_ADMIN` and `BROKER` only                            |

`lockBatch` requires exact balance; audits `CONFIRM`. Rejects if already locked
or unbalanced.

## UI

- Indigo track / Pink fill progress bar
- Per-plan table + link to `/organisations` while unbalanced
- Pink **Lock baseline** CTA with explicit confirm when balanced
- Read-only message after lock

## Out of scope

- Endorsement ledger → premium-calculator
- CoverCategory baselines on locations → wire FK after policy-structure (see `docs/policy-structure.md`)
- Live Neon seed / migrate deploy
