import type {
  BenefitOptionsAvailable,
  RiskCategoryCode,
  TerritoryRecord,
} from "@/lib/territory/types";
import { BENEFIT_OPTIONS, RISK_CATEGORY_LABELS } from "@/lib/territory/types";

export type GraaPresenceFilter = "all" | "yes" | "no";
export type EvacuationFilter = "all" | "yes" | "no";

export type TerritoryFilterState = Readonly<{
  riskCategories: ReadonlySet<RiskCategoryCode>;
  graaPresence: GraaPresenceFilter;
  benefitOptions: ReadonlySet<BenefitOptionsAvailable>;
  evacuation: EvacuationFilter;
}>;

const ALL_RISK_CATEGORIES = new Set<RiskCategoryCode>(
  RISK_CATEGORY_LABELS.map((label) => (label === "Very High" ? "VeryHigh" : label)),
);

const ALL_BENEFIT_OPTIONS = new Set<BenefitOptionsAvailable>(BENEFIT_OPTIONS);

export const DEFAULT_TERRITORY_FILTERS: TerritoryFilterState = {
  riskCategories: ALL_RISK_CATEGORIES,
  graaPresence: "all",
  benefitOptions: ALL_BENEFIT_OPTIONS,
  evacuation: "all",
};

export const BENEFIT_OPTION_LABELS: Record<BenefitOptionsAvailable, string> = {
  CATEGORIES_1_2: "Categories 1–2",
  CATEGORIES_3_4: "Categories 3–4",
  CATEGORY_4_ONLY: "Category 4 only",
  DECLINE: "Decline",
};

export function applyTerritoryFilters(
  territories: readonly TerritoryRecord[],
  filters: TerritoryFilterState,
): TerritoryRecord[] {
  return territories.filter((t) => matchesTerritoryFilters(t, filters));
}

export function matchesTerritoryFilters(
  territory: TerritoryRecord,
  filters: TerritoryFilterState,
): boolean {
  if (!filters.riskCategories.has(territory.riskCategory)) {
    return false;
  }
  if (filters.graaPresence === "yes" && !territory.graaPresence) {
    return false;
  }
  if (filters.graaPresence === "no" && territory.graaPresence) {
    return false;
  }
  if (!filters.benefitOptions.has(territory.benefitOptions)) {
    return false;
  }
  if (filters.evacuation === "yes" && !territory.evacuationFeasible) {
    return false;
  }
  if (filters.evacuation === "no" && territory.evacuationFeasible) {
    return false;
  }
  return true;
}

export function countActiveFilters(filters: TerritoryFilterState): number {
  let count = 0;
  if (filters.riskCategories.size !== ALL_RISK_CATEGORIES.size) {
    count += 1;
  }
  if (filters.graaPresence !== "all") {
    count += 1;
  }
  if (filters.benefitOptions.size !== ALL_BENEFIT_OPTIONS.size) {
    count += 1;
  }
  if (filters.evacuation !== "all") {
    count += 1;
  }
  return count;
}

export function hasActiveFilters(filters: TerritoryFilterState): boolean {
  return countActiveFilters(filters) > 0;
}

export function clearTerritoryFilters(): TerritoryFilterState {
  return DEFAULT_TERRITORY_FILTERS;
}

export const RISK_CATEGORY_FILTER_OPTIONS: readonly {
  code: RiskCategoryCode;
  label: string;
}[] = [
  { code: "Low", label: "Low" },
  { code: "Medium", label: "Medium" },
  { code: "High", label: "High" },
  { code: "VeryHigh", label: "Very High" },
  { code: "Extreme", label: "Extreme" },
];

export const BENEFIT_OPTION_FILTER_OPTIONS: readonly {
  code: BenefitOptionsAvailable;
  label: string;
}[] = [
  { code: "CATEGORIES_1_2", label: BENEFIT_OPTION_LABELS.CATEGORIES_1_2 },
  { code: "CATEGORIES_3_4", label: BENEFIT_OPTION_LABELS.CATEGORIES_3_4 },
  { code: "CATEGORY_4_ONLY", label: BENEFIT_OPTION_LABELS.CATEGORY_4_ONLY },
  { code: "DECLINE", label: BENEFIT_OPTION_LABELS.DECLINE },
];
