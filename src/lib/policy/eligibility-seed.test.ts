import { describe, expect, it } from "vitest";
import { isPlanPermitted, seedTerritoryEligibility } from "@/lib/policy/eligibility-seed";
import { assertBenefitLineMatchesScale } from "@/lib/policy/schema";

describe("policy eligibility-seed", () => {
  it("maps benefit options to plan permission", () => {
    expect(isPlanPermitted("CATEGORIES_1_2", "ESSENTIAL")).toBe(true);
    expect(isPlanPermitted("CATEGORIES_3_4", "ESSENTIAL")).toBe(false);
    expect(isPlanPermitted("DECLINE", "PREMIUM")).toBe(false);
    expect(isPlanPermitted("CATEGORY_4_ONLY", "PREMIUM")).toBe(true);
  });

  it("seeds territory × category pairs", () => {
    const rows = seedTerritoryEligibility({
      clientId: "c1",
      categories: [
        { id: "cat-e", planType: "ESSENTIAL" },
        { id: "cat-p", planType: "PREMIUM" },
      ],
      territories: [
        { id: "t-open", benefitOptions: "CATEGORIES_1_2" },
        { id: "t-decl", benefitOptions: "DECLINE" },
      ],
    });
    expect(rows).toEqual([
      { territoryId: "t-open", coverCategoryId: "cat-e", clientId: "c1" },
      { territoryId: "t-open", coverCategoryId: "cat-p", clientId: "c1" },
    ]);
  });
});

describe("benefit line scale validation", () => {
  it("requires fixedAmount for FIXED_SUM", () => {
    expect(() =>
      assertBenefitLineMatchesScale("FIXED_SUM", {
        benefitType: "DEATH",
        amountBasis: "LUMP_SUM",
      }),
    ).toThrow(/fixedAmount/);
  });

  it("requires earningsMultiple for EARNINGS_BASED Death", () => {
    expect(() =>
      assertBenefitLineMatchesScale("EARNINGS_BASED", {
        benefitType: "DEATH",
        amountBasis: "LUMP_SUM",
      }),
    ).toThrow(/earningsMultiple/);
  });

  it("requires percentOfEarnings for EARNINGS_BASED TTD", () => {
    expect(() =>
      assertBenefitLineMatchesScale("EARNINGS_BASED", {
        benefitType: "TTD",
        amountBasis: "PERIODIC",
      }),
    ).toThrow(/percentOfEarnings/);
  });

  it("always requires fixedAmount for MEDICAL", () => {
    expect(() =>
      assertBenefitLineMatchesScale("EARNINGS_BASED", {
        benefitType: "MEDICAL",
        amountBasis: "LUMP_SUM",
        earningsMultiple: 3,
      }),
    ).toThrow(/fixedAmount/);
  });
});
