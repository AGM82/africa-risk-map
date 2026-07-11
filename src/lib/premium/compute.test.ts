import { describe, expect, it } from "vitest";
import {
  UnsupportedRateBasisError,
  computeBookTotals,
  computeWhatIf,
  rollupLivesByCoverCategory,
} from "@/lib/premium/compute";
import type { PolicySchedule } from "@/lib/policy/types";

const GRAA_SCHEDULE: PolicySchedule = {
  policy: {
    id: "policy-graa-2025-26",
    clientId: "client-graa",
    policyYear: "2025-2026",
    inceptionDate: new Date("2025-12-01T00:00:00.000Z"),
    expiryDate: new Date("2026-11-30T00:00:00.000Z"),
    status: "ON_RISK",
    benefitScale: "FIXED_SUM",
    paymentTermsId: "pay-graa-monthly",
    underwriterUserId: null,
    brokerOrganisationId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  paymentTerms: {
    id: "pay-graa-monthly",
    clientId: "client-graa",
    frequency: "MONTHLY_BY_NUMBERS",
    depositMinPremium: null,
    adjustmentCadenceMonths: null,
    aggregateIsClientFund: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  categories: [
    {
      category: {
        id: "cat-graa-essential",
        policyId: "policy-graa-2025-26",
        clientId: "client-graa",
        categoryLabel: "Category 1 — Essential Cover",
        planType: "ESSENTIAL",
        declaredInsuredCount: 6503,
        declaredAnnualWageRoll: null,
        premiumAmount: 24.06,
        premiumBasis: "PER_PERSON_PER_MONTH",
        premiumIncludesVat: true,
        aggregateAmount: 35,
        aggregateBasis: "PER_PERSON_PER_MONTH",
        aggregateExcludesVat: true,
        sortOrder: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      benefits: [],
    },
    {
      category: {
        id: "cat-graa-premium",
        policyId: "policy-graa-2025-26",
        clientId: "client-graa",
        categoryLabel: "Category 3 — Premium Cover",
        planType: "PREMIUM",
        declaredInsuredCount: 14,
        declaredAnnualWageRoll: null,
        premiumAmount: 77.44,
        premiumBasis: "PER_PERSON_PER_MONTH",
        premiumIncludesVat: true,
        aggregateAmount: 112.44,
        aggregateBasis: "PER_PERSON_PER_MONTH",
        aggregateExcludesVat: true,
        sortOrder: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      benefits: [],
    },
  ],
};

describe("premium compute", () => {
  it("reconciles GRAA ledger book totals (6503 Essential / 14 Premium)", () => {
    const book = computeBookTotals(GRAA_SCHEDULE, [
      { coverCategoryId: "cat-graa-essential", lives: 6503 },
      { coverCategoryId: "cat-graa-premium", lives: 14 },
    ]);
    expect(book.totalLives).toBe(6517);
    expect(book.totalMonthlyPremium).toBeCloseTo(6503 * 24.06 + 14 * 77.44, 2);
    expect(book.totalMonthlyAggregate).toBeCloseTo(6503 * 35 + 14 * 112.44, 2);
    expect(book.totalAnnualAggregateDeductible).toBeCloseTo(book.totalMonthlyAggregate * 12, 2);
    expect(book.lines[0]?.monthlyPremium).toBeCloseTo(156_462.18, 2);
  });

  it("rolls up endorsement deltas by cover category", () => {
    const lives = rollupLivesByCoverCategory([
      { coverCategoryId: "cat-graa-essential", delta: 42 },
      { coverCategoryId: "cat-graa-essential", delta: 10 },
      { coverCategoryId: "cat-graa-premium", delta: 18 },
      { coverCategoryId: "cat-graa-premium", delta: -3 },
    ]);
    expect(lives).toEqual(
      expect.arrayContaining([
        { coverCategoryId: "cat-graa-essential", lives: 52 },
        { coverCategoryId: "cat-graa-premium", lives: 15 },
      ]),
    );
  });

  it("computes what-if incremental premium", () => {
    const preview = computeWhatIf(
      GRAA_SCHEDULE,
      [
        { coverCategoryId: "cat-graa-essential", lives: 42 },
        { coverCategoryId: "cat-graa-premium", lives: 18 },
      ],
      "cat-graa-essential",
      10,
    );
    expect(preview.incrementalMonthlyPremium).toBeCloseTo(10 * 24.06, 2);
    expect(
      preview.updatedBook.lines.find((l) => l.coverCategoryId === "cat-graa-essential")?.lives,
    ).toBe(52);
  });

  it("rejects earnings-based schedules", () => {
    const earnings: PolicySchedule = {
      ...GRAA_SCHEDULE,
      policy: { ...GRAA_SCHEDULE.policy, benefitScale: "EARNINGS_BASED" },
    };
    expect(() => computeBookTotals(earnings, [])).toThrow(UnsupportedRateBasisError);
  });

  it("rejects non-PPPM rate bases", () => {
    const wageRoll: PolicySchedule = {
      ...GRAA_SCHEDULE,
      policy: { ...GRAA_SCHEDULE.policy, benefitScale: "FIXED_SUM" },
      categories: [
        {
          category: {
            ...GRAA_SCHEDULE.categories[0]!.category,
            premiumBasis: "PERCENT_OF_WAGE_ROLL",
            aggregateBasis: "PERCENT_OF_WAGE_ROLL",
          },
          benefits: [],
        },
      ],
    };
    expect(() =>
      computeBookTotals(wageRoll, [{ coverCategoryId: "cat-graa-essential", lives: 10 }]),
    ).toThrow(UnsupportedRateBasisError);
  });
});
