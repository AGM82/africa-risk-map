# external-signals

Fixture-first Phase 7 foundation: ExternalSignal model, Insurer review queue,
territory drawer nudges, Inngest fixture sync stub. No live HTTP feeds; no AI
news scanner.

## Delivered

- Prisma: `ExternalSignal` + enums (migration `0013_external_signals`)
- Domain: `src/lib/external-signal/` (types, schema, repo, fixtures, service, tests)
- Wiring: `createFixtureAdminServices().externalSignal`
- Inngest: daily `external-signals-sync-fixtures` → `syncFixtureFeeds`
- UI: `/signals-review`, territory drawer section, home cards
- Docs: `docs/external-signals.md`

## Deferred

- Live feed HTTP clients
- AI news monitoring
- Prisma adapters / score mutation on accept
- Playwright E2E

## Next

- Live commercial-safe feed parsers (State Dept, WHO GHO, ReliefWeb/GDACS)
- Then governed AI news scanner sharing the same review queue
