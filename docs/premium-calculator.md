# Premium & aggregate calculator

Live book totals and what-if endorsements against the on-risk Policy Schedule.

Canonical domain: `src/lib/premium/` (+ Endorsement on `src/lib/org-location/`).  
Schema: `prisma/schema.prisma` + migration `0009_endorsement`.  
UI: `/calculator` (active-client scoped).

## Live book

Lives per CoverCategory = `sum(Endorsement.delta)` for the on-risk policy. Rates come only from `CoverCategory` (no hard-coded ZAR).

For FIXED_SUM / `PER_PERSON_PER_MONTH`:

| Figure                      | Formula                                            |
| --------------------------- | -------------------------------------------------- |
| Monthly premium             | lives × premiumAmount (schedule already VAT-aware) |
| Monthly aggregate           | lives × aggregateAmount                            |
| Annual aggregate deductible | monthly aggregate × 12                             |

VAT flags (`premiumIncludesVat`, `aggregateExcludesVat`) are display-only.

## Endorsements

| Kind       | Meaning                                              |
| ---------- | ---------------------------------------------------- |
| `BASELINE` | Opening balance at recalibration lock (or demo seed) |
| `ADD`      | Headcount increase (what-if confirm)                 |
| `REMOVE`   | Headcount decrease (schema-ready; UI deferred)       |

`ADD`/`REMOVE` update `OrganisationLocation.headcount`. Parent location delete is RESTRICT.

Confirming a what-if requires a **LOCKED** recalibration batch for the client.

## What-if gates

Reuse `src/lib/org-location/eligibility.ts` plus `TerritoryBenefitEligibility`:

- Decline territories blocked
- Essential only where benefit options allow
- Very High / Extreme → risk + crisis plans on file
- Premium → full underwriting approved
- CoverCategory must appear in the territory eligibility matrix

## Risk-mix drift

Compares projected lives by Low/Med / High / Very High (from location × territory `riskCategory`) to the client’s `RiskMixPolicy` targets ± tolerance. Outside tolerance shows a **warning banner** (does not auto-block).

## Earnings-based (deferred)

`EARNINGS_BASED` / `PERCENT_OF_WAGE_ROLL` schedules return an unsupported empty state (African Parks demo). Enable when live Stated Benefits rates exist.

## Service

`createPremiumCalculatorService(orgLocations, territories, policy, recalibration, clientBroker, audit)`

- `getBook` — all roles with client access
- `simulateWhatIf` — gates + preview
- `confirmWhatIf` — Insurer/Broker only; creates org/location + ADD endorsement

## Fixtures

GRAA demo locations (42 Essential + 18 Premium) with matching BASELINE endorsements and schedule rates R24.06 / R35.00 and R77.44 / R112.44. Proof tests use the ledger book 6,503 / 14.

## Out of scope

- Earnings-based / wage-roll live math
- Endorsement reverse UI / TanStack history (dashboards-reporting)
- Prisma runtime adapters (fixture-only)
- Playwright E2E
