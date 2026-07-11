import { describe, expect, it } from "vitest";
import { TERRITORY_FIXTURES } from "@/lib/territory/fixtures";
import {
  applyTerritoryFilters,
  clearTerritoryFilters,
  countActiveFilters,
  DEFAULT_TERRITORY_FILTERS,
  hasActiveFilters,
} from "@/lib/territory/filters";

describe("territory filters", () => {
  it("returns all fixtures with default filters", () => {
    expect(applyTerritoryFilters(TERRITORY_FIXTURES, DEFAULT_TERRITORY_FILTERS)).toHaveLength(4);
    expect(hasActiveFilters(DEFAULT_TERRITORY_FILTERS)).toBe(false);
    expect(countActiveFilters(DEFAULT_TERRITORY_FILTERS)).toBe(0);
  });

  it("filters by risk category", () => {
    const result = applyTerritoryFilters(TERRITORY_FIXTURES, {
      ...DEFAULT_TERRITORY_FILTERS,
      riskCategories: new Set(["Low"]),
    });
    expect(result.map((t) => t.id)).toEqual(["terr-zaf", "terr-ken"]);
  });

  it("filters by GRAA presence", () => {
    const result = applyTerritoryFilters(TERRITORY_FIXTURES, {
      ...DEFAULT_TERRITORY_FILTERS,
      graaPresence: "yes",
    });
    expect(result.every((t) => t.graaPresence)).toBe(true);
    expect(result).toHaveLength(3);
  });

  it("filters by benefit options and evacuation", () => {
    const result = applyTerritoryFilters(TERRITORY_FIXTURES, {
      ...DEFAULT_TERRITORY_FILTERS,
      benefitOptions: new Set(["DECLINE"]),
      evacuation: "no",
    });
    expect(result.map((t) => t.id)).toEqual(["terr-som-punt"]);
  });

  it("clearTerritoryFilters resets to defaults", () => {
    const cleared = clearTerritoryFilters();
    expect(cleared).toEqual(DEFAULT_TERRITORY_FILTERS);
  });

  it("counts active filter facets", () => {
    expect(
      countActiveFilters({
        ...DEFAULT_TERRITORY_FILTERS,
        graaPresence: "yes",
        evacuation: "no",
      }),
    ).toBe(2);
  });
});
