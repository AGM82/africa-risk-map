# Workbook import pattern

The GRAA source workbooks are **not committed** to this repository (POPIA /
no-real-data rule). Import logic lives as pure parsers under
`src/lib/import/loaders/`, tested against anonymised JSON row fixtures and
in-memory exceljs buffers.

Canonical loaders: `src/lib/import/loaders/`.  
Spatial imports (geoBoundaries, OurAirports, etc.) are separate — see
`docs/prisma-postgis-geometry.md`.

## Source workbooks (reference only)

| Workbook                                                      | Purpose                                        |
| ------------------------------------------------------------- | ---------------------------------------------- |
| `LHR - Risk Rating Table - All Africa GRAA Members (v3).xlsx` | Shared **Territory** risk register (~62 rows)  |
| `GRAA - Monthly Premium & Agg Calc (2025-2026).xlsx`          | Client policy rates + monthly aggregate ledger |

## Normalised outputs

### Risk Rating Table → `TerritorySeedRecord`

Maps country/sub-region rows to the future `Territory` model:

- Six risk sub-scores + total score + risk category
- GRAA presence flag and country-level `# PPL` headcount (not per-org)
- Evacuation paths, LHR evac cost estimate
- Benefit Options Available → enum (`CATEGORIES_1_2`, `CATEGORIES_3_4`,
  `CATEGORY_4_ONLY`, `DECLINE`)
- `evacuationFeasible` derived from benefit decline, zero evac cost, or
  context notes mentioning difficult evac

### Premium & Agg Calc → `PolicyRateSeedRecord` + `LedgerMonthSeedRecord`

- **Rates sheet** — policy year, category label, plan type (Essential/Premium),
  premium/aggregate **per-person-per-month** with fixed VAT treatment:
  premium **includes** VAT, aggregate **excludes** VAT (15% SA default when
  modelled later).
- **Ledger sheet** — month (`YYYY-MM`), member counts, monthly premium/agg,
  annual agg, optional endorsement flag + note.

Confirmed rate card examples (2025–2026 on-risk term):

| Category  | Premium pppm (incl VAT) | Aggregate pppm (excl VAT) |
| --------- | ----------------------- | ------------------------- |
| Essential | R24.06                  | R35.00                    |
| Premium   | R77.44                  | R112.44                   |

## exceljs adapter

`src/lib/import/parse-excel.ts`:

- `readExcelSheetGrid(buffer, sheetName?)` — production path when a real
  `.xlsx` is available locally (never committed).
- `gridToRecords(grid)` — pure path used by loaders and unit tests.
- `buildExcelBuffer(sheets)` — tests only; builds workbooks in memory.

## Import metadata

`buildWorkbookImportMetadata()` in `src/lib/import/metadata.ts` records
`source`, `lastImportedAt`, optional SHA-256 `checksum`, and `rowCount` —
mirroring the spatial `SpatialDatasetRefresh` pattern.

## When a live DB exists

1. Add Prisma `Territory` / `Policy` models in their respective to-dos.
2. Thin seed script: read local `.xlsx` → `readExcelSheetGrid` → loaders →
   transactional `$executeRaw` / Prisma writes.
3. Recalibration Wizard reconciles org/location detail against ledger totals
   (workbooks do not contain per-org registers).

## Fixtures

Under `src/lib/import/fixtures/` — small anonymised row grids only. Never
commit real workbook binaries or insured-person identifiers.
