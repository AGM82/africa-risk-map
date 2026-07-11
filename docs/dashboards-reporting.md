# Dashboards & reporting

Per-role client dashboards, endorsement ledger (with reverse), audit log, and
Insurer cross-client rollup.

Canonical domain: `src/lib/reporting/`.  
UI: `/dashboard`, `/ledger`, `/audit`, `/rollup` (Insurer only).

## Surfaces

| Route        | Audience                               | Content                                                                                                       |
| ------------ | -------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `/dashboard` | All roles (client-scoped)              | Covered lives (primary KPI), org/location counts, live monthly prem/agg, Recharts monthly trend, insight line |
| `/ledger`    | All roles read; Insurer/Broker reverse | TanStack endorsement history, CSV, reverse with named confirm                                                 |
| `/audit`     | All roles (tenant-scoped)              | TanStack audit entries, CSV                                                                                   |
| `/rollup`    | Insurer only                           | Cross-client lives and book totals, CSV                                                                       |

PDF export = browser print (`Print / PDF` + `@media print`). No Policy Schedule / certificate PDFs.

## Monthly series

`buildMonthlyBookSeries(schedule, endorsements)` walks each month in the on-risk
policy term and rolls lives as-of month-end × CoverCategory rates (same engine
as the premium calculator). Demo GRAA fixtures include mid-term ADD/REMOVE so
the chart is non-flat.

## Endorsement reverse

Appends a compensating ADD/REMOVE (opposite delta, note `Reversal of {id}`).
Never mutates or deletes the original. Requires:

- Insurer/Broker write access
- Locked recalibration for the client
- Resulting location headcount ≥ 0
- Original kind is ADD or REMOVE (not BASELINE)

## CSV columns

- **Ledger** — id, effectiveDate, kind, organisation, site, category, delta, note
- **Audit** — id, createdAt, actorUserId, actorRole, clientId, entityType, entityId, action
- **Rollup** — clientId, clientName, organisations, locations, lives, monthlyPremium, monthlyAggregate, policyYear, policyStatus

## Service

`createReportingService(...)` — `getClientDashboard`, `listEndorsementLedger`,
`reverseEndorsement`, `listAuditLog`, `getInsurerRollup`, CSV exporters.

Wired via `createFixtureAdminServices().reporting`.

## Out of scope

- Prisma runtime adapters (fixture audit/endorsement ports today)
- Playwright E2E
- Certificate / Policy Schedule PDF generation
- Icon-rail shell
