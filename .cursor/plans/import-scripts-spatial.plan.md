# Plan: `import-scripts-spatial`

**Status:** awaiting approval  
**Model (implementation):** Grok 4.5 High Fast — confirm in the Agent panel before writing any code  
**Branch:** `feat/import-scripts-spatial` (from current `main`)  
**Scope:** CODE + TESTS ONLY against fixtures/sample data — no live Postgres/PostGIS, no `prisma migrate deploy`, no Neon  
**Does not edit:** `.cursor/plans/africa-risk-map-platform-plan.md`

## Context (Foundations ground truth)

Foundations is merged and green on `main`. Relevant facts for this to-do:

| Already in place                                                                 | Implication for this to-do                                                                                                           |
| -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `prisma/schema.prisma` has PostGIS extension + `AuditLogEntry` only              | Spatial tables are the next schema addition; **do not** invent `Territory` / `Client` / `Broker` here                                |
| `prisma/migrations/0001_init/` enables PostGIS + RLS on `audit_log_entries`      | Hand-author `0002_spatial_layers` the same way (no live DB to `prisma migrate diff` against yet); note drift-check comment like 0001 |
| `src/lib/db/tenant-context.ts` sets RLS GUCs for client-scoped work              | Spatial reference layers are **shared/global** — no `clientId`, **no RLS policies** (same future posture as Territory)               |
| `src/lib/db/spatial.ts` does not exist yet                                       | Create the geometry helpers here; list them in `90-project-context.mdc` canonical files when done                                    |
| `docker-compose.yml` PostGIS exists but Docker may be unavailable on the machine | Do not require `docker compose up` for this PR to pass CI                                                                            |
| Coverage gates: lines/functions ≥80%, branches ≥70%                              | New loader/helper code must be tested; keep axe/coverage gates intact                                                                |

## Goal

Land the PostGIS-ready spatial **import foundation** so Phase 2 (Risk Register & Map) can load ADM1 polygons and POI layers without re-discovering the Prisma geometry pattern.

This to-do is **parsers + schema + helpers + docs + tests**. Persistence against a live DB is deferred until a Neon/Docker instance is provisioned.

## Deliverables

### 1. Documented Prisma + PostGIS geometry pattern

Add `docs/prisma-postgis-geometry.md` covering:

- `Unsupported("geometry(Point,4326)")` / `Unsupported("geometry(MultiPolygon,4326)")` in `schema.prisma`
- Why Prisma has no native geometry type
- How to write spatial predicates via **parameterised** `$queryRaw` / `$executeRaw` only (never string-built SQL — `10-security-popia.mdc` / `61-database.mdc`)
- GiST indexes on every geometry column
- Shared/global nature of these tables (no `clientId`, no RLS tenant filter)
- SRID **4326** (WGS84) as the project standard for all stored geometries
- Attribution / licence notes: geoBoundaries CC BY 4.0, OurAirports public domain, healthsites.io ODbL, GeoNames CC BY

Add thin helpers in `src/lib/db/spatial.ts` so callers do not invent ad-hoc SQL:

- WKT builders for Point / MultiPolygon from validated lon/lat or rings (reject NaN / out-of-range coords)
- Typed wrappers for insert/select patterns that will later call `$executeRaw` (may be stubbed or documented if they require a live DB — **prefer pure functions that return SQL fragments + bound params**, not live executes in this to-do)
- Unit tests in `src/lib/db/spatial.test.ts`

### 2. Schema + migration scaffold (hand-authored, Foundations style)

Extend `prisma/schema.prisma` and add `prisma/migrations/0002_spatial_layers/migration.sql`.

| Table (Prisma / SQL map)                              | Geometry             | Source                                                        |
| ----------------------------------------------------- | -------------------- | ------------------------------------------------------------- |
| `AdminBoundary` → `admin_boundaries`                  | `MultiPolygon`, 4326 | geoBoundaries ADM1                                            |
| `Airport` → `airports`                                | `Point`, 4326        | OurAirports                                                   |
| `HealthFacility` → `health_facilities`                | `Point`, 4326        | healthsites.io                                                |
| `Place` → `places`                                    | `Point`, 4326        | GeoNames                                                      |
| `SpatialDatasetRefresh` → `spatial_dataset_refreshes` | —                    | source key + `lastRefreshedAt` + optional checksum / rowCount |

**Minimum columns (tune names for consistency with codebase style):**

- Stable external id (unique per source), display name/label
- ISO 3166-1 alpha-3 or alpha-2 country code where the source provides it (document which)
- `source` string (e.g. `geoboundaries`, `ourairports`, `healthsites`, `geonames`)
- `sourceUpdatedAt` and/or FK / link to `SpatialDatasetRefresh`
- Geometry as `Unsupported("geometry(...)")` — **not** readable through normal Prisma selects; spatial I/O always via raw SQL helpers
- Timestamps: `createdAt` / `updatedAt` as appropriate

Migration must include:

- `CREATE EXTENSION IF NOT EXISTS postgis` (idempotent; already in 0001)
- Tables + **GiST** indexes on every geometry column
- B-tree indexes on lookup columns (`isoCountry`, external ids, `source`)
- Explicit FK `ON DELETE` / `ON UPDATE` if any FKs are introduced
- **No RLS** policies on these tables
- Header comment: hand-authored; reconcile with `prisma migrate diff` once a live DB exists (same note style as 0001)

