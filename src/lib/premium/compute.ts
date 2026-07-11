import type { CoverCategoryRecord, PolicySchedule, RateBasis } from "@/lib/policy/types";
import type {
  BookTotals,
  CategoryBookLine,
  CategoryLives,
  CategoryRatingInput,
  WhatIfPreview,
} from "@/lib/premium/types";

export class UnsupportedRateBasisError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UnsupportedRateBasisError";
  }
}

export class MissingWageRollError extends Error {
  constructor(
    message = "PERCENT_OF_WAGE_ROLL rating requires CoverCategory.declaredAnnualWageRoll",
  ) {
    super(message);
    this.name = "MissingWageRollError";
  }
}

export class NoActivePolicyError extends Error {
  constructor(message = "No on-risk policy schedule for this client") {
    super(message);
    this.name = "NoActivePolicyError";
  }
}

/**
 * Stated Benefits / wage-roll premium: annualEarnings × (ratePercent / 100).
 * `ratePercent` is stored on CoverCategory as premiumAmount / aggregateAmount
 * (e.g. 1.2 means 1.2%).
 */
export function percentOfWageRoll(annualWageRoll: number, ratePercent: number): number {
  return annualWageRoll * (ratePercent / 100);
}

function resolveWageRoll(
  category: CoverCategoryRecord,
  override: number | null | undefined,
): number {
  const wage =
    override !== undefined && override !== null ? override : category.declaredAnnualWageRoll;
  if (wage === null || wage === undefined || wage < 0) {
    throw new MissingWageRollError(
      `Cover category ${category.id} needs declaredAnnualWageRoll for wage-roll rating`,
    );
  }
  return wage;
}

function amountForBasis(
  basis: RateBasis,
  rateOrAmount: number,
  lives: number,
  annualWageRoll: number | null,
  label: string,
): { annual: number; monthly: number } {
  switch (basis) {
    case "PER_PERSON_PER_MONTH": {
      const monthly = lives * rateOrAmount;
      return { monthly, annual: monthly * 12 };
    }
    case "PER_ANNUM": {
      const annual = lives * rateOrAmount;
      return { annual, monthly: annual / 12 };
    }
    case "PERCENT_OF_WAGE_ROLL": {
      if (annualWageRoll === null) {
        throw new MissingWageRollError(`${label}: wage roll required`);
      }
      const annual = percentOfWageRoll(annualWageRoll, rateOrAmount);
      return { annual, monthly: annual / 12 };
    }
    default: {
      const _exhaustive: never = basis;
      throw new UnsupportedRateBasisError(`Unknown rate basis: ${String(_exhaustive)}`);
    }
  }
}

function lineForCategory(
  category: CoverCategoryRecord,
  lives: number,
  annualWageRollOverride?: number | null,
): CategoryBookLine {
  const wageRoll =
    category.premiumBasis === "PERCENT_OF_WAGE_ROLL" ||
    category.aggregateBasis === "PERCENT_OF_WAGE_ROLL"
      ? resolveWageRoll(category, annualWageRollOverride)
      : (annualWageRollOverride ?? category.declaredAnnualWageRoll);

  const premium = amountForBasis(
    category.premiumBasis,
    category.premiumAmount,
    lives,
    wageRoll,
    "Premium",
  );
  const aggregate = amountForBasis(
    category.aggregateBasis,
    category.aggregateAmount,
    lives,
    wageRoll,
    "Aggregate",
  );

  return {
    coverCategoryId: category.id,
    categoryLabel: category.categoryLabel,
    planType: category.planType,
    lives,
    annualWageRoll: wageRoll,
    premiumAmount: category.premiumAmount,
    premiumBasis: category.premiumBasis,
    premiumIncludesVat: category.premiumIncludesVat,
    aggregateAmount: category.aggregateAmount,
    aggregateBasis: category.aggregateBasis,
    aggregateExcludesVat: category.aggregateExcludesVat,
    monthlyPremium: premium.monthly,
    monthlyAggregate: aggregate.monthly,
    annualPremium: premium.annual,
    annualAggregateDeductible: aggregate.annual,
  };
}

function toRatingInputs(
  schedule: PolicySchedule,
  livesByCategory: readonly CategoryLives[],
  wageRollByCategory?: ReadonlyMap<string, number>,
): CategoryRatingInput[] {
  const livesMap = new Map(livesByCategory.map((row) => [row.coverCategoryId, row.lives]));
  return schedule.categories.map(({ category }) => {
    const wage = wageRollByCategory?.get(category.id);
    return {
      coverCategoryId: category.id,
      lives: livesMap.get(category.id) ?? 0,
      ...(wage !== undefined ? { annualWageRoll: wage } : {}),
    };
  });
}

