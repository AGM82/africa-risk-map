import type { BenefitOptionsAvailable, RiskCategoryCode } from "@/lib/territory/types";
import type { PlanType } from "@/lib/org-location/types";

export class TerritoryDeclinedError extends Error {
  constructor(message = "This territory is declined for cover") {
    super(message);
    this.name = "TerritoryDeclinedError";
  }
}

export class PlanNotEligibleError extends Error {
  constructor(
    message = "The selected plan type is not permitted in this territory's benefit options",
  ) {
    super(message);
    this.name = "PlanNotEligibleError";
  }
}

export class UnderwritingGateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UnderwritingGateError";
  }
}

const HIGH_RISK_CATEGORIES: readonly RiskCategoryCode[] = ["VeryHigh", "Extreme"];

/** Whether Essential cover is allowed given Territory benefit options. */
export function isEssentialAllowed(benefitOptions: BenefitOptionsAvailable): boolean {
  return benefitOptions === "CATEGORIES_1_2";
}

/** Whether any cover is allowed in the territory. */
export function isTerritoryOpen(benefitOptions: BenefitOptionsAvailable): boolean {
  return benefitOptions !== "DECLINE";
}

/** Validates plan type against TerritoryBenefitEligibility (benefit options column). */
export function assertPlanEligibleInTerritory(
  benefitOptions: BenefitOptionsAvailable,
  planType: PlanType,
): void {
  if (!isTerritoryOpen(benefitOptions)) {
    throw new TerritoryDeclinedError();
  }
  if (planType === "ESSENTIAL" && !isEssentialAllowed(benefitOptions)) {
    throw new PlanNotEligibleError();
  }
}

type UnderwritingFlags = Readonly<{
  riskMgmtPlanOnFile: boolean;
  crisisMgmtPlanOnFile: boolean;
  fullUnderwritingApproved: boolean;
}>;

/**
 * Enforces underwriting gates for a location assignment: Very High / Extreme
 * territories require risk & crisis plans; Premium requires full underwriting.
 */
export function assertUnderwritingGates(
  riskCategory: RiskCategoryCode,
  planType: PlanType,
  flags: UnderwritingFlags,
): void {
  if (HIGH_RISK_CATEGORIES.includes(riskCategory)) {
    if (!flags.riskMgmtPlanOnFile || !flags.crisisMgmtPlanOnFile) {
      throw new UnderwritingGateError(
        "Very High / Extreme territories require risk-management and crisis-management plans on file",
      );
    }
  }
  if (planType === "PREMIUM" && !flags.fullUnderwritingApproved) {
    throw new UnderwritingGateError(
      "Premium cover at this location requires full underwriting approval on the member organisation",
    );
  }
}
