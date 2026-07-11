# Policy structure

Client-scoped annual **Policy Schedule**: PaymentTerms, Policy, CoverCategory,
BenefitLine, TerritoryBenefitEligibility, and RiskMixPolicy.

Canonical domain: `src/lib/policy/`.  
Schema: `prisma/schema.prisma` + migrations `0007_policy_structure`, `0010_basis_of_cover`.  
UI: `/policy` (active-client scoped).

## Benefit scales

| Scale            | Market name                   | Compensation                                                                                             |
| ---------------- | ----------------------------- | -------------------------------------------------------------------------------------------------------- |
| `FIXED_SUM`      | Group Personal Accident (GPA) | Nominated rand amounts (Death/PTD/TTD weekly/Medical/Evac)                                               |
| `EARNINGS_BASED` | Stated Benefits               | Multiples of annual earnings (Death/PTD); % of weekly earnings (TTD); Medical/Evac still absolute limits |

Set on `Policy.benefitScale` (dominant style). Premium **rate basis** lives on each
`CoverCategory` and may mix Fixed Sum (pppm) and Stated Benefits (wage-roll %) on
the same policy — totals are the sum of category lines. Zod still enforces the
matching BenefitLine field set per scale when structuring benefits.

**Fixtures**

- **GRAA (demo)** — Fixed Sum on-risk 2025-2026 (Essential R24.06/R35.00, Premium R77.44/R112.44) — two categories, different rates, total = sum
- **African Parks (demo)** — Earnings-Based placeholder schedule (3× Death/PTD, 100% TTD). Real AP schedule loads later.

Person-level earnings / payroll are **not** stored (POPIA). Optional `declaredAnnualWageRoll` on CoverCategory is an anonymised aggregate rating input only.

## Models (summary)

- **PaymentTerms** — billing frequency + whether aggregate is a client-retained fund
- **Policy** — `policyYear`, term dates, status, `benefitScale`
- **CoverCategory** — label, PlanType, Basis of Cover, declared counts, prem/agg
  rates + VAT flags
- **BenefitLine** — Death/PTD/TTD/Medical/Evac with Fixed Sum and/or Earnings fields
- **TerritoryBenefitEligibility** — Territory × CoverCategory permitted pairs (seeded from Territory.benefitOptions × planType)
- **RiskMixPolicy** — target Low/Med / High / Very High % + tolerance

### Basis of Cover

`CoverCategory.basisOfCover` is schedule wording per insured-person category:

| Value                          | Label                                       |
| ------------------------------ | ------------------------------------------- |
| `TWENTY_FOUR_HOUR`             | 24-hour                                     |
| `WORKING_HOURS_ONLY`           | Working hours only                          |
| `WORKING_HOURS_INCL_COMMUTING` | Working hours only incl. commuting journeys |
| `OTHER`                        | Other — free text in `basisOfCoverOther`    |

It differs per category the same way rates and benefits do. Demo fixtures default
to 24-hour. Displayed on `/policy` and calculator category lines; **not** a
premium formula input unless underwriting later ties rate to basis.

## Service

`createPolicyService(repo, clientBroker, audit, listTerritories)` — reads scoped; writes for Insurer/Broker. Includes `clonePolicyForRenewal` and `rebuildTerritoryEligibility`.

## Out of scope

- Live Neon migrate deploy / real African Parks production schedule figures (demo placeholder rates only until live load)

Endorsement / premium engine (incl. Stated Benefits wage-roll math): see [`docs/premium-calculator.md`](premium-calculator.md).  
Structure Chat / PolicyTemplate: see [`docs/structure-chat.md`](structure-chat.md).
