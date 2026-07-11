import {
  assertPlanEligibleInTerritory,
  assertUnderwritingGates,
} from "@/lib/org-location/eligibility";
import type { PlanType } from "@/lib/org-location/types";
import type { TerritoryBenefitEligibilityRecord } from "@/lib/policy/types";
import type { BenefitOptionsAvailable, RiskCategoryCode } from "@/lib/territory/types";

export class CoverCategoryNotEligibleError extends Error {
  constructor(message = "The selected cover category is not permitted in this territory") {
    super(message);
    this.name = "CoverCategoryNotEligibleError";
  }
}

type UnderwritingFlags = Readonly<{
  riskMgmtPlanOnFile: boolean;
  crisisMgmtPlanOnFile: boolean;
  fullUnderwritingApproved: boolean;
}>;

/**
 * What-if underwriting gates: TerritoryBenefitEligibility matrix + plan/territory
 * rules and UW flags from eligibility.ts.
 */
export function assertWhatIfGates(input: {
  benefitOptions: BenefitOptionsAvailable;
  riskCategory: RiskCategoryCode;
  planType: PlanType;
  coverCategoryId: string;
  territoryId: string;
  eligibility: readonly TerritoryBenefitEligibilityRecord[];
  flags: UnderwritingFlags;
}): void {
  assertPlanEligibleInTerritory(input.benefitOptions, input.planType);
  assertUnderwritingGates(input.riskCategory, input.planType, input.flags);

  const permitted = input.eligibility.some(
    (row) => row.territoryId === input.territoryId && row.coverCategoryId === input.coverCategoryId,
  );
  if (!permitted) {
    throw new CoverCategoryNotEligibleError();
  }
}
