import type { BenefitOptionsAvailable } from "@/lib/territory/types";
import type { PlanType } from "@/lib/org-location/types";

/** Whether a CoverCategory plan type is permitted under Territory benefit options. */
export function isPlanPermitted(
  benefitOptions: BenefitOptionsAvailable,
  planType: PlanType,
): boolean {
  if (benefitOptions === "DECLINE") return false;
  if (planType === "ESSENTIAL") return benefitOptions === "CATEGORIES_1_2";
  return true;
}

/**
 * Build territory × cover-category eligibility pairs for a policy's categories.
 */
export function seedTerritoryEligibility(input: {
  clientId: string;
  categories: readonly Readonly<{ id: string; planType: PlanType }>[];
  territories: readonly Readonly<{ id: string; benefitOptions: BenefitOptionsAvailable }>[];
}): readonly Readonly<{
  territoryId: string;
  coverCategoryId: string;
  clientId: string;
}>[] {
  const rows: { territoryId: string; coverCategoryId: string; clientId: string }[] = [];
  for (const territory of input.territories) {
    for (const category of input.categories) {
      if (isPlanPermitted(territory.benefitOptions, category.planType)) {
        rows.push({
          territoryId: territory.id,
          coverCategoryId: category.id,
          clientId: input.clientId,
        });
      }
    }
  }
  return rows;
}
