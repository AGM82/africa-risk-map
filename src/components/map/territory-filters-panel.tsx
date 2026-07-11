"use client";

import { Button } from "@/components/ui/button";
import { getRiskCategoryHex } from "@/lib/territory/colors";
import {
  BENEFIT_OPTION_FILTER_OPTIONS,
  hasActiveFilters,
  RISK_CATEGORY_FILTER_OPTIONS,
  type EvacuationFilter,
  type GraaPresenceFilter,
  type TerritoryFilterState,
} from "@/lib/territory/filters";
import type { BenefitOptionsAvailable, RiskCategoryCode } from "@/lib/territory/types";

type TerritoryFiltersPanelProps = Readonly<{
  filters: TerritoryFilterState;
  totalCount: number;
  visibleCount: number;
  onChange: (filters: TerritoryFilterState) => void;
  onClear: () => void;
}>;

function toggleSetMember<T>(set: ReadonlySet<T>, value: T, checked: boolean): ReadonlySet<T> {
  const next = new Set(set);
  if (checked) {
    next.add(value);
  } else {
    next.delete(value);
  }
  return next;
}

export function TerritoryFiltersPanel({
  filters,
  totalCount,
  visibleCount,
  onChange,
  onClear,
}: TerritoryFiltersPanelProps) {
  const active = hasActiveFilters(filters);

  function setRiskCategory(code: RiskCategoryCode, checked: boolean) {
    const next = toggleSetMember(filters.riskCategories, code, checked);
    if (next.size === 0) {
      return;
    }
    onChange({ ...filters, riskCategories: next });
  }

  function setBenefitOption(code: BenefitOptionsAvailable, checked: boolean) {
    const next = toggleSetMember(filters.benefitOptions, code, checked);
    if (next.size === 0) {
      return;
    }
    onChange({ ...filters, benefitOptions: next });
  }

  function setGraaPresence(value: GraaPresenceFilter) {
    onChange({ ...filters, graaPresence: value });
  }

  function setEvacuation(value: EvacuationFilter) {
    onChange({ ...filters, evacuation: value });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <p className="text-muted-foreground text-xs" aria-live="polite">
          Showing {visibleCount} of {totalCount} territories
        </p>
        {active ? (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-7 shrink-0 px-2 text-xs"
            onClick={onClear}
          >
            Clear filters
          </Button>
        ) : null}
      </div>

      <fieldset className="border-border space-y-2 rounded-lg border p-3">
        <legend className="px-1 text-xs font-semibold tracking-wide uppercase">Risk tier</legend>
        {RISK_CATEGORY_FILTER_OPTIONS.map(({ code, label }) => (
          <label key={code} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={filters.riskCategories.has(code)}
              onChange={(e) => setRiskCategory(code, e.target.checked)}
            />
            <span
              aria-hidden
              className="size-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: getRiskCategoryHex(code) }}
            />
            {label}
          </label>
        ))}
      </fieldset>

      <fieldset className="border-border space-y-2 rounded-lg border p-3">
        <legend className="px-1 text-xs font-semibold tracking-wide uppercase">
          GRAA presence
        </legend>
        {(
          [
            ["all", "All territories"],
            ["yes", "GRAA members only"],
            ["no", "No GRAA presence"],
          ] as const
        ).map(([value, label]) => (
          <label key={value} className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="graa-presence"
              checked={filters.graaPresence === value}
              onChange={() => setGraaPresence(value)}
            />
            {label}
          </label>
        ))}
      </fieldset>

      <fieldset className="border-border space-y-2 rounded-lg border p-3">
        <legend className="px-1 text-xs font-semibold tracking-wide uppercase">
          Benefit options
        </legend>
        {BENEFIT_OPTION_FILTER_OPTIONS.map(({ code, label }) => (
          <label key={code} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={filters.benefitOptions.has(code)}
              onChange={(e) => setBenefitOption(code, e.target.checked)}
            />
            {label}
          </label>
        ))}
      </fieldset>

      <fieldset className="border-border space-y-2 rounded-lg border p-3">
        <legend className="px-1 text-xs font-semibold tracking-wide uppercase">
          Evacuation feasible
        </legend>
        {(
          [
            ["all", "All"],
            ["yes", "Feasible only"],
            ["no", "Not feasible only"],
          ] as const
        ).map(([value, label]) => (
          <label key={value} className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="evacuation-feasible"
              checked={filters.evacuation === value}
              onChange={() => setEvacuation(value)}
            />
            {label}
          </label>
        ))}
      </fieldset>
    </div>
  );
}
