import type { EndorsementRecord } from "@/lib/org-location/types";
import { computeBookTotals, rollupLivesByCoverCategory } from "@/lib/premium/compute";
import type { PolicySchedule } from "@/lib/policy/types";
import type { MonthlyBookPoint } from "@/lib/reporting/types";

function monthKey(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(d: Date): string {
  return d.toLocaleString("en-ZA", { month: "short", year: "numeric", timeZone: "UTC" });
}

/** UTC month-end timestamps from inception month through expiry month (inclusive). */
export function policyMonthEnds(inception: Date, expiry: Date): Date[] {
  const ends: Date[] = [];
  let year = inception.getUTCFullYear();
  let month = inception.getUTCMonth();
  const endYear = expiry.getUTCFullYear();
  const endMonth = expiry.getUTCMonth();

  while (year < endYear || (year === endYear && month <= endMonth)) {
    ends.push(new Date(Date.UTC(year, month + 1, 0, 23, 59, 59, 999)));
    month += 1;
    if (month > 11) {
      month = 0;
      year += 1;
    }
  }
  return ends;
}

/**
 * Monthly premium/agg series for a policy term from endorsements as-of each
 * month-end. Rates always come from the schedule CoverCategory rows.
 */
export function buildMonthlyBookSeries(
  schedule: PolicySchedule,
  endorsements: readonly EndorsementRecord[],
): MonthlyBookPoint[] {
  const ends = policyMonthEnds(schedule.policy.inceptionDate, schedule.policy.expiryDate);
  return ends.map((asOf) => {
    const active = endorsements.filter(
      (e) => e.policyId === schedule.policy.id && e.effectiveDate.getTime() <= asOf.getTime(),
    );
    const lives = rollupLivesByCoverCategory(active);
    const book = computeBookTotals(schedule, lives);
    return {
      monthKey: monthKey(asOf),
      label: monthLabel(asOf),
      totalLives: book.totalLives,
      monthlyPremium: book.totalMonthlyPremium,
      monthlyAggregate: book.totalMonthlyAggregate,
    };
  });
}

export function dashboardInsight(series: readonly MonthlyBookPoint[]): string {
  if (series.length < 2) {
    return "Insufficient months to show a trend yet.";
  }
  const first = series[0]!;
  const last = series[series.length - 1]!;
  const deltaPrem = last.monthlyPremium - first.monthlyPremium;
  const deltaLives = last.totalLives - first.totalLives;
  if (Math.abs(deltaPrem) < 0.01 && deltaLives === 0) {
    return "Monthly premium and lives are flat across the policy term to date.";
  }
  const premDir = deltaPrem > 0 ? "up" : "down";
  const livesDir = deltaLives > 0 ? "up" : deltaLives < 0 ? "down" : "unchanged";
  return `Lives ${livesDir} (${deltaLives >= 0 ? "+" : ""}${deltaLives}); monthly premium ${premDir} from opening to latest month.`;
}
