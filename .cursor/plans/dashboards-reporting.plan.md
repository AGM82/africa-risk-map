# dashboards-reporting

Per-client dashboard (Recharts trends), endorsement ledger with reverse + CSV,
audit log viewer, and Insurer cross-client rollup.

## Delivered

- Deps: `@tanstack/react-table`, `recharts` (exact)
- `src/lib/reporting/` — monthly series, CSV, service + tests
- Routes: `/dashboard`, `/ledger`, `/audit`, `/rollup`
- Fixture mid-term endorsements for non-flat chart series
- Docs: `docs/dashboards-reporting.md`

## Deferred

- Prisma runtime adapters
- Playwright E2E
- Policy Schedule / certificate PDF generation

## Next

- `external-signals` — Composer (Phase 7 stretch)
