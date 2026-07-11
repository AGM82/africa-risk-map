# Plan: `import-scripts-data`

**Status:** implemented  
**Model (implementation):** Composer 2.5 Fast  
**Branch:** `feat/import-scripts-data` (from current `main`, includes merged `import-scripts-spatial`)  
**Scope:** CODE + TESTS ONLY against fixtures — no live DB, no real workbook binaries in repo  
**Does not edit:** `.cursor/plans/africa-risk-map-platform-plan.md`

## Context

| Already in place                                     | Implication                                                                                           |
| ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `import-scripts-spatial` merged (PR #7)              | Spatial loaders pattern to mirror; no overlap with workbook parsers                                   |
| No `Territory` / `Policy` Prisma models yet          | Output **normalised seed records**, not DB writes — models land in `risk-register-map-core` / Phase 3 |
| No `.xlsx` files in repo (POPIA / no-real-data rule) | Fixtures are **JSON row grids** (+ in-memory exceljs workbooks in tests only)                         |
| Platform plan specifies **exceljs**                  | Add as sole new runtime dep; justify in PR                                                            |

## Goal

Pure, fixture-tested parsers for the two GRAA workbooks so Phase 2 can seed Territory rows and Phase 3 can seed policy rates + ledger baselines without re-discovering column mapping.

## Deliverables

### 1. Documentation

`docs/workbook-import.md`:

- Source workbooks (names from platform plan — not committed)
- Normalised output types and column mapping conventions
- Benefit-options and risk-category enums
- Fixture-only / no-live-DB posture; seed wiring deferred to Neon provisioning
- VAT treatment notes (premium incl, aggregate excl)

### 2. Shared import layer

- `src/lib/import/types.ts` — enums + normalised record types + `LoadResult`
- `src/lib/import/parse-excel.ts` — exceljs adapter: buffer → header-mapped row objects; sheet row grid helper for pure tests
- `src/lib/import/metadata.ts` — source key + checksum + rowCount (mirror spatial metadata pattern)

### 3. Pure loaders

| Module                          | Input                                        | Output                                              |
| ------------------------------- | -------------------------------------------- | --------------------------------------------------- |
| `loaders/risk-rating-table.ts`  | header-mapped rows (Risk Rating Table sheet) | `TerritorySeedRecord[]`                             |
| `loaders/premium-agg-ledger.ts` | rate-card rows + monthly ledger rows         | `PolicyRateSeedRecord[]`, `LedgerMonthSeedRecord[]` |

Rules:

- Skip invalid rows (count in `stats.skipped`); Zod-validate accepted records
- No Prisma, no filesystem reads inside loaders (callers pass data)
- Anonymised Africa-scoped fixture rows only

### 4. Fixtures + tests

- `src/lib/import/fixtures/risk-rating-table-sample.json`
- `src/lib/import/fixtures/premium-agg-rates-sample.json`
- `src/lib/import/fixtures/premium-agg-ledger-sample.json`
- Unit tests per loader + parse-excel + metadata
- One test builds a minimal in-memory exceljs workbook to prove the adapter path

### 5. Canonical files update

Add to `90-project-context.mdc`:

- `src/lib/import/loaders/`
- `docs/workbook-import.md`

### 6. Out of scope

- Prisma `Territory` / `Policy` / `CoverCategory` models and migrations
- Live `prisma db seed` against Neon
- Recalibration wizard UI
- MapLibre / R2 tile upload (env keys documented only)
- Real workbook binaries or real member/org names in fixtures

## Verification

1. `npm run typecheck`
2. `npm run lint`
3. `npm run test` (coverage gates)
4. `npm run build`
5. Conventional Commit(s), push, PR → `main`
