import { describe, expect, it } from "vitest";
import {
  MissingWageRollError,
  computeBookTotals,
  computeWhatIf,
  percentOfWageRoll,
  projectAdditionalWageRoll,
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

const APARKS_SCHEDULE: PolicySchedule = {
  policy: {
    id: "policy-aparks-2025-26",
    clientId: "client-aparks",
    policyYear: "2025-2026",
    inceptionDate: new Date("2025-12-01T00:00:00.000Z"),
    expiryDate: new Date("2026-11-30T00:00:00.000Z"),
    status: "ON_RISK",
    benefitScale: "EARNINGS_BASED",
    paymentTermsId: "pay-aparks-monthly",
    underwriterUserId: null,
    brokerOrganisationId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  paymentTerms: {
    id: "pay-aparks-monthly",
    clientId: "client-aparks",
    frequency: "MONTHLY_BY_NUMBERS",
    depositMinPremium: null,
    adjustmentCadenceMonths: 6,
    aggregateIsClientFund: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  categories: [
    {
      category: {
        id: "cat-aparks-staff",
        policyId: "policy-aparks-2025-26",
        clientId: "client-aparks",
        categoryLabel: "All Staff — Stated Benefits (demo)",
        planType: "PREMIUM",
        declaredInsuredCount: 120,
        declaredAnnualWageRoll: 18_000_000,
        premiumAmount: 1.2,
        premiumBasis: "PERCENT_OF_WAGE_ROLL",
        premiumIncludesVat: true,
        aggregateAmount: 0.8,
        aggregateBasis: "PERCENT_OF_WAGE_ROLL",
        aggregateExcludesVat: true,
        sortOrder: 0,
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

  it("applies Stated Benefits math: earnings × rate% = premium", () => {
    expect(percentOfWageRoll(18_000_000, 1.2)).toBeCloseTo(216_000, 2);
    const book = computeBookTotals(APARKS_SCHEDULE, [
      { coverCategoryId: "cat-aparks-staff", lives: 120 },
    ]);
    expect(book.benefitScale).toBe("EARNINGS_BASED");
    expect(book.totalAnnualPremium).toBeCloseTo(216_000, 2);
    expect(book.totalAnnualAggregateDeductible).toBeCloseTo(144_000, 2);
    expect(book.totalMonthlyPremium).toBeCloseTo(216_000 / 12, 2);
    expect(book.totalMonthlyAggregate).toBeCloseTo(144_000 / 12, 2);
    expect(book.lines[0]?.annualWageRoll).toBe(18_000_000);
  });

  it("requires wage roll for PERCENT_OF_WAGE_ROLL", () => {
    const missing: PolicySchedule = {
      ...APARKS_SCHEDULE,
      categories: [
        {
          category: {
            ...APARKS_SCHEDULE.categories[0]!.category,
            declaredAnnualWageRoll: null,
          },
          benefits: [],
        },
      ],
    };
    expect(() =>
      computeBookTotals(missing, [{ coverCategoryId: "cat-aparks-staff", lives: 10 }]),
    ).toThrow(MissingWageRollError);
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

  it("computes what-if incremental premium for PPPM", () => {
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

  it("projects wage-roll what-if from average earnings × headcount", () => {
    const cat = APARKS_SCHEDULE.categories[0]!.category;
    // 18M / 120 = 150_000 average; +10 lives → +1.5M wage roll
    expect(projectAdditionalWageRoll(cat, 10)).toBeCloseTo(1_500_000, 2);
    const preview = computeWhatIf(
      APARKS_SCHEDULE,
      [{ coverCategoryId: "cat-aparks-staff", lives: 120 }],
      "cat-aparks-staff",
      10,
    );
    // New wage 19.5M × 1.2% = 234_000 annual; was 216_000 → +18_000 annual / 12 monthly
    expect(preview.incrementalAnnualPremium).toBeCloseTo(18_000, 2);
    expect(preview.incrementalMonthlyPremium).toBeCloseTo(18_000 / 12, 2);
  });

  it("accepts explicit additional annual wage roll on what-if", () => {
    const preview = computeWhatIf(
      APARKS_SCHEDULE,
      [{ coverCategoryId: "cat-aparks-staff", lives: 120 }],
      "cat-aparks-staff",
      5,
      2_000_000,
    );
    // 20M × 1.2% = 240_000; delta annual = 24_000
    expect(preview.incrementalAnnualPremium).toBeCloseTo(24_000, 2);
  });
});