Also update `.cursor/rules/90-project-context.mdc` canonical-files list to include `src/lib/db/spatial.ts` and `docs/prisma-postgis-geometry.md`.

### 3. Pure loader modules (unit-testable)

Under `src/lib/spatial/loaders/`:

| Module             | Input fixture shape                          | Output                                  |
| ------------------ | -------------------------------------------- | --------------------------------------- |
| `geoboundaries.ts` | geoBoundaries ADM1 GeoJSON FeatureCollection | normalised admin-boundary records + WKT |
| `ourairports.ts`   | OurAirports CSV rows                         | airport point records + WKT             |
| `healthsites.ts`   | healthsites GeoJSON (or CSV) subset          | health facility records + WKT           |
| `geonames.ts`      | GeoNames TSV/CSV subset                      | place records + WKT                     |

Shared:

- `src/lib/spatial/types.ts` — normalised record types + `SpatialSourceMetadata`
- `src/lib/spatial/metadata.ts` — build `source` + `lastRefreshedAt` (+ optional checksum/rowCount) payloads for `SpatialDatasetRefresh`
- Optional small `src/lib/spatial/parse-csv.ts` if needed — prefer Node built-ins + Zod over new deps

**Hard rule:** loaders are **pure parsers/normalisers** — no Prisma client, no network I/O, no filesystem reads of non-fixture paths in the loader itself. Tests pass fixture strings/objects in. Live fetch/upsert scripts can be a later thin CLI once Neon exists.

Normalisation expectations:

- Drop / skip rows with missing or invalid coordinates (document behaviour; prefer skip + count rather than throw on every bad row)
- Africa-scoped fixtures only (subset of ISO countries relevant to the book) — full continent dumps are not committed
- No real client / insured-person data in fixtures (public spatial samples only)

### 4. Fixtures + tests

- Small fixtures under `src/lib/spatial/fixtures/` (GeoJSON / CSV / TSV)
- Unit tests per loader + metadata + spatial helpers
- Coverage thresholds must remain met project-wide after the PR

### 5. Explicitly out of scope

- Live DB connection, `prisma migrate deploy`, seeding Neon/Docker
- MapLibre / Martin / PMTiles / UI map layers (`risk-register-map-*`)
- Excel workbook importers (`import-scripts-data` — next Composer to-do)
- `Territory`, `Client`, `BrokerOrganisation`, Policy domain models
- H3 heat surface, custom-drawn zones, isochrones (Phase 8)
- R2 basemap tile upload (noted in env docs for later)
- Changing CI attest / gitleaks / Semgrep behaviour

## Proposed file layout

```
docs/prisma-postgis-geometry.md
prisma/schema.prisma                          # += spatial models
prisma/migrations/0002_spatial_layers/migration.sql
src/lib/db/spatial.ts
src/lib/db/spatial.test.ts
src/lib/spatial/types.ts
src/lib/spatial/metadata.ts
src/lib/spatial/metadata.test.ts
src/lib/spatial/loaders/geoboundaries.ts
src/lib/spatial/loaders/geoboundaries.test.ts
src/lib/spatial/loaders/ourairports.ts
src/lib/spatial/loaders/ourairports.test.ts
src/lib/spatial/loaders/healthsites.ts
src/lib/spatial/loaders/healthsites.test.ts
src/lib/spatial/loaders/geonames.ts
src/lib/spatial/loaders/geonames.test.ts
src/lib/spatial/fixtures/...
.cursor/rules/90-project-context.mdc          # += canonical file refs
```

## Dependencies

- Prefer **no new runtime deps** if Zod + Node built-ins suffice for CSV/GeoJSON parsing.
- If a tiny CSV helper is truly needed, justify in the PR; otherwise hand-parse fixture CSVs (simple, stable columns).

## Implementation order (for the Grok session)

1. Confirm model is Grok 4.5 High Fast; branch from `main`
2. `docs/prisma-postgis-geometry.md` + `src/lib/db/spatial.ts` (+ tests)
3. Prisma models + `0002_spatial_layers` migration
4. Shared types/metadata (+ tests)
5. Loaders one at a time with fixtures + tests (geoBoundaries → OurAirports → healthsites → GeoNames)
6. Update `90-project-context.mdc` canonical files
7. `npm run typecheck` / `lint` / `test` / `build`
8. Conventional Commit(s), push, open PR → `main`

## Verification

On `feat/import-scripts-spatial`:

1. `npm run typecheck`
2. `npm run lint`
3. `npm run test` (coverage thresholds)
4. `npm run build`
5. Conventional Commit(s), push feature branch, open PR → `main`

## Kickoff prompt (paste into the Grok chat)

```
Implement the approved plan at
.cursor/plans/import-scripts-spatial.plan.md

Do NOT edit the plan file or africa-risk-map-platform-plan.md.

Model gate: confirm Grok 4.5 High Fast is active before writing any code.

Scope: CODE + TESTS ONLY against fixtures — no live database.

Work on feat/import-scripts-spatial from main. Keep typecheck/lint/test/build
green. Use Conventional Commits. Open a PR to main when green.
```

## Approval gate

No implementation in this Opus session. Implementation starts only after this plan is approved and a Grok 4.5 High Fast chat runs the kickoff above.
