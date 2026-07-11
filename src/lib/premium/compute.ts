import type { CoverCategoryRecord, PolicySchedule, RateBasis } from "@/lib/policy/types";
import type {
  BookTotals,
  CategoryBookLine,
  CategoryLives,
  WhatIfPreview,
} from "@/lib/premium/types";

export class UnsupportedRateBasisError extends Error {
  constructor(
    message = "Earnings-based / wage-roll rating is not supported in the calculator yet",
  ) {
    super(message);
    this.name = "UnsupportedRateBasisError";
  }
}

export class NoActivePolicyError extends Error {
  constructor(message = "No on-risk policy schedule for this client") {
    super(message);
    this.name = "NoActivePolicyError";
  }
}

function assertPppm(basis: RateBasis, label: string): void {
  if (basis !== "PER_PERSON_PER_MONTH") {
    throw new UnsupportedRateBasisError(
      `${label} rate basis ${basis} is not supported (PER_PERSON_PER_MONTH only)`,
    );
  }
}

function lineForCategory(category: CoverCategoryRecord, lives: number): CategoryBookLine {
  assertPppm(category.premiumBasis, "Premium");
  assertPppm(category.aggregateBasis, "Aggregate");
  const monthlyPremium = lives * category.premiumAmount;
  const monthlyAggregate = lives * category.aggregateAmount;
  return {
    coverCategoryId: category.id,
    categoryLabel: category.categoryLabel,
    planType: category.planType,
    lives,
    premiumAmount: category.premiumAmount,
    premiumBasis: category.premiumBasis,
    premiumIncludesVat: category.premiumIncludesVat,
    aggregateAmount: category.aggregateAmount,
    aggregateBasis: category.aggregateBasis,
    aggregateExcludesVat: category.aggregateExcludesVat,
    monthlyPremium,
    monthlyAggregate,
    annualAggregateDeductible: monthlyAggregate * 12,
  };
}

/**
 * Roll up endorsement (or other) lives by cover category against an on-risk
 * schedule. Rates come only from CoverCategory — never hard-coded.
 */
export function computeBookTotals(
  schedule: PolicySchedule,
  livesByCategory: readonly CategoryLives[],
): BookTotals {
  if (schedule.policy.benefitScale === "EARNINGS_BASED") {
    throw new UnsupportedRateBasisError(
      "Earnings-based (Stated Benefits) schedules are not supported in the calculator yet",
    );
  }

  const livesMap = new Map(livesByCategory.map((row) => [row.coverCategoryId, row.lives]));
  const lines = schedule.categories.map(({ category }) =>
    lineForCategory(category, livesMap.get(category.id) ?? 0),
  );

  return {
    policyId: schedule.policy.id,
    policyYear: schedule.policy.policyYear,
    paymentFrequency: schedule.paymentTerms.frequency,
    aggregateIsClientFund: schedule.paymentTerms.aggregateIsClientFund,
    lines,
    totalLives: lines.reduce((sum, l) => sum + l.lives, 0),
    totalMonthlyPremium: lines.reduce((sum, l) => sum + l.monthlyPremium, 0),
    totalMonthlyAggregate: lines.reduce((sum, l) => sum + l.monthlyAggregate, 0),
    totalAnnualAggregateDeductible: lines.reduce((sum, l) => sum + l.annualAggregateDeductible, 0),
  };
}

/** Sum endorsement deltas grouped by coverCategoryId. */
export function rollupLivesByCoverCategory(
  endorsements: readonly Readonly<{ coverCategoryId: string; delta: number }>[],
): CategoryLives[] {
  const map = new Map<string, number>();
  for (const row of endorsements) {
    map.set(row.coverCategoryId, (map.get(row.coverCategoryId) ?? 0) + row.delta);
  }
  return [...map.entries()].map(([coverCategoryId, lives]) => ({
    coverCategoryId,
    lives: Math.max(0, lives),
  }));
}

/**
 * What-if preview: add headcount to one cover category and recompute book totals.
 */
export function computeWhatIf(
  schedule: PolicySchedule,
  currentLives: readonly CategoryLives[],
  coverCategoryId: string,
  additionalHeadcount: number,
): WhatIfPreview {
  if (additionalHeadcount <= 0) {
    throw new Error("What-if headcount must be positive");
  }
  const category = schedule.categories.find((c) => c.category.id === coverCategoryId);
  if (!category) {
    throw new Error(`Cover category not on schedule: ${coverCategoryId}`);
  }

  const currentBook = computeBookTotals(schedule, currentLives);
  const nextLives = currentLives.map((row) =>
    row.coverCategoryId === coverCategoryId
      ? { ...row, lives: row.lives + additionalHeadcount }
      : row,
  );
  if (!nextLives.some((r) => r.coverCategoryId === coverCategoryId)) {
    nextLives.push({ coverCategoryId, lives: additionalHeadcount });
  }
  const updatedBook = computeBookTotals(schedule, nextLives);

  return {
    incrementalMonthlyPremium: updatedBook.totalMonthlyPremium - currentBook.totalMonthlyPremium,
    incrementalMonthlyAggregate:
      updatedBook.totalMonthlyAggregate - currentBook.totalMonthlyAggregate,
    incrementalAnnualAggregateDeductible:
      updatedBook.totalAnnualAggregateDeductible - currentBook.totalAnnualAggregateDeductible,
    updatedBook,
  };
}
