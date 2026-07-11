"use client";

import { displayLabel, toRiskCategoryLabel } from "@/lib/territory/types";
import type { TerritoryRecord } from "@/lib/territory/types";
import { RISK_CATEGORY_HEX } from "@/lib/territory/colors";
import { cn } from "@/lib/utils";

type TerritoryListProps = Readonly<{
  territories: readonly TerritoryRecord[];
  selectedId: string | null;
  query: string;
  onQueryChange: (value: string) => void;
  onSelect: (id: string) => void;
}>;

export function TerritoryList({
  territories,
  selectedId,
  query,
  onQueryChange,
  onSelect,
}: TerritoryListProps) {
  const filtered = territories.filter((t) => {
    const haystack = displayLabel(t.country, t.subRegion).toLowerCase();
    return haystack.includes(query.trim().toLowerCase());
  });

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-muted-foreground font-medium">Search territories</span>
        <input
          type="search"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Country or sub-region"
          className="border-input bg-background focus-visible:ring-ring h-9 rounded-lg border px-3 text-sm outline-none focus-visible:ring-2"
        />
      </label>
      <ul aria-label="Territories" className="min-h-0 flex-1 space-y-1 overflow-y-auto pr-1">
        {filtered.map((t) => {
          const selected = t.id === selectedId;
          return (
            <li key={t.id}>
              <button
                type="button"
                aria-current={selected ? "true" : undefined}
                onClick={() => onSelect(t.id)}
                className={cn(
                  "hover:bg-muted focus-visible:ring-ring flex w-full items-start gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors outline-none focus-visible:ring-2",
                  selected && "bg-muted",
                )}
              >
                <span
                  aria-hidden
                  className="mt-1 size-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: RISK_CATEGORY_HEX[t.riskCategory] }}
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">
                    {displayLabel(t.country, t.subRegion)}
                  </span>
                  <span className="text-muted-foreground block text-xs">
                    {toRiskCategoryLabel(t.riskCategory)} · score {t.totalScore}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
        {filtered.length === 0 ? (
          <li className="text-muted-foreground px-2 py-4 text-sm">
            No territories match “{query}”.
          </li>
        ) : null}
      </ul>
    </div>
  );
}
