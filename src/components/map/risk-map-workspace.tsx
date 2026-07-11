"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState, useTransition } from "react";
import { UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { RiskLegend } from "@/components/map/risk-legend";
import { TerritoryDrawer } from "@/components/map/territory-drawer";
import { TerritoryFiltersPanel } from "@/components/map/territory-filters-panel";
import { TerritoryList } from "@/components/map/territory-list";
import { TerritoryTable } from "@/components/map/territory-table";
import {
  applyTerritoryFilters,
  clearTerritoryFilters,
  DEFAULT_TERRITORY_FILTERS,
  hasActiveFilters,
} from "@/lib/territory/filters";
import { createFixtureTerritoryRepository } from "@/lib/territory/fixture-repository";
import { TERRITORY_FIXTURES } from "@/lib/territory/fixtures";
import { createTerritoryService } from "@/lib/territory/service";
import type { AuthContext } from "@/lib/auth/types";
import type { TerritoryRecord, TerritoryScoreUpdate } from "@/lib/territory/types";
import type { TerritorySignalSummary } from "@/components/map/territory-drawer";

const MapCanvas = dynamic(
  () => import("@/components/map/map-canvas").then((mod) => mod.MapCanvas),
  {
    ssr: false,
    loading: () => (
      <div
        className="bg-muted text-muted-foreground flex h-full items-center justify-center text-sm"
        role="status"
      >
        Loading map…
      </div>
    ),
  },
);

type RiskMapWorkspaceProps = Readonly<{
  auth: AuthContext;
  signals?: readonly (TerritorySignalSummary & { territoryId: string })[];
}>;

export function RiskMapWorkspace({ auth, signals = [] }: RiskMapWorkspaceProps) {
  const service = useMemo(
    () => createTerritoryService(createFixtureTerritoryRepository(TERRITORY_FIXTURES)),
    [],
  );
  const [territories, setTerritories] = useState<TerritoryRecord[]>(() => [...TERRITORY_FIXTURES]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState(DEFAULT_TERRITORY_FILTERS);
  const [view, setView] = useState<"map" | "table">("map");
  const [poi, setPoi] = useState({
    airports: true,
    health: false,
    places: false,
  });
  const [, startTransition] = useTransition();

  const filteredTerritories = useMemo(
    () => applyTerritoryFilters(territories, filters),
    [territories, filters],
  );
  const filteredIds = useMemo(
    () => new Set(filteredTerritories.map((t) => t.id)),
    [filteredTerritories],
  );
  const filtersActive = hasActiveFilters(filters);

  const selected = territories.find((t) => t.id === selectedId) ?? null;
  const canEdit = auth.role === "INSURER_ADMIN";
  const selectedSignals = useMemo(
    () =>
      selectedId === null
        ? []
        : signals
            .filter((s) => s.territoryId === selectedId)
            .map((s) => ({
              id: s.id,
              source: s.source,
              indicator: s.indicator,
              value: s.value,
              status: s.status,
              reviewSuggested: s.reviewSuggested,
              asOfDate: s.asOfDate,
            })),
    [selectedId, signals],
  );

  useEffect(() => {
    if (selectedId !== null && !filteredIds.has(selectedId)) {
      setSelectedId(null);
    }
  }, [filteredIds, selectedId]);

  async function refresh() {
    const list = await service.listTerritories();
    setTerritories(list);
  }

  async function handleSaveScores(id: string, scores: TerritoryScoreUpdate) {
    await service.updateTerritoryScores(auth, id, scores);
    await refresh();
  }

  async function handleDelete(id: string) {
    await service.deleteTerritory(auth, id, { confirm: true });
    setSelectedId(null);
    await refresh();
  }

  return (
    <div className="bg-background text-foreground flex h-svh flex-col">
      <header className="border-border flex items-center justify-between gap-4 border-b px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            href="/"
            className="text-muted-foreground hover:text-foreground text-sm underline-offset-2 hover:underline"
          >
            Home
          </Link>
          <h1 className="truncate text-lg font-semibold tracking-tight">Risk register &amp; map</h1>
          <span className="text-muted-foreground hidden text-xs sm:inline">{auth.role}</span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant={view === "map" ? "default" : "outline"}
            onClick={() => setView("map")}
          >
            Map
          </Button>
          <Button
            type="button"
            size="sm"
            variant={view === "table" ? "default" : "outline"}
            onClick={() => setView("table")}
          >
            Table
          </Button>
          <UserButton />
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <aside className="border-border bg-card flex w-80 shrink-0 flex-col gap-4 overflow-y-auto border-r p-4">
          <TerritoryFiltersPanel
            filters={filters}
            totalCount={territories.length}
            visibleCount={filteredTerritories.length}
            onChange={setFilters}
            onClear={() => setFilters(clearTerritoryFilters())}
          />
          <TerritoryList
            territories={filteredTerritories}
            selectedId={selectedId}
            query={query}
            filtersActive={filtersActive}
            onQueryChange={setQuery}
            onSelect={(id) => {
              startTransition(() => setSelectedId(id));
            }}
          />
          <fieldset className="border-border space-y-2 rounded-lg border p-3">
            <legend className="px-1 text-xs font-semibold tracking-wide uppercase">
              Reference layers
            </legend>
            {[
              ["airports", "Airports / airstrips"] as const,
              ["health", "Hospitals & clinics"] as const,
              ["places", "Cities / towns"] as const,
            ].map(([key, label]) => {
              const checked =
                key === "airports" ? poi.airports : key === "health" ? poi.health : poi.places;
              return (
                <label key={key} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => {
                      const value = e.target.checked;
                      setPoi((prev) => {
                        if (key === "airports") {
                          return { ...prev, airports: value };
                        }
                        if (key === "health") {
                          return { ...prev, health: value };
                        }
                        return { ...prev, places: value };
                      });
                    }}
                  />
                  {label}
                </label>
              );
            })}
          </fieldset>
        </aside>

        <main className="relative min-w-0 flex-1">
          {view === "map" ? (
            <>
              <div className="absolute inset-0 bg-[#0b1220]">
                <MapCanvas
                  territories={territories}
                  filteredIds={filteredIds}
                  selectedId={selectedId}
                  poi={poi}
                  onSelectTerritory={setSelectedId}
                />
              </div>
              <RiskLegend className="absolute bottom-4 left-4 z-10 max-w-56" />
            </>
          ) : (
            <TerritoryTable
              className="h-full p-4"
              territories={filteredTerritories}
              selectedId={selectedId}
              onSelect={setSelectedId}
            />
          )}

          <TerritoryDrawer
            territory={selected}
            canEdit={canEdit}
            signals={selectedSignals}
            onClose={() => setSelectedId(null)}
            onSaveScores={handleSaveScores}
            onDelete={handleDelete}
          />
        </main>
      </div>
    </div>
  );
}
