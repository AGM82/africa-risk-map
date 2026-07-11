# Premium & aggregate calculator

Live book totals and what-if endorsements against the on-risk Policy Schedule.

Canonical domain: `src/lib/premium/` (+ Endorsement on `src/lib/org-location/`).  
Schema: `prisma/schema.prisma` + migration `0009_endorsement`.  
UI: `/calculator` (active-client scoped).

## Rating bases

Rates always come from `CoverCategory` (never hard-coded ZAR).

### Fixed Sum (GPA) — `PER_PERSON_PER_MONTH`

| Figure            | Formula                 |
| ----------------- | ----------------------- |
| Monthly premium   | lives × premiumAmount   |
| Monthly aggregate | lives × aggregateAmount |
| Annual figures    | monthly × 12            |

GRAA path: monthly declaration by numbers (`MONTHLY_BY_NUMBERS`).

### Stated Benefits — `PERCENT_OF_WAGE_ROLL`

**Premium = annual earnings × (rate % ÷ 100)**  
(same shape for aggregate when the aggregate basis is also wage-roll).

| Figure           | Formula                                              |
| ---------------- | ---------------------------------------------------- |
| Annual premium   | `declaredAnnualWageRoll` × (`premiumAmount` / 100)   |
| Annual aggregate | `declaredAnnualWageRoll` × (`aggregateAmount` / 100) |
| Monthly display  | annual ÷ 12                                          |

Example (demo African Parks placeholder): R18,000,000 × 1.2% = R216,000 p.a. premium; × 0.8% = R144,000 p.a. aggregate.

Person-level payroll is **never** stored (POPIA). Only the anonymised `declaredAnnualWageRoll` aggregate is used for rating.

### `PER_ANNUM`

Lives × annual amount; monthly = annual ÷ 12.

## Payment terms (billing posture)

| Frequency                | Behaviour                                                                                               |
| ------------------------ | ------------------------------------------------------------------------------------------------------- |
| `MONTHLY_BY_NUMBERS`     | Recalculate from current lives / wage base each month (GRAA)                                            |
| `ANNUAL_WITH_ADJUSTMENT` | Annual estimate at inception; true-up later (premium-only if marginal; premium + aggregate if material) |
| `ANNUAL_FLAT`            | Annual figure without true-up                                                                           |

The calculator always derives amounts from the schedule; adjustment _workflow_ (deposit vs final) is recorded via PaymentTerms and future endorsement notes — not a separate rate engine.

## Live book

Lives per CoverCategory = `sum(Endorsement.delta)` for the on-risk policy.  
Wage-roll premium uses the category’s `declaredAnnualWageRoll` (plus what-if overrides).

## Endorsements

| Kind       | Meaning                                              |
| ---------- | ---------------------------------------------------- |
| `BASELINE` | Opening balance at recalibration lock (or demo seed) |
| `ADD`      | Headcount increase (what-if confirm)                 |
| `REMOVE`   | Headcount decrease (schema-ready; UI deferred)       |

Confirming a what-if requires a **LOCKED** recalibration batch.

## What-if gates

Reuse `src/lib/org-location/eligibility.ts` plus `TerritoryBenefitEligibility` (Decline / plan / VH plans / Premium UW / matrix row).

For Stated Benefits what-if: optional `additionalAnnualWageRoll`; if omitted, projects **average earnings × added headcount** from declared wage roll ÷ declared insured count.

## Risk-mix drift

Projected lives by Low/Med / High / Very High vs `RiskMixPolicy` ± tolerance — warning banner only.

## Client rollout

- **GRAA** — build and prove on Fixed Sum / PPPM with the live ledger.
- **African Parks** — engine supports Stated Benefits math now; replace the demo placeholder with the real schedule and wage roll when the system is live (do not invent production rates in fixtures).

## Service

`createPremiumCalculatorService(...)` — `getBook`, `simulateWhatIf`, `confirmWhatIf`.

## Out of scope

- Endorsement reverse UI / TanStack history (dashboards-reporting)
- Prisma runtime adapters (fixture-only)
- Playwright E2E
- Annual adjustment _settlement_ UI (estimate vs actual deposit ledger)
