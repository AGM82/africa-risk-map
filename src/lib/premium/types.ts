import type { CoverCategoryRecord, PolicySchedule } from "@/lib/policy/types";
import type { RiskMixPolicyRecord } from "@/lib/policy/types";

export type CategoryLives = Readonly<{
  coverCategoryId: string;
  lives: number;
}>;

/** Optional wage-roll override when projecting what-if / adjusted earnings. */
export type CategoryRatingInput = Readonly<{
  coverCategoryId: string;
  lives: number;
  annualWageRoll?: number | null;
}>;

export type CategoryBookLine = Readonly<{
  coverCategoryId: string;
  categoryLabel: string;
  planType: CoverCategoryRecord["planType"];
  basisOfCover: CoverCategoryRecord["basisOfCover"];
  basisOfCoverOther: string | null;
  lives: number;
  /** Anonymised aggregate earnings base used for wage-roll rating (null for PPPM-only). */
  annualWageRoll: number | null;
  premiumAmount: number;
  premiumBasis: CoverCategoryRecord["premiumBasis"];
  premiumIncludesVat: boolean;
  aggregateAmount: number;
  aggregateBasis: CoverCategoryRecord["aggregateBasis"];
  aggregateExcludesVat: boolean;
  monthlyPremium: number;
  monthlyAggregate: number;
  annualPremium: number;
  annualAggregateDeductible: number;
}>;

export type BookTotals = Readonly<{
  policyId: string;
  policyYear: string;
  benefitScale: PolicySchedule["policy"]["benefitScale"];
  paymentFrequency: PolicySchedule["paymentTerms"]["frequency"];
  aggregateIsClientFund: boolean;
  lines: readonly CategoryBookLine[];
  totalLives: number;
  totalMonthlyPremium: number;
  totalMonthlyAggregate: number;
  totalAnnualPremium: number;
  totalAnnualAggregateDeductible: number;
}>;

export type WhatIfPreview = Readonly<{
  incrementalMonthlyPremium: number;
  incrementalMonthlyAggregate: number;
  incrementalAnnualPremium: number;
  incrementalAnnualAggregateDeductible: number;
  updatedBook: BookTotals;
}>;

export type RiskMixTierLives = Readonly<{
  lowMed: number;
  high: number;
  veryHigh: number;
  total: number;
}>;

export type RiskMixDriftResult = Readonly<{
  actual: RiskMixTierLives;
  actualLowMedPct: number;
  actualHighPct: number;
  actualVeryHighPct: number;
  targets: Pick<
    RiskMixPolicyRecord,
    "targetLowMedPct" | "targetHighPct" | "targetVeryHighPct" | "tolerancePct"
  >;
  outsideTolerance: boolean;
  breachedTiers: readonly ("lowMed" | "high" | "veryHigh")[];
}>;
