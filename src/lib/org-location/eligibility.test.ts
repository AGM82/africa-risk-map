import { describe, expect, it } from "vitest";
import {
  PlanNotEligibleError,
  TerritoryDeclinedError,
  UnderwritingGateError,
  assertPlanEligibleInTerritory,
  assertUnderwritingGates,
  isEssentialAllowed,
  isTerritoryOpen,
} from "@/lib/org-location/eligibility";

describe("org-location eligibility", () => {
  it("maps benefit options to essential eligibility", () => {
    expect(isEssentialAllowed("CATEGORIES_1_2")).toBe(true);
    expect(isEssentialAllowed("CATEGORIES_3_4")).toBe(false);
    expect(isTerritoryOpen("DECLINE")).toBe(false);
  });

  it("blocks declined territories", () => {
    expect(() => assertPlanEligibleInTerritory("DECLINE", "ESSENTIAL")).toThrow(
      TerritoryDeclinedError,
    );
    expect(() => assertPlanEligibleInTerritory("DECLINE", "PREMIUM")).toThrow(
      TerritoryDeclinedError,
    );
  });

  it("blocks essential in category 3-4 / 4-only territories", () => {
    expect(() => assertPlanEligibleInTerritory("CATEGORIES_3_4", "ESSENTIAL")).toThrow(
      PlanNotEligibleError,
    );
    expect(() => assertPlanEligibleInTerritory("CATEGORY_4_ONLY", "ESSENTIAL")).toThrow(
      PlanNotEligibleError,
    );
    expect(() => assertPlanEligibleInTerritory("CATEGORY_4_ONLY", "PREMIUM")).not.toThrow();
  });

  it("requires risk/crisis plans for Very High territories", () => {
    expect(() =>
      assertUnderwritingGates("VeryHigh", "ESSENTIAL", {
        riskMgmtPlanOnFile: false,
        crisisMgmtPlanOnFile: true,
        fullUnderwritingApproved: false,
      }),
    ).toThrow(UnderwritingGateError);
    expect(() =>
      assertUnderwritingGates("VeryHigh", "ESSENTIAL", {
        riskMgmtPlanOnFile: true,
        crisisMgmtPlanOnFile: true,
        fullUnderwritingApproved: false,
      }),
    ).not.toThrow();
  });

  it("requires full underwriting for premium locations", () => {
    expect(() =>
      assertUnderwritingGates("Low", "PREMIUM", {
        riskMgmtPlanOnFile: true,
        crisisMgmtPlanOnFile: true,
        fullUnderwritingApproved: false,
      }),
    ).toThrow(UnderwritingGateError);
  });

  it("requires plans for Extreme territories", () => {
    expect(() =>
      assertUnderwritingGates("Extreme", "ESSENTIAL", {
        riskMgmtPlanOnFile: true,
        crisisMgmtPlanOnFile: false,
        fullUnderwritingApproved: false,
      }),
    ).toThrow(UnderwritingGateError);
  });
});
