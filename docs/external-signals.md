# External signals

Advisory evidence layer for Territory risk. Feeds suggest / flag; they never
auto-change scores, premium, or underwriting gates.

## Scope (this slice)

- `ExternalSignal` Prisma model (migration `0013_external_signals`) — global,
  no `clientId`, no RLS
- Fixture repository + service (`src/lib/external-signal/`)
- Insurer review queue at `/signals-review` (accept / reject + audit)
- Territory drawer section on `/map` with “review suggested” badge
- Inngest daily cron stub that runs `syncFixtureFeeds` (no live HTTP)

## Review rules

- Only `INSURER_ADMIN` may list the queue or accept/reject
- Any authenticated role may see signals on the territory drawer (non-PII)
- Accept / reject set status and clear `reviewSuggested`; they **do not** mutate
  Territory sub-scores (`territoryScoresMutated: false` in the audit diff)
- Reviewed rows are preserved across fixture sync; only pending rows refresh

## Provenance fields

Each signal carries source, indicator, value, as-of date, optional URL / quote /
snapshot text, and a raw JSON payload for later live feed parsers.

## Deferred

- Live WHO GHO / World Bank / State Dept / ReliefWeb / GDACS / OurAirports HTTP
- Governed AI news scanner (allow-list, quote verification, corroboration)
- ACLED / IRF (licensing)
- Auto-adjust Territory scores on accept
- Prisma runtime adapter
- Playwright E2E
