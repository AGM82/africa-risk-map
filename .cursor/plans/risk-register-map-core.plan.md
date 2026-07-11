# Plan: `risk-register-map-core`

**Status:** implemented  
**Model (implementation):** Grok 4.5 High Fast — confirm in Agent panel before writing code  
**Branch:** `feat/risk-register-map-core` (from current `main`, includes merged spatial + workbook imports)  
**Does not edit:** `.cursor/plans/africa-risk-map-platform-plan.md`

## Scope posture

Same code-first approach as Foundations / import to-dos where live PostGIS is unavailable:

- **Ship** Prisma models + hand-authored migration, domain logic, MapLibre UI shell, fixture-driven data path.
- **Do not require** Neon/`prisma migrate deploy` for CI green.
- **Defer** advanced filters to `risk-register-map-filters` (Composer).
- **Defer** client org/location pins (need Phase 3 Client/Org models).
- **Defer** live Martin/PostGIS vector tiles and R2 PMTiles hosting (env keys already documented; map uses fixture GeoJSON / public demo basemap URL until R2 is provisioned).

## Goal

Land the **Territory risk register + map core** so Insurer users can view/edit shared territory risk scores (with audit history), and everyone can see a MapLibre map shaded by risk category with a click-through detail panel and accessible table fallback.

## Deliverables

### 1. Prisma: Territory + TerritoryRiskHistory

Extend `prisma/schema.prisma` + `prisma/migrations/0003_territory/` (hand-authored, Foundations style):

| Model                  | Notes                                                                                                                                                                                                 |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Territory`            | Shared/global — **no `clientId`, no RLS**. Fields aligned to `TerritorySeedRecord` + `cuid` id, unique `(country, subRegion)` (nullable subRegion). Enums: `RiskCategory`, `BenefitOptionsAvailable`. |
| `TerritoryRiskHistory` | Snapshot of sub-scores / total / category on each Insurer edit. FK → Territory `onDelete: Restrict`, `onUpdate: Cascade`. Indexes on `territoryId`, `createdAt`.                                      |

Also:

- Optional optional link field for later ADM1 join (e.g. `adminBoundaryExternalId` or `isoCountry` + `subRegion`) — keep minimal; full spatial join can land when PostGIS is live.
- Update schema header comments; list Territory as canonical in `90-project-context.mdc`.

### 2. Domain layer (pure, tested)

Under `src/lib/territory/`:

- `types.ts` / re-use import enums where possible (or Prisma enums once generated)
- `score.ts` — compute / validate total score + risk category rules (Zod)
- `mapper.ts` — `TerritorySeedRecord` → Territory create input
- `history.ts` — build history snapshot from before/after
- In-memory / fixture repository interface for UI + tests until DB is wired (`TerritoryRepository` with fixture impl)

CRUD service methods (Insurer-only mutation checks at the service boundary using `AuthContext`):

- `listTerritories`, `getTerritory`, `updateTerritoryScores` (writes history + audit-shaped diff payload), `createTerritory`, `deleteTerritory` (requires explicit confirm flag)

No live Prisma writes required for tests; optional thin Prisma adapter stubbed behind the repository interface.

### 3. MapLibre map core UI

Dependencies (justify in PR): `maplibre-gl`, `react-map-gl` (MapLibre). Skip deck.gl until H3/advanced layers.

UI layout (Kepler-style, brand Analyst chrome + dark map exception):

- Route: `/map` (or `/territories`) — authenticated
- Left panel: territory list (searchable name only — richer filters = next to-do)
- Centre: MapLibre canvas, dark basemap, Africa bounds
- Risk choropleth from fixture ADM1/territory GeoJSON joined to fixture territory scores (risk-severity green→amber→orange→red→extreme; label always paired)
- Click territory → **non-modal** detail drawer (not a dialog)
- Legend for risk categories
- Toggle stubs for POI layers (airports / health / places) — UI checkboxes wired to fixture GeoJSON points; live PostGIS later
- **Table fallback** view toggle (same territories) for WCAG — map is not the only path
- `expectNoA11yViolations()` on drawer / list / table components

Basemap: configurable `NEXT_PUBLIC_MAP_STYLE_URL` (document in env setup); default to a free MapLibre-compatible dark style URL for local/demo so CI/build does not need R2.

### 4. Insurer edit surface

- Territory detail drawer shows 6 sub-scores, total, category, benefit options, evac feasibility, notes
- Insurer-only edit form for sub-scores; save goes through service (fixture repo in this to-do)
- Delete Territory requires named confirm ("Delete territory")

### 5. Fixtures + tests

- Small territory JSON fixture (reuse / extend import sample)
- Tiny GeoJSON for map shading tests (or mock map component in unit tests — MapLibre WebGL may not run in happy-dom; prefer testing legend/list/drawer/service; smoke-render map shell with mocked Map)
- Coverage gates maintained

### 6. Explicitly out of scope

| Deferred to                 | Item                                                                    |
| --------------------------- | ----------------------------------------------------------------------- |
| `risk-register-map-filters` | Risk-tier filters, GRAA presence filter, multi-facet left-panel filters |
| Phase 3                     | Client org/location pin overlay                                         |
| Live Neon                   | Seed script, `$queryRaw` ADM1 join, Martin tiles                        |
| Phase 8                     | H3, custom draw, isochrones                                             |
| `user-admin`                | Real role assignment UI (use existing Clerk metadata checks)            |

## Proposed file layout

```
docs/territory-risk-register.md
prisma/schema.prisma                          # += Territory models
prisma/migrations/0003_territory/migration.sql
src/lib/territory/...
src/components/map/...                        # MapShell, Legend, TerritoryDrawer, TerritoryTable
src/app/(app)/map/page.tsx                    # or /territories
.cursor/rules/90-project-context.mdc          # += canonical refs
docs/environment-setup.md                     # += NEXT_PUBLIC_MAP_STYLE_URL
```

## Verification

1. `npm run typecheck` / `lint` / `test` / `build`
2. Conventional Commit(s), push, PR → `main`

## Approval gate

No implementation until this plan is approved. Reply **approve** / **go** (or request scope changes).
