# Territory risk register & map core

Shared, Insurer-maintained Territory risk data plus a MapLibre map shell.
Live Neon seeding and PostGIS ADM1 joins land when a database is provisioned.

Canonical domain code: `src/lib/territory/` (including `filters.ts` for list/map filter logic).  
Canonical UI: `src/components/map/` + route `/map`.  
Schema: `Territory` / `TerritoryRiskHistory` in `prisma/schema.prisma`,
migration `0003_territory`.

## Models

### Territory (global — no `clientId`, no RLS)

Aligned to workbook `TerritorySeedRecord`:

- `country` + `subRegion` (empty string = whole-country row)
- Six risk sub-scores + `totalScore` + `riskCategory`
- `benefitOptions`, `evacuationFeasible`, paths/cost/notes
- Optional `adminBoundaryExternalId` / `isoCountry` for later ADM1 join

Unique on `(country, subRegion)`.

### TerritoryRiskHistory

Immutable snapshot after each Insurer score edit. FK `onDelete: Restrict`
so history cannot be destroyed under a casual parent delete.

## Service layer

`createTerritoryService(repo)`:

| Method                                                          | Who                    |
| --------------------------------------------------------------- | ---------------------- |
| `listTerritories` / `getTerritory` / `listHistory`              | Any authenticated role |
| `createTerritory` / `updateTerritoryScores` / `deleteTerritory` | `INSURER_ADMIN` only   |

Delete requires `{ confirm: true }` (named confirm in the UI: “Delete territory”).
Today the repository is the in-memory fixture adapter
(`createFixtureTerritoryRepository`). Swap for Prisma when Neon is live.

## Map UI (`/map`)

- Left panel: multi-facet filters (risk tier, GRAA presence, benefit options, evacuation feasibility), searchable territory list, POI layer toggles
- Filters apply to list, table, and map (non-matching territories dim on the choropleth)
- Centre: MapLibre canvas (dark basemap) shaded by risk category from fixture GeoJSON
- Click → non-modal detail drawer
- Legend (colour + label)
- **Table** view toggle — WCAG fallback (map is not the only path)
- Insurer can edit sub-scores and delete (with confirm) in the drawer

Basemap URL: `NEXT_PUBLIC_MAP_STYLE_URL` (defaults to Carto Dark Matter GL for local/demo).

## Risk colours

Conventional green → amber → orange → red → extreme is a deliberate brand
exception (see platform plan). Tokens: `--risk-low` … `--risk-extreme` in
`src/app/globals.css`. MapLibre uses hex constants in
`src/lib/territory/colors.ts` (GL cannot read CSS variables).

## Out of scope here

- Client org/location pins → Phase 3
- Live PMTiles/R2 / Martin tiles → when hosting is wired
- H3 / custom zones / isochrones → Phase 8
