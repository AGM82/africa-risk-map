import type { RiskMixPolicyRecord } from "@/lib/policy/types";
import type { RiskCategoryCode } from "@/lib/territory/types";
import type { RiskMixDriftResult, RiskMixTierLives } from "@/lib/premium/types";

function tierForRiskCategory(
  riskCategory: RiskCategoryCode,
): keyof Omit<RiskMixTierLives, "total"> {
  if (riskCategory === "Low" || riskCategory === "Medium") return "lowMed";
  if (riskCategory === "High") return "high";
  return "veryHigh";
}

/**
 * Aggregate covered lives by RiskMixPolicy tiers from location headcounts ×
 * territory risk categories.
 */
export function livesByRiskTier(
  locations: readonly Readonly<{
    headcount: number;
    territoryId: string;
  }>[],
  territoriesById: ReadonlyMap<string, RiskCategoryCode>,
): RiskMixTierLives {
  let lowMed = 0;
  let high = 0;
  let veryHigh = 0;
  for (const loc of locations) {
    const risk = territoriesById.get(loc.territoryId);
    if (risk === undefined || loc.headcount <= 0) continue;
    const tier = tierForRiskCategory(risk);
    if (tier === "lowMed") lowMed += loc.headcount;
    else if (tier === "high") high += loc.headcount;
    else veryHigh += loc.headcount;
  }
  return { lowMed, high, veryHigh, total: lowMed + high + veryHigh };
}

function pct(part: number, total: number): number {
  if (total <= 0) return 0;
  return (part / total) * 100;
}

/**
 * Compare actual tier mix to RiskMixPolicy targets ± tolerance.
 * Warning (not a hard block) when any tier drifts outside tolerance.
 */
export function checkRiskMixDrift(
  actual: RiskMixTierLives,
  policy: Pick<
    RiskMixPolicyRecord,
    "targetLowMedPct" | "targetHighPct" | "targetVeryHighPct" | "tolerancePct"
  >,
): RiskMixDriftResult {
  const actualLowMedPct = pct(actual.lowMed, actual.total);
  const actualHighPct = pct(actual.high, actual.total);
  const actualVeryHighPct = pct(actual.veryHigh, actual.total);
  const tol = policy.tolerancePct;

  const breachedTiers: ("lowMed" | "high" | "veryHigh")[] = [];
  if (Math.abs(actualLowMedPct - policy.targetLowMedPct) > tol) breachedTiers.push("lowMed");
  if (Math.abs(actualHighPct - policy.targetHighPct) > tol) breachedTiers.push("high");
  if (Math.abs(actualVeryHighPct - policy.targetVeryHighPct) > tol) {
    breachedTiers.push("veryHigh");
  }

  return {
    actual,
    actualLowMedPct,
    actualHighPct,
    actualVeryHighPct,
    targets: {
      targetLowMedPct: policy.targetLowMedPct,
      targetHighPct: policy.targetHighPct,
      targetVeryHighPct: policy.targetVeryHighPct,
      tolerancePct: policy.tolerancePct,
    },
    outsideTolerance: breachedTiers.length > 0,
    breachedTiers,
  };
}

/** Projected locations after adding a what-if location for drift check. */
export function withWhatIfLocation(
  locations: readonly Readonly<{ headcount: number; territoryId: string }>[],
  territoryId: string,
  headcount: number,
): Readonly<{ headcount: number; territoryId: string }>[] {
  return [...locations, { territoryId, headcount }];
}
