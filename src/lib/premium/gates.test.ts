import { describe, expect, it } from "vitest";
import {
  PlanNotEligibleError,
  TerritoryDeclinedError,
  UnderwritingGateError,
} from "@/lib/org-location/eligibility";
import { CoverCategoryNotEligibleError, assertWhatIfGates } from "@/lib/premium/gates";

const eligibility = [
  {
    id: "e1",
    territoryId: "terr-zaf",
    coverCategoryId: "cat-graa-essential",
    clientId: "client-graa",
    createdAt: new Date(),
  },
  {
    id: "e2",
    territoryId: "terr-zaf",
    coverCategoryId: "cat-graa-premium",
    clientId: "client-graa",
    createdAt: new Date(),
  },
  {
    id: "e3",
    territoryId: "terr-nga-ne",
    coverCategoryId: "cat-graa-premium",
    clientId: "client-graa",
    createdAt: new Date(),
  },
];

describe("what-if gates", () => {
  it("allows Essential in CATEGORIES_1_2 with eligibility row", () => {
    expect(() =>
      assertWhatIfGates({
        benefitOptions: "CATEGORIES_1_2",
        riskCategory: "Low",
        planType: "ESSENTIAL",
        coverCategoryId: "cat-graa-essential",
        territoryId: "terr-zaf",
        eligibility,
        flags: {
          riskMgmtPlanOnFile: false,
          crisisMgmtPlanOnFile: false,
          fullUnderwritingApproved: false,
        },
      }),
    ).not.toThrow();
  });

  it("blocks Decline territories", () => {
    expect(() =>
      assertWhatIfGates({
        benefitOptions: "DECLINE",
        riskCategory: "Extreme",
        planType: "PREMIUM",
        coverCategoryId: "cat-graa-premium",
        territoryId: "terr-som-punt",
        eligibility: [],
        flags: {
          riskMgmtPlanOnFile: true,
          crisisMgmtPlanOnFile: true,
          fullUnderwritingApproved: true,
        },
      }),
    ).toThrow(TerritoryDeclinedError);
  });

  it("blocks Essential when only Premium categories permitted", () => {
    expect(() =>
      assertWhatIfGates({
        benefitOptions: "CATEGORY_4_ONLY",
        riskCategory: "VeryHigh",
        planType: "ESSENTIAL",
        coverCategoryId: "cat-graa-essential",
        territoryId: "terr-nga-ne",
        eligibility,
        flags: {
          riskMgmtPlanOnFile: true,
          crisisMgmtPlanOnFile: true,
          fullUnderwritingApproved: false,
        },
      }),
    ).toThrow(PlanNotEligibleError);
  });

  it("requires risk and crisis plans in Very High", () => {
    expect(() =>
      assertWhatIfGates({
        benefitOptions: "CATEGORY_4_ONLY",
        riskCategory: "VeryHigh",
        planType: "PREMIUM",
        coverCategoryId: "cat-graa-premium",
        territoryId: "terr-nga-ne",
        eligibility,
        flags: {
          riskMgmtPlanOnFile: false,
          crisisMgmtPlanOnFile: false,
          fullUnderwritingApproved: true,
        },
      }),
    ).toThrow(UnderwritingGateError);
  });

  it("requires full underwriting for Premium", () => {
    expect(() =>
      assertWhatIfGates({
        benefitOptions: "CATEGORIES_1_2",
        riskCategory: "Low",
        planType: "PREMIUM",
        coverCategoryId: "cat-graa-premium",
        territoryId: "terr-zaf",
        eligibility,
        flags: {
          riskMgmtPlanOnFile: false,
          crisisMgmtPlanOnFile: false,
          fullUnderwritingApproved: false,
        },
      }),
    ).toThrow(UnderwritingGateError);
  });

  it("requires TerritoryBenefitEligibility matrix row", () => {
    expect(() =>
      assertWhatIfGates({
        benefitOptions: "CATEGORIES_1_2",
        riskCategory: "Low",
        planType: "ESSENTIAL",
        coverCategoryId: "cat-graa-essential",
        territoryId: "terr-ken",
        eligibility,
        flags: {
          riskMgmtPlanOnFile: false,
          crisisMgmtPlanOnFile: false,
          fullUnderwritingApproved: false,
        },
      }),
    ).toThrow(CoverCategoryNotEligibleError);
  });
});
