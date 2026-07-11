# Plan: `risk-register-map-filters`

**Status:** approved (Composer 2.5 ready)  
**Model (implementation):** Composer 2.5 Fast  
**Branch:** `feat/risk-register-map-filters` (from `main` after merged #9)  
**Does not edit:** `.cursor/plans/africa-risk-map-platform-plan.md`

## Goal

Add multi-facet left-panel filters deferred from `risk-register-map-core`: risk-tier toggles, GRAA presence, benefit options, and evacuation feasibility — applied consistently to list, table, and map choropleth.

## Deliverables

### 1. Pure filter module (`src/lib/territory/filters.ts`)

- `TerritoryFilterState` — risk categories (multi-select, default all), GRAA (`all` | `yes` | `no`), benefit options (multi-select, default all), evacuation (`all` | `yes` | `no`)
- `DEFAULT_TERRITORY_FILTERS`, `applyTerritoryFilters`, `countActiveFilters`, `hasActiveFilters`
- Unit tests in `filters.test.ts`

### 2. UI — `TerritoryFiltersPanel`

- Fieldset in left panel above search (progressive disclosure: compact summary + “Clear filters” when active)
- Risk tier checkboxes with colour swatches (match legend)
- GRAA / evacuation as radio groups; benefit options as checkboxes with human labels
- `aria-live` count: “Showing N of M territories”

### 3. Wire workspace

- Filter state in `RiskMapWorkspace`; derive `filteredTerritories`
- Pass filtered set to `TerritoryList`, `TerritoryTable`, `MapCanvas`
- Map: matching polygons full opacity; non-matching dimmed (0.12) and non-interactive
- Clear selection if selected territory drops out of filter set

### 4. Tests + docs

- Extend `map-ui.test.tsx` for filter panel + combined filter behaviour
- Update `docs/territory-risk-register.md` (filters section)
- Optional canonical line in `90-project-context.mdc`

## Out of scope

- Client org/location pins, server-side query filters, URL persistence, saved filter presets

## Verification

`npm run typecheck` / `lint` / `test` / `build` → Conventional Commit → PR