/**
 * Roll up endorsement lives (and optional wage-roll overrides) against an
 * on-risk schedule. Rates come only from CoverCategory — never hard-coded.
 *
 * - FIXED_SUM / PPPM: lives × pppm
 * - PER_ANNUM: lives × annual amount (monthly = annual / 12)
 * - Stated Benefits / PERCENT_OF_WAGE_ROLL: earnings × rate% (monthly = annual / 12)
 */
export function computeBookTotals(
  schedule: PolicySchedule,
  livesByCategory: readonly CategoryLives[],
  wageRollByCategory?: ReadonlyMap<string, number>,
): BookTotals {
  const inputs = toRatingInputs(schedule, livesByCategory, wageRollByCategory);
  const lines = schedule.categories.map(({ category }) => {
    const input = inputs.find((r) => r.coverCategoryId === category.id)!;
    return lineForCategory(category, input.lives, input.annualWageRoll);
  });

  return {
    policyId: schedule.policy.id,
    policyYear: schedule.policy.policyYear,
    benefitScale: schedule.policy.benefitScale,
    paymentFrequency: schedule.paymentTerms.frequency,
    aggregateIsClientFund: schedule.paymentTerms.aggregateIsClientFund,
    lines,
    totalLives: lines.reduce((sum, l) => sum + l.lives, 0),
    totalMonthlyPremium: lines.reduce((sum, l) => sum + l.monthlyPremium, 0),
    totalMonthlyAggregate: lines.reduce((sum, l) => sum + l.monthlyAggregate, 0),
    totalAnnualPremium: lines.reduce((sum, l) => sum + l.annualPremium, 0),
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
 * Project incremental annual wage roll for a what-if headcount add.
 * Prefer an explicit wage figure; otherwise scale declared roll by
 * declaredInsuredCount (average earnings × added lives). POPIA: no person-level pay.
 */
export function projectAdditionalWageRoll(
  category: CoverCategoryRecord,
  additionalHeadcount: number,
  additionalAnnualWageRoll?: number | null,
): number {
  if (additionalAnnualWageRoll !== undefined && additionalAnnualWageRoll !== null) {
    return additionalAnnualWageRoll;
  }
  const base = category.declaredAnnualWageRoll;
  if (base !== null && base > 0 && category.declaredInsuredCount > 0) {
    return (base / category.declaredInsuredCount) * additionalHeadcount;
  }
  return 0;
}

/**
 * What-if preview: add headcount (and optional wage roll) to one cover category.
 */
export function computeWhatIf(
  schedule: PolicySchedule,
  currentLives: readonly CategoryLives[],
  coverCategoryId: string,
  additionalHeadcount: number,
  additionalAnnualWageRoll?: number | null,
): WhatIfPreview {
  if (additionalHeadcount <= 0) {
    throw new Error("What-if headcount must be positive");
  }
  const categoryRow = schedule.categories.find((c) => c.category.id === coverCategoryId);
  if (!categoryRow) {
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

  const wageOverrides = new Map<string, number>();
  for (const { category } of schedule.categories) {
    const base = category.declaredAnnualWageRoll ?? 0;
    if (
      category.id === coverCategoryId &&
      (category.premiumBasis === "PERCENT_OF_WAGE_ROLL" ||
        category.aggregateBasis === "PERCENT_OF_WAGE_ROLL")
    ) {
      const extra = projectAdditionalWageRoll(
        category,
        additionalHeadcount,
        additionalAnnualWageRoll,
      );
      wageOverrides.set(category.id, base + extra);
    } else if (category.declaredAnnualWageRoll !== null) {
      wageOverrides.set(category.id, category.declaredAnnualWageRoll);
    }
  }

  const updatedBook = computeBookTotals(
    schedule,
    nextLives,
    wageOverrides.size > 0 ? wageOverrides : undefined,
  );

  return {
    incrementalMonthlyPremium: updatedBook.totalMonthlyPremium - currentBook.totalMonthlyPremium,
    incrementalMonthlyAggregate:
      updatedBook.totalMonthlyAggregate - currentBook.totalMonthlyAggregate,
    incrementalAnnualPremium: updatedBook.totalAnnualPremium - currentBook.totalAnnualPremium,
    incrementalAnnualAggregateDeductible:
      updatedBook.totalAnnualAggregateDeductible - currentBook.totalAnnualAggregateDeductible,
    updatedBook,
  };
}
